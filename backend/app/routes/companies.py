import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Company
from app.schemas import CompanyCreate
from app.services.company_directory import DirectoryCompany, list_companies
from app.services.company_directory import get_company as get_directory_company

router = APIRouter(prefix="/companies", tags=["companies"])


def _serialize_scanned(company: Company) -> dict:
    return {
        "id": company.id,
        "legal_name": company.legal_name,
        "registration_number": company.registration_number,
        "jurisdiction": company.jurisdiction,
        "industry": company.industry,
        "monitoring_status": company.monitoring_status,
        "risk_level": company.risk_level,
        "onboarded_at": company.onboarded_at,
        "created_at": company.created_at,
        "updated_at": company.updated_at,
        "news_monitoring_enabled": company.news_monitoring_enabled,
        "news_monitoring_interval_minutes": company.news_monitoring_interval_minutes,
        "last_news_check_at": company.last_news_check_at.isoformat() if company.last_news_check_at else None,
        "is_active": company.is_active,
        "deactivated_at": company.deactivated_at,
        "deactivation_reason": company.deactivation_reason,
    }


def _serialize_directory(entity: DirectoryCompany) -> dict:
    """A dataset company that has never been scanned — no Postgres state yet.
    Never scanned means never deactivated either, so it's always active.
    """
    return {
        "id": entity.id,
        "legal_name": entity.name,
        "registration_number": None,
        "jurisdiction": entity.countries,
        # entity.source is the sanctions list name (e.g. "OFAC SDN (CUBA)"), not an
        # industry — the dataset has no industry field, so don't mislabel it as one.
        "industry": None,
        "monitoring_status": "not_monitored",
        "risk_level": "unknown",
        "onboarded_at": None,
        "created_at": None,
        "updated_at": None,
        "news_monitoring_enabled": True,
        "news_monitoring_interval_minutes": 1440,
        "last_news_check_at": None,
        "is_active": True,
        "deactivated_at": None,
        "deactivation_reason": None,
    }


@router.get(
    "",
    responses={
        400: {"description": "Invalid status or scope parameter"},
    }
)
def list_all_companies(
    q: str | None = None,
    status: str = "active",
    scope: str = "directory",
    db: Session = Depends(get_db),
) -> list[dict]:
    """`status` filters by deactivation state: "active" (default) / "inactive" / "all".

    `scope` controls whether the raw sanctions directory (hundreds of
    thousands of never-scanned entities) is included at all:
    - "directory" (default): scanned companies plus the rest of the directory —
      the browsing view an admin needs to onboard new companies.
    - "monitored": only companies actually under active monitoring (scanned
      and past onboarding) — the compliance officer's focused operational view.
    """
    if status not in ("active", "inactive", "all"):
        raise HTTPException(status_code=400, detail="status must be 'active', 'inactive', or 'all'")
    if scope not in ("directory", "monitored"):
        raise HTTPException(status_code=400, detail="scope must be 'directory' or 'monitored'")

    scanned_query = db.query(Company)
    if q and q.strip():
        scanned_query = scanned_query.filter(Company.legal_name.ilike(f"%{q.strip()}%"))
    if status == "active":
        scanned_query = scanned_query.filter(Company.is_active == True)  # noqa: E712
    elif status == "inactive":
        scanned_query = scanned_query.filter(Company.is_active == False)  # noqa: E712
    if scope == "monitored":
        scanned_query = scanned_query.filter(Company.monitoring_status != "not_monitored")
    scanned = {c.id: c for c in scanned_query.all()}

    result = [_serialize_scanned(c) for c in scanned.values()]

    if scope == "directory":
        # Scanned companies first (they carry live risk state), then the rest
        # of the directory, skipping duplicates. Directory-only entries are
        # always active, so they're excluded entirely when filtering to "inactive".
        directory = list_companies(query=q)
        if status != "inactive":
            result.extend(_serialize_directory(e) for e in directory if e.id not in scanned)

    return result


@router.get(
    "/{company_id}",
    responses={
        404: {"description": "Company not found"},
    }
)
def get_company(company_id: str, db: Session = Depends(get_db)) -> dict:
    company = db.get(Company, company_id)
    if company is not None:
        return _serialize_scanned(company)

    entity = get_directory_company(company_id)
    if entity is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return _serialize_directory(entity)


@router.post(
    "",
    responses={
        400: {"description": "Invalid company data"},
    }
)
def create_custom_company(payload: CompanyCreate, db: Session = Depends(get_db)) -> dict:
    company_id = f"CUSTOM-{uuid.uuid4().hex[:8]}"
    company = Company(
        id=company_id,
        legal_name=payload.legal_name,
        jurisdiction=payload.jurisdiction,
        industry=payload.industry,
        monitoring_status="not_monitored",
        risk_level="unknown",
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return _serialize_scanned(company)


class UpdateCadenceRequest(BaseModel):
    # No news_monitoring_interval_minutes field: monitoring frequency is derived
    # automatically from risk level (see app/services/monitoring_cadence.py and
    # its call site in AgentOrchestrator), not something a person sets directly.
    # This endpoint only toggles whether automated monitoring runs at all.
    news_monitoring_enabled: bool | None = None


@router.patch(
    "/{company_id}/cadence",
    responses={
        404: {"description": "Company not found"},
    }
)
def update_company_cadence(company_id: str, payload: UpdateCadenceRequest, db: Session = Depends(get_db)) -> dict:
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if payload.news_monitoring_enabled is not None:
        company.news_monitoring_enabled = payload.news_monitoring_enabled

    db.commit()
    db.refresh(company)
    return _serialize_scanned(company)

