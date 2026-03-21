from __future__ import annotations

"""Instagram finder — backward-compatible wrapper around the social discovery service.

This module delegates to app.services.social for the actual work,
keeping existing API endpoints working.
"""

import logging

from app.services.social import find_socials_for_lead, run_social_discovery

logger = logging.getLogger(__name__)


async def find_instagram_for_lead(
    lead_id: str,
    store_name: str,
    store_url: str,
    domain: str,
) -> str | None:
    """Find Instagram for a single lead. Returns handle or None."""
    socials = await find_socials_for_lead(lead_id, store_name, store_url, domain)
    return socials.get("instagram")


async def run_instagram_finder(batch_size: int = 50) -> dict:
    """Find Instagram handles for leads — delegates to full social discovery."""
    stats = await run_social_discovery(batch_size=batch_size)
    return stats
