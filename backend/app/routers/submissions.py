import uuid
from datetime import datetime, timezone
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.form import Form
from app.models.submission import Submission, SubmissionStatus
from app.models.submission_value import SubmissionValue
from app.models.file_upload import FileUpload
from app.schemas.submission import SubmissionCreate, SubmissionResponse

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
