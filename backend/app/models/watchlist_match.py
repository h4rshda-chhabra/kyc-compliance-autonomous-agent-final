import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database.base import Base


class WatchlistMatch(Base):
    __tablename__ = "watchlist_matches"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company_id: Mapped[str] = mapped_column(String(100), ForeignKey("companies.id"), index=True)
    monitoring_run_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("monitoring_runs.id"), nullable=True
    )

    watchlist_name: Mapped[str] = mapped_column(String(1000))
    matched_name: Mapped[str] = mapped_column(String(255))
    match_score: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(30), default="pending_review")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
