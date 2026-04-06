from __future__ import annotations

"""Google Gemini AI service -- supports both AI Studio (api_key) and Vertex AI (service account)."""

import io
import os
import time
import base64
import re
import logging
import httpx as _httpx
from PIL import Image as PILImage
from google import genai
from google.genai.types import GenerateContentConfig, ImageConfig, HttpOptions, HttpRetryOptions
from app.config import get_settings

logger = logging.getLogger(__name__)

MODEL_FLASH_IMAGE = "gemini-2.5-flash-image"
MODEL_PRO_IMAGE = "gemini-3-pro-image-preview"
MODEL_TEXT = "gemini-2.5-flash"

TEXT_TIMEOUT_MS = 30_000
IMAGE_TIMEOUT_MS = 60_000
PRO_TIMEOUT_MS = 35_000

RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504]

_clients: dict[str, genai.Client] = {}
_using_vertex: bool = False


def _build_http_opts(timeout_ms: int, max_retries: int) -> HttpOptions:
    return HttpOptions(
        timeout=timeout_ms,
        client_args={"timeout": _httpx.Timeout(timeout_ms / 1000.0)},
        retry_options=HttpRetryOptions(
            attempts=max_retries,
            initial_delay=2.0,
            max_delay=10.0,
            http_status_codes=RETRYABLE_STATUS_CODES,
        ),
    )


def _make_vertex_client(settings, http_opts: HttpOptions) -> genai.Client:
    if settings.google_application_credentials:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.google_application_credentials
    return genai.Client(
        vertexai=True,
        project=settings.google_cloud_project,
        location=settings.google_cloud_location,
        http_options=http_opts,
    )


def _make_apikey_client(settings, http_opts: HttpOptions) -> genai.Client:
    return genai.Client(
        api_key=settings.gemini_api_key,
        http_options=http_opts,
    )


def _make_client(timeout_ms: int, max_retries: int = 3) -> genai.Client:
    global _using_vertex
    settings = get_settings()
    http_opts = _build_http_opts(timeout_ms, max_retries)

    if settings.use_vertex_ai and settings.google_cloud_project:
        client = _make_vertex_client(settings, http_opts)
        client.models.generate_content(
            model=MODEL_TEXT,
            contents=[{"text": "ping"}],
        )
        _using_vertex = True
        logger.info(
            "Vertex AI client OK (project=%s, location=%s) — using Google Cloud billing",
            settings.google_cloud_project, settings.google_cloud_location,
        )
        return client

    if not settings.gemini_api_key:
        raise RuntimeError(
            "No working AI backend: set USE_VERTEX_AI=true with GOOGLE_CLOUD_PROJECT, or set GEMINI_API_KEY"
        )
    _using_vertex = False
    logger.info("Using AI Studio client (api_key mode)")
    return _make_apikey_client(settings, http_opts)


def get_client(timeout_ms: int = IMAGE_TIMEOUT_MS, max_retries: int = 3) -> genai.Client:
    global _clients
    key = f"{timeout_ms}_{max_retries}"
    if key not in _clients:
        _clients[key] = _make_client(timeout_ms, max_retries)
    return _clients[key]


def get_text_client() -> genai.Client:
    return get_client(timeout_ms=TEXT_TIMEOUT_MS, max_retries=3)


def get_image_client() -> genai.Client:
    return get_client(timeout_ms=IMAGE_TIMEOUT_MS, max_retries=3)


def get_pro_client() -> genai.Client:
    return get_client(timeout_ms=PRO_TIMEOUT_MS, max_retries=1)


def _is_transient_error(e: Exception) -> bool:
    err_msg = str(e).lower()
    return any(kw in err_msg for kw in [
        "503", "504", "500", "502", "high demand", "overloaded", "deadline",
        "unavailable", "timeout", "timed out", "read timeout", "connect",
    ])


RATIO_ID_TO_API = {
    "square": "1:1",
    "portrait": "3:4",
    "story": "9:16",
    "landscape": "4:3",
    "widescreen": "16:9",
}

MAX_IMAGE_DIMENSION = 1024
JPEG_QUALITY = 85


