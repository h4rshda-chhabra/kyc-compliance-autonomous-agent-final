"""Compares a fresh audit against a company's last-known audit state to
describe *what changed and why*. This is the "diff" step in:

    execute_audit() -> AuditResult -> RiskChangeDetector -> MaterialChangeResult -> SARDecisionService

This service does NOT decide whether a SAR should be generated — that
decision belongs solely to SARDecisionService, which combines this result
with the sanctions/risk-score gate and whether a SAR already exists. This
service only computes the diff.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.models.company_audit_state import CompanyAuditState
from app.orchestrator.audit_result import AuditResult

_RISK_RANK = {"low": 0, "medium": 1, "high": 2}

# Net-new adverse media articles in a single run before it's considered material on its own.
ADVERSE_MEDIA_INCREASE_THRESHOLD = 2

# Minimum jump in entity-resolution confidence (0-100 scale) before it's considered
# material on its own, even when the risk bucket and sanction list haven't changed.
ENTITY_CONFIDENCE_INCREASE_THRESHOLD = 15.0


@dataclass
class MaterialChangeResult:
    material_change_detected: bool
    change_type: str  # NEW_SANCTION | NEW_DIRECTOR_SANCTION | RISK_ESCALATION | NEW_ADVERSE_MEDIA | ENTITY_CONFIDENCE_CHANGE | NO_CHANGE
    change_summary: str
    old_state: Dict[str, Any]
    new_state: Dict[str, Any]


class RiskChangeDetector:
    """Stateless comparison service: compare(previous_state, current) -> MaterialChangeResult."""

    def compare(
        self,
        previous_state: Optional[CompanyAuditState],
        current: AuditResult,
    ) -> MaterialChangeResult:
        is_first_scan = previous_state is None

        previous_risk_level = previous_state.last_risk_level if previous_state else "unknown"
        previous_sanction_ids = set(previous_state.last_sanction_ids) if previous_state else set()
        previous_sanction_count = previous_state.last_sanction_count if previous_state else 0
        previous_news_count = previous_state.last_news_count if previous_state else 0
        previous_entity_confidence = previous_state.last_entity_confidence if previous_state else 0.0

        current_sanction_ids = set(current.sanction_ids)

        old_state = {
            "risk_level": previous_risk_level,
            "sanction_count": previous_sanction_count,
            "sanction_ids": sorted(previous_sanction_ids),
            "news_count": previous_news_count,
            "entity_confidence": previous_entity_confidence,
        }
        new_state = {
            "risk_level": current.risk_level,
            "sanction_count": len(current_sanction_ids),
            "sanction_ids": sorted(current_sanction_ids),
            "news_count": current.news_count,
            "entity_confidence": current.entity_confidence,
        }

        reasons: List[Dict[str, str]] = []

        # 1. New sanctions hit (director-specific hits get their own, more specific type).
        newly_seen_ids = current_sanction_ids - previous_sanction_ids
        if newly_seen_ids:
            newly_seen_hits = [h for h in current.sanctions_alerts if str(h.get("id")) in newly_seen_ids]
            has_director_hit = any(h.get("subject_type") == "director" for h in newly_seen_hits)

            if has_director_hit:
                reasons.append({
                    "type": "NEW_DIRECTOR_SANCTION",
                    "summary": "An additional sanctioned director was identified.",
                })
            elif previous_sanction_count == 0:
                reasons.append({
                    "type": "NEW_SANCTION",
                    "summary": f"Previously clean company is now sanctioned ({len(newly_seen_ids)} hit(s)).",
                })
            else:
                reasons.append({
                    "type": "NEW_SANCTION",
                    "summary": (
                        f"New sanctions list match(es) detected beyond the "
                        f"previously known {previous_sanction_count}."
                    ),
                })

        # 2. Risk level escalation — only meaningful once we have a real prior reading,
        # so a clean first-ever scan doesn't spuriously count as an "escalation".
        if (
            previous_risk_level in _RISK_RANK
            and current.risk_level in _RISK_RANK
            and _RISK_RANK[current.risk_level] > _RISK_RANK[previous_risk_level]
        ):
            reasons.append({
                "type": "RISK_ESCALATION",
                "summary": f"Risk escalated from {previous_risk_level.upper()} to {current.risk_level.upper()}.",
            })

        # 3. Significant adverse media increase since the last audit.
        news_delta = current.news_count - previous_news_count
        if news_delta >= ADVERSE_MEDIA_INCREASE_THRESHOLD:
            reasons.append({
                "type": "NEW_ADVERSE_MEDIA",
                "summary": f"{news_delta} new adverse media article(s) significantly increased the company's risk profile.",
            })

        # 4. Significant increase in entity-resolution confidence, even without a
        # change in the risk bucket or sanction list (e.g. a fuzzy match firms up).
        confidence_delta = current.entity_confidence - previous_entity_confidence
        if confidence_delta >= ENTITY_CONFIDENCE_INCREASE_THRESHOLD:
            reasons.append({
                "type": "ENTITY_CONFIDENCE_CHANGE",
                "summary": (
                    f"Entity-match confidence increased by {confidence_delta:.1f} points "
                    f"(now {current.entity_confidence:.1f}%), materially affecting the investigation."
                ),
            })

        material_change_detected = bool(reasons)

        if is_first_scan:
            change_type = reasons[0]["type"] if reasons else "NO_CHANGE"
            change_summary = (
                "Initial onboarding scan. " + " ".join(r["summary"] for r in reasons)
                if reasons
                else f"Initial onboarding scan completed with risk level {current.risk_level.upper()}."
            )
        elif material_change_detected:
            change_type = reasons[0]["type"]
            change_summary = " ".join(r["summary"] for r in reasons)
        else:
            change_type = "NO_CHANGE"
            change_summary = "No material change detected since the last audit."

        return MaterialChangeResult(
            material_change_detected=material_change_detected,
            change_type=change_type,
            change_summary=change_summary,
            old_state=old_state,
            new_state=new_state,
        )
