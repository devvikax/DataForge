---
phase: 1
plan: 3
wave: 2
depends_on: [1.1, 1.2]
---

# Plan 1.3: Database Models & Alembic Migrations

## Objective
Define all 8 SQLAlchemy ORM models that represent DataForge's complete data schema, configure Alembic for async PostgreSQL, and generate + apply the initial migration. After this plan, the database has all tables created and `alembic upgrade head` runs successfully.

## Context
- .gsd/SPEC.md
- .gsd/phases/1/RESEARCH.md
- backend/app/db/base.py
- backend/app/db/session.py

## Tasks

<task type="auto">
  <name>Create all 8 SQLAlchemy models covering the full DataForge schema</name>
  <files>
    /backend/app/models/__init__.py
    /backend/app/models/user.py
    /backend/app/models/form.py
    /backend/app/models/form_field.py
    /backend/app/models/submission.py
    /backend/app/models/submission_value.py
    /backend/app/models/edit_request.py
    /backend/app/models/file_upload.py
    /backend/app/models/analytics_cache.py
  </files>
  <action>
    Create `backend/app/models/user.py`:
    ```python
    import uuid
    from datetime import datetime, timezone
    from sqlalchemy import String, Boolean, DateTime
    from sqlalchemy.orm import Mapped, mapped_column
    from app.db.base import Base


    class User(Base):
        __tablename__ = "users"

        id: Mapped[uuid.UUID] = mapped_column(
            primary_key=True, default=uuid.uuid4
        )
        username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
        hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
        is_admin: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
        is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
        created_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
        )
        updated_at: Mapped[datetime] = mapped_column(
            DateTime(timezone=True),
            default=lambda: datetime.now(timezone.utc),
            onupdate=lambda: datetime.now(timezone.utc),
        )
    ```

    Create `backend/app/models/form.py`:
    ```python
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
    ```

    Create `backend/app/models/form_field.py`:
    ```python
    import uuid
    from datetime import datetime, timezone
    from sqlalchemy import String, Boolean, Text, DateTime, Integer, JSON, ForeignKey, Enum as SAEnum
    from sqlalchemy.orm import Mapped, mapped_column, relationship
    from app.db.base import Base
    import enum


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
        form_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True)
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
        file_accepted_types: Mapped[list | None] = mapped_column(JSON, nullable=True)  # ["image/jpeg", "application/pdf"]
        file_max_size_mb: Mapped[int | None] = mapped_column(Integer, nullable=True)  # default 5
        file_max_count: Mapped[int | None] = mapped_column(Integer, nullable=True)  # default 1

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
    ```

    Create `backend/app/models/submission.py`:
    ```python
    import uuid
    from datetime import datetime, timezone
    from sqlalchemy import String, DateTime, ForeignKey, Text, Enum as SAEnum
    from sqlalchemy.orm import Mapped, mapped_column, relationship
    from app.db.base import Base
    import enum


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
        form_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True)

        # Human-readable ID: DF-2026-000001
        submission_id: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)

        status: Mapped[SubmissionStatus] = mapped_column(
            SAEnum(SubmissionStatus), default=SubmissionStatus.PENDING, nullable=False, index=True
        )
        admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

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
    ```

    Create `backend/app/models/submission_value.py`:
    ```python
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
    ```

    Create `backend/app/models/edit_request.py`:
    ```python
    import uuid
    from datetime import datetime, timezone
    from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SAEnum, Boolean
    from sqlalchemy.orm import Mapped, mapped_column, relationship
    from app.db.base import Base
    import enum


    class EditRequestStatus(str, enum.Enum):
        PENDING = "pending"
        APPROVED = "approved"
        REJECTED = "rejected"
        USED = "used"      # Token was used successfully
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
    ```

    Create `backend/app/models/file_upload.py`:
    ```python
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
    ```

    Create `backend/app/models/analytics_cache.py`:
    ```python
    import uuid
    from datetime import datetime, timezone
    from sqlalchemy import String, DateTime, ForeignKey, JSON, Integer
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
    ```

    Update `backend/app/models/__init__.py` to import all models (required for Alembic to discover them):
    ```python
    from app.models.user import User
    from app.models.form import Form
    from app.models.form_field import FormField, FieldType
    from app.models.submission import Submission, SubmissionStatus
    from app.models.submission_value import SubmissionValue
    from app.models.edit_request import EditRequest, EditRequestStatus
    from app.models.file_upload import FileUpload
    from app.models.analytics_cache import AnalyticsCache

    __all__ = [
        "User", "Form", "FormField", "FieldType",
        "Submission", "SubmissionStatus", "SubmissionValue",
        "EditRequest", "EditRequestStatus", "FileUpload", "AnalyticsCache",
    ]
    ```
  </action>
  <verify>
    PowerShell:
    ```powershell
    $models = @("user","form","form_field","submission","submission_value","edit_request","file_upload","analytics_cache")
    $allExist = $models | ForEach-Object { Test-Path "backend/app/models/$_.py" } | Where-Object { $_ -eq $false }
    $allExist.Count -eq 0
    ```
    Expected: True (no missing files)

    Also verify __init__.py imports all 8 models:
    ```powershell
    Select-String -Path "backend/app/models/__init__.py" -Pattern "AnalyticsCache" -Quiet
    ```
    Expected: True
  </verify>
  <done>
    - 8 model files exist covering: users, forms, form_fields, submissions, submission_values, edit_requests, file_uploads, analytics_cache
    - All models inherit from Base (DeclarativeBase)
    - submission_values uses EAV pattern with value_text + value_json
    - edit_requests has edit_token, token_expires_at, token_used fields for secure edit links
    - models/__init__.py imports all models so Alembic can discover them
    - All relationships defined with back_populates
  </done>
