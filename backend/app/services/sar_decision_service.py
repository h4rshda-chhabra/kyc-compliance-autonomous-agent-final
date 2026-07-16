"""Decides whether a fresh audit should produce a new SAR.

This is the ONLY place that decision is made:

    generate_new_sar =
        trigger_type == "manual"
        OR (
            sanction_found
            AND risk_score >= SAR_RISK_THRESHOLD
            AND (no_previous_sar_exists OR material_change_detected)
        )

A manually triggered audit ("scan now") always produces a fresh SAR — the
analyst explicitly asked for a report, so risk level and material change
don't gate it. Scheduled sweeps and watchlist-update runs keep the
sanctions/threshold/material-change rule so continuous monitoring doesn't
churn out duplicate reports.

The sanctions/threshold gate and "does a SAR already exist" are this
service's own concerns; whether anything material changed since the last
audit is NOT computed here — that comes in as a MaterialChangeResult from
RiskChangeDetector. This service never diffs evidence itself.

If the rule isn't met, no SAR is created or modified — the caller gets back
whatever SAR already exists for the company, unchanged (or a message if none
exists at all), so callers never have to special-case "no SAR available".
"""

from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.sar_report import SARReport
from app.orchestrator.audit_result import AuditResult
from app.services.risk_change_detector import MaterialChangeResult

NO_SAR_MESSAGE = "No SAR has been generated yet because no material compliance event has occurred."


@dataclass
class SARDecision:
    generate_new: bool
    existing_sar: SARReport | None  # most recent non-archived SAR, if any
    stale_sars: list[SARReport] = field(
        default_factory=list
    )  # ALL non-archived SARs to retire on regeneration
    message: str | None = None


class SARDecisionService:
    def decide(
        self,
        audit_result: AuditResult,
        material_change_result: MaterialChangeResult,
        db: Session,
    ) -> SARDecision:
        settings = get_settings()

        sanction_found = len(audit_result.sanction_ids) > 0
        threshold_met = audit_result.risk_score >= settings.sar_risk_threshold

        # Every currently-active (non-archived) SAR for this company. Normally at
        # most one, but fetch all so a regeneration can't leave older duplicates
        # (e.g. from before this policy existed) stranded outside the archive.
        active_sars = (
            db.query(SARReport)
            .filter(
                SARReport.company_id == audit_result.company_id,
                SARReport.status != "archived",
            )
            .order_by(SARReport.created_at.desc())
            .all()
        )
        existing_sar = active_sars[0] if active_sars else None
        no_previous_sar = existing_sar is None

        # Manual "scan now" runs always regenerate: the analyst asked for a
        # report, so neither risk level nor material change gates it.
        manual_run = audit_result.trigger_type == "manual"

        generate_new = manual_run or (
            sanction_found
            and threshold_met
            and (no_previous_sar or material_change_result.material_change_detected)
        )

        if generate_new or existing_sar is not None:
            return SARDecision(
                generate_new=generate_new,
                existing_sar=existing_sar,
                stale_sars=active_sars,
            )

        return SARDecision(generate_new=False, existing_sar=None, stale_sars=[], message=NO_SAR_MESSAGE)
