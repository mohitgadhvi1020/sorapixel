from __future__ import annotations

"""Jewelry photography router -- ported from Next.js API routes."""

import json
import logging
from fastapi import APIRouter, Depends, Header, HTTPException
from app.middleware.auth import get_current_user
from app.schemas.jewelry import (
    GenerateJewelryRequest, RecolorJewelryRequest, RewriteListingRequest, BrandingRequest,
)
from app.schemas.studio import GenerateResponse, ImageResult
from app.services.gemini_service import generate_image, generate_image_pro, generate_text
from app.services.image_service import (
    crop_to_ratio, add_branding_bar, generate_low_res_preview,
)
from app.services.credit_service import (
    get_jewelry_credits, deduct_jewelry_tokens, check_and_deduct_jewelry,
    get_operation_cost, JEWELRY_PRICING,
)
from app.services.tracking_service import track_generation
from app.services.prompt_service import (
    build_jewelry_prompt, build_jewelry_regen_prompt, build_recolor_prompt,
    build_jewelry_theme_prompt,
    get_ratio, build_listing_prompt,
    build_brand_listing_prompt, get_brand_config,
    JEWELRY_BACKGROUND_PROMPTS,
)
from app.services.project_service import save_project
from app.services.session_service import add_session_action
from app.services.detection_service import detect_jewelry_input
from app.database import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jewelry", tags=["Jewelry"])


def _gen_image(quality: str, prompt: str, image_b64: str, aspect_ratio_id: str | None = None) -> dict:
    """Route to Pro or Standard model based on quality tier."""
    if quality == "pro":
        return generate_image_pro(prompt, image_b64, aspect_ratio_id=aspect_ratio_id)
    return generate_image(prompt, image_b64, aspect_ratio_id=aspect_ratio_id)


