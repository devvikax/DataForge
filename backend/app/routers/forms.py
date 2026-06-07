import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.core.deps import get_current_admin
from app.models.form import Form
from app.models.form_field import FormField, FieldType
from app.models.user import User
from app.schemas.form import (
    FormCreate,
    FormUpdate,
    FormRead,
    FormDetailRead,
    FieldReorderRequest
)
from app.schemas.form_field import FormFieldUpdate, FormFieldRead

router = APIRouter()


@router.post("/", response_model=FormRead, status_code=status.HTTP_201_CREATED)
async def create_form(
    payload: FormCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> Form:
    """Create a new form. Slug must be unique."""
    # Check if slug exists
    slug_result = await db.execute(select(Form).where(Form.slug == payload.slug))
    if slug_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Form slug is already taken.",
        )

    form = Form(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        is_active=payload.is_active,
        unique_field_ids=payload.unique_field_ids,
    )
    db.add(form)
    await db.commit()
    await db.refresh(form)
    return form


@router.get("/", response_model=List[FormRead])
async def list_forms(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> List[Form]:
    """List all forms, ordered by creation date descending."""
    result = await db.execute(select(Form).order_by(Form.created_at.desc()))
    return list(result.scalars().all())


@router.get("/public/{slug}", response_model=FormDetailRead)
async def get_public_form(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> Form:
    """Public endpoint to fetch form details by slug. Unauthenticated."""
    result = await db.execute(
        select(Form).options(selectinload(Form.fields)).where(Form.slug == slug)
    )
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found.",
        )
    if not form.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This form is currently closed.",
        )
    return form


@router.get("/{id}", response_model=FormDetailRead)
async def get_form(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> Form:
    """Fetch form details by ID, including its fields."""
    result = await db.execute(
        select(Form).options(selectinload(Form.fields)).where(Form.id == id)
    )
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found.",
        )
    return form


@router.patch("/{id}", response_model=FormRead)
async def update_form(
    id: uuid.UUID,
    payload: FormUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> Form:
    """Update form metadata/settings."""
    result = await db.execute(select(Form).where(Form.id == id))
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found.",
        )

    # Check slug uniqueness if changed
    if payload.slug and payload.slug != form.slug:
        slug_result = await db.execute(select(Form).where(Form.slug == payload.slug))
        if slug_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Form slug is already taken.",
            )

    # Update attributes
    update_data = payload.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(form, key, val)

    await db.commit()
    await db.refresh(form)
    return form


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_form(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> None:
    """Delete form. Automatically cascades to fields and submissions."""
    result = await db.execute(select(Form).where(Form.id == id))
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found.",
        )
    await db.delete(form)
    await db.commit()


@router.post("/{id}/fields", response_model=List[FormFieldRead])
async def sync_form_fields(
    id: uuid.UUID,
    payload: List[FormFieldUpdate],
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> List[FormField]:
    """Sync fields for a form. 
    Adds new fields, updates existing, and deletes omitted fields.
    """
    result = await db.execute(select(Form).where(Form.id == id))
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found.",
        )

    # Get current fields
    current_fields_result = await db.execute(
        select(FormField).where(FormField.form_id == id)
    )
    current_fields = {field.id: field for field in current_fields_result.scalars().all()}

    updated_field_ids = []
    response_fields = []

    for item in payload:
        if item.id and item.id in current_fields:
            # Update existing field
            field = current_fields[item.id]
            field.field_type = FieldType(item.field_type)
            field.label = item.label
            field.placeholder = item.placeholder
            field.description = item.description
            field.default_value = item.default_value
            field.is_required = item.is_required
            field.order = item.order
            field.options = item.options
            field.conditions = item.conditions
            field.file_accepted_types = item.file_accepted_types
            field.file_max_size_mb = item.file_max_size_mb
            field.file_max_count = item.file_max_count
            updated_field_ids.append(field.id)
            response_fields.append(field)
        else:
            # Create new field
            new_field = FormField(
                id=item.id or uuid.uuid4(),
                form_id=id,
                field_type=FieldType(item.field_type),
                label=item.label,
                placeholder=item.placeholder,
                description=item.description,
                default_value=item.default_value,
                is_required=item.is_required,
                order=item.order,
                options=item.options,
                conditions=item.conditions,
                file_accepted_types=item.file_accepted_types,
                file_max_size_mb=item.file_max_size_mb,
                file_max_count=item.file_max_count,
            )
            db.add(new_field)
            response_fields.append(new_field)

    # Delete fields not present in payload
    for field_id, field in current_fields.items():
        if field_id not in updated_field_ids:
            await db.delete(field)

    await db.commit()

    # Query back the synced list to return it ordered
    refreshed_result = await db.execute(
        select(FormField).where(FormField.form_id == id).order_by(FormField.order)
    )
    return list(refreshed_result.scalars().all())


@router.put("/{id}/fields/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_form_fields(
    id: uuid.UUID,
    payload: FieldReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> None:
    """Update field orders in bulk based on a list of field IDs."""
    # Retrieve all fields for this form
    fields_result = await db.execute(
        select(FormField).where(FormField.form_id == id)
    )
    fields = {field.id: field for field in fields_result.scalars().all()}

    # Update order for each field ID in the request
    for idx, field_id in enumerate(payload.field_ids):
        if field_id in fields:
            fields[field_id].order = idx

    await db.commit()
