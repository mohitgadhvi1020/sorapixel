from __future__ import annotations

from pydantic import BaseModel


class CreditBalance(BaseModel):
    token_balance: int
    studio_free_used: int
    free_limit: int
    tokens_per_image: int
    is_free_tier: bool
    daily_reward_available: bool = False


class JewelryCreditBalance(BaseModel):
    token_balance: int
    pricing: dict


class ClaimDailyRewardResponse(BaseModel):
    success: bool
    tokens_added: int = 0
    new_balance: int = 0
    message: str = ""


class DeductTokensRequest(BaseModel):
    operation: str
    amount: int | None = None
