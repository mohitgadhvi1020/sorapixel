from __future__ import annotations

"""Credit management service -- ported from lib/studio-credits.ts and lib/jewelry-credits.ts"""

import logging
from datetime import date
from app.database import get_supabase
from app.config import get_settings

logger = logging.getLogger(__name__)

JEWELRY_PRICING = {
    "photoPack": 40,
    "recolorSingle": 7,
    "recolorAll": 20,
    "hdUpscale": 10,
    "listing": 5,
}

TOKEN_BUNDLES = [
    {"id": "50_tokens", "tokens": 50, "price_inr": 500, "name": "50 Tokens"},
    {"id": "100_tokens", "tokens": 100, "price_inr": 800, "name": "100 Tokens"},
    {"id": "200_tokens", "tokens": 200, "price_inr": 1500, "name": "200 Tokens"},
    {"id": "500_tokens", "tokens": 500, "price_inr": 3000, "name": "500 Tokens"},
]

DAILY_REWARD_TOKENS = 2


def get_studio_credits(client_id: str) -> dict | None:
    """Get studio credit status for a client."""
    settings = get_settings()
    sb = get_supabase()
    result = sb.table("clients").select(
        "token_balance, studio_free_used"
    ).eq("id", client_id).single().execute()

    if not result.data:
        return None

    free_used = result.data.get("studio_free_used", 0) or 0
    balance = result.data.get("token_balance", 0) or 0
    free_limit = settings.free_studio_limit

    return {
        "token_balance": balance,
        "studio_free_used": free_used,
        "free_remaining": max(0, free_limit - free_used),
        "is_free_tier": free_used < free_limit,
    }


def check_and_deduct_studio(client_id: str) -> dict:
    """Check credits and deduct for a studio generation.
    Returns {"allowed": bool, "error": str|None, "remaining": int}
    """
    settings = get_settings()
    sb = get_supabase()
    result = sb.table("clients").select(
        "token_balance, studio_free_used"
    ).eq("id", client_id).single().execute()

    if not result.data:
        return {"allowed": False, "error": "Client not found", "remaining": 0}

    free_used = result.data.get("studio_free_used", 0) or 0
    balance = result.data.get("token_balance", 0) or 0
    free_limit = settings.free_studio_limit

    if free_used < free_limit:
        sb.table("clients").update(
            {"studio_free_used": free_used + 1}
        ).eq("id", client_id).execute()
        return {"allowed": True, "error": None, "remaining": balance, "used_free": True}

    if balance < settings.tokens_per_image:
        return {
            "allowed": False,
            "error": f"Insufficient tokens. Need {settings.tokens_per_image} but have {balance}.",
            "remaining": balance,
        }

    new_balance = balance - settings.tokens_per_image
    sb.table("clients").update(
        {"token_balance": new_balance}
    ).eq("id", client_id).execute()
    return {"allowed": True, "error": None, "remaining": new_balance, "used_free": False}


def get_jewelry_credits(client_id: str) -> dict | None:
    sb = get_supabase()
    result = sb.table("clients").select("token_balance").eq("id", client_id).single().execute()
    if not result.data:
        return None
    return {"token_balance": result.data.get("token_balance", 0) or 0}


def deduct_jewelry_tokens(client_id: str, amount: int) -> bool:
    sb = get_supabase()
    result = sb.table("clients").select("token_balance").eq("id", client_id).single().execute()
    if not result.data:
        return False
    balance = result.data.get("token_balance", 0) or 0
    if balance < amount:
        return False
    sb.table("clients").update(
        {"token_balance": balance - amount}
    ).eq("id", client_id).execute()
    return True


def add_tokens(client_id: str, amount: int) -> bool:
    sb = get_supabase()
    result = sb.table("clients").select("token_balance").eq("id", client_id).single().execute()
    if not result.data:
        return False
    current = result.data.get("token_balance", 0) or 0
    sb.table("clients").update(
        {"token_balance": current + amount}
    ).eq("id", client_id).execute()
    return True


def claim_daily_reward(client_id: str) -> dict:
    """Claim daily free tokens. Returns {"success": bool, "tokens_added": int, "new_balance": int}"""
    sb = get_supabase()
    result = sb.table("clients").select(
        "token_balance, daily_reward_claimed_at"
    ).eq("id", client_id).single().execute()

    if not result.data:
        return {"success": False, "tokens_added": 0, "new_balance": 0, "message": "Client not found"}

    last_claimed = result.data.get("daily_reward_claimed_at")
    today = date.today().isoformat()

    if last_claimed == today:
        return {
            "success": False,
            "tokens_added": 0,
            "new_balance": result.data.get("token_balance", 0),
            "message": "Already claimed today",
        }

    balance = result.data.get("token_balance", 0) or 0
    new_balance = balance + DAILY_REWARD_TOKENS

    sb.table("clients").update({
        "token_balance": new_balance,
        "daily_reward_claimed_at": today,
    }).eq("id", client_id).execute()

    return {
        "success": True,
        "tokens_added": DAILY_REWARD_TOKENS,
        "new_balance": new_balance,
        "message": f"Claimed {DAILY_REWARD_TOKENS} free tokens!",
    }


def is_daily_reward_available(client_id: str) -> bool:
    sb = get_supabase()
    result = sb.table("clients").select("daily_reward_claimed_at").eq("id", client_id).single().execute()
    if not result.data:
        return False
    last_claimed = result.data.get("daily_reward_claimed_at")
    return last_claimed != date.today().isoformat()
