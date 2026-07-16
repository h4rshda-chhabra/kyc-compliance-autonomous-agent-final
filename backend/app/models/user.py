import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database.base import Base


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    COMPLIANCE_OFFICER = "COMPLIANCE_OFFICER"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e]),
        default=UserRole.COMPLIANCE_OFFICER,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
