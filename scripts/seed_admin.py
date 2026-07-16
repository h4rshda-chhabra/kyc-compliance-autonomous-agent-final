"""Create (or promote) the platform ADMIN login.

ADMIN accounts are never self-registerable via /auth/register — they only
exist through seeding (this script / seed_demo_data.py) or manual promotion.
Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_FULL_NAME in .env,
falling back to the development defaults in app.config.settings.

Idempotent: if a user with ADMIN_EMAIL already exists, it is promoted to
ADMIN, reactivated, and its password reset to ADMIN_PASSWORD.

Usage (from the repo root, with the backend virtual environment activated):
    python scripts/seed_admin.py
"""

import os
import sys
import uuid

# Add the backend directory to sys.path so we can import from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

try:
    from app.config.settings import get_settings
    from app.core.security import get_password_hash
    from app.database.session import SessionLocal
    from app.models.user import User, UserRole
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Please make sure you are running this script with the virtual environment activated.")
    sys.exit(1)


def seed_admin():
    settings = get_settings()
    email = settings.admin_email.lower().strip()

    if len(settings.admin_password) < 8:
        print("Error: ADMIN_PASSWORD must be at least 8 characters.")
        sys.exit(1)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.role = UserRole.ADMIN
            user.hashed_password = get_password_hash(settings.admin_password)
            user.full_name = settings.admin_full_name
            user.is_active = True
            action = "promoted existing user to ADMIN"
        else:
            user = User(
                id=uuid.uuid4(),
                email=email,
                hashed_password=get_password_hash(settings.admin_password),
                full_name=settings.admin_full_name,
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(user)
            action = "created new ADMIN user"
        db.commit()
        print(f"Admin login ready ({action}): {email}")
    except Exception as e:
        db.rollback()
        print(f"Error seeding admin user: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
