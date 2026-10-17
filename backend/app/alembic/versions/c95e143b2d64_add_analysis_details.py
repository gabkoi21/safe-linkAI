"""Store URL reputation results and analysis provenance.

Revision ID: c95e143b2d64
Revises: b84d032a1c53
"""

import sqlalchemy as sa
from alembic import op

revision = "c95e143b2d64"
down_revision = "b84d032a1c53"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("analysis_report", sa.Column("analysis_details", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("analysis_report", "analysis_details")
