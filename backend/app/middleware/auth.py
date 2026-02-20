from __future__ import annotations

"""Auth middleware — validates Supabase JWT tokens and auto-syncs user to clients table."""

import logging
import httpx
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_supabase
from app.config import get_settings

logger = logging.getLogger(__name__)

security = HTTPBearer()


def _verify_supabase_token(token: str) -> dict | None:
    """Verify a Supabase access token by calling the Auth API directly.

    Avoids the gotrue-py client's internal session state issues.
    """
    settings = get_settings()
    try:
        resp = httpx.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_anon_key,
            },
            timeout=10.0,
        )
        if resp.status_code != 200:
            logger.debug("Supabase token verification returned %s", resp.status_code)
            return None
        return resp.json()
    except Exception as e:
        logger.error("Supabase token verification error: %s", e)
        return None


def _ensure_client_record(supabase_user: dict) -> dict:
    """Look up or create a record in the clients table for the Supabase auth user."""
    sb = get_supabase()
    settings = get_settings()
    user_id = supabase_user["id"]

    result = sb.table("clients").select("*").eq("id", user_id).maybe_single().execute()
    if result and result.data:
        user_data = result.data
        if user_data.get("category_id") and not user_data.get("category_slug"):
            cat = sb.table("categories").select("slug").eq("id", user_data["category_id"]).maybe_single().execute()
            if cat and cat.data:
                user_data["category_slug"] = cat.data["slug"]
        return user_data

    email = supabase_user.get("email", "")
    phone = supabase_user.get("phone", "")
    metadata = supabase_user.get("user_metadata", {}) or {}
    name = metadata.get("name", metadata.get("full_name", ""))

    is_admin = False
    if phone and phone.lstrip("+").lstrip("91") in settings.admin_phone_list:
        is_admin = True
    if email and email.lower() in settings.admin_email_list:
        is_admin = True

    clean_phone = phone.lstrip("+").lstrip("91") if phone else None

    new_record = {
        "id": user_id,
        "email": email or None,
        "phone": clean_phone if clean_phone else None,
        "company_name": "",
        "contact_name": name,
        "is_active": True,
        "is_admin": is_admin,
        "token_balance": 0,
        "studio_free_used": 0,
        "allowed_sections": ["studio", "jewelry"],
        "subscription_plan": "free",
        "apply_branding": False,
    }

    try:
        sb.table("clients").upsert(new_record, on_conflict="id").execute()
    except Exception as e:
        logger.warning("Upsert failed (likely duplicate phone/email), trying insert without phone: %s", e)
        new_record.pop("phone", None)
        try:
            sb.table("clients").insert(new_record).execute()
        except Exception:
            pass

    result = sb.table("clients").select("*").eq("id", user_id).maybe_single().execute()
    return result.data if result else None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Extract and validate current user from Supabase JWT token."""
    token = credentials.credentials

    supabase_user = _verify_supabase_token(token)
    if not supabase_user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_data = _ensure_client_record(supabase_user)

    if not user_data:
        raise HTTPException(status_code=401, detail="User not found")
    if not user_data.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")

    return user_data


async def get_current_user_optional(request: Request) -> dict | None:
    """Optionally extract user — returns None if no valid token."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]
    supabase_user = _verify_supabase_token(token)
    if not supabase_user:
        return None

    try:
        return _ensure_client_record(supabase_user)
    except Exception:
        return None


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Require the current user to be an admin."""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
