from __future__ import annotations

"""Home feed router -- NEW feature for pre-generated examples."""

from fastapi import APIRouter, Query
from app.database import get_supabase
from app.middleware.auth import get_current_user_optional
from fastapi import Depends, Request

router = APIRouter(prefix="/feed", tags=["Feed"])


@router.get("/")
async def get_feed(
    category: str | None = None,
    item_type: str | None = None,
    page: int = 1,
    limit: int = 10,
):
    sb = get_supabase()
    query = sb.table("feed_items").select("*").eq("is_active", True).order("display_order")

    if category:
        query = query.eq("category_id", category)
    if item_type:
        query = query.eq("item_type", item_type)

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    result = query.execute()

    return {"items": result.data or [], "page": page, "limit": limit}


@router.get("/categories")
async def get_categories():
    sb = get_supabase()
    result = sb.table("categories").select("*").eq(
        "is_active", True
    ).order("display_order").execute()
    return {"categories": result.data or []}
