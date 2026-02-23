from __future__ import annotations

"""Credit management service."""

import logging
from datetime import date
from app.database import get_supabase
from app.config import get_settings

logger = logging.getLogger(__name__)

JEWELRY_PRICING = {
    "photoPack": 40,
    "regenSingle": 5,
    "recolorSingle": 7,
    "recolorAll": 20,
    "hdUpscale": 10,
    "listing": 5,
}

JEWELRY_FREE_LIMITS = {
    "hero": 1,
    "pack": 1,
}

DAILY_REWARD_TOKENS = 5


def get_studio_credits(client_id: str) -> dict | None:
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
    result = sb.table("clients").select(
        "token_balance, jewelry_free_hero_used, jewelry_free_pack_used"
    ).eq("id", client_id).single().execute()
    if not result.data:
        return None
    hero_used = result.data.get("jewelry_free_hero_used", 0) or 0
    pack_used = result.data.get("jewelry_free_pack_used", 0) or 0
    return {
        "token_balance": result.data.get("token_balance", 0) or 0,
        "free_hero_remaining": max(0, JEWELRY_FREE_LIMITS["hero"] - hero_used),
        "free_pack_remaining": max(0, JEWELRY_FREE_LIMITS["pack"] - pack_used),
    }


def check_and_deduct_jewelry(client_id: str, operation: str) -> dict:
    """Check free tier first, then token balance. Returns {allowed, used_free, locked, remaining}."""
    sb = get_supabase()
    result = sb.table("clients").select(
        "token_balance, jewelry_free_hero_used, jewelry_free_pack_used"
    ).eq("id", client_id).single().execute()

    if not result.data:
        return {"allowed": False, "error": "Client not found", "remaining": 0, "locked": False}

    balance = result.data.get("token_balance", 0) or 0
    hero_used = result.data.get("jewelry_free_hero_used", 0) or 0
    pack_used = result.data.get("jewelry_free_pack_used", 0) or 0

    # Locking disabled for now — all generations are unlocked
    free_hero_remaining = max(0, JEWELRY_FREE_LIMITS["hero"] - hero_used)
    free_pack_remaining = max(0, JEWELRY_FREE_LIMITS["pack"] - pack_used)

    if operation == "hero":
        if hero_used < JEWELRY_FREE_LIMITS["hero"]:
            sb.table("clients").update(
                {"jewelry_free_hero_used": hero_used + 1}
            ).eq("id", client_id).execute()
            return {
                "allowed": True, "used_free": True, "locked": False,
                "remaining": balance,
                "free_hero_remaining": free_hero_remaining - 1,
                "free_pack_remaining": free_pack_remaining,
            }
        return {"allowed": True, "used_free": False, "locked": False, "remaining": balance,
                "free_hero_remaining": 0, "free_pack_remaining": free_pack_remaining}

    if operation == "full_pack":
        cost = JEWELRY_PRICING["photoPack"]
        if pack_used < JEWELRY_FREE_LIMITS["pack"]:
            sb.table("clients").update(
                {"jewelry_free_pack_used": pack_used + 1}
            ).eq("id", client_id).execute()
            return {
                "allowed": True, "used_free": True, "locked": False,
                "remaining": balance,
                "free_hero_remaining": free_hero_remaining,
                "free_pack_remaining": free_pack_remaining - 1,
            }
        if balance >= cost:
            new_balance = balance - cost
            sb.table("clients").update({"token_balance": new_balance}).eq("id", client_id).execute()
            balance = new_balance
        return {"allowed": True, "used_free": False, "locked": False, "remaining": balance,
                "free_hero_remaining": free_hero_remaining,
                "free_pack_remaining": 0}

    cost = JEWELRY_PRICING.get(operation)
    if cost is None:
        return {"allowed": False, "error": f"Unknown operation: {operation}", "remaining": balance, "locked": False}
    if balance >= cost:
        new_balance = balance - cost
        sb.table("clients").update({"token_balance": new_balance}).eq("id", client_id).execute()
        balance = new_balance
    return {"allowed": True, "used_free": False, "locked": False, "remaining": balance,
            "free_hero_remaining": free_hero_remaining,
            "free_pack_remaining": free_pack_remaining}


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
