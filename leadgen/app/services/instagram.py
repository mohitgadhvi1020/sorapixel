from __future__ import annotations

"""Instagram finder — discover Instagram handles for leads.

Strategy:
  1. Scrape the store's website for Instagram links (footer, about page, contact page)
  2. Use Perplexity to search for the store's Instagram account
"""

import asyncio
import json
import logging
import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from app.config import get_settings
from app.database import get_supabase

logger = logging.getLogger(__name__)

IG_URL_RE = re.compile(
    r'(?:https?://)?(?:www\.)?instagram\.com/([a-zA-Z0-9_.]+)/?',
    re.IGNORECASE,
)

SKIP_HANDLES = {
    "instagram", "explore", "p", "reel", "reels", "stories",
    "accounts", "about", "developer", "legal", "privacy",
    "terms", "help", "api", "press", "blog", "jobs",
    "share", "direct", "tv", "igtv",
}

PAGES_TO_CHECK = [
    "", "/about", "/about-us", "/pages/about", "/pages/about-us",
    "/contact", "/contact-us", "/pages/contact",
]


def _extract_ig_handle(url_or_handle: str) -> str | None:
    """Extract a clean Instagram handle from a URL or raw handle."""
    match = IG_URL_RE.search(url_or_handle)
    if match:
        handle = match.group(1).lower().rstrip("/").rstrip(".")
        if handle not in SKIP_HANDLES and len(handle) > 1:
            return handle
    return None


def _extract_ig_from_html(html: str) -> str | None:
    """Find Instagram links in HTML content."""
    matches = IG_URL_RE.findall(html)
    for handle in matches:
        clean = handle.lower().rstrip("/").rstrip(".")
        if clean not in SKIP_HANDLES and len(clean) > 1:
            return clean
    return None


async def find_instagram_from_website(store_url: str) -> str | None:
    """Scrape the store's website for Instagram links."""
    base = store_url.rstrip("/")

    async with httpx.AsyncClient() as client:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        }

        for path in PAGES_TO_CHECK:
            url = f"{base}{path}"
            try:
                resp = await client.get(url, headers=headers, timeout=10.0, follow_redirects=True)
                if resp.status_code != 200:
                    continue

                handle = _extract_ig_from_html(resp.text)
                if handle:
                    return handle

            except Exception:
                continue

    return None


async def find_instagram_via_perplexity(store_name: str, domain: str) -> str | None:
    """Use Perplexity to find the store's Instagram handle."""
    settings = get_settings()
    api_key = settings.perplexity_api_key
    if not api_key:
        return None

    prompt = f'What is the Instagram handle/username for "{store_name}" ({domain})? Return ONLY the Instagram username (without @), nothing else. If you cannot find it, return "NOT_FOUND".'

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                "https://api.perplexity.ai/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "sonar",
                    "messages": [
                        {"role": "system", "content": "Return ONLY the Instagram username. No explanation, no @, no URL."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.0,
                },
                timeout=15.0,
            )
            if resp.status_code != 200:
                return None

            content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()

            if "NOT_FOUND" in content.upper() or not content:
                return None

            clean = content.strip().lstrip("@").split()[0].split("/")[-1].rstrip(".")
            if clean and clean.lower() not in SKIP_HANDLES and len(clean) > 1:
                return clean.lower()

        except Exception as exc:
            logger.debug("Perplexity IG search failed for %s: %s", domain, exc)

    return None


async def find_instagram_for_lead(lead_id: str, store_name: str, store_url: str, domain: str) -> str | None:
    """Find Instagram for a single lead. Returns handle or None."""

    # Method 1: Scrape website
    handle = await find_instagram_from_website(store_url)
    if handle:
        logger.info("Found IG for %s via website: @%s", domain, handle)
        _save_instagram(lead_id, handle)
        return handle

    # Method 2: Perplexity search
    handle = await find_instagram_via_perplexity(store_name, domain)
    if handle:
        logger.info("Found IG for %s via Perplexity: @%s", domain, handle)
        _save_instagram(lead_id, handle)
        return handle

    logger.debug("No Instagram found for %s", domain)
    return None


def _save_instagram(lead_id: str, handle: str):
    """Save Instagram handle to lead metadata."""
    sb = get_supabase()
    lead = sb.table("leads").select("metadata").eq("id", lead_id).single().execute()
    metadata = lead.data.get("metadata") or {} if lead.data else {}
    metadata["instagram_url"] = f"https://www.instagram.com/{handle}/"
    metadata["instagram_handle"] = handle
    sb.table("leads").update({"metadata": metadata}).eq("id", lead_id).execute()


async def run_instagram_finder(batch_size: int = 50) -> dict:
    """Find Instagram handles for leads that don't have one yet."""
    sb = get_supabase()

    result = sb.table("leads").select("id, store_name, store_url, domain, metadata").limit(batch_size).execute()
    leads = result.data or []

    # Filter to leads without Instagram
    leads_to_process = [
        l for l in leads
        if not (l.get("metadata") or {}).get("instagram_handle")
    ]

    found = 0
    not_found = 0

    for lead in leads_to_process:
        handle = await find_instagram_for_lead(
            lead["id"], lead["store_name"], lead["store_url"], lead["domain"]
        )
        if handle:
            found += 1
        else:
            not_found += 1

        await asyncio.sleep(0.5)

    stats = {"processed": len(leads_to_process), "found": found, "not_found": not_found}
    logger.info("Instagram finder complete: %s", stats)
    return stats
