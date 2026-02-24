from __future__ import annotations

"""Blog router -- public read endpoints and admin CRUD for blog posts & categories."""

import uuid
import logging
import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Header
from app.middleware.auth import require_admin
from app.database import get_supabase
from app.config import get_settings
from app.schemas.blog import (
    BlogCategoryCreate, BlogCategoryUpdate,
    BlogPostCreate, BlogPostUpdate, BlogGenerateRequest,
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


@router.post("/admin/generate-post")
async def generate_blog_post(req: BlogGenerateRequest, admin: dict = Depends(require_admin)):
    """Use Gemini AI to generate a full blog post from a topic and keywords."""
    import json as _json
    import re as _re
    from app.services.gemini_service import generate_text

    keywords_str = ", ".join(req.keywords) if req.keywords else req.topic

    prompt = f"""You are an expert SEO content writer for SoraiPixel, an AI-powered jewelry photography platform.
Write a comprehensive blog post about: "{req.topic}"

Target SEO keywords: {keywords_str}
Tone: {req.tone}
Target word count: ~{req.word_count} words

IMPORTANT: Return ONLY valid JSON (no markdown fences, no extra text). The JSON must have this exact structure:

{{
  "title": "SEO-optimized blog post title (50-65 chars)",
  "slug": "url-friendly-slug-with-keywords",
  "excerpt": "Compelling excerpt for previews (150-200 chars)",
  "meta_title": "SEO meta title (50-60 chars) with primary keyword",
  "meta_description": "SEO meta description (150-160 chars) with call to action",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "content": {{
    "type": "doc",
    "content": [
      {{
        "type": "heading",
        "attrs": {{ "level": 2 }},
        "content": [{{ "type": "text", "text": "Section Title" }}]
      }},
      {{
        "type": "paragraph",
        "content": [{{ "type": "text", "text": "Paragraph text here..." }}]
      }},
      {{
        "type": "heading",
        "attrs": {{ "level": 3 }},
        "content": [{{ "type": "text", "text": "Subsection" }}]
      }},
      {{
        "type": "paragraph",
        "content": [
          {{ "type": "text", "text": "Normal text " }},
          {{ "type": "text", "marks": [{{ "type": "bold" }}], "text": "bold text" }},
          {{ "type": "text", "text": " more text." }}
        ]
      }},
      {{
        "type": "bulletList",
        "content": [
          {{
            "type": "listItem",
            "content": [{{
              "type": "paragraph",
              "content": [{{ "type": "text", "text": "List item text" }}]
            }}]
          }}
        ]
      }}
    ]
  }}
}}

Guidelines:
- Write genuinely helpful content, not fluff
- Use H2 for main sections, H3 for subsections
- Include 4-6 main sections with subsections
- Use bullet lists for tips, steps, and comparisons
- Naturally weave in keywords (don't stuff)
- Include a strong opening paragraph and conclusion
- Reference SoraiPixel naturally where relevant (not every paragraph)
- Use bold for key terms and important phrases
- Make it actionable — readers should learn something
- The content MUST be in TipTap JSON format as shown above"""

    try:
        result = generate_text(prompt)
        raw_text = result["text"].strip()
        raw_text = _re.sub(r"^```json?\s*", "", raw_text)
        raw_text = _re.sub(r"\s*```$", "", raw_text)

        try:
            generated = _json.loads(raw_text)
        except _json.JSONDecodeError:
            return {"success": False, "error": "AI returned invalid JSON. Try again.", "raw": raw_text[:500]}

        slug = generated.get("slug", "")
        slug = _re.sub(r"[^a-z0-9-]", "", slug.lower().replace(" ", "-"))
        if not slug:
            slug = _re.sub(r"[^a-z0-9-]", "", generated.get("title", "untitled").lower().replace(" ", "-"))

        sb = get_supabase()
        existing = sb.table("blog_posts").select("id").eq("slug", slug).maybe_single().execute()
        if existing.data:
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"

        status = "published" if req.auto_publish else "draft"
        now = datetime.now(timezone.utc).isoformat()

        payload = {
            "title": generated.get("title", req.topic),
            "slug": slug,
            "content": generated.get("content"),
            "excerpt": generated.get("excerpt", ""),
            "tags": generated.get("tags", req.keywords or []),
            "meta_title": generated.get("meta_title", ""),
            "meta_description": generated.get("meta_description", ""),
            "category_id": req.category_id,
            "status": status,
            "author_id": admin["id"],
            "updated_at": now,
        }
        if status == "published":
            payload["published_at"] = now

        insert_result = sb.table("blog_posts").insert(payload).execute()
        post = insert_result.data[0] if insert_result.data else {}

        return {
            "success": True,
            "post": post,
            "generated_fields": {
                "title": generated.get("title"),
                "slug": slug,
                "excerpt": generated.get("excerpt"),
                "meta_title": generated.get("meta_title"),
                "meta_description": generated.get("meta_description"),
                "tags": generated.get("tags"),
                "sections": len(generated.get("content", {}).get("content", [])),
            },
        }
    except Exception as e:
        logger.error(f"Blog generation error: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


TOPIC_BANK = [
    {
        "topic": "10 Tips for Stunning Jewelry Product Photography",
        "keywords": ["jewelry photography tips", "product photography", "jewelry photo tips"],
        "category": "Photography Tips",
    },
    {
        "topic": "How AI is Revolutionizing E-commerce Product Photography",
        "keywords": ["AI product photography", "ecommerce photography", "automated product photos"],
        "category": "AI & Technology",
    },
    {
        "topic": "The Complete Guide to Jewelry Lighting for Online Stores",
        "keywords": ["jewelry lighting", "product lighting setup", "jewelry photo lighting"],
        "category": "Photography Tips",
    },
    {
        "topic": "Why Professional Product Photos Increase Jewelry Sales by 40%",
        "keywords": ["product photography ROI", "jewelry sales", "ecommerce conversion"],
        "category": "E-commerce",
    },
    {
        "topic": "Ring Photography: How to Capture Every Detail Perfectly",
        "keywords": ["ring photography", "close-up jewelry photos", "macro jewelry photography"],
        "category": "Photography Tips",
    },
    {
        "topic": "Model vs Lifestyle vs Studio: Which Jewelry Photo Style Sells Best?",
        "keywords": ["jewelry photo styles", "lifestyle photography", "studio photography comparison"],
        "category": "E-commerce",
    },
    {
        "topic": "How to Photograph Gold and Diamond Jewelry Without Glare",
        "keywords": ["gold jewelry photography", "diamond photography", "reduce glare jewelry photos"],
        "category": "Photography Tips",
    },
    {
        "topic": "Shopify Product Images: Size, Format, and SEO Best Practices",
        "keywords": ["shopify product images", "ecommerce image optimization", "product photo SEO"],
        "category": "E-commerce",
    },
    {
        "topic": "From Raw Photo to Hero Shot: How AI Transforms Jewelry Images",
        "keywords": ["AI jewelry photography", "hero shot", "before after product photos"],
        "category": "AI & Technology",
    },
    {
        "topic": "Necklace Photography Tips: Angles, Props, and Backgrounds",
        "keywords": ["necklace photography", "jewelry props", "jewelry backgrounds"],
        "category": "Photography Tips",
    },
    {
        "topic": "How Small Jewelry Brands Can Compete with Big Retailers Online",
        "keywords": ["small jewelry brand", "compete online jewelry", "jewelry ecommerce tips"],
        "category": "Business",
    },
    {
        "topic": "The Ultimate Guide to Batch Product Photography for Jewelry Collections",
        "keywords": ["batch product photography", "jewelry collection photos", "bulk photography tips"],
        "category": "Photography Tips",
    },
    {
        "topic": "Why Your Jewelry Photos Look Amateur (And How to Fix It)",
        "keywords": ["jewelry photo mistakes", "improve product photos", "professional jewelry photos"],
        "category": "Photography Tips",
    },
    {
        "topic": "AI-Powered Catalog Creation: Generate Listings in Minutes",
        "keywords": ["AI catalog creation", "automated product listings", "AI ecommerce tools"],
        "category": "AI & Technology",
    },
    {
        "topic": "Color Accuracy in Jewelry Photography: Getting Gold, Silver, and Gemstones Right",
        "keywords": ["color accuracy jewelry", "white balance jewelry", "gemstone color photography"],
        "category": "Photography Tips",
    },
    {
        "topic": "How to Create Scroll-Stopping Jewelry Images for Instagram",
        "keywords": ["jewelry instagram photos", "social media jewelry", "instagram product photography"],
        "category": "Social Media",
    },
    {
        "topic": "Wedding Jewelry Photography: Capturing Bridal Sets and Engagement Rings",
        "keywords": ["wedding jewelry photography", "bridal jewelry photos", "engagement ring photography"],
        "category": "Photography Tips",
    },
    {
        "topic": "Product Photography on a Budget: Smartphone Tips for Jewelry Sellers",
        "keywords": ["smartphone jewelry photography", "budget product photos", "mobile photography tips"],
        "category": "Photography Tips",
    },
    {
        "topic": "The Psychology of Product Images: How Photos Influence Buying Decisions",
        "keywords": ["product image psychology", "visual merchandising", "ecommerce conversion tips"],
        "category": "Business",
    },
    {
        "topic": "How to Write SEO-Optimized Jewelry Product Descriptions with AI",
        "keywords": ["jewelry product descriptions", "SEO product copy", "AI copywriting jewelry"],
        "category": "E-commerce",
    },
]


@router.post("/admin/bulk-generate")
async def bulk_generate_posts(admin: dict = Depends(require_admin)):
    """Generate multiple blog posts from a predefined SEO priority list. Returns results for each."""
    import json as _json
    import re as _re
    from app.services.gemini_service import generate_text

    priority_topics = [
        {
            "topic": "AI Photography: The Complete Guide to AI-Generated Product Images in 2025",
            "keywords": ["AI photography", "AI photo generator", "AI product photography", "AI image generation"],
        },
        {
            "topic": "AI Jewelry Photography: How to Get Studio-Quality Photos Without a Studio",
            "keywords": ["AI jewelry photography", "jewelry photography AI", "AI jewelry photos", "automated jewelry photography"],
        },
        {
            "topic": "Best AI Photography Tools for E-commerce in 2025: A Detailed Comparison",
            "keywords": ["AI photography tools", "best AI photography", "AI product photo tools", "ecommerce AI photography"],
        },
    ]

    results = []
    for entry in priority_topics:
        kw_str = ", ".join(entry["keywords"])
        prompt = f"""You are an expert SEO content writer for SoraiPixel, an AI-powered jewelry photography platform.
Write a comprehensive, high-quality blog post about: "{entry['topic']}"

Target SEO keywords: {kw_str}
Tone: professional
Target word count: ~1500 words

IMPORTANT: Return ONLY valid JSON (no markdown fences, no extra text). The JSON must have this exact structure:

{{
  "title": "SEO-optimized blog post title (50-65 chars)",
  "slug": "url-friendly-slug-with-keywords",
  "excerpt": "Compelling excerpt for previews (150-200 chars)",
  "meta_title": "SEO meta title (50-60 chars) with primary keyword",
  "meta_description": "SEO meta description (150-160 chars) with call to action",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "content": {{
    "type": "doc",
    "content": [
      {{
        "type": "heading",
        "attrs": {{ "level": 2 }},
        "content": [{{ "type": "text", "text": "Section Title" }}]
      }},
      {{
        "type": "paragraph",
        "content": [{{ "type": "text", "text": "Paragraph text here..." }}]
      }},
      {{
        "type": "bulletList",
        "content": [
          {{
            "type": "listItem",
            "content": [{{
              "type": "paragraph",
              "content": [{{ "type": "text", "text": "List item text" }}]
            }}]
          }}
        ]
      }}
    ]
  }}
}}

Guidelines:
- Write genuinely helpful, actionable, in-depth content (not generic)
- Use H2 for main sections, H3 for subsections
- Include 5-7 main sections with subsections
- Use bullet lists for tips, steps, comparisons
- Naturally weave keywords into headings and first paragraphs
- Reference SoraiPixel naturally 2-3 times (not every paragraph)
- Use bold marks for key terms
- Include practical examples and specific advice
- Strong opening paragraph with primary keyword in first sentence"""

        try:
            result = generate_text(prompt)
            raw_text = result["text"].strip()
            raw_text = _re.sub(r"^```json?\s*", "", raw_text)
            raw_text = _re.sub(r"\s*```$", "", raw_text)
            generated = _json.loads(raw_text)

            slug = generated.get("slug", "")
            slug = _re.sub(r"[^a-z0-9-]", "", slug.lower().replace(" ", "-"))
            if not slug:
                slug = _re.sub(r"[^a-z0-9-]", "", entry["topic"].lower().replace(" ", "-"))[:80]

            sb = get_supabase()
            existing = sb.table("blog_posts").select("id").eq("slug", slug).maybe_single().execute()
            if existing.data:
                slug = f"{slug}-{uuid.uuid4().hex[:6]}"

            now = datetime.now(timezone.utc).isoformat()
            payload = {
                "title": generated.get("title", entry["topic"]),
                "slug": slug,
                "content": generated.get("content"),
                "excerpt": generated.get("excerpt", ""),
                "tags": generated.get("tags", entry["keywords"]),
                "meta_title": generated.get("meta_title", ""),
                "meta_description": generated.get("meta_description", ""),
                "status": "published",
                "published_at": now,
                "author_id": admin["id"],
                "updated_at": now,
            }

            sb.table("blog_posts").insert(payload).execute()
            results.append({"topic": entry["topic"], "slug": slug, "success": True})
        except Exception as e:
            logger.error(f"Bulk generation error for '{entry['topic']}': {e}")
            results.append({"topic": entry["topic"], "success": False, "error": str(e)})

    return {"results": results}


@router.get("/admin/topic-bank")
async def get_topic_bank(admin: dict = Depends(require_admin)):
    """Return curated SEO topic suggestions for blog content."""
    return {"topics": TOPIC_BANK}


@router.post("/admin/generate-topics")
async def generate_custom_topics(admin: dict = Depends(require_admin)):
    """Use AI to generate fresh topic ideas based on industry trends."""
    import json as _json
    import re as _re
    from app.services.gemini_service import generate_text

    prompt = """You are an SEO content strategist for SoraiPixel, an AI-powered jewelry photography platform.
Generate 10 fresh, unique blog post topic ideas that would rank well on Google.

Focus areas: jewelry photography, AI product photography, e-commerce optimization, visual merchandising, jewelry business tips.

Return ONLY valid JSON (no markdown fences):
{
  "topics": [
    {
      "topic": "Full blog post title",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "category": "Category name"
    }
  ]
}"""

    try:
        result = generate_text(prompt)
        raw_text = result["text"].strip()
        raw_text = _re.sub(r"^```json?\s*", "", raw_text)
        raw_text = _re.sub(r"\s*```$", "", raw_text)
        data = _json.loads(raw_text)
        return {"topics": data.get("topics", [])}
    except Exception as e:
        logger.error(f"Topic generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate topics: {str(e)}")


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


# ── Cron / Automation Endpoint ────────────────────────────────────────────────

@router.post("/cron/generate")
async def cron_generate_blog(x_cron_secret: str | None = Header(None)):
    """Automated blog generation, callable by n8n, Vercel Cron, or any scheduler.
    Secured by CRON_SECRET env var passed as X-Cron-Secret header.
    Picks a random topic from the bank, generates via AI, and publishes."""
    settings = get_settings()
    cron_secret = getattr(settings, "cron_secret", None) or ""
    if not cron_secret or x_cron_secret != cron_secret:
        raise HTTPException(status_code=401, detail="Invalid cron secret")

    import json as _json
    import re as _re
    from app.services.gemini_service import generate_text

    topic_entry = random.choice(TOPIC_BANK)
    keywords_str = ", ".join(topic_entry["keywords"])

    prompt = f"""You are an expert SEO content writer for SoraiPixel, an AI-powered jewelry photography platform.
Write a comprehensive blog post about: "{topic_entry['topic']}"

Target SEO keywords: {keywords_str}
Tone: professional
Target word count: ~1200 words

IMPORTANT: Return ONLY valid JSON (no markdown fences, no extra text). The JSON must have this exact structure:

{{
  "title": "SEO-optimized blog post title (50-65 chars)",
  "slug": "url-friendly-slug-with-keywords",
  "excerpt": "Compelling excerpt for previews (150-200 chars)",
  "meta_title": "SEO meta title (50-60 chars) with primary keyword",
  "meta_description": "SEO meta description (150-160 chars) with call to action",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "content": {{
    "type": "doc",
    "content": [
      {{
        "type": "heading",
        "attrs": {{ "level": 2 }},
        "content": [{{ "type": "text", "text": "Section Title" }}]
      }},
      {{
        "type": "paragraph",
        "content": [{{ "type": "text", "text": "Paragraph text here..." }}]
      }},
      {{
        "type": "bulletList",
        "content": [
          {{
            "type": "listItem",
            "content": [{{
              "type": "paragraph",
              "content": [{{ "type": "text", "text": "List item text" }}]
            }}]
          }}
        ]
      }}
    ]
  }}
}}

Guidelines:
- Write genuinely helpful, actionable content
- Use H2 for main sections, H3 for subsections
- Include 4-6 main sections
- Use bullet lists for tips, steps, comparisons
- Naturally weave in keywords
- Reference SoraiPixel where relevant but not in every paragraph
- Use bold for key terms
- Make unique — do not rehash generic content"""

    try:
        result = generate_text(prompt)
        raw_text = result["text"].strip()
        raw_text = _re.sub(r"^```json?\s*", "", raw_text)
        raw_text = _re.sub(r"\s*```$", "", raw_text)

        try:
            generated = _json.loads(raw_text)
        except _json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="AI returned invalid JSON")

        slug = generated.get("slug", "")
        slug = _re.sub(r"[^a-z0-9-]", "", slug.lower().replace(" ", "-"))
        if not slug:
            slug = _re.sub(r"[^a-z0-9-]", "", generated.get("title", "untitled").lower().replace(" ", "-"))

        sb = get_supabase()
        existing = sb.table("blog_posts").select("id").eq("slug", slug).maybe_single().execute()
        if existing.data:
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"

        now = datetime.now(timezone.utc).isoformat()
        payload = {
            "title": generated.get("title", topic_entry["topic"]),
            "slug": slug,
            "content": generated.get("content"),
            "excerpt": generated.get("excerpt", ""),
            "tags": generated.get("tags", topic_entry["keywords"]),
            "meta_title": generated.get("meta_title", ""),
            "meta_description": generated.get("meta_description", ""),
            "status": "published",
            "published_at": now,
            "updated_at": now,
        }

        insert_result = sb.table("blog_posts").insert(payload).execute()
        post = insert_result.data[0] if insert_result.data else {}

        logger.info(f"Cron blog generated: {payload['title']} ({slug})")
        return {"success": True, "post_slug": slug, "title": payload["title"]}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cron blog generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
