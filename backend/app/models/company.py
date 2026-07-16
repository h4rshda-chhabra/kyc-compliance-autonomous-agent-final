import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database.base import Base


class Company(Base):
    """A monitored company, materialized on first scan.

    `id` is the OpenSanctions/OFAC entity id (e.g. "NK-..." / "OFAC-36") from
    datasets/processed/sanctions_lookup.db — the companies directory is served
    straight from that dataset, and a row lands here only once the company is
    actually scanned/monitored.
    """

    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    legal_name: Mapped[str] = mapped_column(String(255), index=True)
    registration_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    jurisdiction: Mapped[str | None] = mapped_column(String(100), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(150), nullable=True)
    monitoring_status: Mapped[str] = mapped_column(String(50), default="onboarding")
    risk_level: Mapped[str] = mapped_column(String(20), default="unknown")

    onboarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Risk-based dynamic scheduling fields
    news_monitoring_enabled: Mapped[bool] = mapped_column(default=True)
    news_monitoring_interval_minutes: Mapped[int] = mapped_column(default=1440)  # Default: 24 hours (1440 mins)
    last_news_check_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Deactivation (soft delete) — orthogonal to monitoring_status/risk_level,
    # which reflect the AI pipeline's risk assessment and must keep moving
    # even for a company that a human has since deactivated. Company rows are
    # never deleted; is_active is the single source of truth for whether the
    # scheduler should still audit this company.
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    deactivated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deactivated_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    deactivation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

