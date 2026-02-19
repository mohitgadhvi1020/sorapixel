from __future__ import annotations

"""Studio photography router -- ported from Next.js API routes."""

import logging
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.schemas.studio import (
    GenerateStudioRequest, GeneratePackRequest, GenerateInfoRequest, GenerateResponse, ImageResult,
    RefinePromptRequest,
)
from app.services.gemini_service import generate_image, refine_prompt
from app.services.image_service import crop_to_ratio, add_watermark, overlay_logo
from app.services.credit_service import check_and_deduct_studio, get_studio_credits
from app.services.tracking_service import track_generation
from app.services.prompt_service import build_studio_prompt, build_pack_prompts, get_ratio

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


@router.post("/generate", response_model=GenerateResponse)
async def generate_studio_image(req: GenerateStudioRequest, user: dict = Depends(get_current_user)):
    credit_check = check_and_deduct_studio(user["id"])
    if not credit_check["allowed"]:
        raise HTTPException(status_code=403, detail=credit_check["error"])

    prompt = build_studio_prompt(req.style, req.custom_prompt, req.isolate_product)
    ratio = get_ratio(req.aspect_ratio_id)

    try:
        result = generate_image(prompt, req.image_base64)

        image_b64 = result["base64"]
        try:
            image_b64 = crop_to_ratio(image_b64, ratio["width"], ratio["height"])
        except Exception as e:
            logger.warning(f"Crop failed: {e}")

        if req.logo_base64:
            try:
                image_b64 = overlay_logo(image_b64, req.logo_base64)
            except Exception as e:
                logger.warning(f"Logo overlay failed: {e}")

        watermarked = add_watermark(image_b64)

        usage = result.get("usage", {})
        track_generation(
            client_id=user["id"],
            generation_type="studio",
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
            model_used="gemini-2.5-flash",
        )

        return GenerateResponse(
            success=True,
            images=[ImageResult(base64=watermarked, mime_type="image/png", label="Studio Shot")],
            credits_remaining=credit_check["remaining"],
        )
    except Exception as e:
        logger.error(f"Studio generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-pack", response_model=GenerateResponse)
async def generate_pack(req: GeneratePackRequest, user: dict = Depends(get_current_user)):
    for _ in range(3):
        credit_check = check_and_deduct_studio(user["id"])
        if not credit_check["allowed"]:
            raise HTTPException(status_code=403, detail=credit_check["error"])

    prompts = build_pack_prompts(req.style, req.custom_prompt, req.isolate_product)
    ratio = get_ratio(req.aspect_ratio_id)
    images = []

    for p in prompts:
        try:
            result = generate_image(p["prompt"], req.image_base64)
            image_b64 = result["base64"]
            try:
                image_b64 = crop_to_ratio(image_b64, ratio["width"], ratio["height"])
            except Exception:
                pass
            if req.logo_base64:
                try:
                    image_b64 = overlay_logo(image_b64, req.logo_base64)
                except Exception:
                    pass
            watermarked = add_watermark(image_b64)

            usage = result.get("usage", {})
            track_generation(
                client_id=user["id"],
                generation_type="pack_" + p["label"].lower().replace(" ", "_"),
                input_tokens=usage.get("input_tokens", 0),
                output_tokens=usage.get("output_tokens", 0),
            )

            images.append(ImageResult(base64=watermarked, mime_type="image/png", label=p["label"]))
        except Exception as e:
            logger.error(f"Pack generation error ({p['label']}): {e}")
            images.append(ImageResult(base64="", mime_type="image/png", label=f"{p['label']} (failed)"))

    return GenerateResponse(success=True, images=images)


@router.post("/generate-info", response_model=GenerateResponse)
async def generate_info(req: GenerateInfoRequest, user: dict = Depends(get_current_user)):
    credit_check = check_and_deduct_studio(user["id"])
    if not credit_check["allowed"]:
        raise HTTPException(status_code=403, detail=credit_check["error"])

    info_prompts = {
        "features": (
            "Create a professional product features infographic. "
            "Show the product with arrows/labels pointing to key features. "
            "Clean design, white background, readable text."
        ),
        "dimensions": (
            "Create a professional product dimensions diagram. "
            "Show the product with measurement lines and dimensions labeled. "
            "Clean design, white background, precise look."
        ),
    }

    prompt = info_prompts.get(req.info_type, info_prompts["features"])
    ratio = get_ratio(req.aspect_ratio_id)

    try:
        result = generate_image(prompt, req.image_base64)
        image_b64 = result["base64"]
        try:
            image_b64 = crop_to_ratio(image_b64, ratio["width"], ratio["height"])
        except Exception:
            pass

        usage = result.get("usage", {})
        track_generation(
            client_id=user["id"],
            generation_type=f"info_{req.info_type}",
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
        )

        return GenerateResponse(
            success=True,
            images=[ImageResult(base64=image_b64, mime_type="image/png", label=req.info_type.title())],
        )
    except Exception as e:
        logger.error(f"Info generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refine-prompt")
async def refine_prompt_endpoint(req: RefinePromptRequest):
    result = refine_prompt(req.raw_prompt)
    return {"success": True, **result}
