import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class FileUpload(Base):
    __tablename__ = "file_uploads"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    field_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("form_fields.id", ondelete="CASCADE"), nullable=False
    )

    # Cloudinary metadata
    cloudinary_public_id: Mapped[str] = mapped_column(String(255), nullable=False)
    cloudinary_url: Mapped[str] = mapped_column(Text, nullable=False)
    cloudinary_secure_url: Mapped[str] = mapped_column(Text, nullable=False)

    # File metadata
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)  # MIME type
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    submission: Mapped["Submission"] = relationship("Submission", back_populates="file_uploads")
