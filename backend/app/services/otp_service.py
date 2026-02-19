from __future__ import annotations

"""OTP service -- stores OTP in Supabase DB (simple for 100 DAU, upgrade to Redis later)."""

import random
import logging
from datetime import datetime, timezone, timedelta
import httpx
from app.config import get_settings
from app.database import get_supabase

logger = logging.getLogger(__name__)


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


def send_otp(phone: str) -> dict:
    """Generate OTP, store in DB, and send via MSG91 (or log in dev mode).
    Returns {"success": bool, "message": str}
    """
    settings = get_settings()
    otp = generate_otp()
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=settings.otp_expire_minutes)).isoformat()

    sb = get_supabase()

    sb.table("otps").upsert({
        "phone": phone,
        "code": otp,
        "attempts": 0,
        "expires_at": expires_at,
    }, on_conflict="phone").execute()

    if not settings.msg91_auth_key:
        logger.warning(f"[DEV MODE] OTP for {phone}: {otp}")
        return {"success": True, "message": "OTP sent (dev mode)"}

    try:
        resp = httpx.post(
            "https://control.msg91.com/api/v5/otp",
            headers={"authkey": settings.msg91_auth_key},
            json={
                "template_id": settings.msg91_template_id,
                "mobile": f"91{phone}" if not phone.startswith("91") else phone,
                "otp": otp,
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        return {"success": True, "message": "OTP sent"}
    except Exception as e:
        logger.error(f"MSG91 error: {e}")
        return {"success": False, "message": "Failed to send OTP. Try again."}


def verify_otp(phone: str, code: str) -> bool:
    """Verify OTP from DB. Returns True if valid."""
    sb = get_supabase()
    result = sb.table("otps").select("*").eq("phone", phone).single().execute()

    if not result.data:
        return False

    stored = result.data
    if stored.get("code") != code:
        attempts = (stored.get("attempts", 0) or 0) + 1
        sb.table("otps").update({"attempts": attempts}).eq("phone", phone).execute()
        if attempts >= 5:
            sb.table("otps").delete().eq("phone", phone).execute()
        return False

    expires_at = stored.get("expires_at", "")
    if expires_at:
        try:
            exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > exp:
                sb.table("otps").delete().eq("phone", phone).execute()
                return False
        except (ValueError, TypeError):
            pass

    sb.table("otps").delete().eq("phone", phone).execute()
    return True
