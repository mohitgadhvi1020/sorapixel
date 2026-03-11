from __future__ import annotations

"""AI generation service — run lead product photos through Gemini to create
studio and model shots for before/after comparison emails.
"""

import asyncio
import base64
import io
import logging

import httpx
from google import genai
from google.genai import types as genai_types

from app.config import get_settings
from app.database import get_supabase

logger = logging.getLogger(__name__)

_semaphore: asyncio.Semaphore | None = None


def _get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(get_settings().gemini_max_concurrent)
    return _semaphore


def _get_genai_client() -> genai.Client:
    return genai.Client(api_key=get_settings().gemini_api_key)


# ── Prompt templates ──────────────────────────────────────────────────────────

STUDIO_PROMPT = """You are a professional jewelry product photographer.

Take the jewelry piece from the input image and place it on a clean, pure white seamless background with soft, even studio lighting. The result should look like a high-end e-commerce product photo.

CRITICAL RULES:
1. The jewelry must be the EXACT same piece from the input — same shape, design, color, every detail preserved
2. Do NOT redesign, modify, or reimagine the jewelry
3. Only change the BACKGROUND and LIGHTING
4. Make the jewelry sparkle with professional studio lighting
5. Center the jewelry elegantly in the frame
6. The background must be pure white (#FFFFFF), seamless, with no shadows except a subtle contact shadow
"""

MODEL_PROMPT_TEMPLATES = {
    "ring": """You are a professional jewelry photographer. Generate a photo of an elegant female hand wearing the exact ring from the input image. The hand should be gracefully posed against a soft, neutral beige background. Professional studio lighting that makes the ring sparkle. The ring must be IDENTICAL to the input — same design, stones, metal color. Photorealistic, high-end jewelry advertising style.""",

    "necklace": """You are a professional jewelry photographer. Generate a photo of an elegant woman wearing the exact necklace from the input image. Show from shoulders up, the woman in a simple black top against a soft neutral background. Professional studio lighting highlighting the necklace. The necklace must be IDENTICAL to the input. Photorealistic, high-end jewelry advertising style.""",

    "bracelet": """You are a professional jewelry photographer. Generate a photo of an elegant female wrist wearing the exact bracelet from the input image. The hand should be gracefully posed against a soft marble surface. Professional studio lighting. The bracelet must be IDENTICAL to the input. Photorealistic, high-end jewelry advertising style.""",

    "earring": """You are a professional jewelry photographer. Generate a photo of an elegant woman wearing the exact earrings from the input image. Show a side profile from neck up, hair pulled back to showcase the earring. Soft neutral background, professional studio lighting. The earring must be IDENTICAL to the input. Photorealistic, high-end jewelry advertising style.""",

    "pendant": """You are a professional jewelry photographer. Generate a photo of an elegant woman wearing the exact pendant from the input image on a delicate chain. Show from collarbone up against a soft neutral background. Professional studio lighting highlighting the pendant. The pendant must be IDENTICAL to the input. Photorealistic, high-end jewelry advertising style.""",

    "other": """You are a professional jewelry photographer. Generate a beautiful lifestyle photo showcasing the exact jewelry piece from the input image. Place it elegantly on a luxurious dark velvet surface with soft golden accent lighting. The jewelry must be IDENTICAL to the input — same design, stones, metal. Photorealistic, high-end jewelry advertising style.""",
}


# ── Image generation ──────────────────────────────────────────────────────────

async def _generate_image(image_bytes: bytes, prompt: str) -> bytes | None:
    """Generate an image using Gemini with the input image and prompt."""
    sem = _get_semaphore()
    client = _get_genai_client()

    async with sem:
        try:
            import base64 as b64mod
            image_b64 = b64mod.b64encode(image_bytes).decode("utf-8")

            response = await asyncio.to_thread(
                client.models.generate_content,
                model="gemini-2.5-flash-image",
                contents=[
                    {"text": prompt},
                    {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}},
                ],
                config=genai_types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                ),
            )

            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if hasattr(part, "inline_data") and part.inline_data:
                        raw = part.inline_data.data
                        if isinstance(raw, bytes):
                            return raw
                        elif isinstance(raw, str):
                            return b64mod.b64decode(raw)

        except Exception as exc:
            logger.error("Gemini generation failed: %s", exc)

    return None


