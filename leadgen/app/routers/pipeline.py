from __future__ import annotations

"""Lead generation pipeline API — admin-only endpoints for discovery,
enrichment, scraping, AI generation, email outreach, and tracking.
"""

import logging
from typing import Literal

from fastapi import APIRouter, HTTPException, Header, Query, Request, UploadFile, File, Form
from pydantic import BaseModel

from app.config import get_settings
from app.database import get_supabase
from app.services.discovery import run_discovery
from app.services.enrichment import run_enrichment
from app.services.scraper import run_scraping
from app.services.generator import run_generation, generate_for_lead
from app.services.email import run_email_outreach, send_outreach_email, handle_resend_webhook
from app.services.instagram import run_instagram_finder, find_instagram_for_lead

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pipeline", tags=["pipeline"])


# ── Auth helpers ──────────────────────────────────────────────────────────────

def _verify_cron_secret(x_cron_secret: str | None):
    settings = get_settings()
    secret = settings.cron_secret
    if not secret or x_cron_secret != secret:
        raise HTTPException(status_code=401, detail="Invalid cron secret")


def _verify_admin(x_admin_email: str | None = None, x_cron_secret: str | None = None):
    """Allow access via cron secret OR admin email header."""
    settings = get_settings()
    if x_cron_secret and settings.cron_secret and x_cron_secret == settings.cron_secret:
        return
    if x_admin_email and x_admin_email.lower() in settings.admin_email_list:
        return
    raise HTTPException(status_code=403, detail="Admin access required")


# ── Request models ────────────────────────────────────────────────────────────

class DiscoverRequest(BaseModel):
    platform: Literal["ai_search", "google_places", "shopify", "etsy"] | None = None
    region: Literal["us", "eu", "dubai", "other"] = "us"
    max_results: int = 50


class BatchRequest(BaseModel):
    batch_size: int = 50


# ── Discovery ─────────────────────────────────────────────────────────────────

@router.post("/discover")
async def discover_leads(
    req: DiscoverRequest,
    x_admin_email: str | None = Header(None),
    x_cron_secret: str | None = Header(None),
):
    """Trigger lead discovery for a platform and region."""
    _verify_admin(x_admin_email, x_cron_secret)
    results = await run_discovery(
        platform=req.platform,
        region=req.region,
        max_results=req.max_results,
    )
    return {"status": "ok", "results": results}


# ── Enrichment ────────────────────────────────────────────────────────────────

@router.post("/enrich")
async def enrich_leads(
    req: BatchRequest | None = None,
    x_admin_email: str | None = Header(None),
    x_cron_secret: str | None = Header(None),
):
    """Run email enrichment on discovered leads."""
    _verify_admin(x_admin_email, x_cron_secret)
    batch_size = req.batch_size if req else 50
    stats = await run_enrichment(batch_size=batch_size)
    return {"status": "ok", "stats": stats}


# ── Scraping ──────────────────────────────────────────────────────────────────

@router.post("/scrape")
async def scrape_leads(
    req: BatchRequest | None = None,
    x_admin_email: str | None = Header(None),
    x_cron_secret: str | None = Header(None),
):
    """Scrape product photos for enriched leads."""
    _verify_admin(x_admin_email, x_cron_secret)
    batch_size = req.batch_size if req else 50
    stats = await run_scraping(batch_size=batch_size)
    return {"status": "ok", "stats": stats}


# ── Generation ────────────────────────────────────────────────────────────────

@router.post("/generate")
async def generate_images(
    req: BatchRequest | None = None,
    x_admin_email: str | None = Header(None),
    x_cron_secret: str | None = Header(None),
):
    """Run AI generation on scraped leads."""
    _verify_admin(x_admin_email, x_cron_secret)
    batch_size = req.batch_size if req else 20
    stats = await run_generation(batch_size=batch_size)
    return {"status": "ok", "stats": stats}


# ── Email outreach ────────────────────────────────────────────────────────────

@router.post("/send-emails")
async def send_emails(
    req: BatchRequest | None = None,
    x_admin_email: str | None = Header(None),
    x_cron_secret: str | None = Header(None),
):
    """Send outreach emails for generated leads."""
    _verify_admin(x_admin_email, x_cron_secret)
    batch_size = req.batch_size if req else 50
    stats = await run_email_outreach(batch_size=batch_size)
    return {"status": "ok", "stats": stats}


