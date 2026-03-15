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


def analyze_product_image(image_b64: str, mime_type: str = "image/png") -> dict:
    """Analyze a product image to understand what the product is, its visual
    attributes, and how it is realistically used.  Returns a structured dict
    that feeds into the blog-image strategy layer."""
    import json

    prompt = (
        "You are a senior product photographer and e-commerce strategist.\n"
        "Look at the attached product image carefully and return ONLY valid JSON "
        "with the following fields:\n"
        "{\n"
        '  "product_type": "specific product name (e.g. \'wireless over-ear headphones\', \'organic face serum bottle\', \'leather crossbody bag\')",\n'
        '  "category": "broad category (e.g. \'electronics\', \'skincare\', \'fashion accessories\', \'food & beverage\', \'home decor\')",\n'
        '  "material": "primary material(s) visible (e.g. \'brushed aluminium and memory-foam cushions\', \'frosted glass with gold pump cap\')",\n'
        '  "color": "dominant colors of the product itself (e.g. \'matte black with silver accents\')",\n'
        '  "finish_texture": "surface finish (e.g. \'glossy\', \'matte\', \'textured leather grain\', \'transparent glass\')",\n'
        '  "form_factor": "shape and size impression (e.g. \'compact rectangular box\', \'tall slim bottle\', \'wide brimmed hat\')",\n'
        '  "branding_visible": "any logos, labels, or text visible on the product — describe exactly what you see",\n'
        '  "hero_features": "2-3 standout visual features that make this product recognizable (e.g. \'distinctive red sole\', \'hexagonal bottle shape\', \'braided strap detail\')",\n'
        '  "realistic_use_context": "how a real person actually uses this product in daily life — be specific (e.g. \'worn on wrist while typing at a desk\', \'placed on bathroom shelf next to a mirror\', \'carried over shoulder while walking in a city\')",\n'
        '  "natural_environments": "3-4 real-world environments where this product naturally belongs (e.g. \'modern office desk\', \'gym locker room\', \'kitchen countertop\', \'bedside table\')",\n'
        '  "interaction_type": "how a person interacts with it: worn | held | placed | applied | consumed | poured | opened | displayed | carried | plugged_in | other",\n'
        '  "show_preference": "best way to photograph this product for a blog: alone_on_surface | in_use_by_person | in_natural_context | flat_lay_arrangement | close_up_detail",\n'
        '  "preservation_warnings": "anything the AI image generator must NOT change about this product (e.g. \'do not alter the logo text\', \'keep the exact shade of blue\', \'maintain the curved handle shape\')"\n'
        "}\n\n"
        "Be extremely specific and grounded in what you actually see. "
        "Do NOT guess brand names unless clearly visible. "
        "Do NOT hallucinate features that are not in the image."
    )

    result = generate_text(prompt, image_b64, mime_type, json_mode=True)
    text = result["text"].strip()

    try:
        text_clean = re.sub(r"^```json\s*", "", text)
        text_clean = re.sub(r"\s*```$", "", text_clean)
        parsed = json.loads(text_clean)
        parsed["_product_usage"] = result.get("usage", {})
        return parsed
    except Exception:
        logger.warning(f"Product analysis JSON parse failed: {text[:200]}")
        return {
            "product_type": "product",
            "category": "general",
            "material": "unknown",
            "color": "unknown",
            "finish_texture": "unknown",
            "form_factor": "unknown",
            "branding_visible": "none detected",
            "hero_features": "standard product",
            "realistic_use_context": "general use",
            "natural_environments": "neutral setting",
            "interaction_type": "placed",
            "show_preference": "in_natural_context",
            "preservation_warnings": "preserve all product details exactly",
            "_product_usage": result.get("usage", {}),
        }


