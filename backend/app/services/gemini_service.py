from __future__ import annotations

"""Google Gemini AI service -- ported from lib/gemini.ts"""

import time
import base64
import re
import logging
from google import genai
from google.genai.types import GenerateContentConfig, ImageConfig
from app.config import get_settings

logger = logging.getLogger(__name__)

_client: genai.Client | None = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not set")
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def with_retry(fn, max_retries: int = 3, base_delay: float = 2.0):
    """Retry with exponential backoff for rate limits and transient errors."""
    for attempt in range(max_retries + 1):
        try:
            return fn()
        except Exception as e:
            err_msg = str(e).lower()
            is_retryable = any(
                kw in err_msg
                for kw in ["429", "rate limit", "resource_exhausted", "503", "500", "overloaded"]
            )
            if not is_retryable or attempt == max_retries:
                raise
            delay = base_delay * (2 ** attempt)
            logger.warning(f"Retryable error (attempt {attempt + 1}/{max_retries}): {e}. Waiting {delay}s...")
            time.sleep(delay)


RATIO_ID_TO_API = {
    "square": "1:1",
    "portrait": "3:4",
    "story": "9:16",
    "landscape": "4:3",
    "widescreen": "16:9",
}


def generate_image(prompt: str, image_b64: str, mime_type: str = "image/png", aspect_ratio_id: str | None = None) -> dict:
    """Generate an image using Gemini 2.5 Flash Image model (fast drafts).
    Returns {"base64": str, "mime_type": str, "usage": dict, "model": str}
    """
    return _generate_image_with_model("gemini-2.5-flash-image", prompt, image_b64, mime_type, aspect_ratio_id)


def generate_image_pro(prompt: str, image_b64: str, mime_type: str = "image/png", aspect_ratio_id: str | None = None) -> dict:
    """Generate an image using Nano Banana Pro (Gemini 3 Pro Image) for studio-quality output.
    Returns {"base64": str, "mime_type": str, "usage": dict, "model": str}
    """
    return _generate_image_with_model("gemini-3-pro-image-preview", prompt, image_b64, mime_type, aspect_ratio_id)


def _generate_image_with_model(model: str, prompt: str, image_b64: str, mime_type: str = "image/png", aspect_ratio_id: str | None = None) -> dict:
    """Internal: generate image with a specified model."""
    client = get_client()
    clean_b64 = re.sub(r"^data:image/\w+;base64,", "", image_b64)

    config_kwargs: dict = {"response_modalities": ["IMAGE"]}
    api_ratio = RATIO_ID_TO_API.get(aspect_ratio_id or "")
    if api_ratio:
        config_kwargs["image_config"] = ImageConfig(aspect_ratio=api_ratio)

    response = with_retry(lambda: client.models.generate_content(
        model=model,
        contents=[
            {"text": prompt},
            {"inline_data": {"mime_type": mime_type, "data": clean_b64}},
        ],
        config=GenerateContentConfig(**config_kwargs),
    ))

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
    """Generate with multiple input images using Flash (fast).
    images: list of {"base64": str, "mime_type": str}
    """
    return _generate_image_multi_with_model("gemini-2.5-flash-image", prompt, images, aspect_ratio_id)


def generate_image_pro_multi(prompt: str, images: list[dict], aspect_ratio_id: str | None = None) -> dict:
    """Generate with multiple input images using Nano Banana Pro (studio quality).
    images: list of {"base64": str, "mime_type": str}
    """
    return _generate_image_multi_with_model("gemini-3-pro-image-preview", prompt, images, aspect_ratio_id)


def _generate_image_multi_with_model(model: str, prompt: str, images: list[dict], aspect_ratio_id: str | None = None) -> dict:
    """Internal: multi-image generation with a specified model."""
    client = get_client()
    contents = [{"text": prompt}]
    for img in images:
        clean = re.sub(r"^data:image/\w+;base64,", "", img["base64"])
        contents.append({"inline_data": {"mime_type": img.get("mime_type", "image/png"), "data": clean}})

    config_kwargs: dict = {"response_modalities": ["IMAGE"]}
    api_ratio = RATIO_ID_TO_API.get(aspect_ratio_id or "")
    if api_ratio:
        config_kwargs["image_config"] = ImageConfig(aspect_ratio=api_ratio)

    response = with_retry(lambda: client.models.generate_content(
        model=model,
        contents=contents,
        config=GenerateContentConfig(**config_kwargs),
    ))

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
    client = get_client()
    contents = [{"text": prompt}]
    if image_b64:
        clean = re.sub(r"^data:image/\w+;base64,", "", image_b64)
        contents.append({"inline_data": {"mime_type": mime_type, "data": clean}})

    config_kwargs: dict = {}
    if json_mode:
        config_kwargs["response_mime_type"] = "application/json"

    response = with_retry(lambda: client.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents,
        **({"config": GenerateContentConfig(**config_kwargs)} if config_kwargs else {}),
    ))

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
