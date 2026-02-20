from __future__ import annotations

"""Projects router -- NEW feature for organizing generated content."""

from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.database import get_supabase

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("/")
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

    return {"projects": result.data or [], "page": page, "limit": limit}


@router.get("/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("projects").select("*").eq(
        "id", project_id
    ).eq("client_id", user["id"]).maybe_single().execute()

    if not result or not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data


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
