import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database.base import Base


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    company_id: Mapped[str] = mapped_column(String(100), ForeignKey("companies.id"), index=True)
    monitoring_run_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("monitoring_runs.id"), nullable=True
    )

    evidence_type: Mapped[str] = mapped_column(String(50))
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)

    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
