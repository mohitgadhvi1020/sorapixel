from __future__ import annotations

"""Admin router -- client management, stats, tokens."""

import uuid
import base64 as b64lib
import random
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from app.middleware.auth import require_admin
from app.schemas.admin import CreateClientRequest, UpdateClientRequest, AddTokensRequest
from app.database import get_supabase
from app.services.credit_service import add_tokens
from app.config import get_settings
from app.services.gemini_service import generate_image, generate_image_multi
from app.services.image_service import crop_to_ratio
from app.services.prompt_service import (
    build_catalogue_prompt, build_branding_prompt, get_ratio,
    CATALOGUE_BACKGROUNDS, CATALOGUE_POSES, AI_MODEL_FACES,
)

logger = logging.getLogger(__name__)

BUCKET = "sorapixel-images"
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/clients")
async def list_clients(admin: dict = Depends(require_admin)):
    sb = get_supabase()
    result = sb.table("clients").select(
        "id, phone, email, company_name, contact_name, is_active, is_admin, "
        "created_at, allowed_sections, token_balance, studio_free_used, subscription_plan"
    ).order("created_at", desc=True).execute()
    return {"clients": result.data or []}


@router.post("/clients")
async def create_client(req: CreateClientRequest, admin: dict = Depends(require_admin)):
    settings = get_settings()
    sb = get_supabase()

    existing = sb.table("clients").select("id").eq("phone", req.phone).maybe_single().execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Client with this phone already exists")

    email = f"{req.phone}@phone.sorapixel.com"
    try:
        auth_result = sb.auth.admin.create_user({
            "email": email,
            "password": f"admin_created_{req.phone}",
            "email_confirm": True,
        })
        user_id = auth_result.user.id
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create auth user: {e}")

    sb.table("clients").upsert({
        "id": user_id,
        "phone": req.phone,
        "email": email,
        "company_name": req.company_name,
        "contact_name": req.name,
        "is_active": True,
        "is_admin": req.phone in settings.admin_phone_list,
        "allowed_sections": req.allowed_sections,
        "token_balance": 0,
        "studio_free_used": 0,
    }, on_conflict="id").execute()

    return {"success": True, "client_id": user_id}


