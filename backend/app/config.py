from __future__ import annotations

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "SoraPixel API"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours for simplicity at 100 DAU
    refresh_token_expire_days: int = 30

    # Google OAuth
    google_client_id: str = ""

    # AI Services
    gemini_api_key: str = ""
    fal_key: str = ""

    # OTP
    otp_expire_minutes: int = 5
    msg91_auth_key: str = ""
    msg91_template_id: str = ""

    # Razorpay
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""

    # Admin
    admin_phones: str = ""  # comma-separated phone numbers
    admin_emails: str = ""  # comma-separated email addresses

    # Credits
    free_studio_limit: int = 9
    tokens_per_image: int = 1

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def admin_phone_list(self) -> list[str]:
        return [p.strip() for p in self.admin_phones.split(",") if p.strip()]

    @property
    def admin_email_list(self) -> list[str]:
        return [e.strip().lower() for e in self.admin_emails.split(",") if e.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
