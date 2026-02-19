from __future__ import annotations

"""Razorpay payment service."""

import hmac
import hashlib
import logging
import httpx
from base64 import b64encode
from app.config import get_settings
from app.services.credit_service import TOKEN_BUNDLES, add_tokens

logger = logging.getLogger(__name__)

SUBSCRIPTION_PLANS = [
    {
        "id": "trial_1",
        "name": "Trial Plan",
        "type": "trial",
        "price_inr": 1,
        "tokens": 7,
        "description": "Try SoraPixel with 7 free images for just ₹1",
    },
    {
        "id": "monthly_299",
        "name": "Premium Monthly",
        "type": "subscription",
        "price_inr": 299,
        "tokens": 100,
        "description": "100 tokens/month + premium features",
    },
]

ALL_PLANS = TOKEN_BUNDLES + SUBSCRIPTION_PLANS


def get_all_plans() -> list[dict]:
    return ALL_PLANS


def create_razorpay_order(plan_id: str) -> dict:
    """Create a Razorpay order for the given plan."""
    settings = get_settings()
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        return {"success": False, "error": "Payment not configured"}

    plan = next((p for p in ALL_PLANS if p["id"] == plan_id), None)
    if not plan:
        return {"success": False, "error": f"Unknown plan: {plan_id}"}

    amount_paise = plan["price_inr"] * 100
    auth = b64encode(f"{settings.razorpay_key_id}:{settings.razorpay_key_secret}".encode()).decode()

    try:
        resp = httpx.post(
            "https://api.razorpay.com/v1/orders",
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/json",
            },
            json={
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"sorapixel_{plan_id}",
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()

        return {
            "success": True,
            "order_id": data["id"],
            "amount": amount_paise,
            "currency": "INR",
            "key_id": settings.razorpay_key_id,
        }
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        return {"success": False, "error": "Payment service unavailable"}


def verify_razorpay_payment(order_id: str, payment_id: str, signature: str) -> bool:
    """Verify Razorpay payment signature."""
    settings = get_settings()
    message = f"{order_id}|{payment_id}"
    expected = hmac.new(
        settings.razorpay_key_secret.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def fulfill_payment(client_id: str, plan_id: str, razorpay_order_id: str, razorpay_payment_id: str) -> dict:
    """After successful payment, add tokens and record in DB."""
    from app.database import get_supabase

    plan = next((p for p in ALL_PLANS if p["id"] == plan_id), None)
    if not plan:
        return {"success": False, "error": "Unknown plan"}

    tokens = plan.get("tokens", 0)
    if tokens > 0:
        add_tokens(client_id, tokens)

    sb = get_supabase()
    sb.table("payments").insert({
        "client_id": client_id,
        "razorpay_order_id": razorpay_order_id,
        "razorpay_payment_id": razorpay_payment_id,
        "amount_paise": plan["price_inr"] * 100,
        "plan_type": plan.get("type", "token_pack"),
        "tokens_added": tokens,
        "status": "success",
    }).execute()

    return {"success": True, "tokens_added": tokens}
