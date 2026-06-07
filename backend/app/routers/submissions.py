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
from app.models.edit_request import EditRequest, EditRequestStatus
from app.schemas.submission import (
    SubmissionCreate,
    SubmissionResponse,
    SubmissionDetailResponse,
    PaginatedSubmissionsResponse,
    SubmissionStatusUpdate,
    BulkStatusUpdate,
    BulkArchiveRequest
)
from app.schemas.edit_request import (
    EditRequestCreate,
    EditRequestResponse,
    EditRequestApprove,
    EditRequestReject,
    EditRequestFormDetail
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

    # 3. Submission ID Sequence Generation
    now = datetime.now(timezone.utc)
    year = now.year
    start_of_year = datetime(year, 1, 1, tzinfo=timezone.utc)

    seq_query = select(func.count(Submission.id)).where(
        Submission.form_id == form_id,
        Submission.submitted_at >= start_of_year
    )
    seq_result = await db.execute(seq_query)
    count = seq_result.scalar() or 0
    seq_num = count + 1
    submission_id = f"DF-{year}-{seq_num:06d}"

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
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Retrieve form submissions with support for pagination, global search,
    sorting (dynamic and static), and status filtering.
    """
    # 1. Base query and filters
    query = select(Submission).where(Submission.form_id == form_id)
    count_query = select(func.count(Submission.id)).where(Submission.form_id == form_id)

    if status_filter:
        query = query.where(Submission.status == SubmissionStatus(status_filter))
        count_query = count_query.where(Submission.status == SubmissionStatus(status_filter))

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


@router.patch("/{id}/status", response_model=SubmissionDetailResponse)
async def update_submission_status(
    id: uuid.UUID,
    payload: SubmissionStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Update a specific submission's status and notes."""
    result = await db.execute(
        select(Submission)
        .options(selectinload(Submission.values), selectinload(Submission.file_uploads))
        .where(Submission.id == id)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found."
        )

    submission.status = SubmissionStatus(payload.status)
    if payload.admin_notes is not None:
        submission.admin_notes = payload.admin_notes
    submission.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(submission)
    return submission


@router.post("/bulk-status")
async def bulk_update_submission_status(
    payload: BulkStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Bulk update submission statuses."""
    result = await db.execute(
        select(Submission).where(Submission.id.in_(payload.submission_ids))
    )
    submissions = result.scalars().all()

    now = datetime.now(timezone.utc)
    for sub in submissions:
        sub.status = SubmissionStatus(payload.status)
        sub.updated_at = now

    await db.commit()
    return {"updated_count": len(submissions)}


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
    return {"archived_count": len(submissions)}


@router.post("/edit-requests", status_code=status.HTTP_201_CREATED)
async def create_edit_request(
    payload: EditRequestCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a pending submission edit request (public)."""
    result = await db.execute(
        select(Submission).where(Submission.submission_id == payload.submission_id.strip())
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission ID not found."
        )

    # Check for active pending request
    pending_check = await db.execute(
        select(EditRequest).where(
            EditRequest.submission_id == submission.id,
            EditRequest.status == EditRequestStatus.PENDING
        )
    )
    if pending_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pending edit request already exists for this submission."
        )

    edit_req = EditRequest(
        submission_id=submission.id,
        reason=payload.reason,
        status=EditRequestStatus.PENDING
    )
    db.add(edit_req)
    await db.commit()
    return {"message": "Edit request submitted successfully."}


@router.get("/edit-requests", response_model=List[EditRequestResponse])
async def get_edit_requests(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """List all edit requests for review by admin."""
    query = select(EditRequest).options(
        selectinload(EditRequest.submission).selectinload(Submission.form)
    )

    if status_filter:
        query = query.where(EditRequest.status == EditRequestStatus(status_filter))

    query = query.order_by(EditRequest.created_at.desc())
    result = await db.execute(query)
    reqs = result.scalars().all()

    response = []
    for r in reqs:
        resp = EditRequestResponse.model_validate(r)
        resp.form_name = r.submission.form.name if r.submission and r.submission.form else "Unknown"
        resp.human_submission_id = r.submission.submission_id if r.submission else "Unknown"
        response.append(resp)

    return response


@router.post("/edit-requests/{id}/approve", response_model=EditRequestResponse)
async def approve_edit_request(
    id: uuid.UUID,
    payload: EditRequestApprove,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Approve an edit request and generate a secure temporary link token."""
    result = await db.execute(
        select(EditRequest)
        .options(selectinload(EditRequest.submission).selectinload(Submission.form))
        .where(EditRequest.id == id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Edit request not found."
        )

    now = datetime.now(timezone.utc)
    token = str(uuid.uuid4())

    req.status = EditRequestStatus.APPROVED
    req.edit_token = token
    req.token_expires_at = now + timedelta(hours=24)
    req.token_used = False
    req.reviewed_at = now
    if payload.admin_note is not None:
        req.admin_note = payload.admin_note

    await db.commit()
    await db.refresh(req)

    resp = EditRequestResponse.model_validate(req)
    resp.form_name = req.submission.form.name if req.submission and req.submission.form else "Unknown"
    resp.human_submission_id = req.submission.submission_id if req.submission else "Unknown"
    return resp


@router.post("/edit-requests/{id}/reject", response_model=EditRequestResponse)
async def reject_edit_request(
    id: uuid.UUID,
    payload: EditRequestReject,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Reject an edit request."""
    result = await db.execute(
        select(EditRequest)
        .options(selectinload(EditRequest.submission).selectinload(Submission.form))
        .where(EditRequest.id == id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Edit request not found."
        )

    now = datetime.now(timezone.utc)
    req.status = EditRequestStatus.REJECTED
    req.reviewed_at = now
    if payload.admin_note is not None:
        req.admin_note = payload.admin_note

    await db.commit()
    await db.refresh(req)

    resp = EditRequestResponse.model_validate(req)
    resp.form_name = req.submission.form.name if req.submission and req.submission.form else "Unknown"
    resp.human_submission_id = req.submission.submission_id if req.submission else "Unknown"
    return resp


@router.get("/edit-by-token/{token}", response_model=EditRequestFormDetail)
async def get_submission_by_token(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve submission details by edit token (public)."""
    result = await db.execute(
        select(EditRequest)
        .options(
            selectinload(EditRequest.submission)
            .selectinload(Submission.form)
            .selectinload(Form.fields),
            selectinload(EditRequest.submission).selectinload(Submission.values),
            selectinload(EditRequest.submission).selectinload(Submission.file_uploads)
        )
        .where(EditRequest.edit_token == token)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid edit link token."
        )

    if req.status != EditRequestStatus.APPROVED or req.token_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This edit link has already been used or is not approved."
        )

    expires_at = req.token_expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at and datetime.now(timezone.utc) > expires_at:
        req.status = EditRequestStatus.EXPIRED
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This edit link has expired (24h limit)."
        )

    return EditRequestFormDetail(
        form=req.submission.form,
        submission_id=req.submission.id,
        values=req.submission.values,
        file_uploads=req.submission.file_uploads
    )


@router.patch("/edit-by-token/{token}")
async def apply_submission_edit_by_token(
    token: str,
    payload: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Apply updated submission values using a valid edit token (public)."""
    result = await db.execute(
        select(EditRequest)
        .options(
            selectinload(EditRequest.submission)
            .selectinload(Submission.form)
            .selectinload(Form.fields),
            selectinload(EditRequest.submission).selectinload(Submission.values)
        )
        .where(EditRequest.edit_token == token)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid edit link token."
        )

    if req.status != EditRequestStatus.APPROVED or req.token_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This edit link has already been used or is not approved."
        )

    expires_at = req.token_expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at and datetime.now(timezone.utc) > expires_at:
        req.status = EditRequestStatus.EXPIRED
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This edit link has expired."
        )

    submission = req.submission
    form = submission.form

    # 1. Duplicate check (exclude current submission)
    if form.unique_field_ids:
        fields_lookup = {f.id: f for f in form.fields}

        for unique_field_id_str in form.unique_field_ids:
            try:
                unique_field_id = uuid.UUID(unique_field_id_str)
            except ValueError:
                continue

            incoming_item = next((v for v in payload.values if v.field_id == unique_field_id), None)
            if not incoming_item or incoming_item.value is None:
                continue

            incoming_value = incoming_item.value

            dup_query = select(SubmissionValue).join(Submission).where(
                Submission.form_id == form.id,
                SubmissionValue.field_id == unique_field_id,
                Submission.id != submission.id
            )

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
                dup_query = dup_query.where(SubmissionValue.value_text == val_str)

            dup_result = await db.execute(dup_query)
            if dup_result.first():
                field_label = fields_lookup.get(unique_field_id).label if unique_field_id in fields_lookup else "Unique Field"
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Submission rejected: Duplicate value detected for field '{field_label}'."
                )

    # 2. Apply updates
    try:
        # Delete existing values
        existing_values = (await db.execute(
            select(SubmissionValue).where(SubmissionValue.submission_id == submission.id)
        )).scalars().all()
        for val in existing_values:
            await db.delete(val)

        # Delete existing file uploads
        existing_files = (await db.execute(
            select(FileUpload).where(FileUpload.submission_id == submission.id)
        )).scalars().all()
        for f in existing_files:
            await db.delete(f)

        # Add new values
        for item in payload.values:
            is_json = isinstance(item.value, (list, dict))
            db_val = SubmissionValue(
                submission_id=submission.id,
                field_id=item.field_id,
                value_text=None if is_json or item.value is None else str(item.value),
                value_json=item.value if is_json else None
            )
            db.add(db_val)

        # Add new file uploads
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

        # Reset status back to pending & set used
        submission.status = SubmissionStatus.PENDING
        submission.updated_at = datetime.now(timezone.utc)

        req.status = EditRequestStatus.USED
        req.token_used = True

        await db.commit()
        return {"message": "Submission updated successfully."}

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database update transaction error: {str(e)}"
        )

