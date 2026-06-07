import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SAEnum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class EditRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    USED = "used"       # Token was used successfully
    EXPIRED = "expired"


class EditRequest(Base):
    __tablename__ = "edit_requests"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[EditRequestStatus] = mapped_column(
        SAEnum(EditRequestStatus), default=EditRequestStatus.PENDING, nullable=False, index=True
    )
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Secure edit token (UUID, generated on approval)
    edit_token: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    token_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    submission: Mapped["Submission"] = relationship("Submission", back_populates="edit_requests")
