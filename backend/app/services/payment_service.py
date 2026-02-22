from __future__ import annotations

"""Payment & plan service."""

import logging
from app.services.credit_service import add_tokens

logger = logging.getLogger(__name__)

PLANS = [
    {
        "id": "starter_199",
        "name": "Starter Pack",
        "type": "token_pack",
        "price_inr": 199,
        "tokens": 100,
        "description": "100 tokens — perfect for your first catalogue shoot",
        "recommended": False,
    },
    {
        "id": "pro_999",
        "name": "Pro Monthly",
        "type": "subscription",
        "price_inr": 999,
        "tokens": 500,
        "description": "500 tokens/month, HD upscale included, no watermark",
        "recommended": True,
    },
    {
        "id": "business_2499",
        "name": "Business Monthly",
        "type": "subscription",
        "price_inr": 2499,
        "tokens": 1500,
        "description": "1500 tokens/month, bulk listings, priority support",
        "recommended": False,
    },
    {
        "id": "50_tokens",
        "name": "50 Tokens",
        "type": "token_pack",
        "price_inr": 500,
        "tokens": 50,
        "description": "Top-up pack",
        "recommended": False,
    },
    {
        "id": "200_tokens",
        "name": "200 Tokens",
        "type": "token_pack",
        "price_inr": 1500,
        "tokens": 200,
        "description": "Top-up pack",
        "recommended": False,
    },
    {
        "id": "500_tokens",
        "name": "500 Tokens",
        "type": "token_pack",
        "price_inr": 3000,
        "tokens": 500,
        "description": "Top-up pack",
        "recommended": False,
    },
]


def get_all_plans() -> list[dict]:
    return PLANS


def get_plan_by_id(plan_id: str) -> dict | None:
    return next((p for p in PLANS if p["id"] == plan_id), None)


def fulfill_manual_payment(client_id: str, plan_id: str) -> dict:
    """Admin-triggered fulfillment — add tokens after manual payment confirmation."""
    plan = get_plan_by_id(plan_id)
    if not plan:
        return {"success": False, "error": "Unknown plan"}

    tokens = plan.get("tokens", 0)
    if tokens > 0:
        add_tokens(client_id, tokens)

    return {"success": True, "tokens_added": tokens}
