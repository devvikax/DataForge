import uuid
from datetime import datetime, timezone

class Form:
    """Plain Python Form class for Firestore backing."""
    def __init__(
        self,
        id=None,
        name="",
        slug="",
        description=None,
        is_active=True,
        unique_field_ids=None,
        submission_counter=0,
        fields=None,
        submissions=None,
        created_at=None,
        updated_at=None
    ):
        self.id = id if isinstance(id, uuid.UUID) else uuid.UUID(id) if id else uuid.uuid4()
        self.name = name
        self.slug = slug
        self.description = description
        self.is_active = is_active
        self.unique_field_ids = unique_field_ids or []
        self.submission_counter = submission_counter
        self.fields = fields or []
        self.submissions = submissions or []
        self.created_at = created_at or datetime.now(timezone.utc)
        self.updated_at = updated_at or datetime.now(timezone.utc)
