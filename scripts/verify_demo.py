import os
import sys
import sqlite3

# Add backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

try:
    from app.config import get_settings
    from app.database.session import SessionLocal
    from app.models.company import Company
    from app.services.rss_news_service import RSSNewsService
    from app.services.news_classifier import NewsClassifier
except ImportError as e:
    print(f"[-] Import Error: {e}")
    print("Please run this script inside the virtual environment.")
    sys.exit(1)

def check_step(desc: str, status: bool, detail: str = ""):
    symbol = "[OK]" if status else "[ERR]"
    print(f"{symbol} {desc:<40} {detail}")
    return status

def main():
    print("====================================================")
    print("      KYC AUDITOR DEMO VERIFICATION SUITE           ")
    print("====================================================")
    
    all_passed = True

    # 1. Environment Verification
    settings = get_settings()
    env_loaded = settings.database_url is not None
    all_passed &= check_step("Environment Variables Loaded", env_loaded, f"DB URL: {settings.database_url[:30]}...")

    # 2. Sanctions Database Exists
    sqlite_db = "datasets/processed/sanctions_lookup.db"
    sqlite_exists = os.path.exists(sqlite_db)
    sqlite_size_mb = os.path.getsize(sqlite_db) / (1024 * 1024) if sqlite_exists else 0
    all_passed &= check_step("Sanctions SQLite DB Exists", sqlite_exists, f"Path: {sqlite_db} ({sqlite_size_mb:.2f} MB)")

    # 3. Sanctions Lookup Functionality
    lookup_works = False
    details = "No DB found"
    if sqlite_exists:
        try:
            conn = sqlite3.connect(sqlite_db)
            cur = conn.cursor()
            cur.execute("SELECT name FROM entities LIMIT 1")
            name = cur.fetchone()
            lookup_works = name is not None
            details = f"Sample name found: {name[0]}" if lookup_works else "No records in SQLite"
            conn.close()
        except Exception as e:
            details = f"Query error: {e}"
    all_passed &= check_step("Sanctions Database Queryable", lookup_works, details)

    # 4. PostgreSQL Database Connection
    from sqlalchemy import text
    pg_connected = False
    pg_details = ""
    try:
        db = SessionLocal()
        # Run a simple select 1 query
        db.execute(text("SELECT 1"))  # Just verify connection works
        pg_connected = True
        pg_details = "PostgreSQL connection succeeded."
        db.close()
    except Exception as e:
        pg_details = f"Connection failed: {e}"
    all_passed &= check_step("PostgreSQL Connection", pg_connected, pg_details)


    # 5. Demo Companies Loaded in PostgreSQL
    companies_loaded = False
    comp_details = "Requires connection"
    if pg_connected:
        try:
            db = SessionLocal()
            count = db.query(Company).count()
            companies_loaded = count > 0
            comp_details = f"{count} companies found in database."
            db.close()
        except Exception as e:
            comp_details = f"Query error: {e}"
    all_passed &= check_step("Demo Companies Loaded", companies_loaded, comp_details)

    # 6. RSS News Service Ingestion
    rss_works = False
    rss_details = ""
    try:
        service = RSSNewsService()
        articles = service.fetch_articles("Google", limit=1)
        rss_works = len(articles) > 0
        rss_details = f"Fetched sample title: '{articles[0]['title'][:40]}...'" if rss_works else "Returned empty list (Check network connection)"
    except Exception as e:
        rss_details = f"Ingestion error: {e}"
    # RSS error should not fail the whole suite if network is offline during compilation.
    check_step("RSS News Feed Parser Ingestion", rss_works, rss_details)

    # 7. SAR Narrative Template Exists
    template_path = "backend/app/templates/sar_template.md"
    template_exists = os.path.exists(template_path)
    all_passed &= check_step("SAR Markdown Template Exists", template_exists, f"Path: {template_path}")

    # 8. News Classifier Keyword Logic
    classifier_works = False
    class_details = ""
    try:
        category, severity = NewsClassifier.classify("Wirecard executive arrested for massive money laundering fraud", "Reports indicate graft.")
        classifier_works = category == "Money Laundering" and severity == "Critical"
        class_details = f"Classified: {category} ({severity})" if classifier_works else f"Failed logic match: {category} ({severity})"
    except Exception as e:
        class_details = f"Classifier error: {e}"
    all_passed &= check_step("News Keyword Classifier Logic", classifier_works, class_details)

    print("====================================================")
    if all_passed:
        print("[OK] ALL SYSTEMS VERIFIED: READY FOR HACKATHON DEMO!")
        sys.exit(0)
    else:
        print("[ERR] SYSTEM CHECK INCOMPLETE. Please resolve failures listed above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
