import uuid
from datetime import datetime, timezone

class User:
    """Plain Python User class for Firestore backing."""
    def __init__(
        self,
        id=None,
        username="",
        hashed_password="",
        is_admin=True,
        is_active=True,
        created_at=None,
        updated_at=None
    ):
        self.id = id if isinstance(id, uuid.UUID) else uuid.UUID(id) if id else uuid.uuid4()
        self.username = username
        self.hashed_password = hashed_password
        self.is_admin = is_admin
        self.is_active = is_active
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or datetime.now(timezone.utc)
