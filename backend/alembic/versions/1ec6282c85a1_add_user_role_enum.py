"""add user role enum

Revision ID: 1ec6282c85a1
Revises: a1b2c3d4e5f6
Create Date: 2026-07-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '1ec6282c85a1'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None

user_role_enum = postgresql.ENUM('ADMIN', 'COMPLIANCE_OFFICER', name='user_role')


def upgrade() -> None:
    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)

    # Backfill: existing rows predate the role enum and carry free-form
    # strings (e.g. "reviewer"). The one known admin account maps to ADMIN;
    # every other existing user maps to COMPLIANCE_OFFICER, the standard
    # day-to-day operational role, so nobody's access silently changes.
    op.execute("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@kyc.com'")
    op.execute("UPDATE users SET role = 'COMPLIANCE_OFFICER' WHERE email != 'admin@kyc.com'")

    op.alter_column(
        'users',
        'role',
        existing_type=sa.String(length=50),
        type_=user_role_enum,
        postgresql_using='role::user_role',
        server_default='COMPLIANCE_OFFICER',
        nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        'users',
        'role',
        existing_type=user_role_enum,
        type_=sa.String(length=50),
        postgresql_using='role::text',
        server_default='reviewer',
        nullable=False,
    )
    bind = op.get_bind()
    user_role_enum.drop(bind, checkfirst=True)
