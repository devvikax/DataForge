import enum
import uuid
from datetime import datetime, timezone

class SubmissionStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ARCHIVED = "archived"

class Submission:
    """Plain Python Submission class for Firestore backing."""
    def __init__(
        self,
        id=None,
        submission_id="",
        form_id=None,
        status=SubmissionStatus.PENDING,
        admin_notes=None,
        submitter_ip=None,
        submitted_at=None,
        updated_at=None,
        values=None,
        file_uploads=None
    ):
        self.id = id if isinstance(id, uuid.UUID) else uuid.UUID(id) if id else uuid.uuid4()
        self.submission_id = submission_id
        self.form_id = form_id if isinstance(form_id, uuid.UUID) else uuid.UUID(form_id) if form_id else None
        self.status = status
        self.admin_notes = admin_notes
        self.submitter_ip = submitter_ip
        self.submitted_at = submitted_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or datetime.now(timezone.utc)
        self.values = values or []
        self.file_uploads = file_uploads or []
