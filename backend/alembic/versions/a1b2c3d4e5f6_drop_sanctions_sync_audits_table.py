"""drop sanctions_sync_audits table

Revision ID: a1b2c3d4e5f6
Revises: 9282248680e4
Create Date: 2026-07-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '9282248680e4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table('sanctions_sync_audits')


def downgrade() -> None:
    op.create_table(
        'sanctions_sync_audits',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('sync_timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('provider', sa.String(length=100), nullable=False),
        sa.Column('dataset_version', sa.String(length=100), nullable=False),
        sa.Column('records_added', sa.Integer(), nullable=False),
        sa.Column('records_updated', sa.Integer(), nullable=False),
        sa.Column('records_removed', sa.Integer(), nullable=False),
        sa.Column('total_records', sa.Integer(), nullable=False),
        sa.Column('sync_duration_seconds', sa.Float(), nullable=False),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
