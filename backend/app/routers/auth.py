from __future__ import annotations

"""Auth router — minimal endpoints now that Supabase handles authentication directly."""

import logging
from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/logout")
async def logout():
    """Client-side logout acknowledgement. Actual session invalidation happens via Supabase client."""
    return {"success": True, "message": "Logged out"}
