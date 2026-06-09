import uuid
from datetime import datetime, timezone
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from google.cloud import firestore

from app.db.session import get_db
from app.core.deps import get_current_admin
from app.models.user import User
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
from app.utils.converters import dict_to_form, dict_to_submission, submission_to_dict

router = APIRouter()
logger = logging.getLogger(__name__)

# NOTE: Static/specific routes MUST come before dynamic routes.
# /bulk-archive, /form/{form_id} come before /{form_id} to prevent mis-routing.


@router.post("/bulk-archive")
async def bulk_archive_submissions(
    payload: BulkArchiveRequest,
    db: firestore.AsyncClient = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Bulk archive submissions."""
    now = datetime.now(timezone.utc)
    archived_count = 0
    form_ids = set()

    for sub_id in payload.submission_ids:
        doc_ref = db.collection("submissions").document(str(sub_id))
        doc = await doc_ref.get()
        if doc.exists:
            data = doc.to_dict()
            form_ids.add(data.get("form_id"))
            await doc_ref.update({
                "status": "archived",
                "updated_at": now
            })
            archived_count += 1

    # Update analytics cache for affected forms
    from app.services.analytics import update_analytics_cache
    for f_id_str in form_ids:
        if f_id_str:
            try:
                f_uuid = uuid.UUID(f_id_str)
                await update_analytics_cache(f_uuid, db)
            except Exception as ae:
                logger.error(f"Failed to update analytics cache on bulk archive: {str(ae)}")

    return {"archived_count": archived_count}


@router.get("/form/{form_id}", response_model=PaginatedSubmissionsResponse)
async def get_form_submissions(
    form_id: uuid.UUID,
    page: int = 1,
    limit: int = 50,
    sort_by: str = "submitted_at",
    sort_order: str = "desc",
    search: Optional[str] = None,
    db: firestore.AsyncClient = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Retrieve form submissions with support for pagination, search, and sorting."""
    subs_docs = await db.collection("submissions").where("form_id", "==", str(form_id)).get()
    submissions = [
        dict_to_submission(doc.id, doc.to_dict())
        for doc in subs_docs
        if doc.to_dict().get("status") != "archived"
    ]

    if search:
        search_lower = search.lower()
        filtered_subs = []
        for sub in submissions:
            if search_lower in sub.submission_id.lower():
                filtered_subs.append(sub)
                continue
            match = False
            for val in sub.values:
                if val.value_text and search_lower in val.value_text.lower():
                    match = True
                    break
            if match:
                filtered_subs.append(sub)
        submissions = filtered_subs

    try:
        sort_field_uuid = uuid.UUID(sort_by)
        is_field_sort = True
    except ValueError:
        is_field_sort = False

    reverse_order = (sort_order.lower() == "desc")

    if is_field_sort:
        def get_field_sort_key(sub):
            val = next((v for v in sub.values if v.field_id == sort_field_uuid), None)
            if not val:
                return ""
            return val.value_text or ""
        submissions.sort(key=get_field_sort_key, reverse=reverse_order)
    else:
        def get_attr_sort_key(sub):
            val = getattr(sub, sort_by, sub.submitted_at)
            return val if val is not None else datetime.min.replace(tzinfo=timezone.utc)
        submissions.sort(key=get_attr_sort_key, reverse=reverse_order)

    total_count = len(submissions)
    offset = (page - 1) * limit
    paginated_submissions = submissions[offset:offset + limit]
    total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1

    return PaginatedSubmissionsResponse(
        submissions=paginated_submissions,
        total_count=total_count,
        page=page,
        limit=limit,
        total_pages=total_pages
    )


@router.post("/{form_id}", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    form_id: uuid.UUID,
    payload: SubmissionCreate,
    db: firestore.AsyncClient = Depends(get_db),
):
    """Submits form values: checks duplicate constraints, generates sequence ID,
    and inserts values in Firestore.
    """
    form_doc = await db.collection("forms").document(str(form_id)).get()
    if not form_doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Form not found."
        )
    form = dict_to_form(form_doc.id, form_doc.to_dict())

    if not form.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This form is currently closed for submissions."
        )

    # Duplicate Detection Engine
    if form.unique_field_ids:
        fields_lookup = {f.id: f for f in form.fields}

        subs_docs = await db.collection("submissions").where("form_id", "==", str(form_id)).get()
        existing_submissions = [
            dict_to_submission(doc.id, doc.to_dict())
            for doc in subs_docs
            if doc.to_dict().get("status") != "archived"
        ]

        for unique_field_id_str in form.unique_field_ids:
            try:
                unique_field_id = uuid.UUID(unique_field_id_str)
            except ValueError:
                continue

            incoming_item = next((v for v in payload.values if v.field_id == unique_field_id), None)
            if not incoming_item or incoming_item.value is None:
                continue

            incoming_value = incoming_item.value

            for sub in existing_submissions:
                sub_val = next((v for v in sub.values if v.field_id == unique_field_id), None)
                if not sub_val:
                    continue

                match = False
                if isinstance(incoming_value, list):
                    if not incoming_value:
                        continue
                    if sub_val.value_json == incoming_value:
                        match = True
                    elif sub_val.value_text in [str(v) for v in incoming_value]:
                        match = True
                else:
                    val_str = str(incoming_value).strip()
                    if not val_str:
                        continue
                    if sub_val.value_text == val_str:
                        match = True
                    elif isinstance(sub_val.value_json, list) and val_str in [str(x) for x in sub_val.value_json]:
                        match = True

                if match:
                    field_label = fields_lookup.get(unique_field_id).label if unique_field_id in fields_lookup else "Unique Field"
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Submission rejected: Duplicate value detected for field '{field_label}'."
                    )

    # Submission ID Generation (Collision-Safe Random Hex Based)
    now = datetime.now(timezone.utc)
    while True:
        random_hex = uuid.uuid4().hex[:8].upper()
        submission_id = f"DF-{random_hex}"
        exists_docs = await db.collection("submissions").where("submission_id", "==", submission_id).limit(1).get()
        if not exists_docs:
            break

    try:
        submission = Submission(
            form_id=form_id,
            submission_id=submission_id,
            status=SubmissionStatus.PENDING,
            submitted_at=now,
            updated_at=now
        )

        for item in payload.values:
            is_json = isinstance(item.value, (list, dict))
            db_val = SubmissionValue(
                submission_id=submission.id,
                field_id=item.field_id,
                value_text=None if is_json or item.value is None else str(item.value),
                value_json=item.value if is_json else None
            )
            submission.values.append(db_val)

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
            submission.file_uploads.append(db_upload)

        await db.collection("submissions").document(str(submission.id)).set(submission_to_dict(submission))

        # Increment form's submission_counter
        await db.collection("forms").document(str(form_id)).update({
            "submission_counter": firestore.Increment(1)
        })

        try:
            from app.services.analytics import update_analytics_cache
            await update_analytics_cache(form_id, db)
        except Exception as ae:
            logger.error(f"Failed to update analytics cache on submission: {str(ae)}")

        logger.info(f"Submission {submission_id} created successfully.")
        return submission

    except Exception as e:
        logger.error(f"Failed to create submission: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
