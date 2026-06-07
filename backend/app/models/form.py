import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Text, DateTime, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Form(Base):
    __tablename__ = "forms"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Duplicate detection: JSON array of field_ids that must be unique
    # Example: ["field_uuid_1", "field_uuid_2"]
    unique_field_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    # Per-form submission counter for ID generation (DF-YYYY-NNNNNN)
    submission_counter: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    fields: Mapped[list["FormField"]] = relationship(
        "FormField", back_populates="form", cascade="all, delete-orphan",
        order_by="FormField.order"
    )
    submissions: Mapped[list["Submission"]] = relationship(
        "Submission", back_populates="form", cascade="all, delete-orphan"
    )
