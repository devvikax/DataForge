import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class AnalyticsCache(Base):
    """Pre-computed analytics cache per form. Rebuilt on-demand."""
    __tablename__ = "analytics_cache"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    form_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    total_submissions: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status_counts: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    daily_counts: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    field_stats: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
