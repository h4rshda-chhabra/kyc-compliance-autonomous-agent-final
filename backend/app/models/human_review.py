import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database.base import Base


class HumanReview(Base):
    """A permanent record of a SAR's two-stage human review lifecycle.

    One row per SAR review: the compliance-officer stage (reviewer_id,
    decision, notes, reviewed_at) is filled in when an officer recommends
    deactivation or rejects; the admin stage (admin_id, final_decision,
    admin_notes, admin_reviewed_at) is filled in later, only if the officer
    recommended deactivation, when an admin approves or rejects that
    recommendation. Rows are never deleted or overwritten across a new
    review cycle — this table is the audit trail for the approval workflow.

    sar_report_id is nullable because 5 rows predate this column (created by
    the old decision endpoint, which deleted the SAR afterward) and have no
    SAR left to reference; every row created going forward always sets it.
    """

    __tablename__ = "human_reviews"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company_id: Mapped[str] = mapped_column(String(100), ForeignKey("companies.id"), index=True)
    monitoring_run_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("monitoring_runs.id"), nullable=True
    )
    sar_report_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("sar_reports.id"), nullable=True, index=True
    )

    # Compliance officer stage
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    decision: Mapped[str | None] = mapped_column(String(30), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Admin stage — only populated when decision == "recommend_deactivation"
    admin_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    final_decision: Mapped[str | None] = mapped_column(String(30), nullable=True)
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
