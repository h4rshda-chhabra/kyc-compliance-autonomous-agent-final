import os
import sqlite3
from pathlib import Path
from app.config import get_settings
from app.database import SessionLocal
from app.models.company import Company
from app.services.sanctions_impact_analyzer import determine_affected_companies

def test_targeted_screening():
    print("====================================================")
    print("   TESTING TARGETED SANCTIONS IMPACT ANALYZER       ")
    print("====================================================")

    db = SessionLocal()
    settings = get_settings()
    
    # 1. Retrieve an active company from PostgreSQL to construct a matching sanctions target
    comp = db.query(Company).filter(Company.monitoring_status != "onboarding").first()
    if not comp:
        print("[FAIL] No active companies found in PostgreSQL database to test with.")
        db.close()
        return
        
    print(f"[INFO] Using active company: '{comp.legal_name}' (ID: {comp.id})")

    # 2. Paths
    db_path = Path(settings.sanctions_db_path)
    if not db_path.exists():
        print(f"[FAIL] Sanctions SQLite lookup file not found at {db_path}.")
        db.close()
        return

    # 3. Simulate an added watchlist entry matching the company name
    # We will write to a temp database file to verify
    temp_db_path = db_path.parent / "sanctions_lookup_test_temp.db"
    import shutil
    shutil.copy2(db_path, temp_db_path)

    conn = sqlite3.connect(temp_db_path)
    cur = conn.cursor()
    
    test_entity_id = "TEST-ADDITION-999"
    test_entity_name = comp.legal_name.upper()

    try:
        # Insert test entity matching the company's name
        cur.execute(
            "INSERT OR REPLACE INTO entities (id, name, type, source) VALUES (?, ?, ?, ?)",
            (test_entity_id, test_entity_name, "Company", "OFAC Test Addition")
        )
        conn.commit()
        print(f"[OK] Seeding mock sanctions entity: ID={test_entity_id}, Name='{test_entity_name}'")
        
        # 4. Invoke Impact Analyzer
        added_ids = [test_entity_id]
        updated_ids = []
        removed_ids = []
        
        affected = determine_affected_companies(
            db=db,
            old_db_path=db_path,
            new_db_path=temp_db_path,
            added_ids=added_ids,
            updated_ids=updated_ids,
            removed_ids=removed_ids
        )
        
        print(f"[INFO] Affected company IDs returned: {affected}")
        
        if comp.id in affected:
            print("[PASS] Targeted screening successfully identified the affected company!")
        else:
            print("[FAIL] Impact analyzer did not return the expected company ID.")

    except Exception as e:
        print(f"[FAIL] Test execution failed with exception: {str(e)}")
    finally:
        conn.close()
        db.close()
        if temp_db_path.exists():
            os.remove(temp_db_path)
        print("====================================================")

if __name__ == "__main__":
    test_targeted_screening()
