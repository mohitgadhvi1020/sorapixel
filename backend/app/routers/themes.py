from __future__ import annotations

"""Themes router — browsable curated photography themes."""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.services.theme_service import (
    get_all_themes,
    get_theme_by_id,
    get_theme_categories,
)

router = APIRouter(prefix="/themes", tags=["Themes"])


@router.get("")
async def list_themes(jewelry_type: Optional[str] = Query(None)):
    """Return available themes, optionally filtered by jewelry type."""
    themes = get_all_themes(jewelry_type=jewelry_type)
    categories = get_theme_categories()
    return {
        "themes": themes,
        "categories": categories,
    }


@router.get("/{theme_id}")
async def get_theme(theme_id: str):
    """Return a single theme with full shot details."""
    theme = get_theme_by_id(theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    return theme
