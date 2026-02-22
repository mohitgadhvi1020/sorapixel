from __future__ import annotations

"""Brand profiles router — user self-serve + admin CRUD."""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.middleware.auth import get_current_user, require_admin
from app.database import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/brands", tags=["Brands"])


class CreateBrandRequest(BaseModel):
    name: str
    slug: str
    config: dict


class UpdateBrandRequest(BaseModel):
    config: dict


class AdminAssignBrandRequest(BaseModel):
    client_id: str
    brand_id: str


# ── User-facing ──

@router.get("/me")
async def get_my_brand(user: dict = Depends(get_current_user)):
    """Get the brand profile linked to the current user."""
    sb = get_supabase()
    client = sb.table("clients").select("brand_id").eq("id", user["id"]).single().execute()
    if not client.data or not client.data.get("brand_id"):
        return {"brand": None}

    brand = sb.table("brand_profiles").select("*").eq("id", client.data["brand_id"]).single().execute()
    return {"brand": brand.data}


@router.post("")
async def create_brand(req: CreateBrandRequest, user: dict = Depends(get_current_user)):
    """Create a new brand profile and link it to the current user."""
    sb = get_supabase()

    existing = sb.table("clients").select("brand_id").eq("id", user["id"]).single().execute()
    if existing.data and existing.data.get("brand_id"):
        raise HTTPException(status_code=400, detail="You already have a brand profile. Use PUT to update.")

    slug = req.slug.lower().strip().replace(" ", "-")
    slug_check = sb.table("brand_profiles").select("id").eq("slug", slug).maybe_single().execute()
    if slug_check.data:
        raise HTTPException(status_code=400, detail=f"Brand slug '{slug}' already taken")

    result = sb.table("brand_profiles").insert({
        "slug": slug,
        "name": req.name,
        "config": req.config,
        "created_by": user["id"],
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create brand")

    brand = result.data[0]
    sb.table("clients").update({"brand_id": brand["id"]}).eq("id", user["id"]).execute()
    return {"brand": brand}


@router.put("/{brand_id}")
async def update_brand(brand_id: str, req: UpdateBrandRequest, user: dict = Depends(get_current_user)):
    """Update a brand profile. Owner or admin only."""
    sb = get_supabase()
    brand = sb.table("brand_profiles").select("id, created_by").eq("id", brand_id).single().execute()
    if not brand.data:
        raise HTTPException(status_code=404, detail="Brand not found")

    if brand.data["created_by"] != user["id"] and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized to edit this brand")

    sb.table("brand_profiles").update({
        "config": req.config,
        "updated_at": "now()",
    }).eq("id", brand_id).execute()
    return {"success": True}


# ── Admin ──

@router.get("/admin/list")
async def admin_list_brands(admin: dict = Depends(require_admin)):
    """List all brand profiles (admin only)."""
    sb = get_supabase()
    result = sb.table("brand_profiles").select("*").order("created_at", desc=True).execute()
    return {"brands": result.data or []}


@router.post("/admin/create")
async def admin_create_brand(req: CreateBrandRequest, admin: dict = Depends(require_admin)):
    """Admin creates a brand profile (optionally unlinked to any user)."""
    sb = get_supabase()
    slug = req.slug.lower().strip().replace(" ", "-")

    result = sb.table("brand_profiles").insert({
        "slug": slug,
        "name": req.name,
        "config": req.config,
        "created_by": admin["id"],
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create brand")
    return {"brand": result.data[0]}


@router.put("/admin/{brand_id}")
async def admin_update_brand(brand_id: str, req: UpdateBrandRequest, admin: dict = Depends(require_admin)):
    """Admin edits any brand profile."""
    sb = get_supabase()
    sb.table("brand_profiles").update({
        "config": req.config,
        "updated_at": "now()",
    }).eq("id", brand_id).execute()
    return {"success": True}


@router.post("/admin/assign")
async def admin_assign_brand(req: AdminAssignBrandRequest, admin: dict = Depends(require_admin)):
    """Admin assigns a brand profile to a client."""
    sb = get_supabase()
    brand = sb.table("brand_profiles").select("id").eq("id", req.brand_id).maybe_single().execute()
    if not brand.data:
        raise HTTPException(status_code=404, detail="Brand not found")

    sb.table("clients").update({"brand_id": req.brand_id}).eq("id", req.client_id).execute()
    return {"success": True}


@router.delete("/admin/{brand_id}")
async def admin_delete_brand(brand_id: str, admin: dict = Depends(require_admin)):
    """Admin deletes a brand profile. Unlinks any clients first."""
    sb = get_supabase()
    sb.table("clients").update({"brand_id": None}).eq("brand_id", brand_id).execute()
    sb.table("brand_profiles").delete().eq("id", brand_id).execute()
    return {"success": True}
