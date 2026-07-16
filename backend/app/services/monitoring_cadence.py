"""Maps a company's risk level to how often it gets automatically re-audited.

Monitoring frequency is not a setting a person picks — it's derived entirely
from risk level, so a company's cadence updates automatically the moment its
risk reading changes. See AgentOrchestrator, which calls
`cadence_minutes_for_risk` right after computing a new risk_level.
"""

RISK_CADENCE_MINUTES: dict[str, int] = {
    "critical": 15,
    "high": 60,
    "medium": 360,
    "low": 1440,
}


def cadence_minutes_for_risk(risk_level: str) -> int | None:
    """Returns the auto-assigned interval in minutes, or None for a risk level
    with no defined cadence (e.g. "unknown", before a company's first audit) —
    callers should leave the existing interval untouched in that case.
    """
    return RISK_CADENCE_MINUTES.get(risk_level)
