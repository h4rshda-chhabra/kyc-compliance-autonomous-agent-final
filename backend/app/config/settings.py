from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Central application configuration, loaded from environment variables / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "Continuous KYC Autonomous Auditor"
    environment: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    # CORS
    cors_allow_origins: list[str] = ["http://localhost:5173"]

    # Database
    database_url: str = "postgresql+psycopg2://kyc:kyc@localhost:5432/kyc_auditor"

    # Sanctions screening (pre-built lookup DB compiled from OFAC SDN + OpenSanctions)
    sanctions_db_path: str = str(_REPO_ROOT / "datasets" / "processed" / "sanctions_lookup.db")

    # Auth
    secret_key: str = "change-me-in-env"
    access_token_expire_minutes: int = 30

    # Bootstrap admin login. ADMIN accounts are never self-registerable —
    # they are seeded from these values via scripts/seed_admin.py (or the demo
    # seed). Override in .env for anything beyond local development.
    admin_email: str = "admin@example.com"
    admin_password: str = "admin12345"
    admin_full_name: str = "Platform Administrator"

    # AI providers
    gemini_api_key: str | None = None
    openrouter_api_key: str | None = None

    # Adverse Media Ingestion
    google_news_rss: str = "https://news.google.com/rss/search"
    user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

    # Scheduler
    scheduler_enabled: bool = True
    monitoring_sweep_interval_minutes: int = 15

    # SAR generation gate: a new SAR is only drafted when a sanctions match exists
    # AND the calculated risk score meets/exceeds this threshold (0-100 scale).
    sar_risk_threshold: float = 70.0

    # Logging
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
