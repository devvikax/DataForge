import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Text, DateTime, Integer, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class FieldType(str, enum.Enum):
    TEXT = "text"
    TEXTAREA = "textarea"
    NUMBER = "number"
    EMAIL = "email"
    PHONE = "phone"
    DATE = "date"
    DROPDOWN = "dropdown"
    RADIO = "radio"
    CHECKBOX = "checkbox"
    FILE = "file"


class FormField(Base):
    __tablename__ = "form_fields"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    form_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    field_type: Mapped[FieldType] = mapped_column(SAEnum(FieldType), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    placeholder: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Options for dropdown/radio/checkbox: JSON array of strings
    options: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Conditional logic: {"show_if": [{"field_id": "uuid", "operator": "equals", "value": "Yes"}]}
    conditions: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # File upload constraints
    file_accepted_types: Mapped[list | None] = mapped_column(JSON, nullable=True)
    file_max_size_mb: Mapped[int | None] = mapped_column(Integer, nullable=True)
    file_max_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    form: Mapped["Form"] = relationship("Form", back_populates="fields")