def _prepare_image_b64(raw_b64: str, mime_type: str = "image/png") -> tuple[str, str]:
    """Resize & compress a base64 image so Gemini gets a lightweight payload.

    Returns (clean_b64, output_mime_type).  Images larger than
    MAX_IMAGE_DIMENSION on either side are down-scaled proportionally.
    The result is always JPEG (smaller wire size) unless the source is PNG
    with transparency that matters — but for product photos JPEG is fine.
    """
    clean = re.sub(r"^data:image/\w+;base64,", "", raw_b64)
    raw_bytes = base64.b64decode(clean)
    original_kb = len(raw_bytes) / 1024

    try:
        img = PILImage.open(io.BytesIO(raw_bytes))
    except Exception:
        logger.debug("Could not decode image for resizing, sending as-is")
        return clean, mime_type

    w, h = img.size
    needs_resize = max(w, h) > MAX_IMAGE_DIMENSION

    if not needs_resize and original_kb < 500:
        return clean, mime_type

    if needs_resize:
        scale = MAX_IMAGE_DIMENSION / max(w, h)
        new_w, new_h = int(w * scale), int(h * scale)
        img = img.resize((new_w, new_h), PILImage.LANCZOS)

    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGB")

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    compressed = buf.getvalue()
    out_b64 = base64.b64encode(compressed).decode("utf-8")

    logger.info(
        "Image prep: %dx%d (%.0fKB) -> %dx%d (%.0fKB) — %.0f%% smaller",
        w, h, original_kb,
        img.size[0], img.size[1], len(compressed) / 1024,
        (1 - len(compressed) / len(raw_bytes)) * 100,
    )
    return out_b64, "image/jpeg"


def generate_image(prompt: str, image_b64: str, mime_type: str = "image/png", aspect_ratio_id: str | None = None) -> dict:
    """Generate an image using Flash. Retries once at app level on transient failure."""
    client = get_image_client()
    try:
        return _generate_image_with_client(client, MODEL_FLASH_IMAGE, prompt, image_b64, mime_type, aspect_ratio_id)
    except Exception as e:
        if _is_transient_error(e):
            logger.warning("Flash gen failed (%s), retrying once after 3s...", str(e)[:80])
            time.sleep(3)
            return _generate_image_with_client(client, MODEL_FLASH_IMAGE, prompt, image_b64, mime_type, aspect_ratio_id)
        raise


def generate_image_pro(prompt: str, image_b64: str, mime_type: str = "image/png", aspect_ratio_id: str | None = None) -> dict:
    """Generate using Pro model. If Pro is overloaded/unavailable, automatically falls back to Flash."""
    try:
        client = get_pro_client()
        return _generate_image_with_client(client, MODEL_PRO_IMAGE, prompt, image_b64, mime_type, aspect_ratio_id)
    except Exception as e:
        if _is_transient_error(e):
            logger.warning("Pro model unavailable (%s: %s), falling back to Flash", type(e).__name__, str(e)[:80])
            client = get_image_client()
            result = _generate_image_with_client(client, MODEL_FLASH_IMAGE, prompt, image_b64, mime_type, aspect_ratio_id)
            result["model"] = f"{MODEL_FLASH_IMAGE} (fallback from pro)"
            result["fallback"] = True
            return result
        raise


