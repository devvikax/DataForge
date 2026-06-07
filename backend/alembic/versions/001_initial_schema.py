"""initial_schema

Revision ID: 001_initial
Revises:
Create Date: 2026-06-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("username", sa.String(100), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    # --- forms ---
    op.create_table(
        "forms",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("unique_field_ids", postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("submission_counter", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_forms_slug", "forms", ["slug"], unique=True)

    # --- form_fields ---
    op.create_table(
        "form_fields",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "field_type",
            sa.Enum("text", "textarea", "number", "email", "phone", "date", "dropdown", "radio", "checkbox", "file", name="fieldtype"),
            nullable=False,
        ),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("placeholder", sa.String(255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("default_value", sa.Text(), nullable=True),
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("order", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("options", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("conditions", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("file_accepted_types", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("file_max_size_mb", sa.Integer(), nullable=True),
        sa.Column("file_max_count", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["form_id"], ["forms.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_form_fields_form_id", "form_fields", ["form_id"])

    # --- submissions ---
    op.create_table(
        "submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", sa.String(30), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "verified", "approved", "rejected", "completed", "cancelled", "archived", name="submissionstatus"),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("admin_notes", sa.Text(), nullable=True),
        sa.Column("submitter_ip", sa.String(45), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["form_id"], ["forms.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("submission_id"),
    )
    op.create_index("ix_submissions_form_id", "submissions", ["form_id"])
    op.create_index("ix_submissions_submission_id", "submissions", ["submission_id"], unique=True)
    op.create_index("ix_submissions_status", "submissions", ["status"])
    op.create_index("ix_submissions_submitted_at", "submissions", ["submitted_at"])

    # --- submission_values ---
    op.create_table(
        "submission_values",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("field_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("value_text", sa.Text(), nullable=True),
        sa.Column("value_json", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["field_id"], ["form_fields.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_submission_values_submission_field", "submission_values", ["submission_id", "field_id"])

    # --- edit_requests ---
    op.create_table(
        "edit_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "rejected", "used", "expired", name="editrequeststatus"),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("edit_token", sa.String(100), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("token_used", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("edit_token"),
    )
    op.create_index("ix_edit_requests_submission_id", "edit_requests", ["submission_id"])
    op.create_index("ix_edit_requests_status", "edit_requests", ["status"])
    op.create_index("ix_edit_requests_edit_token", "edit_requests", ["edit_token"], unique=True)

    # --- file_uploads ---
    op.create_table(
        "file_uploads",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("field_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("cloudinary_public_id", sa.String(255), nullable=False),
        sa.Column("cloudinary_url", sa.Text(), nullable=False),
        sa.Column("cloudinary_secure_url", sa.Text(), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("file_type", sa.String(100), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["field_id"], ["form_fields.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_file_uploads_submission_id", "file_uploads", ["submission_id"])

    # --- analytics_cache ---
    op.create_table(
        "analytics_cache",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("form_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("total_submissions", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("status_counts", postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("daily_counts", postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("field_stats", postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["form_id"], ["forms.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("form_id"),
    )
    op.create_index("ix_analytics_cache_form_id", "analytics_cache", ["form_id"], unique=True)


def downgrade() -> None:
    op.drop_table("analytics_cache")
    op.drop_table("file_uploads")
    op.drop_table("edit_requests")
    op.drop_table("submission_values")
    op.drop_table("submissions")
    op.drop_table("form_fields")
    op.drop_table("forms")
    op.drop_table("users")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS fieldtype")
    op.execute("DROP TYPE IF EXISTS submissionstatus")
    op.execute("DROP TYPE IF EXISTS editrequeststatus")
