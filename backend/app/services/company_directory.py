"""Company directory served directly from the sanctions dataset.

The Companies screens browse `datasets/processed/sanctions_lookup.db` (the
OpenSanctions/OFAC lookup) directly — nothing is pre-loaded into Postgres.
A Postgres `companies` row is only materialized when a company is scanned.
"""

import sqlite3
from dataclasses import dataclass
from functools import lru_cache

from app.config import get_settings

_COMPANY_TYPES = ("Company", "Organization", "LegalEntity")
_DEFAULT_LIMIT = 100


@dataclass
class DirectoryCompany:
    id: str
    name: str
    countries: str | None
    source: str | None


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(get_settings().sanctions_db_path)
    conn.row_factory = sqlite3.Row
    return conn


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _row_to_company(row: sqlite3.Row) -> DirectoryCompany:
    return DirectoryCompany(
        id=row["id"],
        name=row["name"],
        countries=row["countries"] or None,
        source=row["source"] or None,
    )


def list_companies(query: str | None = None, limit: int = _DEFAULT_LIMIT) -> list[DirectoryCompany]:
    placeholders = ",".join("?" for _ in _COMPANY_TYPES)
    conn = _connect()
    try:
        cur = conn.cursor()
        if query and query.strip():
            pattern = f"%{_escape_like(query.strip())}%"
            cur.execute(
                f"""
                SELECT id, name, countries, source FROM entities
                WHERE type IN ({placeholders})
                  AND name LIKE ? ESCAPE '\\' COLLATE NOCASE
                LIMIT ?
                """,
                (*_COMPANY_TYPES, pattern, limit),
            )
        else:
            cur.execute(
                f"""
                SELECT id, name, countries, source FROM entities
                WHERE type IN ({placeholders})
                LIMIT ?
                """,
                (*_COMPANY_TYPES, limit),
            )
        return [_row_to_company(row) for row in cur.fetchall()]
    finally:
        conn.close()


def get_company(entity_id: str) -> DirectoryCompany | None:
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, name, countries, source FROM entities WHERE id = ?",
            (entity_id,),
        )
        row = cur.fetchone()
        return _row_to_company(row) if row else None
    finally:
        conn.close()


@lru_cache
def count_companies() -> int:
    placeholders = ",".join("?" for _ in _COMPANY_TYPES)
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute(
            f"SELECT COUNT(*) FROM entities WHERE type IN ({placeholders})",
            _COMPANY_TYPES,
        )
        return cur.fetchone()[0]
    finally:
        conn.close()
