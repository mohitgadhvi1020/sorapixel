from __future__ import annotations

"""Blog router -- public read endpoints and admin CRUD for blog posts & categories."""

import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from app.middleware.auth import require_admin
from app.database import get_supabase
from app.schemas.blog import (
    BlogCategoryCreate, BlogCategoryUpdate,
    BlogPostCreate, BlogPostUpdate,
)

logger = logging.getLogger(__name__)

BUCKET = "sorapixel-images"
MAX_UPLOAD_SIZE = 10 * 1024 * 1024

router = APIRouter(prefix="/blog", tags=["Blog"])


# ── Public Endpoints ──────────────────────────────────────────────────────────

@router.get("/posts")
async def list_published_posts(
    category: str | None = None,
    tag: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
):
    sb = get_supabase()
    query = (
        sb.table("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, category_id, tags, published_at, author_id, created_at")
        .eq("status", "published")
        .order("published_at", desc=True)
    )

    if category:
        cat = sb.table("blog_categories").select("id").eq("slug", category).maybe_single().execute()
        if cat.data:
            query = query.eq("category_id", cat.data["id"])

    if tag:
        query = query.contains("tags", [tag])

    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    result = query.execute()

    total_q = sb.table("blog_posts").select("id", count="exact").eq("status", "published")
    if category and cat.data:
        total_q = total_q.eq("category_id", cat.data["id"])
    total_result = total_q.execute()
    total = total_result.count or 0

    return {
        "posts": result.data or [],
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": max(1, -(-total // limit)),
    }


@router.get("/posts/{slug}")
async def get_post_by_slug(slug: str):
    sb = get_supabase()
    result = (
        sb.table("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybe_single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Post not found")
    return result.data


@router.get("/categories")
async def list_blog_categories():
    sb = get_supabase()
    result = sb.table("blog_categories").select("*").order("display_order").execute()
    return {"categories": result.data or []}


# ── Admin Endpoints ───────────────────────────────────────────────────────────

@router.post("/admin/posts")
async def create_post(req: BlogPostCreate, admin: dict = Depends(require_admin)):
    sb = get_supabase()

    existing = sb.table("blog_posts").select("id").eq("slug", req.slug).maybe_single().execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="A post with this slug already exists")

    payload = req.model_dump(exclude_none=True)
    payload["author_id"] = admin["id"]
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    if req.status == "published" and not payload.get("published_at"):
        payload["published_at"] = datetime.now(timezone.utc).isoformat()

    result = sb.table("blog_posts").insert(payload).execute()
    return result.data[0] if result.data else {}


@router.put("/admin/posts/{post_id}")
async def update_post(post_id: str, req: BlogPostUpdate, admin: dict = Depends(require_admin)):
    sb = get_supabase()

    existing = sb.table("blog_posts").select("id, status").eq("id", post_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Post not found")

    payload = {k: v for k, v in req.model_dump(exclude_none=True).items()}
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()

    if req.status == "published" and existing.data.get("status") != "published":
        payload["published_at"] = datetime.now(timezone.utc).isoformat()

    if req.slug and req.slug != post_id:
        dup = sb.table("blog_posts").select("id").eq("slug", req.slug).neq("id", post_id).maybe_single().execute()
        if dup.data:
            raise HTTPException(status_code=400, detail="A post with this slug already exists")

    result = sb.table("blog_posts").update(payload).eq("id", post_id).execute()
    return result.data[0] if result.data else {}


@router.delete("/admin/posts/{post_id}")
async def delete_post(post_id: str, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    sb.table("blog_posts").delete().eq("id", post_id).execute()
    return {"success": True}


@router.get("/admin/posts")
async def admin_list_posts(admin: dict = Depends(require_admin)):
    """List all posts (including drafts) for admin management."""
    sb = get_supabase()
    result = (
        sb.table("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, category_id, tags, status, published_at, created_at, updated_at")
        .order("updated_at", desc=True)
        .execute()
    )
    return {"posts": result.data or []}


@router.get("/admin/posts/{post_id}")
async def admin_get_post(post_id: str, admin: dict = Depends(require_admin)):
    """Get a single post by ID (including drafts) for editing."""
    sb = get_supabase()
    result = sb.table("blog_posts").select("*").eq("id", post_id).maybe_single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Post not found")
    return result.data


@router.post("/admin/categories")
async def create_category(req: BlogCategoryCreate, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    existing = sb.table("blog_categories").select("id").eq("slug", req.slug).maybe_single().execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="A category with this slug already exists")

    result = sb.table("blog_categories").insert(req.model_dump()).execute()
    return result.data[0] if result.data else {}


@router.put("/admin/categories/{cat_id}")
async def update_category(cat_id: str, req: BlogCategoryUpdate, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    payload = {k: v for k, v in req.model_dump(exclude_none=True).items()}
    if not payload:
        raise HTTPException(status_code=400, detail="Nothing to update")

    result = sb.table("blog_categories").update(payload).eq("id", cat_id).execute()
    return result.data[0] if result.data else {}


@router.delete("/admin/categories/{cat_id}")
async def delete_category(cat_id: str, admin: dict = Depends(require_admin)):
    sb = get_supabase()
    sb.table("blog_categories").delete().eq("id", cat_id).execute()
    return {"success": True}


@router.post("/admin/upload-image")
async def upload_blog_image(file: UploadFile = File(...), admin: dict = Depends(require_admin)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="Image must be under 10 MB")

    ext = (file.filename or "image.png").rsplit(".", 1)[-1].lower()
    if ext not in ("png", "jpg", "jpeg", "webp", "gif"):
        ext = "png"

    storage_path = f"blog/{uuid.uuid4()}.{ext}"
    content_type = file.content_type or f"image/{ext}"

    sb = get_supabase()
    sb.storage.from_(BUCKET).upload(storage_path, content, {"content-type": content_type})

    url = f"{sb.supabase_url}/storage/v1/object/public/{BUCKET}/{storage_path}"
    return {"success": True, "url": url}