def _generate_image_with_client(client: genai.Client, model: str, prompt: str, image_b64: str, mime_type: str = "image/png", aspect_ratio_id: str | None = None) -> dict:
    """Internal: generate image with a pre-configured client."""
    clean_b64, mime_type = _prepare_image_b64(image_b64, mime_type)

    config_kwargs: dict = {"response_modalities": ["IMAGE"]}
    api_ratio = RATIO_ID_TO_API.get(aspect_ratio_id or "")
    if api_ratio:
        config_kwargs["image_config"] = ImageConfig(aspect_ratio=api_ratio)

    t0 = time.time()
    response = client.models.generate_content(
        model=model,
        contents=[
            {"text": prompt},
            {"inline_data": {"mime_type": mime_type, "data": clean_b64}},
        ],
        config=GenerateContentConfig(**config_kwargs),
    )
    elapsed = time.time() - t0
    logger.info("Image gen [%s] completed in %.1fs", model, elapsed)

    parts = response.candidates[0].content.parts if response.candidates else []
    if not parts:
        raise RuntimeError("AI returned no content. The image may have been blocked by safety filters.")

    result_b64 = ""
    result_mime = "image/png"
    for part in parts:
        if hasattr(part, "inline_data") and part.inline_data:
            raw = part.inline_data.data
            if isinstance(raw, bytes):
                result_b64 = base64.b64encode(raw).decode("utf-8")
            else:
                result_b64 = raw
            result_mime = part.inline_data.mime_type or "image/png"

    if not result_b64:
        text_parts = [p.text for p in parts if hasattr(p, "text") and p.text]
        raise RuntimeError(f"AI did not return an image. {' '.join(text_parts) if text_parts else 'Try again.'}")

    usage = {}
    if hasattr(response, "usage_metadata") and response.usage_metadata:
        um = response.usage_metadata
        usage = {
            "input_tokens": getattr(um, "prompt_token_count", 0) or 0,
            "output_tokens": getattr(um, "candidates_token_count", 0) or 0,
            "total_tokens": getattr(um, "total_token_count", 0) or 0,
        }

    return {"base64": result_b64, "mime_type": result_mime, "usage": usage, "model": model}


def generate_image_multi(prompt: str, images: list[dict], aspect_ratio_id: str | None = None) -> dict:
    """Generate with multiple input images using Flash. Retries once on transient failure."""
    client = get_image_client()
    try:
        return _generate_image_multi_with_client(client, MODEL_FLASH_IMAGE, prompt, images, aspect_ratio_id)
    except Exception as e:
        if _is_transient_error(e):
            logger.warning("Flash multi-image failed (%s), retrying once after 3s...", str(e)[:80])
            time.sleep(3)
            return _generate_image_multi_with_client(client, MODEL_FLASH_IMAGE, prompt, images, aspect_ratio_id)
        raise


def generate_image_pro_multi(prompt: str, images: list[dict], aspect_ratio_id: str | None = None) -> dict:
    """Generate with multiple input images using Pro, with automatic fallback to Flash."""
    try:
        client = get_pro_client()
        return _generate_image_multi_with_client(client, MODEL_PRO_IMAGE, prompt, images, aspect_ratio_id)
    except Exception as e:
        if _is_transient_error(e):
            logger.warning("Pro multi-image unavailable (%s), falling back to Flash", type(e).__name__)
            client = get_image_client()
            result = _generate_image_multi_with_client(client, MODEL_FLASH_IMAGE, prompt, images, aspect_ratio_id)
            result["model"] = f"{MODEL_FLASH_IMAGE} (fallback from pro)"
            result["fallback"] = True
            return result
        raise


def _generate_image_multi_with_client(client: genai.Client, model: str, prompt: str, images: list[dict], aspect_ratio_id: str | None = None) -> dict:
    """Internal: multi-image generation with a pre-configured client."""
    contents = [{"text": prompt}]
    for img in images:
        clean_b64, out_mime = _prepare_image_b64(img["base64"], img.get("mime_type", "image/png"))
        contents.append({"inline_data": {"mime_type": out_mime, "data": clean_b64}})

    config_kwargs: dict = {"response_modalities": ["IMAGE"]}
    api_ratio = RATIO_ID_TO_API.get(aspect_ratio_id or "")
    if api_ratio:
        config_kwargs["image_config"] = ImageConfig(aspect_ratio=api_ratio)

    t0 = time.time()
    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=GenerateContentConfig(**config_kwargs),
    )
    elapsed = time.time() - t0
    logger.info("Multi-image gen [%s] completed in %.1fs", model, elapsed)

    parts = response.candidates[0].content.parts if response.candidates else []
    if not parts:
        raise RuntimeError("AI returned no content.")

    result_b64 = ""
    result_mime = "image/png"
    for part in parts:
        if hasattr(part, "inline_data") and part.inline_data:
            raw = part.inline_data.data
            if isinstance(raw, bytes):
                result_b64 = base64.b64encode(raw).decode("utf-8")
            else:
                result_b64 = raw
            result_mime = part.inline_data.mime_type or "image/png"

    if not result_b64:
        raise RuntimeError("AI did not return an image.")

    usage = {}
    if hasattr(response, "usage_metadata") and response.usage_metadata:
        um = response.usage_metadata
        usage = {
            "input_tokens": getattr(um, "prompt_token_count", 0) or 0,
            "output_tokens": getattr(um, "candidates_token_count", 0) or 0,
            "total_tokens": getattr(um, "total_token_count", 0) or 0,
        }

    return {"base64": result_b64, "mime_type": result_mime, "usage": usage, "model": model}


