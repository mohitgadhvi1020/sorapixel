from __future__ import annotations

"""Social media discovery — find all social profiles for leads.

Platforms discovered:
  - Instagram, Facebook, Twitter/X, LinkedIn, Pinterest, TikTok, YouTube

Strategy:
  1. Scrape the store's website for social links (footer, about, contact pages)
  2. Use Perplexity to search for missing profiles
"""

import asyncio
import json
import logging
import re
from urllib.parse import urlparse

import httpx

from app.config import get_settings
from app.database import get_supabase

logger = logging.getLogger(__name__)

PAGES_TO_CHECK = [
    "", "/about", "/about-us", "/pages/about", "/pages/about-us",
    "/contact", "/contact-us", "/pages/contact",
]

# ── Platform regex patterns ───────────────────────────────────────────────────

PLATFORM_PATTERNS = {
    "instagram": re.compile(
        r'(?:https?://)?(?:www\.)?instagram\.com/([a-zA-Z0-9_.]+)/?',
        re.IGNORECASE,
    ),
    "facebook": re.compile(
        r'(?:https?://)?(?:www\.)?(?:facebook\.com|fb\.com)/([a-zA-Z0-9._\-]+)/?',
        re.IGNORECASE,
    ),
    "twitter": re.compile(
        r'(?:https?://)?(?:www\.)?(?:twitter\.com|x\.com)/([a-zA-Z0-9_]+)/?',
        re.IGNORECASE,
    ),
    "linkedin": re.compile(
        r'(?:https?://)?(?:www\.)?linkedin\.com/(?:company|in)/([a-zA-Z0-9_\-]+)/?',
        re.IGNORECASE,
    ),
    "pinterest": re.compile(
        r'(?:https?://)?(?:www\.)?pinterest\.com/([a-zA-Z0-9_\-]+)/?',
        re.IGNORECASE,
    ),
    "tiktok": re.compile(
        r'(?:https?://)?(?:www\.)?tiktok\.com/@([a-zA-Z0-9_.]+)/?',
        re.IGNORECASE,
    ),
    "youtube": re.compile(
        r'(?:https?://)?(?:www\.)?youtube\.com/(?:@|c/|channel/|user/)([a-zA-Z0-9_\-]+)/?',
        re.IGNORECASE,
    ),
}

SKIP_HANDLES: dict[str, set[str]] = {
    "instagram": {
        "instagram", "explore", "p", "reel", "reels", "stories",
        "accounts", "about", "developer", "legal", "privacy",
        "terms", "help", "api", "press", "blog", "jobs",
        "share", "direct", "tv", "igtv",
    },
    "facebook": {
        "facebook", "pages", "groups", "events", "marketplace",
        "watch", "gaming", "login", "help", "privacy", "terms",
        "sharer", "share", "dialog", "plugins",
    },
    "twitter": {
        "twitter", "home", "explore", "search", "settings",
        "login", "i", "intent", "share", "hashtag",
    },
    "linkedin": {
        "linkedin", "company", "in", "feed", "jobs", "messaging",
        "notifications", "mynetwork", "learning",
    },
    "pinterest": {
        "pinterest", "pin", "search", "categories", "topics",
    },
    "tiktok": {
        "tiktok", "explore", "foryou", "following", "live",
    },
    "youtube": {
        "youtube", "watch", "results", "channel", "feed",
        "playlist", "shorts", "trending",
    },
}


def _clean_handle(platform: str, raw: str) -> str | None:
    """Clean and validate a social media handle."""
    handle = raw.lower().strip().rstrip("/").rstrip(".")
    if not handle or len(handle) < 2:
        return None
    skip = SKIP_HANDLES.get(platform, set())
    if handle in skip:
        return None
    if handle.startswith("?") or handle.startswith("#"):
        return None
    return handle


def _build_url(platform: str, handle: str) -> str:
    urls = {
        "instagram": f"https://www.instagram.com/{handle}/",
        "facebook": f"https://www.facebook.com/{handle}/",
        "twitter": f"https://x.com/{handle}",
        "linkedin": f"https://www.linkedin.com/company/{handle}/",
        "pinterest": f"https://www.pinterest.com/{handle}/",
        "tiktok": f"https://www.tiktok.com/@{handle}",
        "youtube": f"https://www.youtube.com/@{handle}",
    }
    return urls.get(platform, "")


def _extract_socials_from_html(html: str) -> dict[str, str]:
    """Extract all social media handles from HTML content."""
    found: dict[str, str] = {}
    for platform, pattern in PLATFORM_PATTERNS.items():
        if platform in found:
            continue
        matches = pattern.findall(html)
        for raw_handle in matches:
            handle = _clean_handle(platform, raw_handle)
            if handle:
                found[platform] = handle
                break
    return found


# ── Website scraping ──────────────────────────────────────────────────────────

