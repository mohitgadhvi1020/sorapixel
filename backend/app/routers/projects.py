from __future__ import annotations

"""Projects router -- NEW feature for organizing generated content."""

import logging
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.database import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/projects", tags=["Projects"])

BUCKET = "sorapixel-images"


def _signed_url(sb, path: str, expires: int = 3600) -> str:
    try:
        res = sb.storage.from_(BUCKET).create_signed_url(path, expires)
        return res.get("signedURL", "") if isinstance(res, dict) else ""
    except Exception:
        return ""


def _enrich_project(sb, project: dict) -> dict:
    """Add signed URLs to every image stored in metadata.images."""
    meta = project.get("metadata") or {}
    images = meta.get("images") or []
    for img in images:
        sp = img.get("storage_path")
        if sp:
            img["url"] = _signed_url(sb, sp)
    if images:
        project["thumbnail_url"] = images[0].get("url", "")
    else:
        project["thumbnail_url"] = ""
    return project


@router.get("")
async def list_projects(
    project_type: str | None = None,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_current_user),
):
    sb = get_supabase()
    query = sb.table("projects").select("*").eq(
        "client_id", user["id"]
    ).order("created_at", desc=True)

    if project_type:
        query = query.eq("project_type", project_type)

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    result = query.execute()

    projects = result.data or []
    for p in projects:
        _enrich_project(sb, p)

    return {"projects": projects, "page": page, "limit": limit}


@router.get("/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("projects").select("*").eq(
        "id", project_id
    ).eq("client_id", user["id"]).maybe_single().execute()

    if not result or not result.data:
        raise HTTPException(status_code=404, detail="Project not found")

    return _enrich_project(sb, result.data)


@router.delete("/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    existing = sb.table("projects").select("id").eq(
        "id", project_id
    ).eq("client_id", user["id"]).single().execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Project not found")

    sb.table("projects").delete().eq("id", project_id).execute()
    return {"success": True}
