import uuid
import enum
from datetime import datetime, timezone


class EditRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class EditRequest:
    """Plain Python EditRequest class for Firestore backing."""
    def __init__(
        self,
        id=None,
        submission_id=None,
        form_id=None,
        requested_by_ip=None,
        old_values=None,
        new_values=None,
        status=EditRequestStatus.PENDING,
        reviewed_at=None,
        created_at=None,
        updated_at=None,
    ):
        self.id = id if isinstance(id, uuid.UUID) else uuid.UUID(id) if id else uuid.uuid4()
        self.submission_id = submission_id
        self.form_id = form_id
        self.requested_by_ip = requested_by_ip
        self.old_values = old_values or {}
        self.new_values = new_values or {}
        self.status = EditRequestStatus(status) if isinstance(status, str) else status
        self.reviewed_at = reviewed_at
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or datetime.now(timezone.utc)
