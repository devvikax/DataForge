import uuid
from datetime import datetime, timezone

class FileUpload:
    """Plain Python FileUpload class for Firestore backing."""
    def __init__(
        self,
        id=None,
        submission_id=None,
        field_id=None,
        cloudinary_public_id="",
        cloudinary_url="",
        cloudinary_secure_url="",
        original_filename="",
        file_type="",
        file_size_bytes=0,
        uploaded_at=None
    ):
        self.id = id if isinstance(id, uuid.UUID) else uuid.UUID(id) if id else uuid.uuid4()
        self.submission_id = submission_id if isinstance(submission_id, uuid.UUID) else uuid.UUID(submission_id) if submission_id else None
        self.field_id = field_id if isinstance(field_id, uuid.UUID) else uuid.UUID(field_id) if field_id else None
        self.cloudinary_public_id = cloudinary_public_id
        self.cloudinary_url = cloudinary_url
        self.cloudinary_secure_url = cloudinary_secure_url
        self.original_filename = original_filename
        self.file_type = file_type
        self.file_size_bytes = file_size_bytes
        self.uploaded_at = uploaded_at or datetime.now(timezone.utc)
