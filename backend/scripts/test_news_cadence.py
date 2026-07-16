import logging
from datetime import datetime, timedelta, UTC
from app.config import get_settings
from app.database import SessionLocal
from app.models.company import Company
from app.orchestrator.scheduler import run_monitoring_sweep

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_news_cadence")

def test_news_cadence_scheduling():
    print("====================================================")
    print("   TESTING RISK-BASED NEWS CADENCE SCHEDULER        ")
    print("====================================================")

    db = SessionLocal()
    try:
        # 1. Retrieve a test company
        company = db.query(Company).filter(Company.monitoring_status != "onboarding").first()
        if not company:
            print("[FAIL] No active companies found in PostgreSQL database to test.")
            return

        print(f"[INFO] Initial company state: '{company.legal_name}' (ID: {company.id})")
        print(f"       Enabled: {company.news_monitoring_enabled}")
        print(f"       Interval: {company.news_monitoring_interval_minutes} mins")
        print(f"       Last check: {company.last_news_check_at}")

        # 2. Test Case A: Disable monitoring and ensure it is skipped
        print("\n--- Test Case A: Disabled Monitoring ---")
        company.news_monitoring_enabled = False
        db.commit()

        # We trigger the scheduled sweep by passing company_ids=[company.id].
        # In a real sweep (company_ids=None), it does this check. For the test, we want to see if
        # run_monitoring_sweep skips the company when not due/disabled.
        # Wait, if we pass company_ids=[company.id], the scheduler runs it unconditionally (fallback override).
        # To test the scheduling check, we run a routine sweep (company_ids=None) and check if our company was skipped!
        # First, set last_news_check_at to 2 days ago so it *would* be due if enabled:
        company.last_news_check_at = datetime.now(UTC) - timedelta(days=2)
        db.commit()

        # Run sweep
        run_monitoring_sweep()
        db.refresh(company)
        
        # Since it is disabled, last_news_check_at should remain unchanged (2 days ago)!
        elapsed = datetime.now(UTC) - company.last_news_check_at.replace(tzinfo=UTC)
        if elapsed.days >= 2:
            print("[PASS] Disabled company was successfully skipped in scheduled sweep.")
        else:
            print("[FAIL] Disabled company was audited during scheduled sweep.")

        # 3. Test Case B: Enabled Monitoring & Due Check
        print("\n--- Test Case B: Due Monitoring ---")
        company.news_monitoring_enabled = True
        company.news_monitoring_interval_minutes = 15  # 15 minutes cadence
        # Set last_news_check_at to 30 mins ago (due)
        company.last_news_check_at = datetime.now(UTC) - timedelta(minutes=30)
        db.commit()

        # Run sweep
        run_monitoring_sweep()
        db.refresh(company)

        # Since it is due, it should be audited and last_news_check_at should be updated to now!
        elapsed = datetime.now(UTC) - company.last_news_check_at.replace(tzinfo=UTC)
        if elapsed.seconds < 60:
            print("[PASS] Due company was successfully audited and check timestamp updated.")
        else:
            print(f"[FAIL] Due company was not audited. Last check remains: {company.last_news_check_at}")

        # 4. Test Case C: Enabled Monitoring & Not Due Check
        print("\n--- Test Case C: Not Due Monitoring ---")
        # Set last_news_check_at to 2 minutes ago (not due yet, since interval is 15 mins)
        company.last_news_check_at = datetime.now(UTC) - timedelta(minutes=2)
        db.commit()
        last_check_saved = company.last_news_check_at

        # Run sweep
        run_monitoring_sweep()
        db.refresh(company)

        # Since it is not due, last_news_check_at should not be updated!
        if company.last_news_check_at == last_check_saved:
            print("[PASS] Not due company was successfully skipped.")
        else:
            print(f"[FAIL] Not due company was audited anyway. Last check changed to: {company.last_news_check_at}")

    except Exception as e:
        print(f"[FAIL] Test encountered exception: {str(e)}")
    finally:
        db.close()
        print("====================================================")

if __name__ == "__main__":
    test_news_cadence_scheduling()