</task>

<task type="auto">
  <name>Configure Alembic for async PostgreSQL and generate initial migration</name>
  <files>
    /backend/alembic.ini
    /backend/alembic/env.py
    /backend/alembic/script.py.mako
    /backend/alembic/versions/  (directory)
  </files>
  <action>
    Run in the backend directory:
    ```bash
    # Inside the backend container or with venv activated:
    alembic init alembic
    ```

    Then REPLACE `backend/alembic/env.py` entirely with the async-compatible version:
    ```python
    import asyncio
    from logging.config import fileConfig

    from sqlalchemy import pool
    from sqlalchemy.engine import Connection
    from sqlalchemy.ext.asyncio import async_engine_from_config

    from alembic import context

    # Import all models so Alembic can detect them
    from app.db.base import Base
    import app.models  # noqa: F401 — triggers all model imports

    from app.core.config import settings

    config = context.config

    if config.config_file_name is not None:
        fileConfig(config.config_file_name)

    target_metadata = Base.metadata

    # Override sqlalchemy.url from environment
    config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("+asyncpg", "+psycopg2"))


    def run_migrations_offline() -> None:
        url = config.get_main_option("sqlalchemy.url")
        context.configure(
            url=url,
            target_metadata=target_metadata,
            literal_binds=True,
            dialect_opts={"paramstyle": "named"},
        )
        with context.begin_transaction():
            context.run_migrations()


    def do_run_migrations(connection: Connection) -> None:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


    async def run_async_migrations() -> None:
        # Use synchronous driver for Alembic (asyncpg not supported directly)
        configuration = config.get_section(config.config_ini_section, {})
        configuration["sqlalchemy.url"] = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
        connectable = async_engine_from_config(
            configuration,
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )
        async with connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)
        await connectable.dispose()


    def run_migrations_online() -> None:
        asyncio.run(run_async_migrations())


    if context.is_offline_mode():
        run_migrations_offline()
    else:
        run_migrations_online()
    ```

    Add `psycopg2-binary` to requirements.txt (needed by Alembic for synchronous connection during migrations):
    ```
    psycopg2-binary==2.9.10
    ```

    After setting up env.py, generate the initial migration:
    ```bash
    alembic revision --autogenerate -m "initial_schema"
    ```

    This will create a file in `backend/alembic/versions/` with all table CREATE statements.

    IMPORTANT: After generating, review the migration file to ensure all 8 tables are present:
    - users, forms, form_fields, submissions, submission_values, edit_requests, file_uploads, analytics_cache

    The `alembic.ini` file should have `script_location = alembic` and the sqlalchemy.url line can be left as a placeholder (env.py overrides it at runtime).
  </action>
  <verify>
    PowerShell:
    ```powershell
    Test-Path "backend/alembic.ini" -and
    Test-Path "backend/alembic/env.py" -and
    (Test-Path "backend/alembic/versions") -and
    (Select-String -Path "backend/alembic/env.py" -Pattern "run_async_migrations" -Quiet)
    ```
    Expected: True

    Check migration file exists:
    ```powershell
    (Get-ChildItem "backend/alembic/versions/*.py").Count -ge 1
    ```
    Expected: True
  </verify>
  <done>
    - alembic.ini exists at backend/
    - alembic/env.py is async-compatible using run_sync pattern
    - env.py imports all models via `import app.models`
    - Initial migration file exists in alembic/versions/
    - Migration file creates all 8 tables
    - psycopg2-binary added to requirements.txt for Alembic sync connection
  </done>
</task>

## Success Criteria
- [ ] All 8 SQLAlchemy model files exist with correct table names and column types
- [ ] SubmissionValue model uses EAV pattern (value_text + value_json)
- [ ] EditRequest model has edit_token, token_expires_at, token_used fields
- [ ] models/__init__.py imports all 8 models for Alembic discovery
- [ ] alembic/env.py uses async-compatible run_sync pattern
- [ ] Initial migration file exists and creates all 8 tables
- [ ] `alembic upgrade head` applies the migration without errors
