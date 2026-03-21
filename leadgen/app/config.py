from __future__ import annotations

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "SoraPixel LeadGen"
    debug: bool = False

    # Supabase (same DB as main backend)
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # AI
    gemini_api_key: str = ""
    gemini_max_concurrent: int = 10

    # Email (Resend)
    resend_api_key: str = ""
    lead_from_email: str = "contact@soraipixel.com"
    lead_from_name: str = "Mohit from SoraPixel"

    # Discovery — Perplexity Sonar (AI search, primary)
    perplexity_api_key: str = ""

    # Discovery — Google Places
    google_places_api_key: str = ""

    # Discovery — Etsy
    etsy_api_key: str = ""

    # Enrichment — Apollo.io
    apollo_api_key: str = ""

    # Enrichment — Hunter.io
    hunter_api_key: str = ""

    # Email verification — ZeroBounce
    zerobounce_api_key: str = ""

    # Pipeline limits
    lead_daily_limit: int = 200
    products_per_lead: int = 3
    email_daily_limit: int = 100

    # Lead scoring thresholds
    score_min_for_outreach: int = 40

    # Security
    cron_secret: str = ""
    admin_emails: str = ""

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://soraipixel.com",
        "https://www.soraipixel.com",
        "https://sorapixelnew.vercel.app",
    ]

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def admin_email_list(self) -> list[str]:
        return [e.strip().lower() for e in self.admin_emails.split(",") if e.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
