from __future__ import annotations

"""Credits & daily rewards router."""

from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.schemas.credits import CreditBalance, ClaimDailyRewardResponse, DeductTokensRequest
from app.services.credit_service import (
    get_studio_credits, get_jewelry_credits, claim_daily_reward,
    is_daily_reward_available, deduct_jewelry_tokens, JEWELRY_PRICING,
)
from app.config import get_settings

router = APIRouter(prefix="/credits", tags=["Credits"])


@router.get("/balance")
async def get_balance(user: dict = Depends(get_current_user)):
    settings = get_settings()
    studio = get_studio_credits(user["id"])
    daily_available = is_daily_reward_available(user["id"])

    return {
        "token_balance": studio["token_balance"] if studio else 0,
        "studio_free_used": studio["studio_free_used"] if studio else 0,
        "free_limit": settings.free_studio_limit,
        "tokens_per_image": settings.tokens_per_image,
        "is_free_tier": studio["is_free_tier"] if studio else True,
        "daily_reward_available": daily_available,
    }


@router.post("/claim-daily", response_model=ClaimDailyRewardResponse)
async def claim_daily(user: dict = Depends(get_current_user)):
    result = claim_daily_reward(user["id"])
    return ClaimDailyRewardResponse(**result)


@router.post("/deduct")
async def deduct_tokens(req: DeductTokensRequest, user: dict = Depends(get_current_user)):
    cost_map = {
        "recolorAll": JEWELRY_PRICING["recolorAll"],
        "recolorSingle": JEWELRY_PRICING["recolorSingle"],
        "hdUpscale": JEWELRY_PRICING["hdUpscale"],
        "listing": JEWELRY_PRICING["listing"],
        "photoPack": JEWELRY_PRICING["photoPack"],
    }
    cost = req.amount or cost_map.get(req.operation)
    if cost is None:
        raise HTTPException(status_code=400, detail=f"Unknown operation: {req.operation}")

    credits = get_jewelry_credits(user["id"])
    if not credits or credits["token_balance"] < cost:
        raise HTTPException(
            status_code=403,
            detail=f"Need {cost} tokens, have {credits['token_balance'] if credits else 0}",
        )

    success = deduct_jewelry_tokens(user["id"], cost)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to deduct tokens")

    return {
        "success": True,
        "tokens_used": cost,
        "remaining": credits["token_balance"] - cost,
    }