def generate_text(prompt: str, image_b64: str | None = None, mime_type: str = "image/png", *, json_mode: bool = False) -> dict:
    """Generate text using Gemini 2.5 Flash (non-image model).
    When json_mode=True, instructs Gemini to return valid JSON.
    Returns {"text": str, "usage": dict}
    """
    client = get_text_client()
    contents = [{"text": prompt}]
    if image_b64:
        clean, out_mime = _prepare_image_b64(image_b64, mime_type)
        contents.append({"inline_data": {"mime_type": out_mime, "data": clean}})

    config_kwargs: dict = {}
    if json_mode:
        config_kwargs["response_mime_type"] = "application/json"

    try:
        response = client.models.generate_content(
            model=MODEL_TEXT,
            contents=contents,
            **({"config": GenerateContentConfig(**config_kwargs)} if config_kwargs else {}),
        )
    except Exception as e:
        if _is_transient_error(e):
            logger.warning("Text gen failed (%s), retrying once after 2s...", str(e)[:80])
            time.sleep(2)
            response = client.models.generate_content(
                model=MODEL_TEXT,
                contents=contents,
                **({"config": GenerateContentConfig(**config_kwargs)} if config_kwargs else {}),
            )
        else:
            raise

    parts = response.candidates[0].content.parts if response.candidates else []
    text = " ".join(p.text for p in parts if hasattr(p, "text") and p.text)

    usage = {}
    if hasattr(response, "usage_metadata") and response.usage_metadata:
        um = response.usage_metadata
        usage = {
            "input_tokens": getattr(um, "prompt_token_count", 0) or 0,
            "output_tokens": getattr(um, "candidates_token_count", 0) or 0,
            "total_tokens": getattr(um, "total_token_count", 0) or 0,
        }

    return {"text": text, "usage": usage}


def refine_prompt(raw_prompt: str) -> dict:
    """Refine a user prompt into a product photography prompt.
    Returns {"refined": str, "isolate": bool}
    """
    system = (
        "You are an expert product photography prompt engineer. "
        "Given a rough idea, output a polished prompt for an AI image generator. "
        "If the user wants the product isolated (white/clean bg), set isolate=true. "
        "Reply in JSON: {\"refined\": \"...\", \"isolate\": true/false}"
    )

    result = generate_text(f"{system}\n\nUser prompt: {raw_prompt}")
    text = result["text"].strip()

    import json
    try:
        text_clean = re.sub(r"^```json\s*", "", text)
        text_clean = re.sub(r"\s*```$", "", text_clean)
        parsed = json.loads(text_clean)
        return {"refined": parsed.get("refined", raw_prompt), "isolate": parsed.get("isolate", False)}
    except Exception:
        return {"refined": text, "isolate": False}


def extract_jewelry_details(image_b64: str, jewelry_type: str) -> dict:
    """Extract details from jewelry image for better prompts.
    Returns {"description": str, "metal": str, "stones": str}
    """
    prompt = (
        f"Analyze this {jewelry_type} jewelry image. Return a JSON with:\n"
        '{"description": "brief visual description", "metal": "gold/silver/rose_gold/platinum", '
        '"stones": "description of stones if any, or none"}\n'
        "Be concise. JSON only, no markdown."
    )
    result = generate_text(prompt, image_b64)
    text = result["text"].strip()
    import json
    try:
        text_clean = re.sub(r"^```json\s*", "", text)
        text_clean = re.sub(r"\s*```$", "", text_clean)
        return json.loads(text_clean)
    except Exception:
        return {"description": jewelry_type, "metal": "gold", "stones": "none"}
