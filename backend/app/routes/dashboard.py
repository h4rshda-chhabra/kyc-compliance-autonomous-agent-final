from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_dep
from app.database import get_db
from app.models import Company, MonitoringRun, SARReport, User
from app.models.user import UserRole

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _count(db: Session, *filters) -> int:
    return db.query(func.count(Company.id)).filter(*filters).scalar() or 0


@router.get("/summary")
def get_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_dep)) -> dict:
    """Each role sees the metrics relevant to their responsibilities, not a
    shared set — a compliance officer cares about their review workload, an
    admin cares about the company roster and deactivation queue.
    """
    if current_user.role == UserRole.ADMIN:
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return {
            "active_companies": _count(db, Company.is_active == True),  # noqa: E712
            "pending_deactivation_requests": (
                db.query(func.count(SARReport.id))
                .filter(SARReport.status == "pending_admin_review")
                .scalar()
                or 0
            ),
            "deactivated_companies": _count(db, Company.is_active == False),  # noqa: E712
            "companies_added_this_month": _count(db, Company.created_at >= month_start),
        }

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return {
        "companies_under_monitoring": _count(
            db,
            Company.is_active == True,  # noqa: E712
            Company.monitoring_status.notin_(["onboarding", "not_monitored"]),
        ),
        "pending_sar_reviews": (
            db.query(func.count(SARReport.id)).filter(SARReport.status == "draft").scalar() or 0
        ),
        "high_risk_companies": _count(
            db,
            Company.is_active == True,  # noqa: E712
            Company.risk_level.in_(["high", "critical"]),
        ),
        "manual_audits_today": (
            db.query(func.count(MonitoringRun.id))
            .filter(MonitoringRun.trigger_type == "manual", MonitoringRun.created_at >= today_start)
            .scalar()
            or 0
        ),
    }
