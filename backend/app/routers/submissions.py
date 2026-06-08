import uuid
from datetime import datetime, timezone, timedelta
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.core.deps import get_current_admin
from app.models.user import User
from app.models.form import Form
from app.models.submission import Submission, SubmissionStatus
from app.models.submission_value import SubmissionValue
from app.models.file_upload import FileUpload
from app.schemas.submission import (
    SubmissionCreate,
    SubmissionResponse,
    SubmissionDetailResponse,
    PaginatedSubmissionsResponse,
    BulkArchiveRequest
)


router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/{form_id}", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    form_id: uuid.UUID,
    payload: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Submits form values: checks duplicate constraints, generates sequence ID,
    and bulk inserts values in a transaction.
    """
    # 1. Fetch form
    form_result = await db.execute(
        select(Form).options(selectinload(Form.fields)).where(Form.id == form_id)
    )
    form = form_result.scalar_one_or_none()

    if not form:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found."
        )

    if not form.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This form is currently closed for submissions."
        )

    # 2. Duplicate Detection Engine
    if form.unique_field_ids:
        # Create field lookup for labels
        fields_lookup = {f.id: f for f in form.fields}
        
        for unique_field_id_str in form.unique_field_ids:
            try:
                unique_field_id = uuid.UUID(unique_field_id_str)
            except ValueError:
                continue

            # Find matching incoming value
            incoming_item = next((v for v in payload.values if v.field_id == unique_field_id), None)
            if not incoming_item or incoming_item.value is None:
                continue

            incoming_value = incoming_item.value

            # Build duplicate check query joining Submission
            dup_query = select(SubmissionValue).join(Submission).where(
                Submission.form_id == form_id,
                SubmissionValue.field_id == unique_field_id
            )

            # Support list (checkboxes) and plain text matching
            if isinstance(incoming_value, list):
                if not incoming_value:
                    continue
                dup_query = dup_query.where(
                    (SubmissionValue.value_text.in_([str(v) for v in incoming_value])) |
                    (SubmissionValue.value_json == incoming_value)
                )
            else:
                val_str = str(incoming_value).strip()
                if not val_str:
                    continue
                dup_query = dup_query.where(
                    (SubmissionValue.value_text == val_str)
                )

            dup_result = await db.execute(dup_query)
            if dup_result.first():
                field_label = fields_lookup.get(unique_field_id).label if unique_field_id in fields_lookup else "Unique Field"
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Submission rejected: Duplicate value detected for field '{field_label}'."
                )

    # 3. Submission ID Generation (Collision-Safe Random Hex Based)
    now = datetime.now(timezone.utc)
    while True:
        random_hex = uuid.uuid4().hex[:8].upper()
        submission_id = f"DF-{random_hex}"
        exists_query = select(Submission.id).where(Submission.submission_id == submission_id)
        exists_result = await db.execute(exists_query)
        if not exists_result.scalar_one_or_none():
            break

    # 4. Transaction creation
    try:
        # Create Submission record
        submission = Submission(
            form_id=form_id,
            submission_id=submission_id,
            status=SubmissionStatus.PENDING,
            submitted_at=now,
            updated_at=now
        )
        db.add(submission)
        await db.flush()  # Populates submission.id

        # Save values EAV
        for item in payload.values:
            is_json = isinstance(item.value, (list, dict))
            db_val = SubmissionValue(
                submission_id=submission.id,
                field_id=item.field_id,
                value_text=None if is_json or item.value is None else str(item.value),
                value_json=item.value if is_json else None
            )
            db.add(db_val)

        # Save file uploads metadata
        for upload in payload.file_uploads:
            db_upload = FileUpload(
                submission_id=submission.id,
                field_id=upload.field_id,
                cloudinary_public_id=upload.cloudinary_public_id,
                cloudinary_url=upload.cloudinary_url,
                cloudinary_secure_url=upload.cloudinary_secure_url,
                original_filename=upload.original_filename,
                file_type=upload.file_type,
                file_size_bytes=upload.file_size_bytes
            )
            db.add(db_upload)

        await db.commit()
        await db.refresh(submission)

        try:
            from app.services.analytics import update_analytics_cache
            await update_analytics_cache(form_id, db)
            await db.commit()
        except Exception as ae:
            logger.error(f"Failed to update analytics cache on submission: {str(ae)}")

        logger.info(f"Submission {submission_id} created successfully.")
        return submission

    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to create submission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction error: {str(e)}"
        )


@router.get("/form/{form_id}", response_model=PaginatedSubmissionsResponse)
async def get_form_submissions(
    form_id: uuid.UUID,
    page: int = 1,
    limit: int = 50,
    sort_by: str = "submitted_at",
    sort_order: str = "desc",
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Retrieve form submissions with support for pagination, global search,
    and sorting (dynamic and static).
    """
    # 1. Base query and filters (exclude archived submissions)
    query = select(Submission).where(
        Submission.form_id == form_id,
        Submission.status != SubmissionStatus.ARCHIVED
    )
    count_query = select(func.count(Submission.id)).where(
        Submission.form_id == form_id,
        Submission.status != SubmissionStatus.ARCHIVED
    )

    if search:
        search_pattern = f"%{search}%"
        # Find submissions matching ID or having matching value_text in EAV values
        search_subquery = select(SubmissionValue.submission_id).where(
            SubmissionValue.value_text.ilike(search_pattern)
        )
        filter_cond = (Submission.submission_id.ilike(search_pattern)) | (Submission.id.in_(search_subquery))
        query = query.where(filter_cond)
        count_query = count_query.where(filter_cond)

    # 2. Total Count
    total_count_res = await db.execute(count_query)
    total_count = total_count_res.scalar() or 0

    # 3. Sorting
    try:
        sort_field_uuid = uuid.UUID(sort_by)
        is_field_sort = True
    except ValueError:
        is_field_sort = False

    if is_field_sort:
        sort_subquery = select(SubmissionValue.value_text).where(
            SubmissionValue.submission_id == Submission.id,
            SubmissionValue.field_id == sort_field_uuid
        ).scalar_subquery()

        if sort_order.lower() == "asc":
            query = query.order_by(sort_subquery.asc().nullslast())
        else:
            query = query.order_by(sort_subquery.desc().nullslast())
    else:
        column = getattr(Submission, sort_by, Submission.submitted_at)
        if sort_order.lower() == "asc":
            query = query.order_by(column.asc())
        else:
            query = query.order_by(column.desc())

    # 4. Pagination & Execution
    offset = (page - 1) * limit
    query = query.options(
        selectinload(Submission.values),
        selectinload(Submission.file_uploads)
    ).offset(offset).limit(limit)

    results = await db.execute(query)
    submissions = results.scalars().all()

    total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1

    return PaginatedSubmissionsResponse(
        submissions=submissions,
        total_count=total_count,
        page=page,
        limit=limit,
        total_pages=total_pages
    )




@router.post("/bulk-archive")
async def bulk_archive_submissions(
    payload: BulkArchiveRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Bulk archive submissions."""
    result = await db.execute(
        select(Submission).where(Submission.id.in_(payload.submission_ids))
    )
    submissions = result.scalars().all()

    now = datetime.now(timezone.utc)
    for sub in submissions:
        sub.status = SubmissionStatus.ARCHIVED
        sub.updated_at = now

    await db.commit()

    if submissions:
        form_ids = {sub.form_id for sub in submissions}
        from app.services.analytics import update_analytics_cache
        for f_id in form_ids:
            try:
                await update_analytics_cache(f_id, db)
            except Exception as ae:
                logger.error(f"Failed to update analytics cache on bulk archive: {str(ae)}")
        await db.commit()

    return {"archived_count": len(submissions)}