@router.post("/send-email/{lead_id}")
async def send_single_email(
    lead_id: str,
    x_admin_email: str | None = Header(None),
    x_cron_secret: str | None = Header(None),
):
    """Send outreach email for a single lead."""
    _verify_admin(x_admin_email, x_cron_secret)
    success = await send_outreach_email(lead_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to send email")
    return {"status": "ok", "sent": True}


# ── Update lead (manual email, name, etc.) ────────────────────────────────────

class UpdateLeadRequest(BaseModel):
    contact_email: str | None = None
    contact_name: str | None = None
    status: str | None = None
    instagram_handle: str | None = None


@router.patch("/leads/{lead_id}")
async def update_lead(
    lead_id: str,
    req: UpdateLeadRequest,
    x_admin_email: str | None = Header(None),
    x_cron_secret: str | None = Header(None),
):
    """Update a lead's email, name, or status manually."""
    _verify_admin(x_admin_email, x_cron_secret)
    sb = get_supabase()

    lead = sb.table("leads").select("id, status").eq("id", lead_id).single().execute()
    if not lead.data:
        raise HTTPException(status_code=404, detail="Lead not found")

    update: dict = {}
    if req.contact_email is not None:
        update["contact_email"] = req.contact_email
    if req.contact_name is not None:
        update["contact_name"] = req.contact_name
    if req.status is not None:
        update["status"] = req.status
    elif req.contact_email and lead.data["status"] in ("discovered", "no_email"):
        update["status"] = "enriched"

    if req.instagram_handle is not None:
        current_meta = lead.data.get("metadata") or {}
        handle = req.instagram_handle.strip().lstrip("@").split("/")[-1].rstrip("/")
        current_meta["instagram_handle"] = handle
        current_meta["instagram_url"] = f"https://www.instagram.com/{handle}/"
        update["metadata"] = current_meta

    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")

    sb.table("leads").update(update).eq("id", lead_id).execute()
    updated = sb.table("leads").select("*").eq("id", lead_id).single().execute()
    return {"status": "ok", "lead": updated.data}


# ── Manual image upload ───────────────────────────────────────────────────────

@router.post("/leads/{lead_id}/upload-image")
async def upload_lead_image(
    lead_id: str,
    file: UploadFile = File(...),
    product_name: str = Form("Product"),
    jewelry_type: str = Form("other"),
    x_admin_email: str | None = Header(None),
    x_cron_secret: str | None = Header(None),
):
    """Manually upload a product image for a lead."""
    _verify_admin(x_admin_email, x_cron_secret)
    sb = get_supabase()
    settings = get_settings()

    lead = sb.table("leads").select("id, status").eq("id", lead_id).single().execute()
    if not lead.data:
        raise HTTPException(status_code=404, detail="Lead not found")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    existing = sb.table("lead_products").select("id").eq("lead_id", lead_id).execute()
    index = len(existing.data or [])

    path = f"lead-originals/{lead_id}/{index}.jpg"
    try:
        sb.storage.from_("lead-images").upload(path, image_bytes, {"content-type": "image/jpeg"})
    except Exception:
        try:
            sb.storage.create_bucket("lead-images", {"public": True})
            sb.storage.from_("lead-images").upload(path, image_bytes, {"content-type": "image/jpeg"})
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Upload failed: {exc}")

    storage_url = f"{settings.supabase_url}/storage/v1/object/public/lead-images/{path}"

    product = sb.table("lead_products").insert({
        "lead_id": lead_id,
        "product_name": product_name,
        "original_image_url": storage_url,
        "jewelry_type": jewelry_type,
        "status": "pending",
    }).execute()

    if lead.data["status"] in ("discovered", "enriched", "no_email", "scrape_failed"):
        new_status = "enriched" if lead.data["status"] in ("discovered", "no_email", "scrape_failed") else lead.data["status"]
        sb.table("leads").update({"status": "scraped"}).eq("id", lead_id).execute()

    return {"status": "ok", "product": product.data[0] if product.data else None, "image_url": storage_url}


# ── Regenerate AI images ──────────────────────────────────────────────────────

@router.post("/leads/{lead_id}/regenerate")
async def regenerate_lead(
    lead_id: str,
    x_admin_email: str | None = Header(None),
    x_cron_secret: str | None = Header(None),
):
    """Re-run AI generation for a lead. Resets products to pending first."""
    _verify_admin(x_admin_email, x_cron_secret)
    sb = get_supabase()

    lead = sb.table("leads").select("id, status").eq("id", lead_id).single().execute()
    if not lead.data:
        raise HTTPException(status_code=404, detail="Lead not found")

    sb.table("lead_products").update({"status": "pending", "generated_studio_url": None, "generated_model_url": None}).eq("lead_id", lead_id).execute()
    sb.table("leads").update({"status": "scraped"}).eq("id", lead_id).execute()

    count = await generate_for_lead(lead_id)
    return {"status": "ok", "generated_products": count}


# ── Instagram finder ──────────────────────────────────────────────────────────

@router.post("/find-instagram")
async def find_instagram_batch(
    req: BatchRequest | None = None,
    x_admin_email: str | None = Header(None),
    x_cron_secret: str | None = Header(None),
):
    """Find Instagram handles for leads that don't have one."""
    _verify_admin(x_admin_email, x_cron_secret)
    batch_size = req.batch_size if req else 50
    stats = await run_instagram_finder(batch_size=batch_size)
    return {"status": "ok", "stats": stats}


@router.post("/leads/{lead_id}/find-instagram")
async def find_instagram_single(
    lead_id: str,
    x_admin_email: str | None = Header(None),
    x_cron_secret: str | None = Header(None),
):
    """Find Instagram for a single lead."""
    _verify_admin(x_admin_email, x_cron_secret)
    sb = get_supabase()
    lead = sb.table("leads").select("id, store_name, store_url, domain").eq("id", lead_id).single().execute()
    if not lead.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    handle = await find_instagram_for_lead(lead.data["id"], lead.data["store_name"], lead.data["store_url"], lead.data["domain"])
    return {"status": "ok", "instagram_handle": handle, "instagram_url": f"https://www.instagram.com/{handle}/" if handle else None}


# ── Full pipeline ─────────────────────────────────────────────────────────────

class FullPipelineRequest(BaseModel):
    platform: Literal["ai_search", "google_places", "shopify", "etsy"] | None = None
    region: Literal["us", "eu", "dubai", "other"] = "us"
    max_discover: int = 50
    batch_size: int = 50


@router.post("/run-full")
async def run_full_pipeline(
    req: FullPipelineRequest,
    x_admin_email: str | None = Header(None),
    x_cron_secret: str | None = Header(None),
):
    """Run the entire pipeline: discover -> enrich -> scrape -> generate -> email."""
    _verify_admin(x_admin_email, x_cron_secret)

    discovery_results = await run_discovery(
        platform=req.platform, region=req.region, max_results=req.max_discover,
    )
    enrichment_stats = await run_enrichment(batch_size=req.batch_size)
    instagram_stats = await run_instagram_finder(batch_size=req.batch_size)
    scraping_stats = await run_scraping(batch_size=req.batch_size)
    generation_stats = await run_generation(batch_size=min(req.batch_size, 20))
    email_stats = await run_email_outreach(batch_size=req.batch_size)

    return {
        "status": "ok",
        "discovery": discovery_results,
        "enrichment": enrichment_stats,
        "instagram": instagram_stats,
        "scraping": scraping_stats,
        "generation": generation_stats,
        "email": email_stats,
    }


# ── Cron endpoint ─────────────────────────────────────────────────────────────

@router.post("/cron")
async def cron_run(x_cron_secret: str | None = Header(None)):
    """Automated daily pipeline run. Secured by cron secret.
    Runs all 3 primary sources in parallel, rotates region by day.
    """
    _verify_cron_secret(x_cron_secret)

    from datetime import datetime, timezone
    day = datetime.now(timezone.utc).day
    regions = ["us", "eu", "dubai"]
    region = regions[day % len(regions)]

    logger.info("Cron run: all sources, region=%s", region)

    discovery_results = await run_discovery(platform=None, region=region, max_results=50)
    enrichment_stats = await run_enrichment(batch_size=100)
    instagram_stats = await run_instagram_finder(batch_size=100)
    scraping_stats = await run_scraping(batch_size=50)
    generation_stats = await run_generation(batch_size=20)
    email_stats = await run_email_outreach(batch_size=100)

    return {
        "status": "ok",
        "region": region,
        "discovery": discovery_results,
        "enrichment": enrichment_stats,
        "instagram": instagram_stats,
        "scraping": scraping_stats,
        "generation": generation_stats,
        "email": email_stats,
    }


# ── Lead management ───────────────────────────────────────────────────────────

@router.get("/leads")
async def list_leads(
    status: str | None = Query(None),
    platform: str | None = Query(None),
    region: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    x_admin_email: str | None = Header(None),
    x_cron_secret: str | None = Header(None),
):
    """List leads with optional filters."""
    _verify_admin(x_admin_email, x_cron_secret)
    sb = get_supabase()

    query = sb.table("leads").select("*", count="exact")
    if status:
        query = query.eq("status", status)
    if platform:
        query = query.eq("platform", platform)
    if region:
        query = query.eq("region", region)

    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    return {"leads": result.data or [], "total": result.count or 0}


@router.get("/leads/{lead_id}")
async def get_lead(
    lead_id: str,
    x_admin_email: str | None = Header(None),
    x_cron_secret: str | None = Header(None),
):
    """Get lead detail with products and email history."""
    _verify_admin(x_admin_email, x_cron_secret)
    sb = get_supabase()

    lead = sb.table("leads").select("*").eq("id", lead_id).single().execute()
    products = sb.table("lead_products").select("*").eq("lead_id", lead_id).execute()
    emails = sb.table("lead_emails").select("*").eq("lead_id", lead_id).order("created_at", desc=True).execute()

    return {
        "lead": lead.data,
        "products": products.data or [],
        "emails": emails.data or [],
    }


@router.delete("/leads/{lead_id}")
async def delete_lead(
    lead_id: str,
    x_admin_email: str | None = Header(None),
    x_cron_secret: str | None = Header(None),
):
    """Delete a lead and all associated data."""
    _verify_admin(x_admin_email, x_cron_secret)
    sb = get_supabase()
    sb.table("leads").delete().eq("id", lead_id).execute()
    return {"status": "ok", "deleted": lead_id}


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(
    x_admin_email: str | None = Header(None),
    x_cron_secret: str | None = Header(None),
):
    """Get pipeline funnel stats."""
    _verify_admin(x_admin_email, x_cron_secret)
    sb = get_supabase()

    # Count by status
    all_leads = sb.table("leads").select("status", count="exact").execute()
    total = all_leads.count or 0

    status_counts: dict[str, int] = {}
    for status in [
        "discovered", "enriched", "no_email",
        "scraped", "scrape_failed",
        "generating", "generated", "gen_failed",
        "queued", "sent", "delivered", "opened", "clicked", "converted",
        "bounced", "skipped",
    ]:
        result = sb.table("leads").select("id", count="exact").eq("status", status).execute()
        count = result.count or 0
        if count > 0:
            status_counts[status] = count

    # Count by platform
    platform_counts: dict[str, int] = {}
    for platform in ["etsy", "google_places", "shopify", "ai_search", "manual"]:
        result = sb.table("leads").select("id", count="exact").eq("platform", platform).execute()
        count = result.count or 0
        if count > 0:
            platform_counts[platform] = count

    # Count by region
    region_counts: dict[str, int] = {}
    for region in ["us", "eu", "dubai", "other"]:
        result = sb.table("leads").select("id", count="exact").eq("region", region).execute()
        count = result.count or 0
        if count > 0:
            region_counts[region] = count

    # Email stats
    email_total = sb.table("lead_emails").select("id", count="exact").execute()
    email_opened = sb.table("lead_emails").select("id", count="exact").eq("status", "opened").execute()
    email_clicked = sb.table("lead_emails").select("id", count="exact").eq("status", "clicked").execute()

    return {
        "total_leads": total,
        "by_status": status_counts,
        "by_platform": platform_counts,
        "by_region": region_counts,
        "emails": {
            "total": email_total.count or 0,
            "opened": email_opened.count or 0,
            "clicked": email_clicked.count or 0,
        },
    }


# ── Resend webhook ────────────────────────────────────────────────────────────

@router.post("/webhook/resend")
async def resend_webhook(request: Request):
    """Handle Resend webhook events for email tracking."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = body.get("type", "")
    data = body.get("data", {})

    handled = handle_resend_webhook(event_type, data)
    return {"status": "ok", "handled": handled}
