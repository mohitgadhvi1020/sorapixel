from __future__ import annotations

"""Credit management service — unified token system."""

import logging
from datetime import date
from app.database import get_supabase
from app.config import get_settings

logger = logging.getLogger(__name__)

# ─── Unified pricing: tokens per operation ───

JEWELRY_PRICING = {
    "standard": {
        "imageGen": 8,
        "regenSingle": 8,
        "recolorSingle": 7,
        "listing": 5,
        "ugcPerPose": 8,
    },
    "pro": {
        "imageGen": 20,
        "regenSingle": 20,
        "recolorSingle": 18,
        "listing": 5,
        "ugcPerPose": 20,
    },
}

STUDIO_PRICING = {
    "standard": 5,
    "pro": 20,
}

VIDEO_PRICING = {
    "standard": 25,
    "pro": 50,
}

DAILY_REWARD_TOKENS = 8

FREE_FIRST_GENERATION = 1


def get_operation_cost(operation: str, quality: str = "standard") -> int:
    tier = quality if quality in ("standard", "pro") else "standard"
    return JEWELRY_PRICING[tier].get(operation, 0)


def log_token_usage(
    client_id: str,
    operation: str,
    tokens: int,
    quality: str = "standard",
    balance_after: int | None = None,
    session_id: str | None = None,
) -> None:
    sb = get_supabase()
    try:
        sb.table("token_logs").insert({
            "client_id": client_id,
            "session_id": session_id,
            "operation": operation,
            "tokens_deducted": tokens,
            "quality": quality,
            "balance_after": balance_after,
        }).execute()
    except Exception as e:
        logger.error(f"log_token_usage error: {e}")


# ─── Studio credits ───

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


def check_studio_balance(client_id: str, quality: str = "standard") -> dict:
    """Check if client can afford a studio generation WITHOUT deducting."""
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
        return {"allowed": True, "error": None, "remaining": balance, "used_free": True}

    cost = STUDIO_PRICING.get(quality, STUDIO_PRICING["standard"])
    if balance < cost:
        return {
            "allowed": False,
            "error": f"Insufficient tokens. Need {cost} but have {balance}.",
            "remaining": balance,
        }

    return {"allowed": True, "error": None, "remaining": balance, "used_free": False}


def deduct_studio_tokens(client_id: str, quality: str = "standard") -> dict:
    """Deduct tokens for a studio generation AFTER success."""
    settings = get_settings()
    sb = get_supabase()
    result = sb.table("clients").select(
        "token_balance, studio_free_used"
    ).eq("id", client_id).single().execute()

    if not result.data:
        return {"remaining": 0}

    free_used = result.data.get("studio_free_used", 0) or 0
    balance = result.data.get("token_balance", 0) or 0
    free_limit = settings.free_studio_limit

    if free_used < free_limit:
        sb.table("clients").update(
            {"studio_free_used": free_used + 1}
        ).eq("id", client_id).execute()
        return {"remaining": balance, "used_free": True}

    cost = STUDIO_PRICING.get(quality, STUDIO_PRICING["standard"])
    new_balance = max(0, balance - cost)
    sb.table("clients").update(
        {"token_balance": new_balance}
    ).eq("id", client_id).execute()
    return {"remaining": new_balance, "used_free": False}


def check_and_deduct_studio(client_id: str, quality: str = "standard") -> dict:
    """Legacy wrapper — checks and deducts in one call."""
    check = check_studio_balance(client_id, quality)
    if not check["allowed"]:
        return check
    deduct = deduct_studio_tokens(client_id, quality)
    return {"allowed": True, "error": None, **deduct}


# ─── Jewelry / unified credits ───

def get_jewelry_credits(client_id: str) -> dict | None:
    sb = get_supabase()
    result = sb.table("clients").select(
        "token_balance, jewelry_free_hero_used"
    ).eq("id", client_id).single().execute()
    if not result.data:
        return None
    free_used = result.data.get("jewelry_free_hero_used", 0) or 0
    return {
        "token_balance": result.data.get("token_balance", 0) or 0,
        "free_generation_remaining": max(0, FREE_FIRST_GENERATION - free_used),
    }


def check_and_deduct_jewelry(
    client_id: str,
    operation: str,
    quality: str = "standard",
    session_id: str | None = None,
) -> dict:
    """Unified credit check. First-ever generation is free, everything else costs tokens."""
    sb = get_supabase()
    result = sb.table("clients").select(
        "token_balance, jewelry_free_hero_used"
    ).eq("id", client_id).single().execute()

    if not result.data:
        return {"allowed": False, "error": "Client not found", "remaining": 0}

    balance = result.data.get("token_balance", 0) or 0
    free_used = result.data.get("jewelry_free_hero_used", 0) or 0
    free_remaining = max(0, FREE_FIRST_GENERATION - free_used)

    if operation == "first_generation" and free_used < FREE_FIRST_GENERATION:
        sb.table("clients").update(
            {"jewelry_free_hero_used": free_used + 1}
        ).eq("id", client_id).execute()
        log_token_usage(client_id, operation, 0, quality, balance, session_id)
        return {
            "allowed": True, "used_free": True,
            "remaining": balance,
            "free_generation_remaining": free_remaining - 1,
        }

    cost = get_operation_cost(operation, quality)
    if cost == 0:
        return {"allowed": False, "error": f"Unknown operation: {operation}", "remaining": balance}

    if balance < cost:
        return {
            "allowed": False,
            "error": f"Insufficient tokens. Need {cost} but have {balance}.",
            "remaining": balance,
            "free_generation_remaining": free_remaining,
        }

    new_balance = balance - cost
    sb.table("clients").update({"token_balance": new_balance}).eq("id", client_id).execute()
    log_token_usage(client_id, operation, cost, quality, new_balance, session_id)
    return {
        "allowed": True, "used_free": False,
        "remaining": new_balance,
        "free_generation_remaining": free_remaining,
    }


def deduct_jewelry_tokens(
    client_id: str,
    amount: int,
    operation: str = "generic",
    quality: str = "standard",
    session_id: str | None = None,
) -> bool:
    sb = get_supabase()
    result = sb.table("clients").select("token_balance").eq("id", client_id).single().execute()
    if not result.data:
        return False
    balance = result.data.get("token_balance", 0) or 0
    if balance < amount:
        return False
    new_balance = balance - amount
    sb.table("clients").update(
        {"token_balance": new_balance}
    ).eq("id", client_id).execute()
    log_token_usage(client_id, operation, amount, quality, new_balance, session_id)
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


# ─── Daily reward ───

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
