"""APScheduler wiring for the continuous monitoring sweep.

Runs a recurring job that re-audits every already-onboarded company on a
fixed interval, so risk profiles stay current without a human clicking
"scan" — this is what makes monitoring "continuous" rather than on-demand.
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.config import get_settings
from app.core.logging import get_logger
from app.database import SessionLocal
from app.models.company import Company

logger = get_logger("app.scheduler")

scheduler = BackgroundScheduler()

SWEEP_JOB_ID = "continuous_monitoring_sweep"


def run_monitoring_sweep(company_ids: list[str] | None = None, trigger_type: str = "scheduled") -> None:
    """Re-runs the audit for every company (or a targeted subset) that has completed at least one scan.

    When running the standard periodic scheduler sweep (company_ids is None), this filters
    companies to only run re-audits for those that are due for news monitoring based on their
    configured monitoring policy (news_monitoring_enabled and news_monitoring_interval_minutes).

    `trigger_type` is recorded on each resulting MonitoringRun — callers driving a targeted
    sweep for a specific reason (e.g. a watchlist update) should pass their own label instead
    of the default "scheduled", so the monitoring history reflects why the run happened.

    Deactivated companies (Company.is_active is False) are always excluded, whether
    targeted or scheduled — a company an admin has deactivated stops being audited
    entirely until reactivated, regardless of how the sweep was triggered.
    """
    from datetime import datetime, timedelta, UTC
    from app.orchestrator.pipeline import run_company_audit

    db = SessionLocal()
    try:
        # is_active excludes deactivated (soft-deleted) companies from every sweep
        # path below — scheduled, news-cadence, and targeted/watchlist re-screening
        # all funnel through this one query, so this is the single enforcement point.
        query = db.query(Company).filter(
            Company.monitoring_status != "onboarding",
            Company.is_active == True,  # noqa: E712 - SQLAlchemy requires `== True`, not `is True`
        )
        if company_ids is not None:
            query = query.filter(Company.id.in_(company_ids))
        
        companies = query.all()
        
        # Apply scheduling filter if it is the routine scheduled background sweep
        if company_ids is None:
            now = datetime.now(UTC)
            due_companies = []
            for company in companies:
                if not company.news_monitoring_enabled:
                    continue
                if company.last_news_check_at is None:
                    due_companies.append(company)
                else:
                    # Make sure comparison is timezone-aware
                    last_check = company.last_news_check_at
                    if last_check.tzinfo is None:
                        last_check = last_check.replace(tzinfo=UTC)
                    
                    elapsed = now - last_check
                    if elapsed >= timedelta(minutes=company.news_monitoring_interval_minutes):
                        due_companies.append(company)
            companies = due_companies

        logger.info(
            "Continuous monitoring sweep starting for %d company(ies) (Targeted=%s).",
            len(companies),
            company_ids is not None,
        )

        for company in companies:
            try:
                run_company_audit(company_id=company.id, db=db, trigger_type=trigger_type)
            except Exception:
                logger.exception("Scheduled audit failed for company %s", company.id)
    finally:
        db.close()




def start_scheduler() -> None:
    settings = get_settings()
    if not settings.scheduler_enabled:
        logger.info("Scheduler disabled via settings; skipping start.")
        return

    if not scheduler.get_job(SWEEP_JOB_ID):
        scheduler.add_job(
            run_monitoring_sweep,
            trigger=IntervalTrigger(minutes=settings.monitoring_sweep_interval_minutes),
            id=SWEEP_JOB_ID,
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )

    if not scheduler.running:
        scheduler.start()
        logger.info(
            "Scheduler started. Continuous monitoring sweep runs every %d minute(s).",
            settings.monitoring_sweep_interval_minutes,
        )


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")