def _upload_generated(lead_id: str, product_index: int, shot_type: str, image_bytes: bytes) -> str:
    """Upload generated image to Supabase Storage."""
    sb = get_supabase()
    path = f"lead-generated/{lead_id}/{product_index}_{shot_type}.jpg"
    try:
        sb.storage.from_("lead-images").upload(
            path, image_bytes, {"content-type": "image/jpeg"}
        )
    except Exception as exc:
        logger.error("Failed to upload generated image: %s", exc)
        return ""

    settings = get_settings()
    return f"{settings.supabase_url}/storage/v1/object/public/lead-images/{path}"


async def _download_original(url: str) -> bytes | None:
    """Download the original product image."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, timeout=20.0, follow_redirects=True)
            if resp.status_code == 200:
                return resp.content
        except Exception as exc:
            logger.debug("Failed to download original: %s", exc)
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# Main generation pipeline
# ═══════════════════════════════════════════════════════════════════════════════

async def generate_for_lead(lead_id: str) -> int:
    """Generate studio + model shots for all products of a lead.
    Returns number of products successfully generated.
    """
    sb = get_supabase()

    # Mark as generating
    sb.table("leads").update({"status": "generating"}).eq("id", lead_id).execute()

    result = sb.table("lead_products").select("*").eq("lead_id", lead_id).eq("status", "pending").execute()
    products = result.data or []

    if not products:
        sb.table("leads").update({"status": "gen_failed"}).eq("id", lead_id).execute()
        return 0

    generated_count = 0

    async def _process_product(idx: int, product: dict):
        nonlocal generated_count

        original_url = product.get("original_image_url")
        if not original_url:
            return

        image_bytes = await _download_original(original_url)
        if not image_bytes:
            sb.table("lead_products").update({"status": "failed"}).eq("id", product["id"]).execute()
            return

        jewelry_type = product.get("jewelry_type", "other")

        # Generate studio shot and model shot in parallel
        studio_task = _generate_image(image_bytes, STUDIO_PROMPT)
        model_prompt = MODEL_PROMPT_TEMPLATES.get(jewelry_type, MODEL_PROMPT_TEMPLATES["other"])
        model_task = _generate_image(image_bytes, model_prompt)

        studio_bytes, model_bytes = await asyncio.gather(studio_task, model_task)

        update_data: dict = {}

        if studio_bytes:
            studio_url = _upload_generated(lead_id, idx, "studio", studio_bytes)
            if studio_url:
                update_data["generated_studio_url"] = studio_url

        if model_bytes:
            model_url = _upload_generated(lead_id, idx, "model", model_bytes)
            if model_url:
                update_data["generated_model_url"] = model_url

        if update_data:
            update_data["status"] = "generated"
            sb.table("lead_products").update(update_data).eq("id", product["id"]).execute()
            generated_count += 1
        else:
            sb.table("lead_products").update({"status": "failed"}).eq("id", product["id"]).execute()

    # Process all products (semaphore inside _generate_image controls concurrency)
    tasks = [_process_product(i, p) for i, p in enumerate(products)]
    await asyncio.gather(*tasks)

    if generated_count > 0:
        sb.table("leads").update({"status": "generated"}).eq("id", lead_id).execute()
    else:
        sb.table("leads").update({"status": "gen_failed"}).eq("id", lead_id).execute()

    return generated_count


async def run_generation(batch_size: int = 20) -> dict:
    """Run AI generation for all scraped leads. Returns stats."""
    sb = get_supabase()
    result = sb.table("leads").select("id").eq("status", "scraped").limit(batch_size).execute()
    leads = result.data or []

    generated = 0
    failed = 0

    for lead in leads:
        count = await generate_for_lead(lead["id"])
        if count > 0:
            generated += 1
        else:
            failed += 1

    stats = {"processed": len(leads), "generated": generated, "failed": failed}
    logger.info("Generation complete: %s", stats)
    return stats
