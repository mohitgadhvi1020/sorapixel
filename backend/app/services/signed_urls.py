from __future__ import annotations

"""Shared helper for generating Supabase Storage signed URLs in batch.

Replaces per-row `create_signed_url` loops (one HTTPS POST per call) with a
single `create_signed_urls` call, cutting list-endpoint latency from
N × RTT (~3–6 s for N=50) down to one round-trip (~100–200 ms).
"""

import logging
from typing import Iterable

logger = logging.getLogger(__name__)

BUCKET = "sorapixel-images"


def sign_many(sb, paths: Iterable[str | None], expires: int = 3600) -> dict[str, str]:
    """Return a {path -> signed_url} map for the given non-empty paths.

    - De-duplicates paths before calling Supabase.
    - Silently drops falsy paths.
    - Returns an empty map if the Supabase call fails, so callers can fall
      back to empty strings without raising.
    """
    unique: list[str] = []
    seen: set[str] = set()
    for p in paths:
        if p and p not in seen:
            seen.add(p)
            unique.append(p)

    if not unique:
        return {}

    try:
        res = sb.storage.from_(BUCKET).create_signed_urls(unique, expires)
    except Exception as e:
        logger.error(f"sign_many batch failed for {len(unique)} paths: {e}")
        return {}

    out: dict[str, str] = {}
    for item in res or []:
        if not isinstance(item, dict):
            continue
        path = item.get("path")
        url = item.get("signedURL") or item.get("signedUrl") or ""
        if path and url:
            out[path] = url
    return out


def sign_one(sb, path: str | None, expires: int = 3600) -> str:
    """Single-path convenience wrapper; still one round-trip but via batch API."""
    if not path:
        return ""
    return sign_many(sb, [path], expires).get(path, "")
