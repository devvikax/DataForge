"""make_submission_id_composite

Revision ID: 002_make_submission_id_composite
Revises: 001_initial
Create Date: 2026-06-07 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "002_make_submission_id_composite"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use batch_alter_table to support SQLite recreations automatically
    with op.batch_alter_table("submissions") as batch_op:
        # Drop the existing unique index on submission_id
        batch_op.drop_index("ix_submissions_submission_id")
        
        # Add composite unique constraint
        batch_op.create_unique_constraint("uq_submissions_form_submission", ["form_id", "submission_id"])
        
        # Recreate the submission_id index as non-unique
        batch_op.create_index("ix_submissions_submission_id", ["submission_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("submissions") as batch_op:
        batch_op.drop_index("ix_submissions_submission_id")
        batch_op.drop_constraint("uq_submissions_form_submission", type_="unique")
        batch_op.create_index("ix_submissions_submission_id", ["submission_id"], unique=True)
