import uuid
from datetime import datetime, UTC

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SARReport, Company, HumanReview, AuditLog, TimelineEvent, User
from app.core.deps import require_admin, require_compliance_officer
from app.schemas.review import ReviewActionRequest

router = APIRouter(prefix="/review", tags=["review"])


def _serialize_sar(sar: SARReport) -> dict:
    return {
        "id": str(sar.id),
        "company_id": sar.company_id,
        "monitoring_run_id": str(sar.monitoring_run_id) if sar.monitoring_run_id else None,
        "status": sar.status,
        "narrative": sar.narrative,
        "filed_at": sar.filed_at,
        "created_at": sar.created_at,
    }


def _serialize_review(review: HumanReview | None) -> dict | None:
    if review is None:
        return None
    return {
        "id": str(review.id),
        "reviewer_id": str(review.reviewer_id) if review.reviewer_id else None,
        "decision": review.decision,
        "notes": review.notes,
        "reviewed_at": review.reviewed_at,
        "admin_id": str(review.admin_id) if review.admin_id else None,
        "final_decision": review.final_decision,
        "admin_notes": review.admin_notes,
        "admin_reviewed_at": review.admin_reviewed_at,
    }


def _get_review_for_sar(db: Session, sar_id: uuid.UUID) -> HumanReview | None:
    return (
        db.query(HumanReview)
        .filter(HumanReview.sar_report_id == sar_id)
        .order_by(HumanReview.created_at.desc())
        .first()
    )


def _queue_item(sar: SARReport, legal_name: str, risk_level: str) -> dict:
    item = _serialize_sar(sar)
    item["company_name"] = legal_name
    item["company_risk_level"] = risk_level
    return item


@router.get("/sar")
def list_sar_reports(db: Session = Depends(get_db)) -> list[dict]:
    reports = db.query(SARReport).order_by(SARReport.created_at.desc()).all()
    return [_serialize_sar(r) for r in reports]


@router.get("/sar/{sar_id}")
def get_sar_report(sar_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    report = db.get(SARReport, sar_id)
    if report is None:
        raise HTTPException(status_code=404, detail="SAR report not found")
    payload = _serialize_sar(report)
    payload["review"] = _serialize_review(_get_review_for_sar(db, sar_id))
    return payload


# ─── Compliance officer: review queue + recommendation actions ──────────────
# Whenever a SAR is generated it starts in status "draft" — that is this
# queue. An officer either rejects it (SAR closes, company keeps being
# monitored as before) or recommends deactivation (SAR moves into the admin
# queue). Officers never deactivate a company directly.

@router.get("/queue/compliance")
def list_compliance_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_compliance_officer()),
) -> list[dict]:
    rows = (
        db.query(SARReport, Company.legal_name, Company.risk_level)
        .join(Company, SARReport.company_id == Company.id)
        .filter(SARReport.status == "draft")
        .order_by(SARReport.created_at.asc())
        .all()
    )
    return [_queue_item(sar, name, risk) for sar, name, risk in rows]


@router.post("/sar/{sar_id}/recommend-deactivation")
def recommend_deactivation(
    sar_id: uuid.UUID,
    payload: ReviewActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_compliance_officer()),
) -> dict:
    sar = db.get(SARReport, sar_id)
    if sar is None:
        raise HTTPException(status_code=404, detail="SAR report not found")
    if sar.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This SAR is not awaiting compliance officer review (status: {sar.status}).",
        )

    now = datetime.now(UTC)
    review = HumanReview(
        id=uuid.uuid4(),
        company_id=sar.company_id,
        monitoring_run_id=sar.monitoring_run_id,
        sar_report_id=sar.id,
        reviewer_id=current_user.id,
        decision="recommend_deactivation",
        notes=payload.remarks,
        reviewed_at=now,
    )
    db.add(review)

    sar.status = "pending_admin_review"

    db.add(TimelineEvent(
        id=uuid.uuid4(),
        company_id=sar.company_id,
        event_type="sar_recommendation",
        description=(
            f"Compliance officer {current_user.full_name} recommended deactivation for admin review."
            + (f" Remarks: {payload.remarks}" if payload.remarks else "")
        ),
        occurred_at=now,
    ))

    db.add(AuditLog(
        id=uuid.uuid4(),
        actor=current_user.email,
        action="recommend_deactivation",
        resource_type="sar_report",
        resource_id=str(sar.id),
        event_metadata={"company_id": sar.company_id, "remarks": payload.remarks},
    ))

    db.commit()
    result = _serialize_sar(sar)
    result["review"] = _serialize_review(review)
    return result


