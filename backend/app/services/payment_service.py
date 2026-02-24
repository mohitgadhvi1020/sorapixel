from __future__ import annotations

"""Payment & plan service with Razorpay integration."""

import logging
from datetime import datetime, timezone

import razorpay

from app.config import get_settings
from app.database import get_supabase
from app.services.credit_service import add_tokens

logger = logging.getLogger(__name__)

PLANS = [
    {
        "id": "starter_199",
        "name": "Starter Pack",
        "type": "token_pack",
        "price_inr": 199,
        "price_usd": 499,
        "tokens": 40,
        "description": "40 tokens — 5 Standard images or 2 Pro images",
        "recommended": False,
    },
    {
        "id": "basic_499",
        "name": "Basic Pack",
        "type": "token_pack",
        "price_inr": 499,
        "price_usd": 1499,
        "tokens": 120,
        "description": "120 tokens — 15 Standard images or 6 Pro images",
        "recommended": False,
    },
    {
        "id": "pro_999",
        "name": "Pro Pack",
        "type": "token_pack",
        "price_inr": 999,
        "price_usd": 2999,
        "tokens": 280,
        "description": "280 tokens — 35 Standard images or 14 Pro images",
        "recommended": False,
    },
    {
        "id": "growth_799",
        "name": "Growth Monthly",
        "type": "subscription",
        "price_inr": 799,
        "price_usd": 1999,
        "tokens": 250,
        "description": "250 tokens/month — 31 Standard or 12 Pro images monthly",
        "recommended": True,
    },
    {
        "id": "business_1999",
        "name": "Business Monthly",
        "type": "subscription",
        "price_inr": 1999,
        "price_usd": 4999,
        "tokens": 800,
        "description": "800 tokens/month — 100 Standard or 40 Pro images monthly",
        "recommended": False,
    },
]


def _get_razorpay_client() -> razorpay.Client:
    settings = get_settings()
    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


def get_all_plans() -> list[dict]:
    return PLANS


def get_plan_by_id(plan_id: str) -> dict | None:
    return next((p for p in PLANS if p["id"] == plan_id), None)


def create_razorpay_order(client_id: str, plan_id: str, currency: str = "INR") -> dict:
    """Create a Razorpay order for the given plan and record it in the DB.

    currency: "INR" (default) or "USD". USD orders enable PayPal checkout for
    international customers.
    """
    plan = get_plan_by_id(plan_id)
    if not plan:
        return {"success": False, "error": "Unknown plan"}

    currency = currency.upper()
    if currency not in ("INR", "USD"):
        return {"success": False, "error": "Unsupported currency. Use INR or USD."}

    if currency == "USD":
        amount_minor = plan["price_usd"]  # already in cents
    else:
        amount_minor = plan["price_inr"] * 100  # convert rupees to paise

    client = _get_razorpay_client()

    order_data = {
        "amount": amount_minor,
        "currency": currency,
        "notes": {
            "client_id": client_id,
            "plan_id": plan_id,
            "plan_name": plan["name"],
        },
    }

    try:
        order = client.order.create(data=order_data)
    except Exception as e:
        logger.error("Razorpay order creation failed: %s", e)
        return {"success": False, "error": "Payment gateway error. Please try again."}

    sb = get_supabase()
    try:
        sb.table("payments").insert({
            "client_id": client_id,
            "razorpay_order_id": order["id"],
            "amount_paise": amount_minor,
            "currency": currency,
            "plan_type": plan_id,
            "tokens_added": plan["tokens"],
            "status": "created",
        }).execute()
    except Exception as e:
        logger.error("Failed to record payment in DB: %s", e)

    return {
        "success": True,
        "order_id": order["id"],
        "amount": amount_minor,
        "currency": currency,
        "plan": plan,
    }


def verify_razorpay_payment(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    client_id: str,
) -> dict:
    """Verify the Razorpay payment signature and fulfill the order."""
    client = _get_razorpay_client()

    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature,
        })
    except razorpay.errors.SignatureVerificationError:
        logger.warning("Signature mismatch for order %s", razorpay_order_id)
        return {"success": False, "error": "Payment verification failed"}

    sb = get_supabase()
    result = sb.table("payments").select("*").eq(
        "razorpay_order_id", razorpay_order_id
    ).maybe_single().execute()

    if not result or not result.data:
        logger.warning("Payment record not found for order %s", razorpay_order_id)
        return {"success": False, "error": "Payment record not found"}

    payment = result.data
    if payment["status"] == "paid":
        return {"success": True, "already_fulfilled": True, "tokens_added": payment["tokens_added"]}

    if payment.get("client_id") and payment["client_id"] != client_id:
        logger.warning("Client mismatch for order %s", razorpay_order_id)
        return {"success": False, "error": "Unauthorized"}

    sb.table("payments").update({
        "razorpay_payment_id": razorpay_payment_id,
        "status": "paid",
    }).eq("razorpay_order_id", razorpay_order_id).execute()

    tokens = payment.get("tokens_added", 0)
    if tokens > 0:
        add_tokens(client_id, tokens)

    plan = get_plan_by_id(payment.get("plan_type", ""))
    if plan and plan.get("type") == "subscription":
        from datetime import timedelta
        expires = datetime.now(timezone.utc) + timedelta(days=30)
        sb.table("clients").update({
            "subscription_plan": payment["plan_type"],
            "subscription_expires_at": expires.isoformat(),
        }).eq("id", client_id).execute()

    logger.info("Payment fulfilled: order=%s tokens=%s client=%s", razorpay_order_id, tokens, client_id)
    return {"success": True, "tokens_added": tokens}


def handle_razorpay_webhook(payload: dict, signature: str) -> dict:
    """Handle Razorpay webhook events (payment.captured, etc.).

    Acts as a safety net — the primary fulfillment happens in verify_razorpay_payment
    after the client-side callback. The webhook ensures tokens are credited even if the
    user closes the browser before the verify call completes.
    """
    event = payload.get("event", "")
    if event == "payment.captured":
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        payment_id = payment_entity.get("id")

        if order_id and payment_id:
            sb = get_supabase()
            result = sb.table("payments").select("*").eq(
                "razorpay_order_id", order_id
            ).maybe_single().execute()

            if result and result.data and result.data["status"] != "paid":
                payment_rec = result.data
                sb.table("payments").update({
                    "razorpay_payment_id": payment_id,
                    "status": "paid",
                }).eq("razorpay_order_id", order_id).execute()

                tokens = payment_rec.get("tokens_added", 0)
                client_id = payment_rec.get("client_id")
                if tokens > 0 and client_id:
                    add_tokens(client_id, tokens)
                    logger.info("Webhook fulfilled: order=%s tokens=%s", order_id, tokens)

    return {"status": "ok"}


def fulfill_manual_payment(client_id: str, plan_id: str) -> dict:
    """Admin-triggered fulfillment — add tokens after manual payment confirmation."""
    plan = get_plan_by_id(plan_id)
    if not plan:
        return {"success": False, "error": "Unknown plan"}

    tokens = plan.get("tokens", 0)
    if tokens > 0:
        add_tokens(client_id, tokens)

    return {"success": True, "tokens_added": tokens}
