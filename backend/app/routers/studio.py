from __future__ import annotations

"""Studio (Photo Shoot) router — Flyr-style: upload product + pick background."""

import logging
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.schemas.studio import GenerateStudioRequest, GenerateResponse, ImageResult
import re
from app.services.gemini_service import generate_image, generate_image_pro, analyze_product_structure
from app.services.openai_image_service import generate_image as generate_image_ultra, MODEL_ULTRA
from app.services.image_service import crop_to_ratio
from app.services.credit_service import check_studio_balance, deduct_studio_tokens, get_studio_credits, STUDIO_PRICING
from app.services.tracking_service import track_generation
from app.services.prompt_service import build_studio_prompt, get_ratio, get_studio_backgrounds
from app.services.project_service import save_project
from app.services.studio_session_service import update_studio_session

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/studio", tags=["Studio"])


@router.get("/credits")
async def studio_credits(user: dict = Depends(get_current_user)):
    from app.config import get_settings
    settings = get_settings()
    credits = get_studio_credits(user["id"])
    if not credits:
        raise HTTPException(status_code=500, detail="Could not fetch credits")
    return {
        **credits,
        "free_limit": settings.free_studio_limit,
        "tokens_per_image": STUDIO_PRICING,
    }


@router.get("/backgrounds")
async def list_backgrounds(user: dict = Depends(get_current_user)):
    """Return available backgrounds — may include category-specific ones."""
    category_slug = user.get("category_slug")
    return {"backgrounds": get_studio_backgrounds(category_slug)}


@router.post("/generate", response_model=GenerateResponse)
async def generate_studio_image(req: GenerateStudioRequest, user: dict = Depends(get_current_user)):
    credit_check = check_studio_balance(user["id"], req.quality)
    if not credit_check["allowed"]:
        raise HTTPException(status_code=403, detail=credit_check["error"])

    category_slug = user.get("category_slug")

    # Vision pre-pass: for categories where products frequently have multi-piece / stacked
    # structure (jewellery, accessories), analyze the input image first so the downstream
    # image generator has explicit ground-truth anchors (piece count, finish, ornaments).
    # Best-effort: failures return None and we fall back to the prompt-only path.
    product_structure: dict | None = None
    if category_slug in ("jewellery", "accessories"):
        try:
            product_structure = analyze_product_structure(req.image_base64, category_slug)
            if product_structure:
                logger.info(
                    "Studio pre-pass [%s]: type=%r count=%r ornaments=%r",
                    category_slug,
                    product_structure.get("product_type"),
                    product_structure.get("piece_count"),
                    product_structure.get("ornaments"),
                )
        except Exception as e:
            logger.warning("Product structure pre-pass errored (non-blocking): %s", e)

    # Silent Pro auto-upgrade: if the pre-pass detects a stacked / multi-piece product,
    # override Standard to Pro — gemini-3-pro-image-preview follows structural constraints
    # much more reliably on complex inputs. User still pays Standard credits (the deduction
    # uses req.quality below, which we leave untouched).
    effective_quality = req.quality
    if product_structure and req.quality == "standard":
        blob = " ".join([
            product_structure.get("product_type", ""),
            product_structure.get("piece_count", ""),
            product_structure.get("critical_details", ""),
        ]).lower()
        is_multi = any(tok in blob for tok in ("stack", "multi", "layered", "multiple", "strand", "pair", "set of"))
        if not is_multi:
            # Also upgrade if piece_count contains a number > 2
            nums = [int(n) for n in re.findall(r"\b(\d+)\b", product_structure.get("piece_count", ""))]
            if nums and max(nums) > 2:
                is_multi = True
        if is_multi:
            logger.info("Studio: auto-upgrading Standard -> Pro for multi-piece product")
            effective_quality = "pro"

    prompt = build_studio_prompt(
        background_id=req.background_id or "studio",
        category_slug=category_slug,
        special_instructions=req.special_instructions,
        product_structure=product_structure,
    )
    ratio = get_ratio(req.aspect_ratio_id)

    try:
        if effective_quality == "ultra":
            # gpt-image-2 — highest fidelity, higher cost. Gated by token price upstream.
            try:
                result = generate_image_ultra(prompt, req.image_base64, aspect_ratio_id=req.aspect_ratio_id)
            except Exception as oe:
                logger.warning("OpenAI ultra failed (%s), falling back to Gemini Pro", str(oe)[:100])
                result = generate_image_pro(prompt, req.image_base64, aspect_ratio_id=req.aspect_ratio_id)
                result["model"] = f"{result.get('model', 'gemini-3-pro')} (fallback from ultra)"
                result["fallback"] = True
        elif effective_quality == "pro":
            result = generate_image_pro(prompt, req.image_base64, aspect_ratio_id=req.aspect_ratio_id)
        else:
            result = generate_image(prompt, req.image_base64, aspect_ratio_id=req.aspect_ratio_id)

        image_b64 = result["base64"]
        try:
            image_b64 = crop_to_ratio(image_b64, ratio["width"], ratio["height"])
        except Exception as e:
            logger.warning(f"Crop failed: {e}")

        deducted = deduct_studio_tokens(user["id"], req.quality)

        usage = result.get("usage", {})
        track_generation(
            client_id=user["id"],
            generation_type="studio",
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
            model_used=result.get("model", "gemini-2.5-flash-image"),
            metadata={"background": req.background_id, "category": category_slug, "quality": req.quality},
        )

        saved_project_id: str | None = None
        try:
            saved_project = save_project(
                client_id=user["id"],
                project_type="photoshoot",
                title=f"Studio Shot – {req.background_id or 'auto'}",
                images=[{"base64": image_b64, "label": "Studio Shot"}],
                metadata={"background": req.background_id, "category": category_slug, "quality": req.quality},
            )
            if saved_project:
                saved_project_id = saved_project.get("id")
        except Exception as save_err:
            logger.warning(f"Project save failed (non-blocking): {save_err}")

        if req.studio_session_id:
            try:
                update_studio_session(
                    session_id=req.studio_session_id,
                    client_id=user["id"],
                    current_step="done",
                    result_project_id=saved_project_id,
                )
            except Exception as link_err:
                logger.warning(f"Studio session link failed (non-blocking): {link_err}")

        return GenerateResponse(
            success=True,
            images=[ImageResult(base64=image_b64, mime_type="image/png", label="Studio Shot")],
            credits_remaining=deducted["remaining"],
        )
    except Exception as e:
        logger.error(f"Studio generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
