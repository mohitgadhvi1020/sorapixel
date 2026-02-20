from __future__ import annotations

"""Studio (Photo Shoot) router — Flyr-style: upload product + pick background."""

import logging
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.schemas.studio import GenerateStudioRequest, GenerateResponse, ImageResult
from app.services.gemini_service import generate_image
from app.services.image_service import crop_to_ratio, add_watermark
from app.services.credit_service import check_and_deduct_studio, get_studio_credits
from app.services.tracking_service import track_generation
from app.services.prompt_service import build_studio_prompt, get_ratio, get_studio_backgrounds
from app.services.project_service import save_project

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
        "tokens_per_image": settings.tokens_per_image,
    }


@router.get("/backgrounds")
async def list_backgrounds(user: dict = Depends(get_current_user)):
    """Return available backgrounds — may include category-specific ones."""
    category_slug = user.get("category_slug")
    return {"backgrounds": get_studio_backgrounds(category_slug)}


@router.post("/generate", response_model=GenerateResponse)
async def generate_studio_image(req: GenerateStudioRequest, user: dict = Depends(get_current_user)):
    credit_check = check_and_deduct_studio(user["id"])
    if not credit_check["allowed"]:
        raise HTTPException(status_code=403, detail=credit_check["error"])

    category_slug = user.get("category_slug")
    prompt = build_studio_prompt(
        background_id=req.background_id or "studio",
        category_slug=category_slug,
        special_instructions=req.special_instructions,
    )
    ratio = get_ratio(req.aspect_ratio_id)

    try:
        result = generate_image(prompt, req.image_base64)

        image_b64 = result["base64"]
        try:
            image_b64 = crop_to_ratio(image_b64, ratio["width"], ratio["height"])
        except Exception as e:
            logger.warning(f"Crop failed: {e}")

        watermarked = add_watermark(image_b64)

        usage = result.get("usage", {})
        track_generation(
            client_id=user["id"],
            generation_type="studio",
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
            metadata={"background": req.background_id, "category": category_slug},
        )

        try:
            save_project(
                client_id=user["id"],
                project_type="photoshoot",
                title=f"Studio Shot – {req.background_id or 'auto'}",
                images=[{"base64": watermarked, "label": "Studio Shot"}],
                metadata={"background": req.background_id, "category": category_slug},
            )
        except Exception as save_err:
            logger.warning(f"Project save failed (non-blocking): {save_err}")

        return GenerateResponse(
            success=True,
            images=[ImageResult(base64=watermarked, mime_type="image/png", label="Studio Shot")],
            credits_remaining=credit_check["remaining"],
        )
    except Exception as e:
        logger.error(f"Studio generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
