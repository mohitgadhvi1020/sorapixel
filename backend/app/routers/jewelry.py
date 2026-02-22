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
    crop_to_ratio, center_crop_closeup, crop_to_ratio_contain,
)
from app.services.credit_service import (
    get_jewelry_credits, deduct_jewelry_tokens, check_and_deduct_jewelry,
    JEWELRY_PRICING, JEWELRY_FREE_LIMITS,
)
from app.services.tracking_service import track_generation
from app.services.prompt_service import (
    build_jewelry_prompt, build_recolor_prompt,
    JEWELRY_TRYON_PROMPTS, get_ratio, build_listing_prompt,
    build_brand_listing_prompt, get_brand_config,
)
from app.services.project_service import save_project

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jewelry", tags=["Jewelry"])


@router.get("/credits")
async def jewelry_credits(user: dict = Depends(get_current_user)):
    credits = get_jewelry_credits(user["id"])
    if not credits:
        raise HTTPException(status_code=500, detail="Could not fetch credits")
    return {**credits, "pricing": JEWELRY_PRICING, "free_limits": JEWELRY_FREE_LIMITS}


@router.post("/generate")
async def generate_jewelry(req: GenerateJewelryRequest, user: dict = Depends(get_current_user)):
    ratio = get_ratio(req.aspect_ratio_id)

    SINGLE_REGEN_STEPS = {"regen_hero", "regen_angle", "regen_closeup"}
    if req.step in SINGLE_REGEN_STEPS:
        return await _regenerate_single(req, user, ratio)

    operation = "hero" if req.step == "hero" else "full_pack"
    credit_result = check_and_deduct_jewelry(user["id"], operation)
    is_locked = credit_result.get("locked", False)

    images = []

    hero_prompt = build_jewelry_prompt(req.jewelry_type, req.background, "hero", req.special_instructions)
    try:
        result = generate_image(hero_prompt, req.image_base64)
        hero_b64 = result["base64"]
        try:
            hero_b64 = crop_to_ratio_contain(hero_b64, ratio["width"], ratio["height"])
        except Exception:
            pass
        usage = result.get("usage", {})
        track_generation(
            client_id=user["id"],
            generation_type="hero",
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
        )
        images.append(ImageResult(base64=hero_b64, label="Hero Shot"))
    except Exception as e:
        logger.error(f"Hero generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    if req.step == "hero":
        try:
            save_images = [{"base64": req.image_base64, "label": "Original Upload"}]
            save_images += [{"base64": img.base64, "label": img.label} for img in images]
            save_project(
                client_id=user["id"],
                project_type="jewelry_hero",
                title=f"Jewelry Hero – {req.jewelry_type.title()}",
                images=save_images,
                metadata={"jewelry_type": req.jewelry_type, "background": req.background},
            )
        except Exception as save_err:
            logger.warning(f"Project save failed (non-blocking): {save_err}")
        return {
            "success": True, "images": [{"base64": img.base64, "label": img.label} for img in images],
            "locked": is_locked,
            "free_hero_remaining": credit_result.get("free_hero_remaining", 0),
            "free_pack_remaining": credit_result.get("free_pack_remaining", 0),
            "token_balance": credit_result.get("remaining", 0),
        }

    angle_prompt = build_jewelry_prompt(req.jewelry_type, req.background, "angle", req.special_instructions)
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
        track_generation(client_id=user["id"], generation_type="angle")
        images.append(ImageResult(base64=angle_b64, label="Alternate Angle"))
    except Exception as e:
        logger.warning(f"Angle generation failed: {e}")
        images.append(ImageResult(base64="", label="Alternate Angle (failed)"))

    closeup_prompt = build_jewelry_prompt(req.jewelry_type, req.background, "closeup", req.special_instructions)
    try:
        closeup_result = generate_image(closeup_prompt, req.image_base64)
        closeup_b64 = closeup_result["base64"]
        try:
            closeup_b64 = crop_to_ratio_contain(closeup_b64, ratio["width"], ratio["height"])
        except Exception:
            pass
        closeup_usage = closeup_result.get("usage", {})
        track_generation(
            client_id=user["id"],
            generation_type="closeup",
            input_tokens=closeup_usage.get("input_tokens", 0),
            output_tokens=closeup_usage.get("output_tokens", 0),
        )
        images.append(ImageResult(base64=closeup_b64, label="Close-up Detail"))
    except Exception as e:
        logger.warning(f"Closeup generation failed, falling back to crop: {e}")
        try:
            closeup_b64 = center_crop_closeup(hero_b64, zoom=0.5)
            images.append(ImageResult(base64=closeup_b64, label="Close-up Detail"))
        except Exception:
            images.append(ImageResult(base64="", label="Close-up Detail (failed)"))

    try:
        save_images = [{"base64": req.image_base64, "label": "Original Upload"}]
        save_images += [{"base64": img.base64, "label": img.label} for img in images if img.base64]
        save_project(
            client_id=user["id"],
            project_type="jewelry_pack",
            title=f"Jewelry 3-Angle – {req.jewelry_type.title()}",
            images=save_images,
            metadata={"jewelry_type": req.jewelry_type, "background": req.background},
        )
    except Exception as save_err:
        logger.warning(f"Project save failed (non-blocking): {save_err}")

    return {
        "success": True, "images": [{"base64": img.base64, "label": img.label} for img in images if img.base64],
        "locked": is_locked,
        "free_hero_remaining": credit_result.get("free_hero_remaining", 0),
        "free_pack_remaining": credit_result.get("free_pack_remaining", 0),
        "token_balance": credit_result.get("remaining", 0),
    }


async def _regenerate_single(req: GenerateJewelryRequest, user: dict, ratio: dict):
    """Regenerate a single shot type (hero, angle, or closeup) — costs 1 token."""
    regen_cost = JEWELRY_PRICING.get("regenSingle", 1)
    credits = get_jewelry_credits(user["id"])
    if not credits or credits["token_balance"] < regen_cost:
        raise HTTPException(status_code=403, detail=f"Need {regen_cost} tokens to regenerate")
    deduct_jewelry_tokens(user["id"], regen_cost)

    shot_map = {"regen_hero": "hero", "regen_angle": "angle", "regen_closeup": "closeup"}
    shot_type = shot_map[req.step]
    label_map = {"hero": "Hero Shot", "angle": "Alternate Angle", "closeup": "Close-up Detail"}

    prompt = build_jewelry_prompt(req.jewelry_type, req.background, shot_type, req.special_instructions)
    try:
        result = generate_image(prompt, req.image_base64)
        img_b64 = result["base64"]
        try:
            img_b64 = crop_to_ratio_contain(img_b64, ratio["width"], ratio["height"])
        except Exception:
            pass
        usage = result.get("usage", {})
        track_generation(
            client_id=user["id"],
            generation_type=f"regen_{shot_type}",
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
        )
        try:
            save_project(
                client_id=user["id"],
                project_type="jewelry_regen",
                title=f"Jewelry Regen – {label_map[shot_type]}",
                images=[{"base64": img_b64, "label": label_map[shot_type]}],
                metadata={"jewelry_type": req.jewelry_type, "background": req.background, "shot_type": shot_type},
            )
        except Exception as save_err:
            logger.warning(f"Project save failed (non-blocking): {save_err}")

        return GenerateResponse(success=True, images=[ImageResult(base64=img_b64, label=label_map[shot_type])])
    except Exception as e:
        logger.error(f"Regenerate {shot_type} error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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

        usage = result.get("usage", {})
        track_generation(
            client_id=user["id"],
            generation_type="recolor",
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
            metadata={"target_metal": req.target_metal},
        )

        recolor_label = f"Recolored ({req.target_metal})"
        try:
            save_project(
                client_id=user["id"],
                project_type="jewelry_recolor",
                title=f"Jewelry Recolor – {req.target_metal.title()}",
                images=[{"base64": result["base64"], "label": recolor_label}],
                metadata={"jewelry_type": req.jewelry_type, "target_metal": req.target_metal},
            )
        except Exception as save_err:
            logger.warning(f"Project save failed (non-blocking): {save_err}")

        return GenerateResponse(
            success=True,
            images=[ImageResult(base64=result["base64"], label=recolor_label)],
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

        try:
            save_project(
                client_id=user["id"],
                project_type="jewelry_hd",
                title="Jewelry HD Upscale",
                images=[{"base64": hd_b64, "label": "HD Upscale"}],
                metadata={},
            )
        except Exception as save_err:
            logger.warning(f"Project save failed (non-blocking): {save_err}")

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

    brand_config = get_brand_config(user["id"])
    if brand_config:
        prompt = build_brand_listing_prompt(brand_config, req.jewelry_type)
    else:
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

        try:
            save_project(
                client_id=user["id"],
                project_type="jewelry_tryon",
                title=f"Jewelry Try-On – {jtype.title()}",
                images=[{"base64": image_b64, "label": "Try-On"}],
                metadata={"jewelry_type": jtype},
            )
        except Exception as save_err:
            logger.warning(f"Project save failed (non-blocking): {save_err}")

        return GenerateResponse(
            success=True,
            images=[ImageResult(base64=image_b64, label="Try-On")],
        )
    except Exception as e:
        logger.error(f"Try-on error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
