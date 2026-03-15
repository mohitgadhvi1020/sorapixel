from __future__ import annotations

"""Blog Image Generation router — multi-step pipeline:
1. Analyze the product image(s) to understand what they are
2. Analyze the blog content + SEO intent
3. Merge into a strategy, build a layered prompt, generate
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal

from app.middleware.auth import get_current_user
from app.services.gemini_service import (
    generate_image, generate_image_pro,
    generate_image_multi, generate_image_pro_multi,
    analyze_blog_for_image,
    analyze_product_image,
)
from app.services.image_service import crop_to_ratio
from app.services.credit_service import check_studio_balance, deduct_studio_tokens, get_studio_credits, STUDIO_PRICING
from app.services.tracking_service import track_generation
from app.services.prompt_service import get_ratio
from app.services.project_service import save_project

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/blog-images", tags=["Blog Images"])


class BlogImageRequest(BaseModel):
    image_base64: str | None = None
    images: list[str] | None = None
    blog_content: str
    aspect_ratio_id: str | None = "landscape"
    custom_prompt: str | None = None
    quality: Literal["standard", "pro"] = "standard"
    include_human: bool = False
    scene_style: str | None = None


class ImageResult(BaseModel):
    base64: str
    mime_type: str = "image/png"
    label: str = ""


class BlogImageResponse(BaseModel):
    success: bool
    images: list[ImageResult] = []
    error: str | None = None
    credits_remaining: int | None = None


# ---------------------------------------------------------------------------
# Strategy builder — merges product understanding + blog/SEO analysis
# ---------------------------------------------------------------------------

def _build_strategy(product_analyses: list[dict], blog_analysis: dict) -> dict:
    """Combine product-level understanding with blog/SEO intent into a
    single strategy object that drives the final generation prompt."""

    if len(product_analyses) == 1:
        pa = product_analyses[0]
    else:
        pa = {
            "product_type": ", ".join(p.get("product_type", "product") for p in product_analyses),
            "category": product_analyses[0].get("category", "general"),
            "material": "; ".join(p.get("material", "") for p in product_analyses if p.get("material")),
            "color": "; ".join(p.get("color", "") for p in product_analyses if p.get("color")),
            "finish_texture": product_analyses[0].get("finish_texture", ""),
            "form_factor": "; ".join(p.get("form_factor", "") for p in product_analyses if p.get("form_factor")),
            "branding_visible": "; ".join(p.get("branding_visible", "") for p in product_analyses if p.get("branding_visible")),
            "hero_features": "; ".join(p.get("hero_features", "") for p in product_analyses if p.get("hero_features")),
            "realistic_use_context": product_analyses[0].get("realistic_use_context", "general use"),
            "natural_environments": product_analyses[0].get("natural_environments", "neutral setting"),
            "interaction_type": product_analyses[0].get("interaction_type", "placed"),
            "show_preference": product_analyses[0].get("show_preference", "in_natural_context"),
            "preservation_warnings": "; ".join(p.get("preservation_warnings", "") for p in product_analyses if p.get("preservation_warnings")),
        }

    ba = blog_analysis

    return {
        "product": pa,
        "blog": ba,
        "visual_goal": ba.get("visual_goal", "show the product in a relevant context"),
        "recommended_image_type": ba.get("recommended_image_type", "in_use_contextual"),
        "article_intent": ba.get("article_intent", "informational"),
        "target_reader": ba.get("target_reader", "general reader"),
        "likely_search_query": ba.get("likely_search_query", ""),
        "what_section_it_supports": ba.get("what_section_it_supports", "general"),
    }


# ---------------------------------------------------------------------------
# Prompt builder — layered, strategy-driven
# ---------------------------------------------------------------------------

def _build_prompt_from_strategy(strategy: dict, num_products: int = 1, custom_prompt: str | None = None) -> str:
    p = strategy["product"]
    b = strategy["blog"]

    product_count_note = (
        f"There are {num_products} product reference images attached. "
        f"ALL {num_products} products must appear in the final image, arranged naturally together."
    ) if num_products > 1 else "There is 1 product reference image attached."

    human_dir = b.get("human_direction", "")

    prompt = (
        "You are generating a commercially usable blog-supporting product photograph.\n\n"

        "GOAL\n"
        "Create a photorealistic image that helps the reader immediately understand the product, "
        "its real-world use case, and the article context. This image must SERVE the article — "
        "not just look pretty.\n\n"

        "PRODUCT IDENTITY (NON-NEGOTIABLE)\n"
        f"• {product_count_note}\n"
        "• Reproduce the EXACT product(s) from the reference image(s) with perfect fidelity.\n"
        "• Do NOT change shape, proportions, color, branding, labeling, texture, materials, or construction.\n"
        "• Do NOT invent product variants, accessories, packaging, or extra merchandise.\n"
        "• Only the uploaded product(s) may appear. Decorative non-commercial props are allowed.\n\n"

        "PRODUCT UNDERSTANDING\n"
        f"• Product type: {p.get('product_type', 'product')}\n"
        f"• Category: {p.get('category', 'general')}\n"
        f"• Material & texture: {p.get('material', 'N/A')}, {p.get('finish_texture', 'N/A')}\n"
        f"• Color: {p.get('color', 'N/A')}\n"
        f"• Key visual features: {p.get('hero_features', 'standard product')}\n"
        f"• Branding/labels visible: {p.get('branding_visible', 'none')}\n"
        f"• How it is actually used: {p.get('realistic_use_context', 'general use')}\n"
        f"• Natural environments: {p.get('natural_environments', 'neutral setting')}\n"
        f"• Interaction type: {p.get('interaction_type', 'placed')}\n"
        f"• Preservation warnings: {p.get('preservation_warnings', 'preserve all details')}\n\n"

        "ARTICLE CONTEXT & SEO INTENT\n"
        f"• Article intent: {strategy.get('article_intent', 'informational')}\n"
        f"• Target reader: {strategy.get('target_reader', 'general reader')}\n"
        f"• Likely search query: {strategy.get('likely_search_query', 'N/A')}\n"
        f"• Section this image supports: {strategy.get('what_section_it_supports', 'general')}\n"
        f"• Visual goal: {strategy.get('visual_goal', 'show the product in context')}\n"
        f"• Recommended image type: {strategy.get('recommended_image_type', 'in_use_contextual')}\n\n"

        "IMAGE STRATEGY\n"
        f"This image should help the reader understand: {strategy.get('visual_goal', 'the product in context')}.\n"
        "The product must be shown in a way that is semantically correct for its REAL use — "
        "not placed in a random luxury/editorial scene unless the article intent supports that.\n"
        "Prefer explanatory clarity over visual decoration.\n\n"

        "SCENE REQUIREMENTS\n"
        f"• Setting: {b.get('setting', 'contextual scene')}\n"
        f"• Lighting: {b.get('lighting', 'natural soft lighting')}\n"
        f"• Mood: {b.get('mood', 'professional')}\n"
        f"• Color palette: {b.get('color_palette', 'neutral tones')}\n"
        f"• Props (decorative only, NOT products): {b.get('props', 'minimal')}\n"
        f"• Camera angle: {b.get('camera_angle', 'eye-level')}\n"
        f"• Depth of field: {b.get('depth_of_field', 'shallow, product in focus')}\n\n"

        f"CREATIVE BRIEF\n{b.get('photography_brief', 'Professional product photograph in a contextual setting.')}\n\n"

        "USE-CASE RULES\n"
        "• Show the product in a context that matches how it is ACTUALLY used in real life.\n"
        "• The scene must make sense for this specific product — a face serum belongs near a "
        "bathroom mirror, headphones belong on a desk or around a neck, a handbag belongs "
        "being carried or placed on a chair.\n"
        "• Do NOT place the product in a random pretty scene that has no logical connection.\n"
    )

    if human_dir:
        prompt += (
            f"\nHUMAN MODEL\n{human_dir}\n"
            "The person must look completely real — natural skin pores, subtle imperfections, "
            "realistic hair, authentic clothing wrinkles. No plastic/CGI look. "
            "Natural, relaxed body language as if captured candidly.\n"
        )

    prompt += (
        "\nNEGATIVE RULES\n"
        "• No extra commercial products, branded items, or merchandise not in the reference.\n"
        "• No misleading usage scenarios.\n"
        "• No surreal or fantasy styling.\n"
        "• No altered text, logos, or labels.\n"
        "• No fake materials or wrong textures.\n"
        "• No overdesigned props that steal focus from the product.\n\n"

        "PHOTO REALISM\n"
        "This must look like a REAL photo taken by a professional photographer.\n"
        "• Natural sensor noise / fine film grain appropriate to the lighting\n"
        "• Realistic shadow falloff and ambient occlusion\n"
        "• Specular highlights that match the described light source\n"
        "• No HDR glow, no AI-typical smoothness, no uncanny symmetry\n"
        "• If there is text on the product, it must be legible and accurate\n"
    )

    if custom_prompt:
        prompt += f"\nADDITIONAL USER DIRECTION\n{custom_prompt}\n"

    return prompt


@router.get("/credits")
async def blog_image_credits(user: dict = Depends(get_current_user)):
    credits = get_studio_credits(user["id"])
    if not credits:
        raise HTTPException(status_code=500, detail="Could not fetch credits")
    return {
        **credits,
        "tokens_per_image": STUDIO_PRICING,
    }


@router.post("/generate", response_model=BlogImageResponse)
async def generate_blog_image(req: BlogImageRequest, user: dict = Depends(get_current_user)):
    image_list: list[str] = []
    if req.images:
        image_list = [img for img in req.images if img]
    elif req.image_base64:
        image_list = [req.image_base64]

    if not image_list:
        raise HTTPException(status_code=400, detail="At least one product image is required")
    if len(image_list) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 product images allowed")
    if not req.blog_content or len(req.blog_content.strip()) < 20:
        raise HTTPException(status_code=400, detail="Blog content must be at least 20 characters")

    credit_check = check_studio_balance(user["id"], req.quality)
    if not credit_check["allowed"]:
        raise HTTPException(status_code=403, detail=credit_check["error"])

    ratio = get_ratio(req.aspect_ratio_id)
    num_products = len(image_list)

    try:
        # ── Step 1: Analyze each product image ──
        logger.info(f"Blog image pipeline — Step 1: analyzing {num_products} product image(s)")
        product_analyses = []
        product_usage_tokens = {"input_tokens": 0, "output_tokens": 0}
        for img_b64 in image_list:
            pa = analyze_product_image(img_b64)
            pu = pa.pop("_product_usage", {})
            product_usage_tokens["input_tokens"] += pu.get("input_tokens", 0) or 0
            product_usage_tokens["output_tokens"] += pu.get("output_tokens", 0) or 0
            product_analyses.append(pa)
            logger.info(f"Product identified: {pa.get('product_type', '?')} ({pa.get('category', '?')})")

        # ── Step 2: Analyze blog content + SEO intent ──
        logger.info("Blog image pipeline — Step 2: analyzing blog content + SEO intent")
        blog_analysis = analyze_blog_for_image(
            blog_content=req.blog_content,
            scene_style=req.scene_style,
            include_human=req.include_human,
        )
        blog_usage = blog_analysis.pop("_analysis_usage", {})
        logger.info(
            f"Blog analysis: intent={blog_analysis.get('article_intent')}, "
            f"image_type={blog_analysis.get('recommended_image_type')}, "
            f"mood={blog_analysis.get('mood')}"
        )

        # ── Step 3: Build strategy + generate ──
        logger.info("Blog image pipeline — Step 3: building strategy and generating image")
        strategy = _build_strategy(product_analyses, blog_analysis)
        prompt = _build_prompt_from_strategy(strategy, num_products=num_products, custom_prompt=req.custom_prompt)

        if num_products == 1:
            if req.quality == "pro":
                result = generate_image_pro(prompt, image_list[0], aspect_ratio_id=req.aspect_ratio_id)
            else:
                result = generate_image(prompt, image_list[0], aspect_ratio_id=req.aspect_ratio_id)
        else:
            imgs = [{"base64": b64, "mime_type": "image/png"} for b64 in image_list]
            if req.quality == "pro":
                result = generate_image_pro_multi(prompt, imgs, aspect_ratio_id=req.aspect_ratio_id)
            else:
                result = generate_image_multi(prompt, imgs, aspect_ratio_id=req.aspect_ratio_id)

        image_b64 = result["base64"]
        try:
            image_b64 = crop_to_ratio(image_b64, ratio["width"], ratio["height"])
        except Exception as e:
            logger.warning(f"Crop failed: {e}")

        deducted = deduct_studio_tokens(user["id"], req.quality)

        img_usage = result.get("usage", {})
        total_input = (
            product_usage_tokens["input_tokens"]
            + (blog_usage.get("input_tokens", 0) or 0)
            + (img_usage.get("input_tokens", 0) or 0)
        )
        total_output = (
            product_usage_tokens["output_tokens"]
            + (blog_usage.get("output_tokens", 0) or 0)
            + (img_usage.get("output_tokens", 0) or 0)
        )

        track_generation(
            client_id=user["id"],
            generation_type="blog_image",
            input_tokens=total_input,
            output_tokens=total_output,
            model_used=result.get("model", "gemini-2.5-flash-image"),
            metadata={
                "quality": req.quality,
                "aspect_ratio": req.aspect_ratio_id,
                "include_human": req.include_human,
                "scene_style": req.scene_style,
                "num_products": num_products,
                "product_types": [pa.get("product_type", "") for pa in product_analyses],
                "article_intent": blog_analysis.get("article_intent"),
                "recommended_image_type": blog_analysis.get("recommended_image_type"),
                "visual_goal": blog_analysis.get("visual_goal", "")[:200],
                "analysis_mood": blog_analysis.get("mood"),
                "analysis_setting": blog_analysis.get("setting", "")[:100],
            },
        )

        try:
            save_project(
                client_id=user["id"],
                project_type="blog_image",
                title="Blog Image",
                images=[{"base64": image_b64, "label": "Blog Image"}],
                metadata={
                    "quality": req.quality,
                    "aspect_ratio": req.aspect_ratio_id,
                    "include_human": req.include_human,
                    "scene_style": req.scene_style,
                    "num_products": num_products,
                    "product_analyses": [{k: v for k, v in pa.items() if not k.startswith("_")} for pa in product_analyses],
                    "blog_analysis": {k: v for k, v in blog_analysis.items() if not k.startswith("_")},
                    "strategy_visual_goal": strategy.get("visual_goal", ""),
                    "strategy_image_type": strategy.get("recommended_image_type", ""),
                },
            )
        except Exception as save_err:
            logger.warning(f"Project save failed (non-blocking): {save_err}")

        return BlogImageResponse(
            success=True,
            images=[ImageResult(base64=image_b64, mime_type="image/png", label="Blog Image")],
            credits_remaining=deducted["remaining"],
        )
    except Exception as e:
        logger.error(f"Blog image generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
