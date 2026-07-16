import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_user_dep
from app.database import get_db
from app.models import Company, Evidence, RiskReport, SARReport, TimelineEvent
from app.models.user import User
from app.services.sar_pdf_service import build_sar_pdf

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/sar/{sar_id}/pdf")
def download_sar_pdf(
    sar_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_dep),
) -> Response:
    """Download a SAR as a formatted PDF. Any authenticated user (officer or
    admin) may download — the narrative itself is already visible to both roles.
    """
    sar = db.get(SARReport, sar_id)
    if sar is None:
        raise HTTPException(status_code=404, detail="SAR report not found.")

    company = db.get(Company, sar.company_id)
    company_name = company.legal_name if company else sar.company_id

    pdf_bytes = build_sar_pdf(sar, company_name)
    filename = f"SAR-{str(sar.id)[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/companies/{company_id}/risk")
def get_risk_report(company_id: str, db: Session = Depends(get_db)) -> dict:
    report = (
        db.query(RiskReport)
        .filter(RiskReport.company_id == company_id)
        .order_by(RiskReport.created_at.desc())
        .first()
    )
    if report is None:
        return {
            "company_id": company_id,
            "risk_score": 0.0,
            "risk_level": "unknown",
            "rationale": None,
        }

    return {
        "id": str(report.id),
        "company_id": report.company_id,
        "monitoring_run_id": str(report.monitoring_run_id) if report.monitoring_run_id else None,
        "risk_score": report.risk_score,
        "risk_level": report.risk_level,
        "rationale": report.rationale,
        "created_at": report.created_at,
    }


@router.get("/companies/{company_id}/timeline")
def get_timeline(company_id: str, db: Session = Depends(get_db)) -> list[dict]:
    events = (
        db.query(TimelineEvent)
        .filter(TimelineEvent.company_id == company_id)
        .order_by(TimelineEvent.occurred_at.desc())
        .all()
    )
    return [
        {
            "id": str(e.id),
            "company_id": e.company_id,
            "event_type": e.event_type,
            "description": e.description,
            "occurred_at": e.occurred_at,
            "created_at": e.created_at,
        }
        for e in events
    ]


@router.get("/companies/{company_id}/evidence")
def get_evidence(company_id: str, db: Session = Depends(get_db)) -> list[dict]:
    items = (
        db.query(Evidence)
        .filter(Evidence.company_id == company_id)
        .order_by(Evidence.collected_at.desc())
        .all()
    )
    return [
        {
            "id": str(e.id),
            "company_id": e.company_id,
            "monitoring_run_id": str(e.monitoring_run_id) if e.monitoring_run_id else None,
            "evidence_type": e.evidence_type,
            "source_url": e.source_url,
            "content": e.content,
            "collected_at": e.collected_at,
        }
        for e in items
    ]
