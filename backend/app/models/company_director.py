import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database.base import Base


class CompanyDirector(Base):
    __tablename__ = "company_directors"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company_id: Mapped[str] = mapped_column(String(100), ForeignKey("companies.id"), index=True)

    full_name: Mapped[str] = mapped_column(String(255))
    role_title: Mapped[str | None] = mapped_column(String(150), nullable=True)
    nationality: Mapped[str | None] = mapped_column(String(100), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_pep: Mapped[bool] = mapped_column(default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
