from __future__ import annotations

"""Google Gemini AI service -- ported from lib/gemini.ts"""

import time
import base64
import re
import logging
from google import genai
from google.genai.types import GenerateContentConfig
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


def generate_image(prompt: str, image_b64: str, mime_type: str = "image/png") -> dict:
    """Generate an image using Gemini 2.5 Flash Image model.
    Returns {"base64": str, "mime_type": str, "usage": dict}
    """
    client = get_client()
    clean_b64 = re.sub(r"^data:image/\w+;base64,", "", image_b64)

    response = with_retry(lambda: client.models.generate_content(
        model="gemini-2.5-flash-preview-05-20",
        contents=[
            {"text": prompt},
            {"inline_data": {"mime_type": mime_type, "data": clean_b64}},
        ],
        config=GenerateContentConfig(response_modalities=["IMAGE"]),
    ))

    parts = response.candidates[0].content.parts if response.candidates else []
    if not parts:
        raise RuntimeError("AI returned no content. The image may have been blocked by safety filters.")

    result_b64 = ""
    result_mime = "image/png"
    for part in parts:
        if hasattr(part, "inline_data") and part.inline_data:
            result_b64 = part.inline_data.data
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

    return {"base64": result_b64, "mime_type": result_mime, "usage": usage}


def generate_image_multi(prompt: str, images: list[dict]) -> dict:
    """Generate with multiple input images.
    images: list of {"base64": str, "mime_type": str}
    """
    client = get_client()
    contents = [{"text": prompt}]
    for img in images:
        clean = re.sub(r"^data:image/\w+;base64,", "", img["base64"])
        contents.append({"inline_data": {"mime_type": img.get("mime_type", "image/png"), "data": clean}})

    response = with_retry(lambda: client.models.generate_content(
        model="gemini-2.5-flash-preview-05-20",
        contents=contents,
        config=GenerateContentConfig(response_modalities=["IMAGE"]),
    ))

    parts = response.candidates[0].content.parts if response.candidates else []
    if not parts:
        raise RuntimeError("AI returned no content.")

    result_b64 = ""
    result_mime = "image/png"
    for part in parts:
        if hasattr(part, "inline_data") and part.inline_data:
            result_b64 = part.inline_data.data
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

    return {"base64": result_b64, "mime_type": result_mime, "usage": usage}


def generate_text(prompt: str, image_b64: str | None = None, mime_type: str = "image/png") -> dict:
    """Generate text using Gemini 2.5 Flash (non-image model).
    Returns {"text": str, "usage": dict}
    """
    client = get_client()
    contents = [{"text": prompt}]
    if image_b64:
        clean = re.sub(r"^data:image/\w+;base64,", "", image_b64)
        contents.append({"inline_data": {"mime_type": mime_type, "data": clean}})

    response = with_retry(lambda: client.models.generate_content(
        model="gemini-2.5-flash-preview-05-20",
        contents=contents,
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
