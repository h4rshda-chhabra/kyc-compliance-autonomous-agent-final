import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_dep, require_compliance_officer, require_admin
from app.database import get_db
from app.models import AuditLog, Company, MonitoringRun, User
from app.services.company_directory import get_company as get_directory_company
from app.orchestrator.pipeline import run_company_audit

router = APIRouter(prefix="/monitor", tags=["monitor"])


def _serialize(run: MonitoringRun, company_name: str | None = None) -> dict:
    return {
        "id": str(run.id),
        "company_id": run.company_id,
        "company_name": company_name,
        "trigger_type": run.trigger_type,
        "status": run.status,
        "summary": run.summary,
        "started_at": run.started_at,
        "completed_at": run.completed_at,
        "created_at": run.created_at,
    }


@router.get("/runs")
def list_monitoring_runs(company_id: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    query = (
        db.query(MonitoringRun, Company.legal_name)
        .outerjoin(Company, MonitoringRun.company_id == Company.id)
    )
    if company_id:
        query = query.filter(MonitoringRun.company_id == company_id)
    results = query.order_by(MonitoringRun.created_at.desc()).all()
    return [_serialize(run, company_name) for run, company_name in results]


@router.get("/runs/{run_id}")
def get_monitoring_run(run_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    run = db.get(MonitoringRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Monitoring run not found")

    company = db.get(Company, run.company_id)
    company_name = company.legal_name if company else None
    return _serialize(run, company_name)


@router.post("/companies/{company_id}/trigger")
def trigger_manual_run(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_compliance_officer()),
) -> dict:
    company = db.get(Company, company_id)
    if company is None:
        # First scan: materialize the company from the sanctions dataset directory.
        entity = get_directory_company(company_id)
        if entity is None:
            raise HTTPException(status_code=404, detail="Company not found")
        company = Company(
            id=entity.id,
            legal_name=entity.name,
            jurisdiction=entity.countries,
            # The sanctions dataset has no industry field — `entity.source` is the
            # sanctions list name (e.g. "OFAC SDN (CUBA)"), not an industry, so it
            # must not be mapped here. Leave unset; the SAR template falls back to "N/A".
            industry=None,
            monitoring_status="onboarding",
            risk_level="unknown",
            onboarded_at=datetime.now(UTC),
        )
        db.add(company)
        db.commit()
        db.refresh(company)

    # Every manual audit gets its own audit-trail entry naming who triggered it —
    # distinct from AgentOrchestrator's generic "run_monitoring" entry, which
    # fires for scheduled/watchlist runs too and has no human actor to record.
    db.add(AuditLog(
        id=uuid.uuid4(),
        actor=current_user.email,
        action="manual_audit_triggered",
        resource_type="company",
        resource_id=company.id,
        event_metadata={"triggered_by": current_user.full_name},
    ))
    db.commit()

    try:
        result = run_company_audit(company_id=company.id, db=db, trigger_type="manual")

        run = db.get(MonitoringRun, uuid.UUID(result["run_id"]))
        if run:
            serialized_run = _serialize(run, company.legal_name)
            serialized_run.update(result)
            return serialized_run

        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/companies/{company_id}/onboard")
def onboard_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin()),
) -> dict:
    """Admin-only: Onboard a company from the sanctions dataset without running a scan.

    This just materializes the company row and marks it as ready for monitoring.
    The first scan will run on the next scheduled sweep.
    """
    company = db.get(Company, company_id)

    if company is None:
        # First time: materialize from dataset
        entity = get_directory_company(company_id)
        if entity is None:
            raise HTTPException(status_code=404, detail="Company not found in dataset")
        company = Company(
            id=entity.id,
            legal_name=entity.name,
            jurisdiction=entity.countries,
            industry=None,
            monitoring_status="onboarding",
            risk_level="unknown",
            onboarded_at=datetime.now(UTC),
        )
        db.add(company)
        db.add(AuditLog(
            id=uuid.uuid4(),
            actor=current_user.email,
            action="company_onboarded",
            resource_type="company",
            resource_id=company.id,
            event_metadata={"onboarded_by": current_user.full_name},
        ))
        db.commit()
        db.refresh(company)
    else:
        # Company already exists—check if deactivated
        if not company.is_active:
            raise HTTPException(
                status_code=409,
                detail=f"This company has been deactivated. Reason: {company.deactivation_reason or 'No reason provided'}"
            )

        # Ensure it's in onboarding status
        if company.monitoring_status == "not_monitored":
            company.monitoring_status = "onboarding"
            company.onboarded_at = datetime.now(UTC)
            db.add(AuditLog(
                id=uuid.uuid4(),
                actor=current_user.email,
                action="company_onboarded",
                resource_type="company",
                resource_id=company.id,
                event_metadata={"onboarded_by": current_user.full_name},
            ))
            db.commit()
            db.refresh(company)
        # If already onboarded (any status != "not_monitored"), just return success

    return {
        "id": company.id,
        "legal_name": company.legal_name,
        "monitoring_status": company.monitoring_status,
        "risk_level": company.risk_level,
        "onboarded_at": company.onboarded_at,
    }


@router.post("/watchlist/simulate")
def simulate_watchlist_update(db: Session = Depends(get_db)) -> dict:
    """Simulate a watchlist update for demonstration purposes.

    Inserts predefined demo sanctions entries directly into sanctions_lookup.db,
    triggers the SanctionsImpactAnalyzer to find affected companies, and runs
    targeted re-screening for those companies.
    """
    try:
        from app.services.watchlist_service import simulate_watchlist_update as _simulate
        result = _simulate(db=db)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
