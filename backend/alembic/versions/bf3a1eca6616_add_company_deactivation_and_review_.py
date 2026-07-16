"""add company deactivation and human review workflow fields

Revision ID: bf3a1eca6616
Revises: 1ec6282c85a1
Create Date: 2026-07-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'bf3a1eca6616'
down_revision = '1ec6282c85a1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('companies', sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column('companies', sa.Column('deactivated_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('companies', sa.Column('deactivated_by', sa.Uuid(), nullable=True))
    op.add_column('companies', sa.Column('deactivation_reason', sa.Text(), nullable=True))
    op.create_foreign_key(
        'fk_companies_deactivated_by_users',
        'companies', 'users',
        ['deactivated_by'], ['id'],
    )

    op.add_column('human_reviews', sa.Column('sar_report_id', sa.Uuid(), nullable=True))
    op.add_column('human_reviews', sa.Column('admin_id', sa.Uuid(), nullable=True))
    op.add_column('human_reviews', sa.Column('final_decision', sa.String(length=30), nullable=True))
    op.add_column('human_reviews', sa.Column('admin_notes', sa.Text(), nullable=True))
    op.add_column('human_reviews', sa.Column('admin_reviewed_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_human_reviews_sar_report_id'), 'human_reviews', ['sar_report_id'], unique=False)
    op.create_foreign_key(
        'fk_human_reviews_sar_report_id_sar_reports',
        'human_reviews', 'sar_reports',
        ['sar_report_id'], ['id'],
    )
    op.create_foreign_key(
        'fk_human_reviews_admin_id_users',
        'human_reviews', 'users',
        ['admin_id'], ['id'],
    )


def downgrade() -> None:
    op.drop_constraint('fk_human_reviews_admin_id_users', 'human_reviews', type_='foreignkey')
    op.drop_constraint('fk_human_reviews_sar_report_id_sar_reports', 'human_reviews', type_='foreignkey')
    op.drop_index(op.f('ix_human_reviews_sar_report_id'), table_name='human_reviews')
    op.drop_column('human_reviews', 'admin_reviewed_at')
    op.drop_column('human_reviews', 'admin_notes')
    op.drop_column('human_reviews', 'final_decision')
    op.drop_column('human_reviews', 'admin_id')
    op.drop_column('human_reviews', 'sar_report_id')

    op.drop_constraint('fk_companies_deactivated_by_users', 'companies', type_='foreignkey')
    op.drop_column('companies', 'deactivation_reason')
    op.drop_column('companies', 'deactivated_by')
    op.drop_column('companies', 'deactivated_at')
    op.drop_column('companies', 'is_active')
