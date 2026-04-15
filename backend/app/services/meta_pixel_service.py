from __future__ import annotations

"""Meta Pixel Conversions API (CAPI) service for server-side event tracking."""

import hashlib
import logging
import time

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v18.0"


def _hash_value(value: str) -> str:
    """SHA-256 hash a value (lowercased, stripped) for Meta user_data fields."""
    return hashlib.sha256(value.strip().lower().encode()).hexdigest()


def send_event(
    event_name: str,
    event_id: str,
    user_data: dict | None = None,
    custom_data: dict | None = None,
    event_source_url: str | None = None,
    event_time: int | None = None,
) -> bool:
    """Send a single event to Meta Conversions API. Returns True on success."""
    settings = get_settings()
    if not settings.meta_pixel_id or not settings.meta_access_token:
        logger.warning("Meta Pixel not configured — skipping CAPI event")
        return False

    url = f"https://graph.facebook.com/{GRAPH_API_VERSION}/{settings.meta_pixel_id}/events"

    payload = {
        "data": [
            {
                "event_name": event_name,
                "event_time": event_time or int(time.time()),
                "event_id": event_id,
                "action_source": "website",
                **({"event_source_url": event_source_url} if event_source_url else {}),
                **({"user_data": user_data} if user_data else {}),
                **({"custom_data": custom_data} if custom_data else {}),
            }
        ],
        "access_token": settings.meta_access_token,
    }

    # Attempt with 1 retry
    for attempt in range(2):
        try:
            resp = httpx.post(url, json=payload, timeout=10)
            if resp.status_code == 200:
                logger.info("CAPI event sent: %s (event_id=%s)", event_name, event_id)
                return True
            logger.error(
                "CAPI error (attempt %d): %s %s", attempt + 1, resp.status_code, resp.text
            )
        except httpx.HTTPError as e:
            logger.error("CAPI request failed (attempt %d): %s", attempt + 1, e)

        if attempt == 0:
            time.sleep(2)

    return False


def build_user_data(
    email: str | None = None,
    phone: str | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
) -> dict:
    """Build hashed user_data dict for CAPI."""
    data: dict = {}
    if email:
        data["em"] = [_hash_value(email)]
    if phone:
        # Strip formatting: +, spaces, dashes
        cleaned = phone.replace("+", "").replace(" ", "").replace("-", "")
        data["ph"] = [_hash_value(cleaned)]
    if ip:
        data["client_ip_address"] = ip
    if user_agent:
        data["client_user_agent"] = user_agent
    return data


def send_purchase_event(
    event_id: str,
    value: float,
    currency: str,
    email: str | None = None,
    phone: str | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
    event_source_url: str | None = None,
) -> bool:
    return send_event(
        event_name="Purchase",
        event_id=event_id,
        user_data=build_user_data(email, phone, ip, user_agent),
        custom_data={"value": value, "currency": currency},
        event_source_url=event_source_url,
    )


def send_lead_event(
    event_id: str,
    email: str | None = None,
    phone: str | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
    event_source_url: str | None = None,
) -> bool:
    return send_event(
        event_name="Lead",
        event_id=event_id,
        user_data=build_user_data(email, phone, ip, user_agent),
        event_source_url=event_source_url,
    )
