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

# Hard wall-clock ceiling for a single OpenAI image call. Streaming resets the
# per-read timeout on every partial frame, so without this a stalled/slow stream
# could run for tens of minutes (observed: a 42-minute outlier). When this is
# exceeded we abort; the dispatch layer (image_dispatch) then falls back to
# Gemini Pro, so the user gets an image in bounded time instead of hanging.
OPENAI_DEADLINE_SECONDS = 240.0


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        # gpt-image-2 high-quality edits take ~145-280s (median ~195s); medium
        # ~60s, low ~25s. The OpenAI SDK default is 600s — the previous 60s value
        # caused EVERY high-tier call to time out client-side before the (working)
        # server responded. We stream partial images (see _collect_stream) so the
        # connection stays warm and first bytes arrive in ~15s, and keep a generous
        # ceiling so the final image is never cut off.
        _client = OpenAI(api_key=settings.openai_api_key, timeout=300.0, max_retries=1)
    return _client


def _size_for_ratio(aspect_ratio_id: str | None) -> str:
    if not aspect_ratio_id:
        return "1024x1024"
    return RATIO_TO_SIZE.get(aspect_ratio_id, "1024x1024")


def _usage_from(obj) -> dict:
    u = getattr(obj, "usage", None)
    if not u:
        return {}
    return {
        "input_tokens": getattr(u, "input_tokens", 0) or 0,
        "output_tokens": getattr(u, "output_tokens", 0) or 0,
        "total_tokens": getattr(u, "total_tokens", 0) or 0,
    }


def _collect_stream(stream, deadline_s: float = OPENAI_DEADLINE_SECONDS) -> tuple[str | None, dict]:
    """Consume a streamed image response and return (final_b64, usage).

    Streaming keeps the HTTP connection alive via periodic partial-image events
    (first arrives in ~15s), which is what prevents the 60s gateway/read timeout
    that high-quality gpt-image-2 edits used to trip. We keep the latest partial
    as a safety net in case the terminal `*.completed` event lacks a payload.

    A wall-clock `deadline_s` bounds the total time: streaming resets the per-read
    timeout on each frame, so this is the only thing that stops a pathologically
    slow stream from running for tens of minutes. On breach we raise TimeoutError
    so the caller can fall back to Gemini.

    Handles both edit (`image_edit.*`) and generate (`image_generation.*`) event
    names by matching on the suffix.
    """
    final_b64 = None
    last_partial = None
    usage = {}
    start = time.time()
    try:
        for event in stream:
            if time.time() - start > deadline_s:
                raise TimeoutError(
                    f"OpenAI image stream exceeded {deadline_s:.0f}s wall-clock deadline"
                )
            etype = getattr(event, "type", "") or ""
            b64 = getattr(event, "b64_json", None)
            if etype.endswith("completed"):
                if b64:
                    final_b64 = b64
                usage = _usage_from(event) or usage
            elif etype.endswith("partial_image") and b64:
                last_partial = b64
    finally:
        # Release the underlying HTTP connection promptly on abort/success.
        try:
            stream.close()
        except Exception:
            pass
    return (final_b64 or last_partial), usage


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
    quality: str = "medium",
) -> dict:
    """Generate (or edit, if image_b64 given) using gpt-image-2.

    - If image_b64 is None → pure text-to-image via images.generate
    - If image_b64 is provided → edit/variation via images.edit (high-fidelity reference)

    Default quality is "medium" (~60-90s): A/B testing showed it is visually
    near-identical to "high" (~195s) for jewelry while being ~3x faster and far
    more stable. Callers can still pass quality="high" for a premium tier.
    """
    client = _get_client()
    size = _size_for_ratio(aspect_ratio_id)

    t0 = time.time()
    try:
        if image_b64:
            name, raw, mime = _b64_to_file_tuple(image_b64, mime_type)
            file_tuple = (name, BytesIO(raw), mime)
            stream = client.images.edit(
                model=model,
                image=file_tuple,
                prompt=prompt,
                size=size,
                quality=quality,
                stream=True,
                partial_images=2,
            )
        else:
            stream = client.images.generate(
                model=model,
                prompt=prompt,
                size=size,
                quality=quality,
                stream=True,
                partial_images=2,
            )
        result_b64, usage = _collect_stream(stream)
    except Exception as e:
        logger.error("OpenAI image gen failed [%s]: %s", model, str(e)[:200])
        raise

    elapsed = time.time() - t0
    logger.info("OpenAI image gen [%s] completed in %.1fs", model, elapsed)

    if not result_b64:
        raise RuntimeError("OpenAI returned no image data (likely content policy block).")

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
    quality: str = "medium",
) -> dict:
    """Edit with multiple reference images (gpt-image-2 accepts up to 10).

    Default quality "medium" — see generate_image() for rationale.
    """
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
        stream = client.images.edit(
            model=model,
            image=files,
            prompt=prompt,
            size=size,
            quality=quality,
            stream=True,
            partial_images=2,
        )
        result_b64, usage = _collect_stream(stream)
    except Exception as e:
        logger.error("OpenAI multi-image gen failed [%s]: %s", model, str(e)[:200])
        raise

    logger.info("OpenAI multi-image gen [%s] completed in %.1fs", model, time.time() - t0)

    if not result_b64:
        raise RuntimeError("OpenAI returned no image payload.")

    return {
        "base64": result_b64,
        "mime_type": "image/png",
        "usage": usage,
        "model": model,
    }
