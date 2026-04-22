from __future__ import annotations

"""OpenAI gpt-image-2 service — used for the 'ultra' quality tier.

Return shape mirrors gemini_service.generate_image:
    {"base64": str, "mime_type": str, "usage": dict, "model": str}
"""

import base64
import logging
import time
from io import BytesIO

from openai import OpenAI
from app.config import get_settings

logger = logging.getLogger(__name__)

# Pinned to the date-stamped release (gpt-image-2, launched 2026-04-21).
# We avoid rolling aliases (chatgpt-image-latest, gpt-image-2) in prod so a
# silent OpenAI upgrade can never change our output without us noticing.
MODEL_ULTRA = "gpt-image-2-2026-04-21"
MODEL_MINI = "gpt-image-1-mini"

# Map our aspect ratio IDs to OpenAI's `size` param. gpt-image-2 supports
# 1024x1024, 1024x1536 (portrait), 1536x1024 (landscape), and 4K multiples.
RATIO_TO_SIZE = {
    "square": "1024x1024",
    "portrait": "1024x1536",
    "landscape": "1536x1024",
    "9:16": "1024x1536",
    "16:9": "1536x1024",
    "4:5": "1024x1536",
    "1:1": "1024x1024",
}

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        _client = OpenAI(api_key=settings.openai_api_key, timeout=180.0)
    return _client


def _size_for_ratio(aspect_ratio_id: str | None) -> str:
    if not aspect_ratio_id:
        return "1024x1024"
    return RATIO_TO_SIZE.get(aspect_ratio_id, "1024x1024")


def _b64_to_file_tuple(image_b64: str, mime_type: str = "image/png") -> tuple[str, bytes, str]:
    """Strip data URI prefix if present and return (filename, bytes, mime)."""
    clean = image_b64.split(",", 1)[1] if image_b64.startswith("data:") else image_b64
    raw = base64.b64decode(clean)
    ext = "png" if "png" in mime_type else "jpg"
    return (f"input.{ext}", raw, mime_type)


def generate_image(
    prompt: str,
    image_b64: str | None = None,
    mime_type: str = "image/png",
    aspect_ratio_id: str | None = None,
    model: str = MODEL_ULTRA,
    quality: str = "high",
) -> dict:
    """Generate (or edit, if image_b64 given) using gpt-image-2.

    - If image_b64 is None → pure text-to-image via images.generate
    - If image_b64 is provided → edit/variation via images.edit (high-fidelity reference)
    """
    client = _get_client()
    size = _size_for_ratio(aspect_ratio_id)

    t0 = time.time()
    try:
        if image_b64:
            name, raw, mime = _b64_to_file_tuple(image_b64, mime_type)
            file_tuple = (name, BytesIO(raw), mime)
            response = client.images.edit(
                model=model,
                image=file_tuple,
                prompt=prompt,
                size=size,
                quality=quality,
            )
        else:
            response = client.images.generate(
                model=model,
                prompt=prompt,
                size=size,
                quality=quality,
            )
    except Exception as e:
        logger.error("OpenAI image gen failed [%s]: %s", model, str(e)[:200])
        raise

    elapsed = time.time() - t0
    logger.info("OpenAI image gen [%s] completed in %.1fs", model, elapsed)

    if not response.data:
        raise RuntimeError("OpenAI returned no image data (likely content policy block).")

    result_b64 = response.data[0].b64_json
    if not result_b64:
        raise RuntimeError("OpenAI returned an empty image payload.")

    usage = {}
    if hasattr(response, "usage") and response.usage:
        u = response.usage
        usage = {
            "input_tokens": getattr(u, "input_tokens", 0) or 0,
            "output_tokens": getattr(u, "output_tokens", 0) or 0,
            "total_tokens": getattr(u, "total_tokens", 0) or 0,
        }

    return {
        "base64": result_b64,
        "mime_type": "image/png",
        "usage": usage,
        "model": model,
    }


def generate_image_multi(
    prompt: str,
    images: list[dict],
    aspect_ratio_id: str | None = None,
    model: str = MODEL_ULTRA,
    quality: str = "high",
) -> dict:
    """Edit with multiple reference images (gpt-image-2 accepts up to 10)."""
    if not images:
        raise ValueError("generate_image_multi requires at least one image")

    client = _get_client()
    size = _size_for_ratio(aspect_ratio_id)

    files = []
    for idx, img in enumerate(images[:10]):
        b64 = img.get("base64") or img.get("image_base64") or ""
        mime = img.get("mime_type", "image/png")
        name, raw, m = _b64_to_file_tuple(b64, mime)
        files.append((f"ref_{idx}.{name.split('.')[-1]}", BytesIO(raw), m))

    t0 = time.time()
    try:
        response = client.images.edit(
            model=model,
            image=files,
            prompt=prompt,
            size=size,
            quality=quality,
        )
    except Exception as e:
        logger.error("OpenAI multi-image gen failed [%s]: %s", model, str(e)[:200])
        raise

    logger.info("OpenAI multi-image gen [%s] completed in %.1fs", model, time.time() - t0)

    if not response.data or not response.data[0].b64_json:
        raise RuntimeError("OpenAI returned no image payload.")

    usage = {}
    if hasattr(response, "usage") and response.usage:
        u = response.usage
        usage = {
            "input_tokens": getattr(u, "input_tokens", 0) or 0,
            "output_tokens": getattr(u, "output_tokens", 0) or 0,
            "total_tokens": getattr(u, "total_tokens", 0) or 0,
        }

    return {
        "base64": response.data[0].b64_json,
        "mime_type": "image/png",
        "usage": usage,
        "model": model,
    }
