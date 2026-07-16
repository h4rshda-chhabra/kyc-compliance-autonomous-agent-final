import json
import os
import sys
import sqlite3
import uuid
from datetime import datetime, date

# Add the backend directory to sys.path so we can import from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

try:
    from app.config.settings import get_settings
    from app.database.session import SessionLocal
    from app.models.company import Company
    from app.models.company_director import CompanyDirector
    from app.models.monitoring_run import MonitoringRun
    from app.models.sanction_match import SanctionMatch
    from app.models.risk_report import RiskReport
    from app.models.news_article import NewsArticle
    from app.models.user import User, UserRole
    from app.models.audit_log import AuditLog
    from app.models.evidence import Evidence
    from app.models.timeline_event import TimelineEvent
    from app.models.sar_report import SARReport
    from app.models.human_review import HumanReview
    from app.core.security import get_password_hash
    from rapidfuzz import fuzz
except ImportError as e:
    print(f"Error importing modules: {e}")
    print("Please make sure you are running this script with the virtual environment activated.")
    sys.exit(1)

DEMO_COMPANIES_PATH = "datasets/demo/demo_companies.json"
SQLITE_DB_PATH = "datasets/processed/sanctions_lookup.db"

def search_sanctions_sqlite(director_name: str) -> list:
    """Helper to query the local SQLite sanctions index for matches."""
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"Warning: SQLite sanctions lookup DB not found at {SQLITE_DB_PATH}. Skipping automated match check.")
        return []

    conn = sqlite3.connect(SQLITE_DB_PATH)
    cur = conn.cursor()
    
    # Query names or aliases
    query = """
        SELECT e.id, e.name, e.type, e.source, e.countries, e.dob
        FROM entities e
        WHERE e.name LIKE ?
        UNION
        SELECT e.id, e.name, e.type, e.source, e.countries, e.dob
        FROM entities e
        JOIN aliases a ON e.id = a.entity_id
        WHERE a.alias_name LIKE ?
    """
    
    search_param = f"%{director_name}%"
    cur.execute(query, (search_param, search_param))
    rows = cur.fetchall()
    conn.close()

    matches = []
    for row in rows:
        target_name = row[1]
        # Perform fuzzy string comparison
        score = fuzz.token_sort_ratio(director_name.lower(), target_name.lower())
        if score >= 85.0:
            matches.append({
                "id": row[0],
                "name": target_name,
                "type": row[2],
                "source": row[3],
                "countries": row[4],
                "dob": row[5],
                "score": score
            })
    return matches