async def find_socials_from_website(store_url: str) -> dict[str, str]:
    """Scrape the store's website for all social media links."""
    base = store_url.rstrip("/")
    all_found: dict[str, str] = {}

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
                socials = _extract_socials_from_html(resp.text)
                for platform, handle in socials.items():
                    if platform not in all_found:
                        all_found[platform] = handle
            except Exception:
                continue

            if len(all_found) >= len(PLATFORM_PATTERNS):
                break

    return all_found


# ── Perplexity fallback ───────────────────────────────────────────────────────

async def find_socials_via_perplexity(store_name: str, domain: str, missing_platforms: list[str]) -> dict[str, str]:
    """Use Perplexity to find missing social media profiles."""
    settings = get_settings()
    api_key = settings.perplexity_api_key
    if not api_key:
        return {}

    platforms_str = ", ".join(missing_platforms)
    prompt = (
        f'Find the social media profiles for "{store_name}" ({domain}). '
        f'I need their: {platforms_str}. '
        f'Return ONLY a JSON object with platform names as keys and usernames/handles as values. '
        f'Use null for profiles you cannot find. No markdown, no explanation.'
    )

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
                        {"role": "system", "content": "Return ONLY valid JSON. No markdown, no explanation."},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.0,
                },
                timeout=15.0,
            )
            if resp.status_code != 200:
                return {}

            content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
            json_match = re.search(r'\{[\s\S]*\}', content)
            if not json_match:
                return {}

            data = json.loads(json_match.group(0))
            found: dict[str, str] = {}
            for platform, handle in data.items():
                platform_lower = platform.lower().replace(" ", "").replace("_", "")
                if platform_lower in ("x", "twitter", "x/twitter"):
                    platform_lower = "twitter"
                if handle and platform_lower in PLATFORM_PATTERNS:
                    clean = _clean_handle(platform_lower, str(handle).lstrip("@").split("/")[-1])
                    if clean:
                        found[platform_lower] = clean
            return found

        except Exception as exc:
            logger.debug("Perplexity social search failed for %s: %s", domain, exc)

    return {}


# ═══════════════════════════════════════════════════════════════════════════════
# Main social discovery
# ═══════════════════════════════════════════════════════════════════════════════

async def find_socials_for_lead(
    lead_id: str,
    store_name: str,
    store_url: str,
    domain: str,
) -> dict[str, str]:
    """Find all social media profiles for a lead."""

    # Step 1: Scrape website
    socials = await find_socials_from_website(store_url)

    # Step 2: Use Perplexity for missing platforms (only Instagram + Facebook — most valuable)
    priority_platforms = ["instagram", "facebook"]
    missing = [p for p in priority_platforms if p not in socials]
    if missing:
        ai_socials = await find_socials_via_perplexity(store_name, domain, missing)
        for platform, handle in ai_socials.items():
            if platform not in socials:
                socials[platform] = handle

    # Save to database
    if socials:
        _save_socials(lead_id, socials)

    platforms_found = list(socials.keys())
    logger.info("Social discovery for %s: found %s", domain, platforms_found or "none")
    return socials


def _save_socials(lead_id: str, socials: dict[str, str]):
    """Save social media profiles to lead metadata."""
    sb = get_supabase()
    lead = sb.table("leads").select("metadata").eq("id", lead_id).single().execute()
    metadata = lead.data.get("metadata") or {} if lead.data else {}

    social_data: dict[str, dict[str, str]] = metadata.get("socials", {})
    for platform, handle in socials.items():
        social_data[platform] = {
            "handle": handle,
            "url": _build_url(platform, handle),
        }

    metadata["socials"] = social_data

    # Keep backward-compatible instagram fields
    if "instagram" in socials:
        metadata["instagram_handle"] = socials["instagram"]
        metadata["instagram_url"] = _build_url("instagram", socials["instagram"])

    sb.table("leads").update({"metadata": metadata}).eq("id", lead_id).execute()


async def run_social_discovery(batch_size: int = 50) -> dict:
    """Find social profiles for leads that don't have them yet."""
    sb = get_supabase()

    result = sb.table("leads").select("id, store_name, store_url, domain, metadata").limit(batch_size).execute()
    leads = result.data or []

    leads_to_process = [
        l for l in leads
        if not (l.get("metadata") or {}).get("socials")
    ]

    found_count = 0
    not_found = 0

    for lead in leads_to_process:
        socials = await find_socials_for_lead(
            lead["id"], lead["store_name"], lead["store_url"], lead["domain"]
        )
        if socials:
            found_count += 1
        else:
            not_found += 1

        await asyncio.sleep(0.5)

    stats = {
        "processed": len(leads_to_process),
        "found": found_count,
        "not_found": not_found,
    }
    logger.info("Social discovery complete: %s", stats)
    return stats
