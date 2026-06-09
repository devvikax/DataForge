import uuid
from datetime import datetime, timezone

class AnalyticsCache:
    """Plain Python AnalyticsCache class for Firestore backing."""
    def __init__(
        self,
        id=None,
        form_id=None,
        total_submissions=0,
        status_counts=None,
        daily_counts=None,
        field_stats=None,
        computed_at=None
    ):
        self.id = id if isinstance(id, uuid.UUID) else uuid.UUID(id) if id else uuid.uuid4()
        self.form_id = form_id if isinstance(form_id, uuid.UUID) else uuid.UUID(form_id) if form_id else None
        self.total_submissions = total_submissions
        self.status_counts = status_counts or {}
        self.daily_counts = daily_counts or []
        self.field_stats = field_stats or {}
        self.computed_at = computed_at or datetime.now(timezone.utc)
