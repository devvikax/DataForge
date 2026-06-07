import uuid
from sqlalchemy import Text, ForeignKey, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class SubmissionValue(Base):
    """EAV table storing individual field values per submission."""
    __tablename__ = "submission_values"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False
    )
    field_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("form_fields.id", ondelete="CASCADE"), nullable=False
    )

    # Plain text value for text/number/email/phone/date/radio/dropdown
    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # JSON value for checkbox (array) and file (array of URLs)
    value_json: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)

    # Relationships
    submission: Mapped["Submission"] = relationship("Submission", back_populates="values")

    __table_args__ = (
        Index("ix_submission_values_submission_field", "submission_id", "field_id"),
    )
