import uuid
import csv
import io
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from openpyxl import Workbook
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

from app.db.session import get_db
from app.core.deps import get_current_admin
from app.models.form import Form
from app.models.form_field import FormField, FieldType
from app.models.user import User
from app.models.submission import Submission, SubmissionStatus
from app.models.analytics_cache import AnalyticsCache
from app.schemas.form import (
    FormCreate,
    FormUpdate,
    FormRead,
    FormDetailRead,
    FieldReorderRequest,
    FormAnalyticsResponse,
    AdminStatsResponse
)
from app.schemas.form_field import FormFieldUpdate, FormFieldRead
from app.services.analytics import update_analytics_cache

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
    forms = list(result.scalars().all())
    
    # Calculate live non-archived submission counts
    for form in forms:
        submission_count = await db.scalar(
            select(func.count(Submission.id)).where(
                Submission.form_id == form.id,
                Submission.status != SubmissionStatus.ARCHIVED
            )
        )
        form.submission_counter = submission_count or 0
        
    return forms


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


@router.get("/admin/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> dict:
    """Fetch live counts for the admin dashboard (excluding archived submissions)."""
    total_forms = await db.scalar(select(func.count(Form.id)))
    total_submissions = await db.scalar(
        select(func.count(Submission.id)).where(Submission.status != SubmissionStatus.ARCHIVED)
    )
    return {
        "total_forms": total_forms or 0,
        "total_submissions": total_submissions or 0,
    }


@router.get("/{id}", response_model=FormDetailRead)
async def get_form(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
) -> Form:
    """Fetch form details by ID, including its fields and active submission counts."""
    result = await db.execute(
        select(Form).options(selectinload(Form.fields)).where(Form.id == id)
    )
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found.",
        )
    
    # Calculate live non-archived submission counts
    submission_count = await db.scalar(
        select(func.count(Submission.id)).where(
            Submission.form_id == form.id,
            Submission.status != SubmissionStatus.ARCHIVED
        )
    )
    form.submission_counter = submission_count or 0
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


async def fetch_submissions_for_export(form_id: uuid.UUID, db: AsyncSession):
    # Fetch form fields sorted by order
    fields_result = await db.execute(
        select(FormField).where(FormField.form_id == form_id).order_by(FormField.order)
    )
    fields = fields_result.scalars().all()

    # Fetch submissions
    submissions_result = await db.execute(
        select(Submission)
        .options(
            selectinload(Submission.values),
            selectinload(Submission.file_uploads)
        )
        .where(Submission.form_id == form_id)
        .order_by(Submission.submitted_at.desc())
    )
    submissions = submissions_result.scalars().all()
    return fields, submissions


@router.get("/{id}/analytics", response_model=FormAnalyticsResponse)
async def get_form_analytics(
    id: uuid.UUID,
    force_refresh: bool = False,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Retrieve form submissions analytics. Uses pre-computed cache by default."""
    form_result = await db.execute(select(Form).where(Form.id == id))
    form = form_result.scalar_one_or_none()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found.",
        )

    cache_res = await db.execute(
        select(AnalyticsCache).where(AnalyticsCache.form_id == id)
    )
    cache = cache_res.scalar_one_or_none()

    if not cache or force_refresh:
        cache = await update_analytics_cache(id, db)
        await db.commit()

    today_str = datetime.now(timezone.utc).date().isoformat()
    today_submissions = 0
    for day in cache.daily_counts:
        if day.get("date") == today_str:
            today_submissions = day.get("count", 0)
            break

    return FormAnalyticsResponse(
        total_submissions=cache.total_submissions,
        today_submissions=today_submissions,
        daily_counts=cache.daily_counts,
        field_stats=cache.field_stats,
        computed_at=cache.computed_at
    )


@router.get("/{id}/export/csv")
async def export_submissions_csv(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Export all submissions for a form in CSV format."""
    form_res = await db.execute(select(Form).where(Form.id == id))
    form = form_res.scalar_one_or_none()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found.",
        )

    fields, submissions = await fetch_submissions_for_export(id, db)

    output = io.StringIO()
    writer = csv.writer(output)

    header = ["Submission ID", "Status", "Submitted At"]
    for field in fields:
        header.append(field.label)
    writer.writerow(header)

    for sub in submissions:
        row = [
            sub.submission_id,
            sub.status.value,
            sub.submitted_at.strftime("%Y-%m-%d %H:%M:%S")
        ]
        for field in fields:
            if field.field_type == FieldType.FILE:
                files = [f for f in sub.file_uploads if f.field_id == field.id]
                row.append(", ".join(f.cloudinary_secure_url for f in files))
            else:
                sub_val = next((v for v in sub.values if v.field_id == field.id), None)
                if sub_val:
                    if sub_val.value_json is not None:
                        if isinstance(sub_val.value_json, list):
                            row.append(", ".join(str(x) for x in sub_val.value_json))
                        else:
                            row.append(str(sub_val.value_json))
                    elif sub_val.value_text is not None:
                        row.append(sub_val.value_text)
                    else:
                        row.append("")
                else:
                    row.append("")
        writer.writerow(row)

    output.seek(0)
    filename = f"export_{form.slug}_{datetime.now().strftime('%Y%m%d%H%M%S')}.csv"
    return StreamingResponse(
        io.StringIO(output.getvalue()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{id}/export/xlsx")
async def export_submissions_xlsx(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Export all submissions for a form in Excel (XLSX) format."""
    form_res = await db.execute(select(Form).where(Form.id == id))
    form = form_res.scalar_one_or_none()
    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found.",
        )

    fields, submissions = await fetch_submissions_for_export(id, db)

    wb = Workbook()
    ws = wb.active
    ws.title = "Submissions"

    header = ["Submission ID", "Status", "Submitted At"]
    for field in fields:
        header.append(field.label)
    ws.append(header)

    for col_idx in range(1, len(header) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = Font(bold=True)

    for sub in submissions:
        row = [
            sub.submission_id,
            sub.status.value,
            sub.submitted_at.strftime("%Y-%m-%d %H:%M:%S")
        ]
        for field in fields:
            if field.field_type == FieldType.FILE:
                files = [f for f in sub.file_uploads if f.field_id == field.id]
                row.append(", ".join(f.cloudinary_secure_url for f in files))
            else:
                sub_val = next((v for v in sub.values if v.field_id == field.id), None)
                if sub_val:
                    if sub_val.value_json is not None:
                        if isinstance(sub_val.value_json, list):
                            row.append(", ".join(str(x) for x in sub_val.value_json))
                        else:
                            row.append(str(sub_val.value_json))
                    elif sub_val.value_text is not None:
                        row.append(sub_val.value_text)
                    else:
                        row.append("")
                else:
                    row.append("")
        ws.append(row)

    for col in ws.columns:
        max_len = 0
        for cell in col:
            val_str = str(cell.value or "")
            if len(val_str) > max_len:
                max_len = len(val_str)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 10)

    out = io.BytesIO()
    wb.save(out)
    out.seek(0)

    filename = f"export_{form.slug}_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    return Response(
        content=out.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

