"""Seeds a cross-company director contamination scenario.

Additive and idempotent: re-running removes only the three companies this
script owns (matched by legal name) and recreates them. Existing demo data
(TechNova / Vostok / Theranos) and users are left untouched.

Scenario
--------
1. Crimson Star Logistics FZE (UAE)   - already assessed HIGH risk, escalated.
   Directors: Viktor Orlov, Dmitri Sokolov.
2. Helios Marine Services Ltd (Cyprus) - already assessed MEDIUM risk, in review.
   Directors: Priya Nair, Helena Brandt.
3. Nordwind Capital Partners (Singapore) - clean-looking, NOT yet audited.
   Directors: Viktor Orlov (shared with #1), Priya Nair (shared with #2),
   Deepa Krishnamoorthy (clean).

Auditing Nordwind should produce two cross_company_contamination alerts:
Viktor Orlov -> Crimson Star (HIGH link, +30 escalation) and
Priya Nair -> Helios Marine (MEDIUM link). Base 15 + 30 = 45, level MEDIUM.

All director names were checked against datasets/processed/sanctions_lookup.db
to confirm they do NOT fuzzy-match any watchlist entity (>= 85 token_sort_ratio),
so the contamination signal is not drowned out by a sanctions hit.

Run from the project root:  python scripts/seed_contamination_demo.py
"""

import os
import sys
import uuid
from datetime import date, datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

try:
    from app.database.session import SessionLocal
    from app.models.company import Company
    from app.models.company_audit_state import CompanyAuditState
    from app.models.company_director import CompanyDirector
    from app.models.evidence import Evidence
    from app.models.human_review import HumanReview
    from app.models.monitoring_run import MonitoringRun
    from app.models.news_article import NewsArticle
    from app.models.risk_report import RiskReport
    from app.models.sanction_match import SanctionMatch
    from app.models.sar_report import SARReport
    from app.models.timeline_event import TimelineEvent
    from app.models.watchlist_match import WatchlistMatch
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Run this from the project root with the backend environment active.")
    sys.exit(1)

SEED_COMPANIES = [
    {
        "legal_name": "Crimson Star Logistics FZE",
        "registration_number": "AE-FZ-118842",
        "jurisdiction": "United Arab Emirates",
        "industry": "Freight & Logistics",
        "risk_level": "high",
        "monitoring_status": "escalated",
        "risk_score": 92.0,
        "rationale": (
            "Severe risk identified during prior audit. Multiple critical adverse media "
            "findings tying the company to sanctions-evasion logistics networks; "
            "beneficial ownership could not be verified."
        ),
        "directors": [
            {"name": "Viktor Orlov", "nationality": "Russia", "dob": "1971-03-14"},
            {"name": "Dmitri Sokolov", "nationality": "Russia", "dob": "1968-11-02"},
        ],
        "prior_findings": [
            {
                "event_type": "adverse_media",
                "description": (
                    "Critical adverse media: 'Crimson Star Logistics named in dual-use "
                    "goods re-export investigation' - classified as Fraud (Critical)."
                ),
                "evidence_type": "adverse_media",
                "source_url": "https://example.com/news/crimson-star-investigation",
            },
        ],
    },
    {
        "legal_name": "Helios Marine Services Ltd",
        "registration_number": "CY-HE-402917",
        "jurisdiction": "Cyprus",
        "industry": "Maritime Services",
        "risk_level": "medium",
        "monitoring_status": "review",
        "risk_score": 55.0,
        "rationale": (
            "Medium risk flagged in prior audit due to adverse media coverage of an "
            "ongoing port-authority litigation and opaque vessel ownership structures."
        ),
        "directors": [
            {"name": "Priya Nair", "nationality": "India", "dob": "1979-06-25"},
            {"name": "Helena Brandt", "nationality": "Germany", "dob": "1983-09-30"},
        ],
        "prior_findings": [
            {
                "event_type": "adverse_media",
                "description": (
                    "Adverse media: 'Helios Marine faces litigation over falsified "
                    "port declarations' - classified as Litigation (Medium)."
                ),
                "evidence_type": "adverse_media",
                "source_url": "https://example.com/news/helios-marine-litigation",
            },
        ],
    },
    {
        # The clean-looking target company. Not audited yet; its next audit is
        # what demonstrates the cross-contamination check firing.
        "legal_name": "Nordwind Capital Partners",
        "registration_number": "SG-201944712K",
        "jurisdiction": "Singapore",
        "industry": "Investment Management",
        "risk_level": "unknown",
        "monitoring_status": "monitored",
        "risk_score": None,
        "rationale": None,
        "directors": [
            {"name": "Viktor Orlov", "nationality": "Russia", "dob": "1971-03-14"},
            {"name": "Priya Nair", "nationality": "India", "dob": "1979-06-25"},
            {"name": "Deepa Krishnamoorthy", "nationality": "Singapore", "dob": "1986-01-19"},
        ],
        "prior_findings": [],
    },
]

