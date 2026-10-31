"""initial_schema

Revision ID: 0001_initial
Revises: 
Create Date: 2026-10-08 19:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.core.database import Base

# revision identifiers, used by Alembic.
revision: str = '0001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    # Safely ensure pgvector extension if available
    try:
        bind.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector;"))
    except Exception:
        pass
    # Create all tables registered with Base metadata
    Base.metadata.create_all(bind=bind, checkfirst=True)


def downgrade() -> None:
    pass
