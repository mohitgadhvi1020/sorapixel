from __future__ import annotations

from pydantic import BaseModel


class UserProfile(BaseModel):
    id: str
    phone: str | None = None
    email: str | None = None
    name: str | None = None
    company_name: str | None = None
    contact_name: str | None = None
    business_logo_url: str | None = None
    business_address: str | None = None
    business_website: str | None = None
    apply_branding: bool = False
    category_id: str | None = None
    is_active: bool = True
    is_admin: bool = False
    token_balance: int = 0
    studio_free_used: int = 0
    allowed_sections: list[str] = ["studio", "jewelry"]
    subscription_plan: str = "free"
    daily_reward_claimed_at: str | None = None


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    company_name: str | None = None
    contact_name: str | None = None
    business_address: str | None = None
    business_website: str | None = None
    email: str | None = None
    apply_branding: bool | None = None
    category_id: str | None = None
