from __future__ import annotations

"""User profile router."""

import base64
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.middleware.auth import get_current_user
from app.schemas.user import UserProfile, UpdateProfileRequest
from app.database import get_supabase

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me")
async def get_profile(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "phone": user.get("phone"),
        "email": user.get("email"),
        "name": user.get("contact_name", ""),
        "company_name": user.get("company_name", ""),
        "business_logo_url": user.get("business_logo_url"),
        "business_address": user.get("business_address", ""),
        "business_website": user.get("business_website", ""),
        "apply_branding": user.get("apply_branding", False),
        "category_id": user.get("category_id"),
        "category_slug": user.get("category_slug"),
        "is_admin": user.get("is_admin", False),
        "token_balance": user.get("token_balance", 0),
        "studio_free_used": user.get("studio_free_used", 0),
        "allowed_sections": user.get("allowed_sections", ["studio", "jewelry"]),
        "subscription_plan": user.get("subscription_plan", "free"),
        "daily_reward_claimed_at": user.get("daily_reward_claimed_at"),
    }


@router.put("/me")
async def update_profile(req: UpdateProfileRequest, user: dict = Depends(get_current_user)):
    sb = get_supabase()
    updates = {}

    if req.name is not None:
        updates["contact_name"] = req.name
    if req.company_name is not None:
        updates["company_name"] = req.company_name
    if req.contact_name is not None:
        updates["contact_name"] = req.contact_name
    if req.business_address is not None:
        updates["business_address"] = req.business_address
    if req.business_website is not None:
        updates["business_website"] = req.business_website
    if req.email is not None:
        updates["email"] = req.email
    if req.apply_branding is not None:
        updates["apply_branding"] = req.apply_branding
    if req.category_id is not None:
        updates["category_id"] = req.category_id

    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    sb.table("clients").update(updates).eq("id", user["id"]).execute()
    return {"success": True}


@router.post("/me/logo")
async def upload_logo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload business logo."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Logo must be under 2MB")

    sb = get_supabase()
    file_name = f"logos/{user['id']}/{uuid.uuid4()}.png"

    sb.storage.from_("sorapixel-images").upload(
        file_name, content, {"content-type": "image/png"}
    )

    url = f"{sb.supabase_url}/storage/v1/object/public/sorapixel-images/{file_name}"

    sb.table("clients").update({"business_logo_url": url}).eq("id", user["id"]).execute()

    return {"success": True, "logo_url": url}
