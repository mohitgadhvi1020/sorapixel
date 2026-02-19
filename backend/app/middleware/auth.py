from __future__ import annotations

from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.utils.security import decode_token
from app.database import get_supabase

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Extract and validate current user from JWT token."""
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    sb = get_supabase()
    result = sb.table("clients").select("*").eq("id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=401, detail="User not found")
    if not result.data.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")

    return result.data


async def get_current_user_optional(request: Request) -> dict | None:
    """Optionally extract user -- returns None if no valid token."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:]
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    sb = get_supabase()
    result = sb.table("clients").select("*").eq("id", user_id).single().execute()
    return result.data if result.data else None


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Require the current user to be an admin."""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
