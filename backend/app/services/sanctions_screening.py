"""Fuzzy name screening against the pre-built OFAC SDN / OpenSanctions lookup DB.

`sanctions_lookup.db` (datasets/processed/) holds ~1.3M entities and ~1.2M
aliases. A full fuzzy scan over that many rows per screen would be far too
slow, so this narrows candidates first with an indexed SQL substring lookup,
then scores only that (small) candidate set with difflib.
"""

import sqlite3
from dataclasses import dataclass
from difflib import SequenceMatcher

from app.config import get_settings

_CANDIDATE_LIMIT = 200


@dataclass
class SanctionsMatch:
    entity_id: str
    matched_name: str
    source: str
    score: float


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def screen_name(name: str, threshold: float = 0.6, limit: int = 5) -> list[SanctionsMatch]:
    """Screen a name against the sanctions lookup dataset.

    Returns up to `limit` matches scoring at or above `threshold` (0-1),
    highest score first.
    """
    name = name.strip()
    if not name:
        return []

    settings = get_settings()
    pattern = f"%{_escape_like(name)}%"

    conn = sqlite3.connect(settings.sanctions_db_path)
    try:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        cur.execute(
            """
            SELECT id AS entity_id, name AS matched_name, source
            FROM entities
            WHERE name LIKE ? ESCAPE '\\' COLLATE NOCASE
            LIMIT ?
            """,
            (pattern, _CANDIDATE_LIMIT),
        )
        candidates: dict[str, tuple[str, str]] = {
            row["entity_id"]: (row["matched_name"], row["source"]) for row in cur.fetchall()
        }

        cur.execute(
            """
            SELECT aliases.entity_id AS entity_id,
                   aliases.alias_name AS matched_name,
                   entities.source AS source
            FROM aliases
            JOIN entities ON entities.id = aliases.entity_id
            WHERE aliases.alias_name LIKE ? ESCAPE '\\' COLLATE NOCASE
            LIMIT ?
            """,
            (pattern, _CANDIDATE_LIMIT),
        )
        for row in cur.fetchall():
            candidates.setdefault(row["entity_id"], (row["matched_name"], row["source"]))
    finally:
        conn.close()

    scored = [
        SanctionsMatch(
            entity_id=entity_id,
            matched_name=matched_name,
            source=source,
            score=_similarity(name, matched_name),
        )
        for entity_id, (matched_name, source) in candidates.items()
    ]
    scored = [m for m in scored if m.score >= threshold]
    scored.sort(key=lambda m: m.score, reverse=True)
    return scored[:limit]
