import hashlib
import logging
import os
import sqlite3
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.config import get_settings
from app.services.rss_news_service import RSSNewsService
from app.services.news_classifier import NewsClassifier
from app.services.risk_change_detector import MaterialChangeResult
from app.services.sar_decision_service import SARDecision
from app.services.monitoring_cadence import cadence_minutes_for_risk
from app.agents.entity_resolution_agent import EntityResolutionAgent
from app.orchestrator.audit_result import AuditResult

# ORM models
from app.models.company import Company
from app.models.company_audit_state import CompanyAuditState
from app.models.company_director import CompanyDirector
from app.models.monitoring_run import MonitoringRun
from app.models.sanction_match import SanctionMatch
from app.models.news_article import NewsArticle
from app.models.evidence import Evidence
from app.models.risk_report import RiskReport
from app.models.timeline_event import TimelineEvent
from app.models.sar_report import SARReport
from app.models.audit_log import AuditLog

logger = logging.getLogger("app.orchestrator")
settings = get_settings()


class AgentOrchestrator:
    """Orchestrates the continuous audit workflow.

    Collection, diffing, and the SAR decision are three separate stages so
    none of "did anything change" or "is this worth a SAR" lives here:

    1. execute_audit() — collects sanctions/adverse-media evidence, resolves
       entities, and calculates a risk reading. Returns an AuditResult. Does
       NOT decide materiality and does NOT write SAR/evidence rows.
    2. (external) RiskChangeDetector.compare() diffs the AuditResult against
       the company's prior audit state -> MaterialChangeResult.
    3. (external) SARDecisionService.decide() combines that with the
       sanctions/threshold gate and any existing SAR -> SARDecision.
    4. finalize(audit_result, material_change_result, sar_decision) — always
       persists evidence, timeline events, risk history, and the audit-state
       baseline; only (re)generates the SAR document when sar_decision says to.
    """

    def __init__(self, company_id: str, db: Session) -> None:
        self.company_id = company_id
        self.db = db
        self.rss_service = RSSNewsService()
        self.resolver = EntityResolutionAgent()
        # Resolve database path dynamically to be directory-agnostic (handles root or backend/ context)

        possible_paths = [
            "datasets/processed/sanctions_lookup.db",
            "../datasets/processed/sanctions_lookup.db",
            "../../datasets/processed/sanctions_lookup.db",
        ]
        self.sqlite_db = possible_paths[0]
        for p in possible_paths:
            if os.path.exists(p):
                self.sqlite_db = p
                break

        # Populated by execute_audit(); reused by finalize() so it doesn't need
        # to re-fetch/re-derive anything the first stage already computed.
        self._company: Optional[Company] = None
        self._directors: List[CompanyDirector] = []
        self._run: Optional[MonitoringRun] = None

    def _check_cross_company_contamination(
        self,
        company_id: str,
        directors: list,
    ) -> list:
        """Queries PostgreSQL for directors shared with other Medium/High-risk companies.

        For each director of the current company, this method looks for other companies
        in the database that:
          1. Share the exact same director full_name.
          2. Have an existing risk_level of 'medium' or 'high'.

        This surfaces a major KYC loophole: a director who was cleared for Company A
        may have already been flagged when screened under Company B.

        Returns a list of contamination alert dicts.
        """
        contamination_alerts = []
        if not directors:
            return contamination_alerts

        try:
            for director in directors:
                # Find other company_directors rows with the same full_name, belonging to a
                # different company that has already been risk-assessed as medium/high.
                linked_rows = (
                    self.db.query(CompanyDirector, Company)
                    .join(Company, Company.id == CompanyDirector.company_id)
                    .filter(
                        CompanyDirector.full_name == director.full_name,
                        CompanyDirector.company_id != company_id,
                        Company.risk_level.in_(["medium", "high"]),
                    )
                    .all()
                )

                for linked_dir, linked_company in linked_rows:
                    alert = {
                        "director_name": director.full_name,
                        "linked_company_id": linked_company.id,
                        "linked_company_name": linked_company.legal_name,
                        "linked_company_risk": linked_company.risk_level,
                        "linked_company_jurisdiction": linked_company.jurisdiction or "Unknown",
                    }
                    contamination_alerts.append(alert)
                    logger.warning(
                        "[CROSS-CONTAMINATION] Director '%s' is also a director at '%s' (%s risk).",
                        director.full_name,
                        linked_company.legal_name,
                        linked_company.risk_level.upper(),
                    )
        except Exception as e:
            logger.error("Cross-company contamination check failed: %s", str(e))

        return contamination_alerts

    def _get_sqlite_candidates(self, name: str) -> List[Dict[str, Any]]:
        """Queries the preprocessed SQLite database for raw matching targets."""
        if not os.path.exists(self.sqlite_db):
            logger.warning("Sanctions SQLite lookup DB not found at %s. Skipping SQLite check.", self.sqlite_db)
            return []

        candidates = []
        try:
            conn = sqlite3.connect(self.sqlite_db)
            cur = conn.cursor()

            # Query primary names and aliases
            query = """
                SELECT e.id, e.name, e.type, e.source, e.countries, e.dob, 'Primary Name' as match_type
                FROM entities e
                WHERE e.name LIKE ?

                UNION

                SELECT e.id, e.name, e.type, e.source, e.countries, e.dob, 'Alias' as match_type
                FROM entities e
                JOIN aliases a ON e.id = a.entity_id
                WHERE a.alias_name LIKE ?
            """
            search_param = f"%{name}%"
            cur.execute(query, (search_param, search_param))
            rows = cur.fetchall()
            conn.close()

            for row in rows:
                candidates.append({
                    "id": row[0],
                    "name": row[1],
                    "type": row[2],
                    "source": row[3],
                    "countries": row[4],
                    "dob": row[5],
                    "match_type": row[6]
                })
        except Exception as e:
            logger.error("Error querying SQLite database: %s", str(e))

        return candidates

    def _call_gemini_llm(self, prompt: str) -> Optional[str]:
        """Optionally generates content using the Gemini SDK if configured."""
        if not settings.gemini_api_key:
            return None

        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error("Failed to generate LLM response from Gemini SDK: %s", str(e))
            return None

    def execute_audit(self, trigger_type: str = "manual") -> AuditResult:
        """Collects fresh evidence and calculates a risk reading. No persistence
        of findings and no materiality/SAR decisions happen here.
        """
        logger.info(
            "Starting automated compliance audit for company ID: %s (trigger=%s)",
            self.company_id,
            trigger_type,
        )

        # 1. Fetch Company & Directors
        company = self.db.query(Company).filter(Company.id == self.company_id).first()
        if not company:
            raise ValueError(f"Company with ID {self.company_id} not found in database.")

        directors = self.db.query(CompanyDirector).filter(CompanyDirector.company_id == self.company_id).all()
        logger.info("Retrieved company '%s' with %d directors.", company.legal_name, len(directors))

        # 2. Create Monitoring Run (left "running" — finalize() closes it out)
        run = MonitoringRun(
            id=uuid.uuid4(),
            company_id=company.id,
            trigger_type=trigger_type,
            status="running",
            summary="Continuous KYC audit scan in progress...",
            started_at=datetime.utcnow()
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)

        sanctions_alerts: List[Dict[str, Any]] = []
        adverse_media_alerts: List[Dict[str, Any]] = []
        timeline_events_data: List[Dict[str, Any]] = []

        try:
            # 3. Step: Sanctions Screening & Entity Resolution (in-memory — persisted
            # only by finalize() if the result turns out to be a material change)
            company_raw_hits = self._get_sqlite_candidates(company.legal_name)
            resolved_company = self.resolver.resolve_directors(
                director_name=company.legal_name,
                candidates=company_raw_hits,
                nationality=company.jurisdiction,
                dob=None
            )
            for hit in resolved_company:
                hit["subject_type"] = "company"
                sanctions_alerts.append(hit)
                timeline_events_data.append({
                    "event_type": "sanction_match",
                    "description": f"Company {company.legal_name} matched watchlist: {hit['name']} ({hit['source']}).",
                    "evidence": {
                        "kind": "sanction",
                        "subject": company.legal_name,
                        "hit": hit,
                    },
                })

            for director in directors:
                raw_hits = self._get_sqlite_candidates(director.full_name)

                resolved = self.resolver.resolve_directors(
                    director_name=director.full_name,
                    candidates=raw_hits,
                    nationality=director.nationality,
                    dob=str(director.date_of_birth) if director.date_of_birth else None
                )

                for hit in resolved:
                    hit["subject_type"] = "director"
                    sanctions_alerts.append(hit)
                    timeline_events_data.append({
                        "event_type": "sanction_match",
                        "description": f"Director {director.full_name} matched watchlist: {hit['name']} ({hit['source']}).",
                        "evidence": {
                            "kind": "sanction",
                            "subject": director.full_name,
                            "hit": hit,
                        },
                    })

            # 4. Step: Adverse Media Screening
            queries = [company.legal_name] + [d.full_name for d in directors]
            for query in queries[:3]:  # Limit queries to prevent rate limits
                articles = self.rss_service.fetch_articles(query, limit=5)
                for art in articles:
                    category, severity = NewsClassifier.classify(art["title"], art["description"])

                    if severity in ["Medium", "High", "Critical"]:
                        adverse_media_alerts.append({
                            "title": art["title"],
                            "url": art["link"],
                            "source": art["source"],
                            "category": category,
                            "severity": severity
                        })
                        timeline_events_data.append({
                            "event_type": "adverse_media",
                            "description": f"Adverse media match: '{art['title'][:80]}...' ({category})",
                            "evidence": {
                                "kind": "adverse_media",
                                "article": art,
                                "category": category,
                                "severity": severity,
                            },
                        })

            # 5. Step: Cross-Director Risk Contamination Check
            # Queries PostgreSQL for directors shared with already-flagged companies.
            contamination_alerts = self._check_cross_company_contamination(
                company_id=str(company.id),
                directors=directors,
            )

            for alert in contamination_alerts:
                timeline_events_data.append({
                    "event_type": "cross_company_contamination",
                    "description": (
                        f"Director '{alert['director_name']}' is also listed at "
                        f"'{alert['linked_company_name']}' which has {alert['linked_company_risk'].upper()} risk."
                    ),
                    "evidence": {
                        "kind": "contamination",
                        "director": alert["director_name"],
                        "linked_company": alert["linked_company_name"],
                        "linked_risk": alert["linked_company_risk"],
                    }
                })

            # 6. Step: Risk Score Calculation Logic
            risk_score = 15.0
            risk_level = "low"

            if sanctions_alerts:
                risk_score = max(risk_score, 95.0)
                risk_level = "high"
            elif any(a["severity"] in ["High", "Critical"] for a in adverse_media_alerts):
                risk_score = max(risk_score, 65.0)
                risk_level = "medium"
            elif adverse_media_alerts:
                risk_score = max(risk_score, 40.0)
                risk_level = "medium"

            # Cross-director contamination escalation — applies on top of existing score
            if contamination_alerts:
                high_linked = any(a["linked_company_risk"] == "high" for a in contamination_alerts)
                escalation = 30.0 if high_linked else 25.0
                risk_score = min(100.0, risk_score + escalation)
                if risk_level == "low":
                    risk_level = "medium"

            contamination_names = ", ".join(
                f"'{a['director_name']}' → {a['linked_company_name']} ({a['linked_company_risk'].upper()})"
                for a in contamination_alerts
            )

            rationale_summary = "No adverse sanctions, PEPs, or media alerts resolved for this company."
            if risk_level == "high":
                rationale_summary = "Severe risk identified. Director matched sanctioned watchlist."
                if contamination_alerts:
                    rationale_summary += f" Additionally, shared directors found at previously flagged companies: {contamination_names}."
            elif risk_level == "medium":
                if contamination_alerts:
                    rationale_summary = f"Medium risk flagged. Shared directors detected at previously flagged entities: {contamination_names}."
                else:
                    rationale_summary = "Medium risk flagged due to multiple negative adverse media matches."

            # Current risk always reflects the latest scan, independent of whether
            # it's a material enough change to alert a human about.
            company.risk_level = risk_level
            company.monitoring_status = "escalated" if risk_level == "high" else ("review" if risk_level == "medium" else "monitored")

            # Monitoring frequency is derived from risk, not chosen manually —
            # every time risk_level moves, cadence moves with it automatically.
            new_cadence = cadence_minutes_for_risk(risk_level)
            if new_cadence is not None:
                company.news_monitoring_interval_minutes = new_cadence

            self.db.commit()

            sanction_ids = sorted({str(hit["id"]) for hit in sanctions_alerts if hit.get("id") is not None})
            news_fingerprint = "|".join(sorted(a["url"] for a in adverse_media_alerts))
            news_hash = hashlib.sha256(news_fingerprint.encode("utf-8")).hexdigest()
            entity_confidence = max((float(hit["resolution_score"]) for hit in sanctions_alerts), default=0.0)

            self._company = company
            self._directors = directors
            self._run = run

            logger.info("Audit evidence collection complete for %s.", company.legal_name)

            return AuditResult(
                run_id=str(run.id),
                company_id=str(company.id),
                trigger_type=trigger_type,
                risk_score=risk_score,
                risk_level=risk_level,
                rationale_summary=rationale_summary,
                sanctions_alerts=sanctions_alerts,
                adverse_media_alerts=adverse_media_alerts,
                contamination_alerts=contamination_alerts,
                timeline_events_data=timeline_events_data,
                sanction_ids=sanction_ids,
                news_count=len(adverse_media_alerts),
                news_hash=news_hash,
                entity_confidence=entity_confidence,
            )

        except Exception as e:
            self.db.rollback()
            logger.error("Failed to collect audit evidence: %s", str(e))
            try:
                run.status = "failed"
                run.summary = f"Execution failed: {str(e)}"
                run.completed_at = datetime.utcnow()
                self.db.commit()
            except Exception:
                pass
            raise e

    def _build_sar_narrative(self, audit_result: AuditResult, material_change_result: MaterialChangeResult) -> str:
        possible_template_paths = [
            "backend/app/templates/sar_template.md",
            "app/templates/sar_template.md",
            "../app/templates/sar_template.md"
        ]
        template_path = possible_template_paths[0]
        for tp in possible_template_paths:
            if os.path.exists(tp):
                template_path = tp
                break

        if not os.path.exists(template_path):
            return ""

        company = self._company
        directors = self._directors

        with open(template_path, "r", encoding="utf-8") as f:
            template_content = f.read()

        directors_str = "\n".join([f"* **Name**: {d.full_name} ({d.nationality})" for d in directors])
        timeline_str = "\n".join([f"* **{datetime.utcnow().strftime('%Y-%m-%d')}**: {e['description']}" for e in audit_result.timeline_events_data])

        # Format sanctions with proper list of watchlists
        sanctions_items = []
        for s in audit_result.sanctions_alerts:
            # Split sources by semicolon and format as nested list
            sources = [src.strip() for src in s['source'].split(';') if src.strip()]
            sources_list = "\n    ".join([f"- {src}" for src in sources])
            sanctions_items.append(f"* **{s['name']}** (Score: {s['resolution_score']}%)\n    {sources_list}")
        sanctions_str = "\n".join(sanctions_items) if sanctions_items else "* No sanctions found"

        media_str = "\n".join([f"* **{m['title']}** ({m['source']}): Classified as {m['category']} ({m['severity']})" for m in audit_result.adverse_media_alerts])

        # Build contamination findings section
        if audit_result.contamination_alerts:
            contamination_rows = []
            for alert in audit_result.contamination_alerts:
                contamination_rows.append(
                    f"* **Director**: {alert['director_name']} | "
                    f"**Also listed at**: {alert['linked_company_name']} "
                    f"(Jurisdiction: {alert['linked_company_jurisdiction']}, "
                    f"Risk Level: **{alert['linked_company_risk'].upper()}**)"
                )
            contamination_str = "\n".join(contamination_rows)
        else:
            contamination_str = "* No cross-company director contamination detected."

        sar_narrative = template_content\
            .replace("{{ company_name }}", company.legal_name)\
            .replace("{{ jurisdiction }}", company.jurisdiction or "Unknown")\
            .replace("{{ risk_score }}", str(audit_result.risk_score))\
            .replace("{{ risk_level }}", audit_result.risk_level.upper())\
            .replace("{{ trigger_reason }}", "Continuous Monitoring Sweep" if audit_result.trigger_type == "scheduled" else "Manual / Onboarding Refresh")\
            .replace("{{ filing_date }}", datetime.utcnow().strftime("%Y-%m-%d"))\
            .replace("{{ registration_number }}", company.registration_number or "N/A")\
            .replace("{{ industry }}", company.industry or "N/A")\
            .replace("{{ subject_directors_list }}", directors_str if directors_str else "* None Listed")\
            .replace(
                "{{ investigation_trigger_details }}",
                material_change_result.change_summary or f"Audit initiated for {company.legal_name} based on {audit_result.trigger_type} trigger.",
            )\
            .replace("{{ timeline_events_markdown }}", timeline_str if timeline_str else "* No events logged")\
            .replace("{{ sanctions_findings_details }}", sanctions_str if sanctions_str else "* No sanctions found")\
            .replace("{{ pep_findings_details }}", "* No Politically Exposed Persons (PEPs) found")\
            .replace("{{ contamination_findings_details }}", contamination_str)\
            .replace("{{ adverse_media_details }}", media_str if media_str else "* No negative news detected")\
            .replace("{{ risk_rationale }}", audit_result.rationale_summary)\
            .replace("{{ analyst_recommendation }}", "Reject Onboarding" if audit_result.risk_level == "high" else ("Escalate to Manual Review" if audit_result.risk_level == "medium" else "Approve Onboarding"))\
            .replace("{{ analyst_rationale }}", "Automatically generated analysis based on pre-processed watchlist matching.")\
            .replace("{{ confidence_score }}", f"{audit_result.entity_confidence:.0f}" if audit_result.sanctions_alerts else "75")\
            .replace("{{ narrative_summary_text }}", f"Company {company.legal_name} underwent automatic sanctions screening. " + ("Critical hits identified on sanctions list." if audit_result.sanctions_alerts else "No critical risk matches found."))

        llm_prompt = (
            "You are an expert compliance investigator at a major global financial institution. "
            "Your task is to take the following draft Suspicious Activity Report (SAR) template and write a highly professional, "
            "formal, and detailed regulatory report narrative inspired by FinCEN guidelines.\n\n"
            "INSTRUCTIONS:\n"
            "1. Expand the executive summary and subject information with formal banking terminology.\n"
            "2. Under 'Reason for Investigation', analyze the implications of the sanctions lists or media hits found. "
            "Explain why these matches present high compliance risk.\n"
            "3. Format the Timeline of Events and Sanctions/PEP findings as professional, readable tables or detailed bullet points.\n"
            "4. Under 'Narrative Summary', write a comprehensive, cohesive paragraphs detailing the investigation: who is involved, "
            "what lists they matched, what negative news was flagged, what is the risk of doing business with them, and what specific steps the compliance division must take.\n"
            "5. Maintain all critical data facts (scores, names, dates, list names) exactly as provided.\n"
            "6. Make sure the output is written in clean, beautifully structured Markdown.\n\n"
            f"Here is the draft input:\n\n{sar_narrative}"
        )
        improved_narrative = self._call_gemini_llm(llm_prompt)
        if improved_narrative:
            sar_narrative = improved_narrative

        return sar_narrative

    def finalize(
        self,
        audit_result: AuditResult,
        material_change_result: MaterialChangeResult,
        sar_decision: SARDecision,
    ) -> Dict[str, Any]:
        """Persists execute_audit()'s findings. Evidence, monitoring history, risk
        reports, and the audit-state baseline are always recorded — only the SAR
        document itself is gated, and solely by sar_decision (see SARDecisionService).
        """
        company = self._company
        run = self._run
        if company is None or run is None:
            raise RuntimeError("finalize() called before execute_audit()")

        try:
            # Evidence and monitoring history are recorded on every run, regardless
            # of the SAR decision — routine sweeps still keep the record current.
            for hit in audit_result.sanctions_alerts:
                san_match = SanctionMatch(
                    id=uuid.uuid4(),
                    company_id=company.id,
                    monitoring_run_id=run.id,
                    list_name=hit["source"],
                    matched_name=hit["name"],
                    match_score=float(hit["resolution_score"]),
                    status="pending_review"
                )
                self.db.add(san_match)
                self.db.add(Evidence(
                    id=uuid.uuid4(),
                    company_id=company.id,
                    monitoring_run_id=run.id,
                    evidence_type="sanction",
                    source_url=f"https://opensanctions.org/entities/{hit['id']}",
                    content=f"Watchlist match ({hit['resolution_score']}% confidence) on {hit['source']}. Subject: {hit['name']}, DOB: {hit['dob']}, Country: {hit['countries']}"
                ))

            for art in audit_result.adverse_media_alerts:
                self.db.add(NewsArticle(
                    id=uuid.uuid4(),
                    company_id=company.id,
                    monitoring_run_id=run.id,
                    title=art["title"],
                    url=art["url"],
                    source=art["source"],
                    sentiment="negative",
                    published_at=datetime.utcnow()
                ))
                self.db.add(Evidence(
                    id=uuid.uuid4(),
                    company_id=company.id,
                    monitoring_run_id=run.id,
                    evidence_type="adverse_media",
                    source_url=art["url"],
                    content=f"Adverse media coverage identified: '{art['title']}' — classified as {art['category']} ({art['severity']} severity)."
                ))

            for alert in audit_result.contamination_alerts:
                    alert_content = (
                        f"Shared directorship identified: '{alert['director_name']}' is also "
                        f"a director at '{alert['linked_company_name']}' "
                        f"(Jurisdiction: {alert['linked_company_jurisdiction']}), "
                        f"which carries an existing {alert['linked_company_risk'].upper()} risk rating. "
                        f"This represents a related-entity risk factor."
                    )
                    # Deduplicate: only insert if this exact alert isn't already stored
                    existing = (
                        self.db.query(Evidence)
                        .filter(
                            Evidence.company_id == company.id,
                            Evidence.evidence_type == "connected_entity",
                            Evidence.content == alert_content,
                        )
                        .first()
                    )
                    if not existing:
                        self.db.add(Evidence(
                            id=uuid.uuid4(),
                            company_id=company.id,
                            monitoring_run_id=run.id,
                            evidence_type="connected_entity",
                            source_url=f"/companies/{alert['linked_company_id']}",
                            content=alert_content,
                        ))

            for event_info in audit_result.timeline_events_data:
                self.db.add(TimelineEvent(
                    id=uuid.uuid4(),
                    company_id=company.id,
                    event_type=event_info["event_type"],
                    description=event_info["description"],
                    occurred_at=datetime.utcnow()
                ))
            if material_change_result.material_change_detected:
                # Summary event explaining *why* the risk reading changed — purely
                # descriptive, independent of whether a SAR gets (re)generated.
                self.db.add(TimelineEvent(
                    id=uuid.uuid4(),
                    company_id=company.id,
                    event_type=material_change_result.change_type,
                    description=material_change_result.change_summary,
                    occurred_at=datetime.utcnow()
                ))

            self.db.add(RiskReport(
                id=uuid.uuid4(),
                company_id=company.id,
                monitoring_run_id=run.id,
                risk_score=audit_result.risk_score,
                risk_level=audit_result.risk_level,
                rationale=audit_result.rationale_summary
            ))

            # SAR generation: the only part gated by SARDecisionService's rule
            # (manual runs always; otherwise sanction found AND risk_score >=
            # threshold AND material change). Not met -> the existing SAR (if
            # any) is returned completely unchanged, never overwritten.
            sar_payload: Dict[str, Any]
            if sar_decision.generate_new:
                # Archive rather than delete — preserves history instead of
                # accumulating duplicate active drafts for the same company.
                for stale_sar in sar_decision.stale_sars:
                    stale_sar.status = "archived"

                sar_narrative = self._build_sar_narrative(audit_result, material_change_result)
                new_sar = SARReport(
                    id=uuid.uuid4(),
                    company_id=company.id,
                    monitoring_run_id=run.id,
                    status="draft",
                    narrative=sar_narrative,
                    created_at=datetime.utcnow()
                )
                self.db.add(new_sar)

                # Placeholder for a real notification channel (email/Slack/webhook).
                self.db.add(AuditLog(
                    id=uuid.uuid4(),
                    actor="system",
                    action="notify_compliance",
                    resource_type="company",
                    resource_id=str(company.id),
                    event_metadata={
                        "sar_id": str(new_sar.id),
                        "risk_score": audit_result.risk_score,
                        "risk_level": audit_result.risk_level,
                    }
                ))

                run.summary = f"New SAR generated. Risk Level: {audit_result.risk_level.upper()} (Score: {audit_result.risk_score}/100)."
                sar_payload = {
                    "generated_new": True,
                    "id": str(new_sar.id),
                    "status": new_sar.status,
                    "created_at": new_sar.created_at.isoformat(),
                    "message": None,
                }
            elif sar_decision.existing_sar is not None:
                run.summary = f"No material change since the last SAR — existing SAR remains current. Risk Level: {audit_result.risk_level.upper()} (Score: {audit_result.risk_score}/100)."
                sar_payload = {
                    "generated_new": False,
                    "id": str(sar_decision.existing_sar.id),
                    "status": sar_decision.existing_sar.status,
                    "created_at": sar_decision.existing_sar.created_at.isoformat(),
                    "message": None,
                }
            else:
                run.summary = f"SAR threshold not met. Risk Level: {audit_result.risk_level.upper()} (Score: {audit_result.risk_score}/100)."
                sar_payload = {
                    "generated_new": False,
                    "id": None,
                    "status": None,
                    "created_at": None,
                    "message": sar_decision.message,
                }

            run.status = "completed"
            run.completed_at = datetime.utcnow()

            self.db.add(AuditLog(
                id=uuid.uuid4(),
                actor="system",
                action="run_monitoring",
                resource_type="monitoring_run",
                resource_id=str(run.id),
                event_metadata={
                    "company_name": company.legal_name,
                    "risk_level": audit_result.risk_level,
                    "material_change": material_change_result.material_change_detected,
                    "sar_generated": sar_decision.generate_new,
                }
            ))

            # Refresh the baseline for the next comparison — always, regardless of
            # the SAR decision, so scheduled sweeps keep the record current.
            state = self.db.get(CompanyAuditState, company.id)
            if state is None:
                state = CompanyAuditState(company_id=company.id)
                self.db.add(state)
            state.last_risk_level = audit_result.risk_level
            state.last_sanction_count = len(audit_result.sanction_ids)
            state.last_sanction_ids = audit_result.sanction_ids
            state.last_news_count = audit_result.news_count
            state.last_news_hash = audit_result.news_hash
            state.last_entity_confidence = audit_result.entity_confidence
            state.last_audit_at = datetime.utcnow()
            if sar_decision.generate_new:
                state.last_sar_generated_at = datetime.utcnow()
                state.last_sar_risk = audit_result.risk_level

            # Update news check timestamp on the company itself
            company.last_news_check_at = datetime.utcnow()

            self.db.commit()
            logger.info(
                "Audit finalized for %s (material_change=%s, sar_generated=%s).",
                company.legal_name,
                material_change_result.material_change_detected,
                sar_decision.generate_new,
            )

            return {
                "run_id": audit_result.run_id,
                "company_id": audit_result.company_id,
                "risk_score": audit_result.risk_score,
                "risk_level": audit_result.risk_level,
                "rationale": audit_result.rationale_summary,
                "sanctions_hits": len(audit_result.sanctions_alerts),
                "media_hits": len(audit_result.adverse_media_alerts),
                "material_change": material_change_result.material_change_detected,
                "change_type": material_change_result.change_type,
                "change_summary": material_change_result.change_summary,
                "sar": sar_payload,
            }

        except Exception as e:
            self.db.rollback()
            logger.error("Failed to finalize audit: %s", str(e))
            try:
                run.status = "failed"
                run.summary = f"Finalization failed: {str(e)}"
                run.completed_at = datetime.utcnow()
                self.db.commit()
            except Exception:
                pass
            raise e