@router.patch("/clients")
async def update_client(req: UpdateClientRequest, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    updates = {}
    if req.is_active is not None:
        updates["is_active"] = req.is_active
    if req.allowed_sections is not None:
        updates["allowed_sections"] = req.allowed_sections

    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    sb.table("clients").update(updates).eq("id", req.client_id).execute()
    return {"success": True}


@router.post("/tokens")
async def add_tokens_endpoint(req: AddTokensRequest, admin: dict = Depends(require_admin)):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    success = add_tokens(req.client_id, req.amount)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to add tokens")
    return {"success": True}


@router.get("/stats")
async def get_stats(admin: dict = Depends(require_admin)):
    sb = get_supabase()

    clients = sb.table("clients").select(
        "id, phone, email, company_name, contact_name, is_active, created_at, "
        "studio_free_used, token_balance, allowed_sections"
    ).order("created_at", desc=True).execute()

    gen_counts = sb.table("generations").select(
        "client_id, id, input_tokens, output_tokens, total_tokens, generation_type"
    ).execute()

    dl_counts = sb.table("downloads").select("client_id, id").execute()
    img_counts = sb.table("images").select("client_id, id").execute()

    stats = []
    for c in (clients.data or []):
        gens = [g for g in (gen_counts.data or []) if g["client_id"] == c["id"]]
        dls = [d for d in (dl_counts.data or []) if d["client_id"] == c["id"]]
        imgs = [i for i in (img_counts.data or []) if i["client_id"] == c["id"]]
        total_tokens = sum(g.get("total_tokens", 0) for g in gens)

        stats.append({
            "id": c["id"],
            "phone": c.get("phone"),
            "email": c.get("email"),
            "company_name": c.get("company_name"),
            "is_active": c.get("is_active"),
            "created_at": c.get("created_at"),
            "total_generations": len(gens),
            "total_tokens_used": total_tokens,
            "total_images": len(imgs),
            "total_downloads": len(dls),
            "token_balance": c.get("token_balance", 0),
        })

    recent = sb.table("generations").select(
        "id, client_id, generation_type, total_tokens, model_used, status, created_at"
    ).order("created_at", desc=True).limit(50).execute()

    total_gens = sum(s["total_generations"] for s in stats)
    total_tokens = sum(s["total_tokens_used"] for s in stats)

    return {
        "client_stats": stats,
        "recent_activity": recent.data or [],
        "totals": {
            "total_clients": len(stats),
            "total_generations": total_gens,
            "total_tokens": total_tokens,
        },
    }


# ---- Image Upload ----

@router.post("/upload-image")
async def upload_feed_image(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    """Upload an image for feed items. Returns the public URL."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="Image must be under 10 MB")

    ext = (file.filename or "image.png").rsplit(".", 1)[-1].lower()
    if ext not in ("png", "jpg", "jpeg", "webp", "gif"):
        ext = "png"

    storage_path = f"feed/{uuid.uuid4()}.{ext}"
    content_type = file.content_type or f"image/{ext}"

    sb = get_supabase()
    sb.storage.from_(BUCKET).upload(storage_path, content, {"content-type": content_type})

    url = f"{sb.supabase_url}/storage/v1/object/public/{BUCKET}/{storage_path}"
    return {"success": True, "url": url, "storage_path": storage_path}


# ---- Feed Examples Management ----

@router.get("/feed-items")
async def list_feed_items(admin: dict = Depends(require_admin)):
    sb = get_supabase()
    result = sb.table("feed_items").select("*").order("display_order").execute()
    return {"items": result.data or []}


@router.post("/feed-items")
async def create_feed_item(body: dict, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    allowed = ["category_id", "title", "before_image_url", "after_image_url",
               "item_type", "tags", "display_order", "is_active"]
    payload = {k: v for k, v in body.items() if k in allowed}
    if not payload.get("category_id") or not payload.get("after_image_url"):
        raise HTTPException(status_code=400, detail="category_id and after_image_url required")
    result = sb.table("feed_items").insert(payload).execute()
    return result.data[0] if result.data else {}


@router.put("/feed-items/{item_id}")
async def update_feed_item(item_id: str, body: dict, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    allowed = ["category_id", "title", "before_image_url", "after_image_url",
               "item_type", "tags", "display_order", "is_active"]
    payload = {k: v for k, v in body.items() if k in allowed}
    result = sb.table("feed_items").update(payload).eq("id", item_id).execute()
    return result.data[0] if result.data else {}


@router.delete("/feed-items/{item_id}")
async def delete_feed_item(item_id: str, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    sb.table("feed_items").delete().eq("id", item_id).execute()
    return {"success": True}


# ---- Admin Catalogue Generation for Feed Seeding ----

OUTFIT_OPTIONS = [
    "a simple elegant navy blue dress with minimal accessories",
    "a classic black fitted dress, clean and professional",
    "a sophisticated maroon/wine-colored outfit, elegant draping",
    "a crisp white blouse with dark formal trousers",
    "a deep emerald green ethnic kurta with subtle gold accents",
]


@router.post("/generate-catalogue")
async def admin_generate_catalogue(body: dict, admin: dict = Depends(require_admin)):
    """Generate catalogue images for feed seeding — no credit deduction.

    Accepts the same payload as /catalogue/generate:
      image_base64, model_type, poses (list), background, special_instructions,
      key_highlights, aspect_ratio_id, category_slug
    Returns a list of {url, label, pose} with Supabase storage public URLs.
    """
    sb = get_supabase()

    image_base64: str = body.get("image_base64", "")
    if not image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    model_type: str = body.get("model_type", "indian_woman")
    poses: list[str] = body.get("poses", ["standing", "side_view", "back_view", "sitting"])[:4]
    background: str = body.get("background", "best_match")
    special_instructions: str | None = body.get("special_instructions")
    key_highlights: str | None = body.get("key_highlights")
    aspect_ratio_id: str | None = body.get("aspect_ratio_id")
    category_slug: str | None = body.get("category_slug")

    ratio = get_ratio(aspect_ratio_id)
    outfit = random.choice(OUTFIT_OPTIONS)

    images = []
    for pose in poses:
        prompt = build_catalogue_prompt(
            model_type=model_type,
            pose=pose,
            background=background,
            category_slug=category_slug,
            special_instructions=special_instructions,
            key_highlights=key_highlights,
            outfit_description=outfit,
        )

        try:
            result = generate_image(prompt, image_base64)
            image_b64 = result["base64"]

            try:
                image_b64 = crop_to_ratio(image_b64, ratio["width"], ratio["height"])
            except Exception:
                pass

            # Upload to storage and return public URL
            raw_bytes = b64lib.b64decode(image_b64)
            storage_path = f"feed/catalogue/{uuid.uuid4()}.png"
            sb.storage.from_(BUCKET).upload(storage_path, raw_bytes, {"content-type": "image/png"})
            public_url = f"{sb.supabase_url}/storage/v1/object/public/{BUCKET}/{storage_path}"

            images.append({
                "url": public_url,
                "label": pose.replace("_", " ").title(),
                "pose": pose,
                "storage_path": storage_path,
            })
        except Exception as e:
            logger.error(f"Admin catalogue generation error (pose={pose}): {e}")
            images.append({"url": "", "label": pose.replace("_", " ").title(), "pose": pose, "error": str(e)})

    valid = [img for img in images if img.get("url")]
    return {"success": bool(valid), "images": images}