def analyze_blog_for_image(blog_content: str, scene_style: str | None = None, include_human: bool = False) -> dict:
    """Analyze blog text to extract both creative direction AND SEO/article intent.
    Returns a structured dict with visual brief fields plus article-intent fields.
    """
    import json

    style_hint = f'\nThe user has requested a "{scene_style}" scene style — factor this into your choices.' if scene_style else ""
    human_hint = (
        '\nThe image MUST include a realistic human model interacting with the product. '
        'Include a "human_direction" field describing the person\'s age range, gender (or neutral), '
        'pose, clothing style, and how they interact with the product (holding, wearing, using, etc.).'
    ) if include_human else ""

    prompt = (
        "You are a creative director AND SEO content strategist at a top agency.\n"
        "Read the blog content below and extract TWO things:\n"
        "1) A precise visual brief for a product photograph that would accompany this article\n"
        "2) The article's SEO intent so the image actually supports the content goal\n\n"
        f"--- BLOG CONTENT ---\n{blog_content[:3000]}\n--- END ---\n"
        f"{style_hint}{human_hint}\n\n"
        "Return ONLY valid JSON with ALL of these fields:\n"
        "{\n"
        '  "product_context": "what the product is and how the blog talks about it",\n'
        '  "article_intent": "one of: informational | comparison | how_to | listicle | buyer_guide | problem_solution | review | tutorial",\n'
        '  "funnel_stage": "one of: awareness | consideration | decision",\n'
        '  "target_reader": "who is reading this article and why (e.g. \'first-time buyer researching options\', \'existing user looking for tips\')",\n'
        '  "likely_search_query": "the search query someone would type to find this article (e.g. \'best wireless headphones for working out\')",\n'
        '  "visual_goal": "what the image should communicate to the reader in one sentence (e.g. \'show the headphones being comfortably worn during a workout\')",\n'
        '  "recommended_image_type": "one of: hero_banner | in_use_contextual | explanatory_support | lifestyle_credibility | comparison_support | step_illustration | product_detail_closeup",\n'
        '  "what_section_it_supports": "which part of the article this image best supports (e.g. \'introduction\', \'benefits section\', \'how-to step 3\')",\n'
        '  "setting": "specific physical location/environment for the photo — be very specific (e.g. \'sunlit Scandinavian kitchen with white oak countertops\')",\n'
        '  "lighting": "exact lighting setup (e.g. \'warm golden-hour side light from a large window, soft fill from white walls\')",\n'
        '  "color_palette": "3-5 specific colors that match the blog mood (e.g. \'warm ivory, terracotta, sage green, matte brass\')",\n'
        '  "mood": "emotional tone in 2-3 words (e.g. \'cozy and intimate\', \'bold and energetic\')",\n'
        '  "props": "2-4 complementary DECORATIVE objects only (NOT products/merchandise). Be specific. Never suggest other commercial products.",\n'
        '  "camera_angle": "specific camera position (e.g. \'45-degree overhead\', \'eye-level straight-on\')",\n'
        '  "depth_of_field": "shallow/medium/deep and what should be in focus vs blurred",\n'
        '  "photography_brief": "A single, dense paragraph (80-120 words) that a photographer could use as a shot list. Hyper-specific."\n'
        + (',  "human_direction": "detailed description of the person in the shot"' if include_human else "")
        + "\n}\n\n"
        "IMPORTANT: The image must SERVE the article — not just look pretty. "
        "Think about what a reader searching for this topic needs to SEE to trust the article. "
        "Be extremely specific and visual. Avoid generic descriptions."
    )

    result = generate_text(prompt, json_mode=True)
    text = result["text"].strip()

    try:
        text_clean = re.sub(r"^```json\s*", "", text)
        text_clean = re.sub(r"\s*```$", "", text_clean)
        parsed = json.loads(text_clean)
        parsed["_analysis_usage"] = result.get("usage", {})
        return parsed
    except Exception:
        logger.warning(f"Blog analysis JSON parse failed, using raw text: {text[:200]}")
        return {
            "photography_brief": text[:500],
            "article_intent": "informational",
            "funnel_stage": "awareness",
            "target_reader": "general reader",
            "likely_search_query": "",
            "visual_goal": "show the product in a relevant context",
            "recommended_image_type": "in_use_contextual",
            "what_section_it_supports": "general",
            "setting": "contextual scene",
            "lighting": "natural soft lighting",
            "mood": "professional",
            "color_palette": "neutral tones",
            "props": "minimal complementary objects",
            "camera_angle": "eye-level",
            "depth_of_field": "shallow, product in focus",
            "_analysis_usage": result.get("usage", {}),
        }


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
