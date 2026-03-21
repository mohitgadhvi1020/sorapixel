from __future__ import annotations

"""Lead scoring — qualify leads based on multiple signals.

Score range: 0-100
  - 0-29:  Low quality — skip outreach
  - 30-49: Medium — outreach if capacity allows
  - 50-69: Good — prioritize for outreach
  - 70-100: Excellent — high-priority outreach

Signals:
  1. Has personal email (not generic)          +25
  2. Has contact name                          +10
  3. Has phone number                          +5
  4. Has website                               +5
  5. Google rating quality (3.5-4.8 sweet spot) +15
  6. Review count (5-500 = ideal small biz)    +10
  7. Has Instagram                             +5
  8. Has multiple social profiles              +5
  9. Is Shopify store (easy to sell to)         +10
  10. Website quality signals                  +10
"""

import logging
import re

import httpx

from app.config import get_settings
from app.database import get_supabase

logger = logging.getLogger(__name__)


def _score_email(lead: dict) -> int:
    email = lead.get("contact_email")
    if not email:
        return 0
    local = email.split("@")[0].lower()
    generic_prefixes = ["info", "hello", "contact", "support", "help", "sales", "admin", "team"]
    if any(local.startswith(p) for p in generic_prefixes):
        return 10
    return 25


def _score_contact_info(lead: dict) -> int:
    score = 0
    if lead.get("contact_name"):
        score += 10
    if lead.get("phone"):
        score += 5
    if lead.get("store_url"):
        score += 5
    return score


def _score_ratings(metadata: dict) -> int:
    rating = metadata.get("rating")
    rating_count = metadata.get("rating_count", 0)

    score = 0

    if rating is not None:
        if 3.5 <= rating <= 4.8:
            score += 15
        elif 3.0 <= rating < 3.5:
            score += 10
        elif rating > 4.8:
            score += 8
        elif rating < 3.0:
            score += 3

    if 5 <= rating_count <= 500:
        score += 10
    elif 500 < rating_count <= 2000:
        score += 5
    elif rating_count > 2000:
        score += 2

    return score


def _score_social(metadata: dict) -> int:
    score = 0
    socials = metadata.get("socials", {})
    ig = metadata.get("instagram_handle") or socials.get("instagram", {}).get("handle")

    if ig:
        score += 5

    social_count = len(socials)
    if social_count >= 3:
        score += 5
    elif social_count >= 1:
        score += 2

    return score


def _score_platform(lead: dict, metadata: dict) -> int:
    platform = lead.get("platform", "")
    is_shopify = metadata.get("is_shopify", False)

    if platform == "shopify" or is_shopify:
        return 10
    return 0


async def _score_website_quality(store_url: str) -> int:
    """Check website quality signals — is it a real, active e-commerce site?"""
    if not store_url:
        return 0

    score = 0
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                store_url, timeout=10.0, follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"},
            )
            if resp.status_code != 200:
                return 0

            html = resp.text.lower()

            if any(sig in html for sig in ["add to cart", "add to bag", "buy now", "shop now"]):
                score += 4

            if any(sig in html for sig in ["cdn.shopify.com", "shopify.com/s/files"]):
                score += 3

            if len(html) > 10000:
                score += 3

    except Exception:
        pass

    return min(score, 10)


def compute_score_sync(lead: dict) -> int:
    """Compute lead score synchronously (without website check)."""
    metadata = lead.get("metadata") or {}

    score = 0
    score += _score_email(lead)
    score += _score_contact_info(lead)
    score += _score_ratings(metadata)
    score += _score_social(metadata)
    score += _score_platform(lead, metadata)

    return min(score, 100)


async def compute_score(lead: dict, check_website: bool = False) -> int:
    """Compute lead score with optional website quality check."""
    score = compute_score_sync(lead)

    if check_website and lead.get("store_url"):
        website_score = await _score_website_quality(lead["store_url"])
        score += website_score

    return min(score, 100)


def score_label(score: int) -> str:
    if score >= 70:
        return "excellent"
    elif score >= 50:
        return "good"
    elif score >= 30:
        return "medium"
    return "low"


# ═══════════════════════════════════════════════════════════════════════════════
# Batch scoring
# ═══════════════════════════════════════════════════════════════════════════════

async def score_lead(lead_id: str, check_website: bool = False) -> dict:
    """Score a single lead and save to database."""
    sb = get_supabase()
    lead = sb.table("leads").select("*").eq("id", lead_id).single().execute()
    if not lead.data:
        return {"error": "Lead not found"}

    score = await compute_score(lead.data, check_website=check_website)
    label = score_label(score)

    metadata = lead.data.get("metadata") or {}
    metadata["lead_score"] = score
    metadata["lead_score_label"] = label

    sb.table("leads").update({"metadata": metadata}).eq("id", lead_id).execute()

    return {"lead_id": lead_id, "score": score, "label": label}


async def run_scoring(batch_size: int = 100, check_website: bool = False) -> dict:
    """Score all unscored leads."""
    sb = get_supabase()

    result = sb.table("leads").select("*").limit(batch_size).execute()
    leads = result.data or []

    leads_to_score = [
        l for l in leads
        if not (l.get("metadata") or {}).get("lead_score")
    ]

    scored = 0
    score_distribution = {"excellent": 0, "good": 0, "medium": 0, "low": 0}

    for lead in leads_to_score:
        score = await compute_score(lead, check_website=check_website)
        label = score_label(score)

        metadata = lead.get("metadata") or {}
        metadata["lead_score"] = score
        metadata["lead_score_label"] = label

        sb.table("leads").update({"metadata": metadata}).eq("id", lead["id"]).execute()
        scored += 1
        score_distribution[label] += 1

    stats = {
        "processed": len(leads_to_score),
        "scored": scored,
        "distribution": score_distribution,
    }
    logger.info("Scoring complete: %s", stats)
    return stats
