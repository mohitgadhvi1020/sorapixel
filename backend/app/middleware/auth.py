from __future__ import annotations

"""Auth middleware — validates Supabase JWT tokens and auto-syncs user to clients table."""

import hashlib
import logging
import time
import httpx
from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_supabase
from app.config import get_settings

logger = logging.getLogger(__name__)

security = HTTPBearer()

# Short-TTL in-process cache for (token → user_data) so parallel API calls on a
# single page load don't each pay Supabase + DB round-trips. Bounded by JWT
# lifetime; safe to cache briefly since token revocation is not instantaneous
# with Supabase anyway.
_USER_CACHE: dict[str, tuple[float, dict]] = {}
_USER_CACHE_TTL_SECONDS = 60
_USER_CACHE_MAX_ENTRIES = 1000


def _token_key(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _cache_get(token: str) -> dict | None:
    key = _token_key(token)
    entry = _USER_CACHE.get(key)
    if not entry:
        return None
    expires_at, user_data = entry
    if time.time() >= expires_at:
        _USER_CACHE.pop(key, None)
        return None
    return user_data


def _cache_put(token: str, user_data: dict) -> None:
    if len(_USER_CACHE) >= _USER_CACHE_MAX_ENTRIES:
        # Cheap eviction: drop the oldest ~10% of entries.
        for k in list(_USER_CACHE.keys())[: _USER_CACHE_MAX_ENTRIES // 10]:
            _USER_CACHE.pop(k, None)
    _USER_CACHE[_token_key(token)] = (time.time() + _USER_CACHE_TTL_SECONDS, user_data)


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

        email = supabase_user.get("email", "")
        phone = supabase_user.get("phone", "")
        should_be_admin = False
        if phone:
            clean = phone.lstrip("+")
            if clean.startswith("91"):
                clean = clean[2:]
            if clean in settings.admin_phone_list:
                should_be_admin = True
        if email and email.lower() in settings.admin_email_list:
            should_be_admin = True

        if should_be_admin != user_data.get("is_admin", False):
            try:
                sb.table("clients").update({"is_admin": should_be_admin}).eq("id", user_id).execute()
                user_data["is_admin"] = should_be_admin
            except Exception as e:
                logger.warning("Failed to sync admin flag for %s: %s", user_id, e)

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

    clean_phone = None
    if phone:
        p = phone.lstrip("+")
        if p.startswith("91"):
            p = p[2:]
        clean_phone = p
    
    # The database requires an email, so we generate a dummy one for phone-only logins
    final_email = email
    if not final_email and clean_phone:
        final_email = f"{clean_phone}@phone.sorapixel.com"
    elif not final_email:
        final_email = f"{user_id}@placeholder.sorapixel.com"

    new_record = {
        "id": user_id,
        "email": final_email,
        "phone": clean_phone,
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

    cached = _cache_get(token)
    if cached is not None:
        return cached

    supabase_user = _verify_supabase_token(token)
    if not supabase_user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_data = _ensure_client_record(supabase_user)

    if not user_data:
        raise HTTPException(status_code=401, detail="User not found")
    if not user_data.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")

    _cache_put(token, user_data)
    return user_data


async def get_current_user_optional(request: Request) -> dict | None:
    """Optionally extract user — returns None if no valid token."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header[7:]

    cached = _cache_get(token)
    if cached is not None:
        return cached

    supabase_user = _verify_supabase_token(token)
    if not supabase_user:
        return None

    try:
        user_data = _ensure_client_record(supabase_user)
        if user_data:
            _cache_put(token, user_data)
        return user_data
    except Exception:
        return None


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Require the current user to be an admin."""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
