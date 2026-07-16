from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database.base import Base


class CompanyAuditState(Base):
    """Baseline snapshot of a company's last-known audit findings.

    One row per company. RiskChangeDetector diffs the results of a fresh
    execute_audit() run against this row to decide whether a material change
    occurred; the row is then refreshed to become the baseline for the next run.
    """

    __tablename__ = "company_audit_states"

    company_id: Mapped[str] = mapped_column(String(100), ForeignKey("companies.id"), primary_key=True)

    last_risk_level: Mapped[str] = mapped_column(String(20), default="unknown")
    last_sanction_count: Mapped[int] = mapped_column(Integer, default=0)
    last_sanction_ids: Mapped[list] = mapped_column(JSON, default=list)
    last_news_count: Mapped[int] = mapped_column(Integer, default=0)
    last_news_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_entity_confidence: Mapped[float] = mapped_column(Float, default=0.0)

    last_audit_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_sar_generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_sar_risk: Mapped[str | None] = mapped_column(String(20), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
