import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class SubmissionStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    APPROVED = "approved"
    REJECTED = "rejected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ARCHIVED = "archived"


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    form_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Human-readable ID: DF-2026-000001
    submission_id: Mapped[str] = mapped_column(String(30), nullable=False, index=True)

    status: Mapped[SubmissionStatus] = mapped_column(
        SAEnum(SubmissionStatus), default=SubmissionStatus.PENDING, nullable=False, index=True
    )
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint("form_id", "submission_id", name="uq_submissions_form_submission"),
    )


    # Submitter metadata
    submitter_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)

    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    form: Mapped["Form"] = relationship("Form", back_populates="submissions")
    values: Mapped[list["SubmissionValue"]] = relationship(
        "SubmissionValue", back_populates="submission", cascade="all, delete-orphan"
    )
    edit_requests: Mapped[list["EditRequest"]] = relationship(
        "EditRequest", back_populates="submission", cascade="all, delete-orphan"
    )
    file_uploads: Mapped[list["FileUpload"]] = relationship(
        "FileUpload", back_populates="submission", cascade="all, delete-orphan"
    )