@router.post("/generate-free")
async def generate_free(
    req: GenerateJewelryRequest,
    x_anonymous_id: str | None = Header(None),
):
    """One free generation for anonymous (unauthenticated) visitors.

    Tracked by anonymous_id (from cookie). Returns watermarked low-res preview.
    """
    anon_id = (x_anonymous_id or "").strip()
    if not anon_id or len(anon_id) < 10:
        raise HTTPException(status_code=400, detail="Missing or invalid anonymous ID")

    sb = get_supabase()

    # Check if this anonymous_id already used their free generation
    try:
        existing = (
            sb.table("anonymous_generations")
            .select("id")
            .eq("anonymous_id", anon_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=403,
                detail="Free generation already used. Sign up to continue — you'll get 8 free tokens.",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"anonymous_generations lookup failed (table may not exist): {e}")
        # If table doesn't exist yet, allow the generation but log warning

    ratio = get_ratio(req.aspect_ratio_id)

    # Force standard quality and single hero shot for anonymous
    quality = "standard"

    try:
        detection = detect_jewelry_input(req.image_base64, req.jewelry_type)
        detection_dict = detection.to_dict()
    except Exception:
        detection_dict = None

    if req.theme_id:
        shot_id = (req.shots[0].get("shot_id", "hero")) if req.shots else "hero"
        prompt = build_jewelry_theme_prompt(
            jewelry_type=req.jewelry_type,
            theme_id=req.theme_id,
            shot_id=shot_id,
            special_instructions=req.special_instructions,
            ratio_id=req.aspect_ratio_id,
            detection=detection_dict,
        )
        label = (req.shots[0].get("label", "Studio Shot 1")) if req.shots else "Studio Shot 1"
    else:
        prompt = build_jewelry_prompt(
            req.jewelry_type, req.background, "hero", req.special_instructions,
            ratio_id=req.aspect_ratio_id, detection=detection_dict,
        )
        label = "Studio Shot 1"

    logger.info(f"[ANON FREE GEN] anon_id={anon_id[:8]}..., type={req.jewelry_type}, quality={quality}")
    try:
        result = generate_image(prompt, req.image_base64, aspect_ratio_id=req.aspect_ratio_id)
        img_b64 = result["base64"]
        try:
            img_b64 = crop_to_ratio(img_b64, ratio["width"], ratio["height"])
        except Exception:
            pass
    except Exception as e:
        logger.error(f"Anonymous generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    # Watermark the result for anonymous users
    watermarked_b64 = generate_low_res_preview(img_b64)

    # Record this anonymous generation
    try:
        sb.table("anonymous_generations").insert({"anonymous_id": anon_id}).execute()
    except Exception as e:
        logger.warning(f"Failed to record anonymous generation: {e}")

    return {
        "success": True,
        "images": [{"base64": watermarked_b64, "label": label}],
        "generation_ids": [],
        "token_balance": 0,
        "free_generation_remaining": 0,
        "anonymous": True,
    }


@router.get("/credits")
async def jewelry_credits(user: dict = Depends(get_current_user)):
    credits = get_jewelry_credits(user["id"])
    if not credits:
        raise HTTPException(status_code=500, detail="Could not fetch credits")
    return {**credits, "pricing": JEWELRY_PRICING}


@router.post("/generate")
async def generate_jewelry(req: GenerateJewelryRequest, user: dict = Depends(get_current_user)):
    ratio = get_ratio(req.aspect_ratio_id)

    if req.step == "regen_hero":
        return await _regenerate_single(req, user, ratio)

    if req.step == "all":
        return await _generate_all(req, user, ratio)

    raise HTTPException(status_code=400, detail=f"Unknown step: {req.step}. Use 'all' or 'regen_hero'.")


async def _generate_all(req: GenerateJewelryRequest, user: dict, ratio: dict):
    """Unified generation: supports both legacy background mode and new theme+shots mode."""
    use_theme = bool(req.theme_id)
    shot_configs = req.shots or [{"shot_id": "hero"}]
    alt_count = len(req.alt_images_base64) if req.alt_images_base64 else 0

    if use_theme:
        total_images = len(shot_configs) + alt_count
    else:
        total_images = 1 + alt_count

    per_image_cost = get_operation_cost("imageGen", req.quality)
    total_cost = per_image_cost * total_images

    credits = get_jewelry_credits(user["id"])
    if not credits:
        raise HTTPException(status_code=500, detail="Could not fetch credits")

    free_remaining = credits.get("free_generation_remaining", 0)
    if free_remaining <= 0 and credits["token_balance"] < total_cost:
        raise HTTPException(
            status_code=403,
            detail=f"Need {total_cost} tokens, have {credits['token_balance']}. Buy tokens to continue.",
            headers={"X-Required-Credits": str(total_cost), "X-Current-Balance": str(credits["token_balance"])},
        )

    images: list[ImageResult] = []
    generation_ids: list[str] = []

    try:
        detection = detect_jewelry_input(req.image_base64, req.jewelry_type)
        detection_dict = detection.to_dict()
    except Exception as det_err:
        logger.warning(f"Detection step failed (non-blocking): {det_err}")
        detection_dict = None

    if use_theme:
        # Theme-based multi-shot generation
        for i, shot_cfg in enumerate(shot_configs):
            shot_id = shot_cfg.get("shot_id", "hero")
            shot_details = shot_cfg.get("additional_details")
            shot_color = shot_cfg.get("theme_color")

            prompt = build_jewelry_theme_prompt(
                jewelry_type=req.jewelry_type,
                theme_id=req.theme_id,
                shot_id=shot_id,
                additional_details=shot_details,
                theme_color_override=shot_color,
                special_instructions=req.special_instructions,
                ratio_id=req.aspect_ratio_id,
                detection=detection_dict,
            )
            shot_label = shot_cfg.get("label", f"Shot {i + 1}")
            logger.info(f"[THEME GEN] theme={req.theme_id}, shot={shot_id}, quality={req.quality}")
            try:
                result = _gen_image(req.quality, prompt, req.image_base64, aspect_ratio_id=req.aspect_ratio_id)
                img_b64 = result["base64"]
                try:
                    img_b64 = crop_to_ratio(img_b64, ratio["width"], ratio["height"])
                except Exception:
                    pass
                usage = result.get("usage", {})
                gen_id = track_generation(
                    client_id=user["id"],
                    generation_type=f"theme_{shot_id}",
                    input_tokens=usage.get("input_tokens", 0),
                    output_tokens=usage.get("output_tokens", 0),
                    model_used=result.get("model", "gemini-2.5-flash-image"),
                )
                if gen_id:
                    generation_ids.append(gen_id)
                images.append(ImageResult(base64=img_b64, label=shot_label))
            except Exception as e:
                logger.warning(f"Theme shot {shot_id} generation failed: {e}")
                if i == 0:
                    raise HTTPException(status_code=500, detail=str(e))
                images.append(ImageResult(base64="", label=f"{shot_label} (failed)"))
    else:
        # Legacy background-based generation
        hero_prompt = build_jewelry_prompt(
            req.jewelry_type, req.background, "hero", req.special_instructions,
            ratio_id=req.aspect_ratio_id, detection=detection_dict,
        )
        logger.info(f"[HERO PROMPT] type={req.jewelry_type}, bg={req.background}, quality={req.quality}")
        try:
            result = _gen_image(req.quality, hero_prompt, req.image_base64, aspect_ratio_id=req.aspect_ratio_id)
            hero_b64 = result["base64"]
            try:
                hero_b64 = crop_to_ratio(hero_b64, ratio["width"], ratio["height"])
            except Exception:
                pass
            usage = result.get("usage", {})
            gen_id = track_generation(
                client_id=user["id"],
                generation_type="hero",
                input_tokens=usage.get("input_tokens", 0),
                output_tokens=usage.get("output_tokens", 0),
                model_used=result.get("model", "gemini-2.5-flash-image"),
            )
            if gen_id:
                generation_ids.append(gen_id)
            images.append(ImageResult(base64=hero_b64, label="Studio Shot 1"))
        except Exception as e:
            logger.error(f"Hero generation error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    # Deduct tokens after successful generation
    if free_remaining > 0:
        credit_result = check_and_deduct_jewelry(user["id"], "first_generation", req.quality, session_id=req.session_id)
    else:
        successful_count = len([img for img in images if img.base64])
        actual_cost = per_image_cost * successful_count
        deduct_jewelry_tokens(user["id"], actual_cost, operation="imageGen", quality=req.quality, session_id=req.session_id)
        credit_result = {"remaining": credits["token_balance"] - actual_cost, "free_generation_remaining": 0}

    # Alt images (same prompt as hero for legacy mode)
    if req.alt_images_base64:
        for idx, alt_b64 in enumerate(req.alt_images_base64):
            if use_theme:
                alt_prompt = build_jewelry_theme_prompt(
                    req.jewelry_type, req.theme_id, "hero",
                    special_instructions=req.special_instructions,
                    ratio_id=req.aspect_ratio_id, detection=detection_dict,
                )
            else:
                alt_prompt = build_jewelry_prompt(
                    req.jewelry_type, req.background, "hero", req.special_instructions,
                    ratio_id=req.aspect_ratio_id, detection=detection_dict,
                )
            try:
                alt_result = _gen_image(req.quality, alt_prompt, alt_b64, aspect_ratio_id=req.aspect_ratio_id)
                alt_img_b64 = alt_result["base64"]
                try:
                    alt_img_b64 = crop_to_ratio(alt_img_b64, ratio["width"], ratio["height"])
                except Exception:
                    pass
                alt_gen_id = track_generation(client_id=user["id"], generation_type="studio", model_used=alt_result.get("model", "gemini-2.5-flash-image"))
                if alt_gen_id:
                    generation_ids.append(alt_gen_id)
                images.append(ImageResult(base64=alt_img_b64, label=f"Studio Shot {len(images) + 1}"))
            except Exception as e:
                logger.warning(f"Alt image {idx + 1} generation failed: {e}")
                images.append(ImageResult(base64="", label=f"Studio Shot {len(images) + 1} (failed)"))

    try:
        save_images = [{"base64": req.image_base64, "label": "Original Upload"}]
        save_images += [{"base64": img.base64, "label": img.label} for img in images if img.base64]
        meta = {"jewelry_type": req.jewelry_type, "detection": detection_dict}
        if req.session_id:
            meta["session_id"] = req.session_id
        if use_theme:
            meta["theme_id"] = req.theme_id
            meta["shots"] = req.shots
        else:
            meta["background"] = req.background
            meta["alt_count"] = alt_count
        save_project(
            client_id=user["id"],
            project_type="jewelry_all",
            title=f"Jewelry – {req.jewelry_type.title()} ({len(images)} shots)",
            images=save_images,
            metadata=meta,
        )
    except Exception as save_err:
        logger.warning(f"Project save failed (non-blocking): {save_err}")

    if req.session_id:
        try:
            add_session_action(
                session_id=req.session_id,
                action_type="jewelry_gen",
                quality=req.quality,
                tokens_used=per_image_cost * len([img for img in images if img.base64]),
                input_data={"jewelry_type": req.jewelry_type, "theme_id": req.theme_id, "step": req.step},
                output_images_b64=[{"base64": img.base64, "label": img.label} for img in images if img.base64],
            )
        except Exception as e:
            logger.warning(f"Session action save failed: {e}")

    return {
        "success": True,
        "images": [{"base64": img.base64, "label": img.label} for img in images if img.base64],
        "generation_ids": generation_ids,
        "token_balance": credit_result.get("remaining", 0),
        "free_generation_remaining": credit_result.get("free_generation_remaining", 0),
    }


async def _regenerate_single(req: GenerateJewelryRequest, user: dict, ratio: dict):
    """Regenerate a single shot — uses theme prompt when theme_id is present."""
    regen_cost = get_operation_cost("regenSingle", req.quality)
    credits = get_jewelry_credits(user["id"])
    if not credits or credits["token_balance"] < regen_cost:
        raise HTTPException(status_code=403, detail=f"Need {regen_cost} tokens to regenerate")

    shot_id = (req.shots[0].get("shot_id") if req.shots else None) or "hero"

    if req.theme_id:
        prompt = build_jewelry_theme_prompt(
            jewelry_type=req.jewelry_type,
            theme_id=req.theme_id,
            shot_id=shot_id,
            special_instructions=req.special_instructions,
            ratio_id=req.aspect_ratio_id,
        )
    else:
        prompt = build_jewelry_regen_prompt(
            req.jewelry_type, req.background, req.special_instructions,
        )
    try:
        result = _gen_image(req.quality, prompt, req.image_base64, aspect_ratio_id=req.aspect_ratio_id)
        img_b64 = result["base64"]
        try:
            img_b64 = crop_to_ratio(img_b64, ratio["width"], ratio["height"])
        except Exception:
            pass
        usage = result.get("usage", {})
        shot_label = shot_id.replace("_", " ").title() if shot_id != "hero" else "Studio Shot"
        regen_gen_id = track_generation(
            client_id=user["id"],
            generation_type=f"regen_{shot_id}",
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
            model_used=result.get("model", "gemini-2.5-flash-image"),
        )
        try:
            save_project(
                client_id=user["id"],
                project_type="jewelry_regen",
                title=f"Jewelry Regen – {shot_label}",
                images=[{"base64": img_b64, "label": shot_label}],
                metadata={"jewelry_type": req.jewelry_type, "background": req.background, "theme_id": req.theme_id, "shot_id": shot_id},
            )
        except Exception as save_err:
            logger.warning(f"Project save failed (non-blocking): {save_err}")

        if req.session_id:
            try:
                add_session_action(
                    session_id=req.session_id,
                    action_type="regen",
                    quality=req.quality,
                    tokens_used=regen_cost,
                    input_data={"special_instructions": req.special_instructions, "theme_id": req.theme_id, "shot_id": shot_id},
                    output_images_b64=[{"base64": img_b64, "label": shot_label}],
                )
            except Exception as e:
                logger.warning(f"Session action save failed: {e}")

        deduct_jewelry_tokens(user["id"], regen_cost, operation="regenSingle", quality=req.quality, session_id=req.session_id)
        return {
            "success": True,
            "images": [{"base64": img_b64, "label": shot_label}],
            "generation_ids": [regen_gen_id] if regen_gen_id else [],
        }
    except Exception as e:
        logger.error(f"Regenerate hero error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recolor", response_model=GenerateResponse)
async def recolor_jewelry(req: RecolorJewelryRequest, user: dict = Depends(get_current_user)):
    credits = get_jewelry_credits(user["id"])
    cost = get_operation_cost("recolorSingle", req.quality)
    if not credits or credits["token_balance"] < cost:
        raise HTTPException(status_code=403, detail=f"Need {cost} tokens")

    prompt = build_recolor_prompt(req.jewelry_type, req.target_metal)
    try:
        result = _gen_image(req.quality, prompt, req.image_base64)

        usage = result.get("usage", {})
        track_generation(
            client_id=user["id"],
            generation_type="recolor",
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
            model_used=result.get("model", "gemini-2.5-flash-image"),
            metadata={"target_metal": req.target_metal},
        )

        deduct_jewelry_tokens(user["id"], cost, operation="recolorSingle", quality=req.quality, session_id=req.session_id)
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

        if req.session_id:
            try:
                add_session_action(
                    session_id=req.session_id,
                    action_type="recolor",
                    quality=req.quality,
                    tokens_used=cost,
                    input_data={"target_metal": req.target_metal, "jewelry_type": req.jewelry_type},
                    output_images_b64=[{"base64": result["base64"], "label": recolor_label}],
                )
            except Exception as e:
                logger.warning(f"Session action save failed: {e}")

        return GenerateResponse(
            success=True,
            images=[ImageResult(base64=result["base64"], label=recolor_label)],
        )
    except Exception as e:
        logger.error(f"Recolor error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/listing")
async def generate_listing(req: RewriteListingRequest, user: dict = Depends(get_current_user)):
    credits = get_jewelry_credits(user["id"])
    cost = get_operation_cost("listing")
    if not credits or credits["token_balance"] < cost:
        raise HTTPException(status_code=403, detail=f"Need {cost} tokens")

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

        deduct_jewelry_tokens(user["id"], cost, operation="listing", session_id=req.session_id)
        track_generation(
            client_id=user["id"],
            generation_type="listing",
            input_tokens=result.get("usage", {}).get("input_tokens", 0),
            output_tokens=result.get("usage", {}).get("output_tokens", 0),
        )

        if req.session_id:
            try:
                add_session_action(
                    session_id=req.session_id,
                    action_type="listing",
                    tokens_used=cost,
                    input_data={"jewelry_type": req.jewelry_type},
                    output_text=listing,
                )
            except Exception as e:
                logger.warning(f"Session action save failed: {e}")

        return {"success": True, "listing": listing}
    except Exception as e:
        logger.error(f"Listing generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/branding")
async def apply_branding(req: BrandingRequest, user: dict = Depends(get_current_user)):
    """Apply a branding strip (appended below) to an image. No AI cost."""
    if not req.business_name and not req.phone:
        raise HTTPException(status_code=400, detail="Provide at least a business name or phone number")
    try:
        branded_b64 = add_branding_bar(
            image_b64=req.image_base64,
            business_name=req.business_name,
            phone=req.phone,
            background=req.background,
        )
        if req.session_id:
            try:
                add_session_action(
                    session_id=req.session_id,
                    action_type="branding",
                    quality="standard",
                    tokens_used=0,
                    input_data={"business_name": req.business_name, "phone": req.phone},
                    output_images_b64=[{"base64": branded_b64, "label": "Branded"}],
                )
            except Exception as e:
                logger.warning(f"Session action save failed for branding: {e}")
        return {"success": True, "image": {"base64": branded_b64, "label": "Branded"}}
    except Exception as e:
        logger.error(f"Branding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
