from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class AuditResult:
    """Structured output of a single AgentOrchestrator.execute_audit() run.

    Carries every fact needed to (a) decide whether the run represents a
    material risk change and (b) persist the findings — the orchestrator does
    not decide materiality or SAR generation itself; RiskChangeDetector does.
    """

    run_id: str
    company_id: str
    trigger_type: str

    risk_score: float
    risk_level: str
    rationale_summary: str

    sanctions_alerts: List[Dict[str, Any]] = field(default_factory=list)
    adverse_media_alerts: List[Dict[str, Any]] = field(default_factory=list)
    contamination_alerts: List[Dict[str, Any]] = field(default_factory=list)
    timeline_events_data: List[Dict[str, Any]] = field(default_factory=list)

    sanction_ids: List[str] = field(default_factory=list)
    news_count: int = 0
    news_hash: str = ""
    entity_confidence: float = 0.0
