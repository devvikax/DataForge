"""
Shared data-conversion utilities for Firestore documents <-> Python models.
This module is intentionally free of any router/service imports to avoid
circular dependency chains.
"""
import uuid
from datetime import datetime, timezone
from typing import List

from app.models.form import Form
from app.models.form_field import FormField, FieldType
from app.models.submission import Submission, SubmissionStatus
from app.models.submission_value import SubmissionValue
from app.models.file_upload import FileUpload


# ─── Datetime helpers ────────────────────────────────────────────────────────

def to_datetime(val) -> datetime:
    """Convert a Firestore Timestamp, datetime, or None to a timezone-aware datetime."""
    if val is None:
        return datetime.now(timezone.utc)
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    # Firestore DatetimeWithNanoseconds / Timestamp objects
    try:
        return val.astimezone(timezone.utc)
    except Exception:
        pass
    try:
        return datetime.utcfromtimestamp(val.timestamp()).replace(tzinfo=timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


# ─── Form converters ──────────────────────────────────────────────────────────

def dict_to_form(doc_id: str, data: dict) -> Form:
    fields_data = data.get("fields", [])
    fields = []
    for f in fields_data:
        f_id = f.get("id")
        form_id_val = f.get("form_id") or doc_id
        fields.append(FormField(
            id=uuid.UUID(f_id) if isinstance(f_id, str) else f_id,
            form_id=uuid.UUID(form_id_val) if isinstance(form_id_val, str) else form_id_val,
            field_type=FieldType(f.get("field_type")),
            label=f.get("label", ""),
            placeholder=f.get("placeholder"),
            description=f.get("description"),
            default_value=f.get("default_value"),
            is_required=f.get("is_required", False),
            order=f.get("order", 0),
            options=f.get("options"),
            conditions=f.get("conditions"),
            file_accepted_types=f.get("file_accepted_types"),
            file_max_size_mb=f.get("file_max_size_mb"),
            file_max_count=f.get("file_max_count"),
            created_at=to_datetime(f.get("created_at")),
            updated_at=to_datetime(f.get("updated_at"))
        ))

    fields.sort(key=lambda x: x.order)
    form_uuid = uuid.UUID(doc_id) if isinstance(doc_id, str) else doc_id

    return Form(
        id=form_uuid,
        name=data.get("name", ""),
        slug=data.get("slug", ""),
        description=data.get("description"),
        is_active=data.get("is_active", True),
        unique_field_ids=data.get("unique_field_ids", []),
        submission_counter=data.get("submission_counter", 0),
        fields=fields,
        created_at=to_datetime(data.get("created_at")),
        updated_at=to_datetime(data.get("updated_at"))
    )


def form_to_dict(form: Form) -> dict:
    fields_dict = []
    for f in form.fields:
        fields_dict.append({
            "id": str(f.id),
            "form_id": str(f.form_id),
            "field_type": f.field_type.value if hasattr(f.field_type, "value") else str(f.field_type),
            "label": f.label,
            "placeholder": f.placeholder,
            "description": f.description,
            "default_value": f.default_value,
            "is_required": f.is_required,
            "order": f.order,
            "options": f.options,
            "conditions": f.conditions,
            "file_accepted_types": f.file_accepted_types,
            "file_max_size_mb": f.file_max_size_mb,
            "file_max_count": f.file_max_count,
            "created_at": f.created_at,
            "updated_at": f.updated_at
        })
    return {
        "id": str(form.id),
        "name": form.name,
        "slug": form.slug,
        "description": form.description,
        "is_active": form.is_active,
        "unique_field_ids": form.unique_field_ids,
        "submission_counter": form.submission_counter,
        "fields": fields_dict,
        "created_at": form.created_at,
        "updated_at": form.updated_at
    }


# ─── Submission converters ────────────────────────────────────────────────────

def dict_to_submission(doc_id: str, data: dict) -> Submission:
    sub_id = uuid.UUID(doc_id) if isinstance(doc_id, str) else doc_id

    values_data = data.get("values", [])
    values = []
    for v in values_data:
        val_id = v.get("id")
        values.append(SubmissionValue(
            id=uuid.UUID(val_id) if isinstance(val_id, str) else val_id,
            submission_id=sub_id,
            field_id=uuid.UUID(v["field_id"]) if isinstance(v["field_id"], str) else v["field_id"],
            value_text=v.get("value_text"),
            value_json=v.get("value_json")
        ))

    uploads_data = data.get("file_uploads", [])
    file_uploads = []
    for u in uploads_data:
        upload_id = u.get("id")
        file_uploads.append(FileUpload(
            id=uuid.UUID(upload_id) if isinstance(upload_id, str) else upload_id,
            submission_id=sub_id,
            field_id=uuid.UUID(u["field_id"]) if isinstance(u["field_id"], str) else u["field_id"],
            cloudinary_public_id=u.get("cloudinary_public_id", ""),
            cloudinary_url=u.get("cloudinary_url", ""),
            cloudinary_secure_url=u.get("cloudinary_secure_url", ""),
            original_filename=u.get("original_filename", ""),
            file_type=u.get("file_type", ""),
            file_size_bytes=u.get("file_size_bytes", 0),
            uploaded_at=to_datetime(u.get("uploaded_at"))
        ))

    return Submission(
        id=sub_id,
        submission_id=data.get("submission_id", ""),
        form_id=uuid.UUID(data["form_id"]) if isinstance(data.get("form_id"), str) else data.get("form_id"),
        status=SubmissionStatus(data.get("status", "pending")),
        admin_notes=data.get("admin_notes"),
        submitter_ip=data.get("submitter_ip"),
        submitted_at=to_datetime(data.get("submitted_at")),
        updated_at=to_datetime(data.get("updated_at")),
        values=values,
        file_uploads=file_uploads
    )


def submission_to_dict(sub: Submission) -> dict:
    values_dict = []
    for v in sub.values:
        values_dict.append({
            "id": str(v.id),
            "submission_id": str(v.submission_id),
            "field_id": str(v.field_id),
            "value_text": v.value_text,
            "value_json": v.value_json
        })

    uploads_dict = []
    for u in sub.file_uploads:
        uploaded_at = u.uploaded_at
        if isinstance(uploaded_at, datetime) and uploaded_at.tzinfo is None:
            uploaded_at = uploaded_at.replace(tzinfo=timezone.utc)
        uploads_dict.append({
            "id": str(u.id),
            "submission_id": str(u.submission_id),
            "field_id": str(u.field_id),
            "cloudinary_public_id": u.cloudinary_public_id,
            "cloudinary_url": u.cloudinary_url,
            "cloudinary_secure_url": u.cloudinary_secure_url,
            "original_filename": u.original_filename,
            "file_type": u.file_type,
            "file_size_bytes": u.file_size_bytes,
            "uploaded_at": uploaded_at
        })

    submitted_at = sub.submitted_at
    if isinstance(submitted_at, datetime) and submitted_at.tzinfo is None:
        submitted_at = submitted_at.replace(tzinfo=timezone.utc)
    updated_at = sub.updated_at
    if isinstance(updated_at, datetime) and updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)

    return {
        "id": str(sub.id),
        "submission_id": sub.submission_id,
        "form_id": str(sub.form_id),
        "status": sub.status.value if hasattr(sub.status, "value") else str(sub.status),
        "admin_notes": sub.admin_notes,
        "submitter_ip": sub.submitter_ip,
        "submitted_at": submitted_at,
        "updated_at": updated_at,
        "values": values_dict,
        "file_uploads": uploads_dict
    }
