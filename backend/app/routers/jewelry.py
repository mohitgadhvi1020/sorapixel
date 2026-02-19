from __future__ import annotations

"""Jewelry photography router -- ported from Next.js API routes."""

import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.schemas.jewelry import (
    GenerateJewelryRequest, RecolorJewelryRequest, GenerateHdRequest,
    RewriteListingRequest, TryOnRequest,
)
from app.schemas.studio import GenerateResponse, ImageResult
from app.services.gemini_service import generate_image, generate_text
from app.services.fal_service import hd_upscale
from app.services.image_service import (
    crop_to_ratio, add_watermark, center_crop_closeup, crop_to_ratio_contain,
)
from app.services.credit_service import (
    get_jewelry_credits, deduct_jewelry_tokens, JEWELRY_PRICING,
)
from app.services.tracking_service import track_generation
from app.services.prompt_service import (
    build_jewelry_prompt, build_recolor_prompt,
    JEWELRY_TRYON_PROMPTS, get_ratio, build_listing_prompt,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jewelry", tags=["Jewelry"])


@router.get("/credits")
async def jewelry_credits(user: dict = Depends(get_current_user)):
    credits = get_jewelry_credits(user["id"])
    if not credits:
        raise HTTPException(status_code=500, detail="Could not fetch credits")
    return {**credits, "pricing": JEWELRY_PRICING}


@router.post("/generate", response_model=GenerateResponse)
async def generate_jewelry(req: GenerateJewelryRequest, user: dict = Depends(get_current_user)):
    ratio = get_ratio(req.aspect_ratio_id)

    if req.step == "full_pack":
        credits = get_jewelry_credits(user["id"])
        if not credits or credits["token_balance"] < JEWELRY_PRICING["photoPack"]:
            raise HTTPException(
                status_code=403,
                detail=f"Need {JEWELRY_PRICING['photoPack']} tokens, have {credits['token_balance'] if credits else 0}",
            )
        deduct_jewelry_tokens(user["id"], JEWELRY_PRICING["photoPack"])

    images = []

    hero_prompt = build_jewelry_prompt(req.jewelry_type, req.background, "hero")
    try:
        result = generate_image(hero_prompt, req.image_base64)
        hero_b64 = result["base64"]
        try:
            hero_b64 = crop_to_ratio_contain(hero_b64, ratio["width"], ratio["height"])
        except Exception:
            pass
        watermarked = add_watermark(hero_b64)

        usage = result.get("usage", {})
        track_generation(
            client_id=user["id"],
            generation_type="hero",
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
        )
        images.append(ImageResult(base64=watermarked, label="Hero Shot"))
    except Exception as e:
        logger.error(f"Hero generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    if req.step == "hero":
        return GenerateResponse(success=True, images=images)

    angle_prompt = build_jewelry_prompt(req.jewelry_type, req.background, "angle")
    try:
        if req.custom_angle_base64:
            angle_result = generate_image(angle_prompt, req.custom_angle_base64)
        else:
            angle_result = generate_image(angle_prompt, req.image_base64)
        angle_b64 = angle_result["base64"]
        try:
            angle_b64 = crop_to_ratio_contain(angle_b64, ratio["width"], ratio["height"])
        except Exception:
            pass
        watermarked = add_watermark(angle_b64)
        track_generation(client_id=user["id"], generation_type="angle")
        images.append(ImageResult(base64=watermarked, label="Alternate Angle"))
    except Exception as e:
        logger.warning(f"Angle generation failed: {e}")
        images.append(ImageResult(base64="", label="Alternate Angle (failed)"))

    try:
        closeup_b64 = center_crop_closeup(hero_b64, zoom=0.5)
        watermarked = add_watermark(closeup_b64)
        track_generation(client_id=user["id"], generation_type="closeup")
        images.append(ImageResult(base64=watermarked, label="Close-up Detail"))
    except Exception as e:
        logger.warning(f"Closeup generation failed: {e}")
        images.append(ImageResult(base64="", label="Close-up Detail (failed)"))

    return GenerateResponse(success=True, images=images)


@router.post("/recolor", response_model=GenerateResponse)
async def recolor_jewelry(req: RecolorJewelryRequest, user: dict = Depends(get_current_user)):
    credits = get_jewelry_credits(user["id"])
    cost = JEWELRY_PRICING["recolorSingle"]
    if not credits or credits["token_balance"] < cost:
        raise HTTPException(status_code=403, detail=f"Need {cost} tokens")

    deduct_jewelry_tokens(user["id"], cost)

    prompt = build_recolor_prompt(req.jewelry_type, req.target_metal)
    try:
        result = generate_image(prompt, req.image_base64)
        watermarked = add_watermark(result["base64"])

        usage = result.get("usage", {})
        track_generation(
            client_id=user["id"],
            generation_type="recolor",
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
            metadata={"target_metal": req.target_metal},
        )

        return GenerateResponse(
            success=True,
            images=[ImageResult(base64=watermarked, label=f"Recolored ({req.target_metal})")],
        )
    except Exception as e:
        logger.error(f"Recolor error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hd-upscale", response_model=GenerateResponse)
async def hd_upscale_endpoint(req: GenerateHdRequest, user: dict = Depends(get_current_user)):
    credits = get_jewelry_credits(user["id"])
    cost = JEWELRY_PRICING["hdUpscale"]
    if not credits or credits["token_balance"] < cost:
        raise HTTPException(status_code=403, detail=f"Need {cost} tokens")

    deduct_jewelry_tokens(user["id"], cost)

    try:
        hd_b64 = hd_upscale(req.image_base64)
        track_generation(client_id=user["id"], generation_type="hd_upscale", model_used="fal-flux-dev")
        return GenerateResponse(
            success=True,
            images=[ImageResult(base64=hd_b64, label="HD Upscale")],
        )
    except Exception as e:
        logger.error(f"HD upscale error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/listing")
async def generate_listing(req: RewriteListingRequest, user: dict = Depends(get_current_user)):
    credits = get_jewelry_credits(user["id"])
    cost = JEWELRY_PRICING["listing"]
    if not credits or credits["token_balance"] < cost:
        raise HTTPException(status_code=403, detail=f"Need {cost} tokens")

    deduct_jewelry_tokens(user["id"], cost)

    prompt = build_listing_prompt(req.jewelry_type)
    try:
        result = generate_text(prompt, req.image_base64)
        text = result["text"].strip()
        import re
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

        try:
            listing = json.loads(text)
        except json.JSONDecodeError:
            listing = {"raw_text": text}

        track_generation(
            client_id=user["id"],
            generation_type="listing",
            input_tokens=result.get("usage", {}).get("input_tokens", 0),
            output_tokens=result.get("usage", {}).get("output_tokens", 0),
        )

        return {"success": True, "listing": listing}
    except Exception as e:
        logger.error(f"Listing generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/tryon", response_model=GenerateResponse)
async def jewelry_tryon(req: TryOnRequest, user: dict = Depends(get_current_user)):
    ratio = get_ratio(req.aspect_ratio_id)
    jtype = req.jewelry_type or "necklace"
    prompt_text = JEWELRY_TRYON_PROMPTS.get(jtype, JEWELRY_TRYON_PROMPTS["necklace"])
    prompt = f"{prompt_text}\n\nCOMPOSITION: {ratio.get('hint', 'Centered')}"

    try:
        from app.services.gemini_service import generate_image_multi
        result = generate_image_multi(
            prompt,
            [
                {"base64": req.jewelry_base64, "mime_type": "image/png"},
                {"base64": req.person_base64, "mime_type": "image/png"},
            ],
        )

        image_b64 = result["base64"]
        try:
            image_b64 = crop_to_ratio(image_b64, ratio["width"], ratio["height"])
        except Exception:
            pass

        usage = result.get("usage", {})
        track_generation(
            client_id=user["id"],
            generation_type="tryon",
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
        )

        return GenerateResponse(
            success=True,
            images=[ImageResult(base64=image_b64, label="Try-On")],
        )
    except Exception as e:
        logger.error(f"Try-on error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