SEED_NAMES = [c["legal_name"] for c in SEED_COMPANIES]


def cleanup(db):
    """Removes only this script's companies (and their child rows)."""
    ids = [
        row.id
        for row in db.query(Company).filter(Company.legal_name.in_(SEED_NAMES)).all()
    ]
    if not ids:
        return
    print(f"Removing {len(ids)} previously seeded contamination-demo companies...")
    for model in (
        HumanReview,
        SARReport,
        RiskReport,
        SanctionMatch,
        NewsArticle,
        Evidence,
        TimelineEvent,
        WatchlistMatch,
        CompanyAuditState,
        MonitoringRun,
        CompanyDirector,
    ):
        db.query(model).filter(model.company_id.in_(ids)).delete(synchronize_session=False)
    db.query(Company).filter(Company.id.in_(ids)).delete(synchronize_session=False)
    db.commit()


def seed():
    db = SessionLocal()
    try:
        cleanup(db)

        for comp_data in SEED_COMPANIES:
            print(f"Seeding company: {comp_data['legal_name']} ({comp_data['risk_level']} risk)...")
            company = Company(
                id=str(uuid.uuid4()),
                legal_name=comp_data["legal_name"],
                registration_number=comp_data["registration_number"],
                jurisdiction=comp_data["jurisdiction"],
                industry=comp_data["industry"],
                monitoring_status=comp_data["monitoring_status"],
                risk_level=comp_data["risk_level"],
                onboarded_at=datetime.utcnow(),
            )
            db.add(company)
            db.commit()
            db.refresh(company)

            for d in comp_data["directors"]:
                db.add(CompanyDirector(
                    id=uuid.uuid4(),
                    company_id=company.id,
                    full_name=d["name"],
                    nationality=d["nationality"],
                    date_of_birth=date.fromisoformat(d["dob"]),
                ))
            db.commit()

            # Companies with a prior assessment get a completed run + report +
            # findings so their profile explains WHY they are already flagged.
            if comp_data["risk_score"] is not None:
                run = MonitoringRun(
                    id=uuid.uuid4(),
                    company_id=company.id,
                    trigger_type="manual",
                    status="completed",
                    summary=(
                        f"Initial risk audit completed. Risk level classified as "
                        f"{comp_data['risk_level'].upper()}."
                    ),
                    started_at=datetime.utcnow(),
                    completed_at=datetime.utcnow(),
                )
                db.add(run)
                db.commit()
                db.refresh(run)

                db.add(RiskReport(
                    id=uuid.uuid4(),
                    company_id=company.id,
                    monitoring_run_id=run.id,
                    risk_score=comp_data["risk_score"],
                    risk_level=comp_data["risk_level"],
                    rationale=comp_data["rationale"],
                ))

                # Lock the company's risk_level to match the report so later
                # re-audits don't recalculate it downward from missing evidence.
                company.risk_level = comp_data["risk_level"]

                for finding in comp_data["prior_findings"]:
                    db.add(TimelineEvent(
                        id=uuid.uuid4(),
                        company_id=company.id,
                        event_type=finding["event_type"],
                        description=finding["description"],
                        occurred_at=datetime.utcnow(),
                    ))
                    db.add(Evidence(
                        id=uuid.uuid4(),
                        company_id=company.id,
                        monitoring_run_id=run.id,
                        evidence_type=finding["evidence_type"],
                        source_url=finding["source_url"],
                        content=finding["description"],
                    ))
                db.commit()

        # Verify: replicate the orchestrator's contamination join for the
        # clean company so the seed proves the check will fire on next audit.
        target = db.query(Company).filter(Company.legal_name == "Nordwind Capital Partners").one()
        directors = db.query(CompanyDirector).filter(CompanyDirector.company_id == target.id).all()
        print("\nVerification - contamination links the next Nordwind audit will find:")
        hits = 0
        for director in directors:
            linked_rows = (
                db.query(CompanyDirector, Company)
                .join(Company, Company.id == CompanyDirector.company_id)
                .filter(
                    CompanyDirector.full_name == director.full_name,
                    CompanyDirector.company_id != target.id,
                    Company.risk_level.in_(["medium", "high"]),
                )
                .all()
            )
            for _, linked_company in linked_rows:
                hits += 1
                print(
                    f"  [CROSS-CONTAMINATION] '{director.full_name}' is also a director at "
                    f"'{linked_company.legal_name}' ({linked_company.risk_level.upper()} risk)"
                )
        if hits == 0:
            print("  WARNING: no contamination links found - seed did not work as intended.")
        else:
            print(f"\nSeed complete: {hits} contamination link(s) in place.")
            print("Trigger an audit on 'Nordwind Capital Partners' to see the alerts, "
                  "escalated risk score, and SAR contamination section.")

    except Exception as e:
        db.rollback()
        print(f"Error during contamination demo seed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