@router.post("/sar/{sar_id}/reject")
def reject_by_compliance_officer(
    sar_id: uuid.UUID,
    payload: ReviewActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_compliance_officer()),
) -> dict:
    sar = db.get(SARReport, sar_id)
    if sar is None:
        raise HTTPException(status_code=404, detail="SAR report not found")
    if sar.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This SAR is not awaiting compliance officer review (status: {sar.status}).",
        )

    now = datetime.now(UTC)
    review = HumanReview(
        id=uuid.uuid4(),
        company_id=sar.company_id,
        monitoring_run_id=sar.monitoring_run_id,
        sar_report_id=sar.id,
        reviewer_id=current_user.id,
        decision="reject",
        notes=payload.remarks,
        reviewed_at=now,
    )
    db.add(review)

    sar.status = "closed"

    db.add(TimelineEvent(
        id=uuid.uuid4(),
        company_id=sar.company_id,
        event_type="sar_recommendation",
        description=(
            f"Compliance officer {current_user.full_name} reviewed this SAR and found no basis "
            f"for deactivation; monitoring continues."
            + (f" Remarks: {payload.remarks}" if payload.remarks else "")
        ),
        occurred_at=now,
    ))

    db.add(AuditLog(
        id=uuid.uuid4(),
        actor=current_user.email,
        action="reject_recommendation",
        resource_type="sar_report",
        resource_id=str(sar.id),
        event_metadata={"company_id": sar.company_id, "remarks": payload.remarks},
    ))

    db.commit()
    result = _serialize_sar(sar)
    result["review"] = _serialize_review(review)
    return result


# ─── Admin: deactivation queue + final decision ──────────────────────────────
# Only SARs an officer has already recommended for deactivation land here.
# Admins never see the raw "draft" queue, and officers never see this one.

@router.get("/queue/admin")
def list_admin_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin()),
) -> list[dict]:
    rows = (
        db.query(SARReport, Company.legal_name, Company.risk_level)
        .join(Company, SARReport.company_id == Company.id)
        .filter(SARReport.status == "pending_admin_review")
        .order_by(SARReport.created_at.asc())
        .all()
    )
    results = []
    for sar, name, risk in rows:
        item = _queue_item(sar, name, risk)
        item["review"] = _serialize_review(_get_review_for_sar(db, sar.id))
        results.append(item)
    return results


@router.post("/sar/{sar_id}/approve-deactivation")
def approve_deactivation(
    sar_id: uuid.UUID,
    payload: ReviewActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin()),
) -> dict:
    sar = db.get(SARReport, sar_id)
    if sar is None:
        raise HTTPException(status_code=404, detail="SAR report not found")
    if sar.status != "pending_admin_review":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This SAR is not awaiting admin review (status: {sar.status}).",
        )

    review = _get_review_for_sar(db, sar.id)
    if review is None or review.decision != "recommend_deactivation":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No compliance officer recommendation found for this SAR.",
        )

    company = db.get(Company, sar.company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    now = datetime.now(UTC)
    review.admin_id = current_user.id
    review.final_decision = "approved_deactivation"
    review.admin_notes = payload.remarks
    review.admin_reviewed_at = now

    sar.status = "deactivation_approved"

    # Soft delete only — the row, and every historical SAR/evidence/timeline/
    # risk report tied to it, is retained permanently. is_active is what the
    # scheduler checks to stop auditing this company going forward.
    company.is_active = False
    company.deactivated_at = now
    company.deactivated_by = current_user.id
    company.deactivation_reason = payload.remarks or (
        f"Deactivated following an approved compliance recommendation on SAR {sar.id}."
    )

    db.add(TimelineEvent(
        id=uuid.uuid4(),
        company_id=company.id,
        event_type="company_deactivated",
        description=(
            f"Company deactivated by admin {current_user.full_name} following an approved "
            f"compliance recommendation." + (f" Remarks: {payload.remarks}" if payload.remarks else "")
        ),
        occurred_at=now,
    ))

    db.add(AuditLog(
        id=uuid.uuid4(),
        actor=current_user.email,
        action="approve_deactivation",
        resource_type="company",
        resource_id=company.id,
        event_metadata={"sar_id": str(sar.id), "review_id": str(review.id), "remarks": payload.remarks},
    ))

    db.commit()
    result = _serialize_sar(sar)
    result["review"] = _serialize_review(review)
    result["company_is_active"] = company.is_active
    return result


@router.post("/sar/{sar_id}/reject-recommendation")
def reject_by_admin(
    sar_id: uuid.UUID,
    payload: ReviewActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin()),
) -> dict:
    sar = db.get(SARReport, sar_id)
    if sar is None:
        raise HTTPException(status_code=404, detail="SAR report not found")
    if sar.status != "pending_admin_review":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This SAR is not awaiting admin review (status: {sar.status}).",
        )

    review = _get_review_for_sar(db, sar.id)
    if review is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No compliance officer recommendation found for this SAR.",
        )

    now = datetime.now(UTC)
    review.admin_id = current_user.id
    review.final_decision = "rejected"
    review.admin_notes = payload.remarks
    review.admin_reviewed_at = now

    sar.status = "closed"

    db.add(TimelineEvent(
        id=uuid.uuid4(),
        company_id=sar.company_id,
        event_type="admin_decision",
        description=(
            f"Admin {current_user.full_name} rejected the deactivation recommendation; "
            f"monitoring continues." + (f" Remarks: {payload.remarks}" if payload.remarks else "")
        ),
        occurred_at=now,
    ))

    db.add(AuditLog(
        id=uuid.uuid4(),
        actor=current_user.email,
        action="reject_recommendation",
        resource_type="sar_report",
        resource_id=str(sar.id),
        event_metadata={"company_id": sar.company_id, "review_id": str(review.id), "remarks": payload.remarks},
    ))

    db.commit()
    result = _serialize_sar(sar)
    result["review"] = _serialize_review(review)
    return result
