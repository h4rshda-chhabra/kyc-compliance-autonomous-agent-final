"""Watchlist service: owns the 'sanctions watchlist has changed' event.

In the simplified architecture there is a single source of truth:
    datasets/processed/sanctions_lookup.db

Whenever that database changes (via future integrations or the demo simulator),
this service handles the downstream reaction: impact analysis → targeted
re-screening → risk update → SAR generation.
"""

import logging
import sqlite3
from pathlib import Path

from sqlalchemy.orm import Session

logger = logging.getLogger("app.watchlist_service")

# ─── Demo entities ────────────────────────────────────────────────────────────
DEMO_ENTITIES = [
    {
        "id": "DEMO-OFAC-THERANOS",
        "name": "THERANOS INC",
        "type": "Company",
        "source": "US OFAC Specially Designated Nationals List",
        "countries": "us",
        "dob": None,
    },
    {
        "id": "DEMO-OFAC-HOLMES",
        "name": "ELIZABETH HOLMES",
        "type": "Person",
        "source": "US OFAC Specially Designated Nationals List",
        "countries": "us",
        "dob": "1984-02-03",
    },
]

DEMO_IDS = [e["id"] for e in DEMO_ENTITIES]


def simulate_watchlist_update(db: Session) -> dict:
    """Directly inserts predefined demo sanctions entries into the live
    sanctions_lookup.db, then triggers the impact analyzer and targeted
    re-screening pipeline.

    Each call:
    1. Deletes previous demo mock entries so there is always a fresh delta.
    2. Inserts the demo entities — produces added_ids = DEMO_IDS.
    3. Calls SanctionsImpactAnalyzer to find affected companies.
    4. Triggers targeted re-screening for those companies.

    Returns a summary dict.
    """
    from app.config import get_settings

    settings = get_settings()
    db_path = Path(settings.sanctions_db_path)

    if not db_path.exists():
        raise FileNotFoundError(f"sanctions_lookup.db not found at {db_path}")

    # ── 1. Wipe previous demo entries (idempotent reset) ──────────────────────
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        placeholders = ",".join("?" for _ in DEMO_IDS)
        cur.execute(f"DELETE FROM entities WHERE id IN ({placeholders})", DEMO_IDS)
        cur.execute(f"DELETE FROM aliases  WHERE entity_id IN ({placeholders})", DEMO_IDS)
        conn.commit()
        logger.info("[WATCHLIST SIM] Cleared %d previous demo entity(ies).", len(DEMO_IDS))

        # ── 2. Insert fresh demo entities ─────────────────────────────────────
        for entity in DEMO_ENTITIES:
            cur.execute(
                """
                INSERT OR REPLACE INTO entities (id, name, type, source, countries, dob)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    entity["id"],
                    entity["name"],
                    entity["type"],
                    entity["source"],
                    entity["countries"],
                    entity["dob"],
                ),
            )
            # Insert a matching alias so alias-based screening also picks it up
            cur.execute(
                """
                INSERT OR REPLACE INTO aliases (entity_id, alias_name)
                VALUES (?, ?)
                """,
                (entity["id"], entity["name"]),
            )

        conn.commit()
        logger.info("[WATCHLIST SIM] Inserted %d demo entity(ies) into sanctions_lookup.db.", len(DEMO_ENTITIES))
    finally:
        conn.close()

    added_ids = DEMO_IDS

    # ── 3. Impact analysis ────────────────────────────────────────────────────
    from app.services.sanctions_impact_analyzer import determine_affected_companies

    affected_company_ids = determine_affected_companies(
        db=db,
        added_ids=added_ids,
        updated_ids=[],
        removed_ids=[],
    )

    # ── 4. Targeted re-screening ──────────────────────────────────────────────
    if affected_company_ids:
        logger.info(
            "[WATCHLIST SIM] Triggering targeted re-screening for %d company(ies): %s",
            len(affected_company_ids),
            list(affected_company_ids),
        )
        from app.orchestrator.scheduler import run_monitoring_sweep
        run_monitoring_sweep(company_ids=list(affected_company_ids), trigger_type="watchlist_update")
    else:
        logger.info("[WATCHLIST SIM] No monitored companies matched the demo watchlist entries.")

    return {
        "success": True,
        "entities_inserted": len(DEMO_ENTITIES),
        "affected_companies": len(affected_company_ids),
        "affected_company_ids": list(affected_company_ids),
    }