def seed():
    print("Initializing Database Seed Process...")
    
    # Load demo data
    if not os.path.exists(DEMO_COMPANIES_PATH):
        print(f"Error: Demo companies file not found at {DEMO_COMPANIES_PATH}")
        sys.exit(1)
        
    with open(DEMO_COMPANIES_PATH, "r", encoding="utf-8") as f:
        demo_data = json.load(f)

    db = SessionLocal()
    try:
        # Clear existing demo data to allow clean re-runs
        print("Cleaning up old tables...")
        db.query(AuditLog).delete()
        db.query(HumanReview).delete()
        db.query(SARReport).delete()
        db.query(RiskReport).delete()
        db.query(SanctionMatch).delete()
        db.query(NewsArticle).delete()
        db.query(Evidence).delete()
        db.query(TimelineEvent).delete()
        db.query(MonitoringRun).delete()
        db.query(CompanyDirector).delete()
        db.query(Company).delete()
        db.query(User).delete()
        db.commit()

        # 1. Create a Default Reviewer User
        print("Creating demo reviewer...")
        demo_user = User(
            id=uuid.uuid4(),
            email="demo@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Demo Auditor Analyst",
            role=UserRole.COMPLIANCE_OFFICER,
            is_active=True
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

        # 1b. Create the Admin login (ADMIN is never self-registerable;
        # credentials come from ADMIN_EMAIL / ADMIN_PASSWORD in .env)
        settings = get_settings()
        print("Creating admin login...")
        admin_user = User(
            id=uuid.uuid4(),
            email=settings.admin_email.lower().strip(),
            hashed_password=get_password_hash(settings.admin_password),
            full_name=settings.admin_full_name,
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin_user)
        db.commit()

        # 2. Iterate and Seed Companies
        for comp_data in demo_data:
            comp_name = comp_data["company_name"]
            expected = comp_data["expected_result"]
            print(f"Seeding company: {comp_name}...")

            # Insert Company
            company = Company(
                id=str(uuid.uuid4()),
                legal_name=comp_name,
                registration_number=comp_data["registration_number"],
                jurisdiction=comp_data["jurisdiction"],
                industry=comp_data["industry"],
                monitoring_status="escalated" if expected["risk_level"] == "High" else ("review" if expected["risk_level"] == "Medium" else "monitored"),
                risk_level=expected["risk_level"].lower(),
                onboarded_at=datetime.utcnow()
            )
            db.add(company)
            db.commit()
            db.refresh(company)

            # Insert Directors
            directors = []
            for dir_data in comp_data["directors"]:
                dob_val = None
                if dir_data["date_of_birth"]:
                    try:
                        dob_val = date.fromisoformat(dir_data["date_of_birth"])
                    except ValueError:
                        pass
                
                director = CompanyDirector(
                    id=uuid.uuid4(),
                    company_id=company.id,
                    full_name=dir_data["name"],
                    nationality=dir_data["nationality"],
                    date_of_birth=dob_val,
                    is_pep=True if expected["risk_level"] == "High" and "Kim" in dir_data["name"] else False
                )
                db.add(director)
                directors.append(director)
            db.commit()

            # Create Monitoring Run
            run = MonitoringRun(
                id=uuid.uuid4(),
                company_id=company.id,
                trigger_type="manual",
                status="completed",
                summary=f"Onboarding and initial risk audit run completed. Risk level classified as {expected['risk_level']}.",
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow()
            )
            db.add(run)
            db.commit()
            db.refresh(run)

            # Check Sanctions Matches
            for director in directors:
                matches = search_sanctions_sqlite(director.full_name)
                for m in matches:
                    print(f"  -> Found Sanctions Match for director '{director.full_name}': {m['name']} ({m['source']})")
                    s_match = SanctionMatch(
                        id=uuid.uuid4(),
                        company_id=company.id,
                        monitoring_run_id=run.id,
                        list_name=m["source"],
                        matched_name=m["name"],
                        match_score=float(m["score"]),
                        status="pending_review"
                    )
                    db.add(s_match)
                    
                    # Create Evidence
                    evidence = Evidence(
                        id=uuid.uuid4(),
                        company_id=company.id,
                        monitoring_run_id=run.id,
                        evidence_type="sanction",
                        source_url=f"https://opensanctions.org/entities/{m['id']}",
                        content=f"Fuzzy match {m['score']}% found for director {director.full_name} on global list {m['source']}. Details: Name: {m['name']}, Country: {m['countries']}, DOB: {m['dob']}"
                    )
                    db.add(evidence)

                    # Create Timeline Event
                    event = TimelineEvent(
                        id=uuid.uuid4(),
                        company_id=company.id,
                        event_type="sanction_alert",
                        description=f"Director {director.full_name} identified on global watchlist {m['source']}.",
                        occurred_at=datetime.utcnow()
                    )
                    db.add(event)

            # Insert Mock Adverse News for Controversy Company (Theranos)
            if comp_name == "Theranos Inc":
                print("  -> Inserting mock adverse news articles for Theranos...")
                articles = [
                    {
                        "title": "Theranos Founder Elizabeth Holmes Sentenced to Over 11 Years in Prison for Fraud",
                        "url": "https://www.justice.gov/usao-ndca/pr/theranos-founder-elizabeth-holmes-sentenced",
                        "source": "U.S. Department of Justice",
                        "sentiment": "negative"
                    },
                    {
                        "title": "Sunny Balwani, former Theranos President, Convicted of Multiple Fraud Charges",
                        "url": "https://www.sec.gov/news/press-release/theranos-balwani",
                        "source": "SEC Press Release",
                        "sentiment": "negative"
                    }
                ]
                for art in articles:
                    news = NewsArticle(
                        id=uuid.uuid4(),
                        company_id=company.id,
                        monitoring_run_id=run.id,
                        title=art["title"],
                        url=art["url"],
                        source=art["source"],
                        sentiment=art["sentiment"],
                        published_at=datetime.utcnow()
                    )
                    db.add(news)

                    # Create Evidence
                    evidence = Evidence(
                        id=uuid.uuid4(),
                        company_id=company.id,
                        monitoring_run_id=run.id,
                        evidence_type="adverse_media",
                        source_url=art["url"],
                        content=f"Adverse news article detected: {art['title']} published by {art['source']}."
                    )
                    db.add(evidence)

                    # Create Timeline Event
                    event = TimelineEvent(
                        id=uuid.uuid4(),
                        company_id=company.id,
                        event_type="adverse_media",
                        description=f"Negative news flagged: '{art['title']}'",
                        occurred_at=datetime.utcnow()
                    )
                    db.add(event)

            # Write Risk Assessment Report
            report = RiskReport(
                id=uuid.uuid4(),
                company_id=company.id,
                monitoring_run_id=run.id,
                risk_score=expected["risk_score"],
                risk_level=expected["risk_level"].lower(),
                rationale=expected["rationale"]
            )
            db.add(report)

            # Write Audit Logs
            audit = AuditLog(
                id=uuid.uuid4(),
                actor="system",
                action="onboard_company",
                resource_type="company",
                resource_id=str(company.id),
                event_metadata={"company_name": comp_name, "risk_level": expected["risk_level"]}
            )
            db.add(audit)
            db.commit()

        print("Database Seed completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error during Database Seed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()
