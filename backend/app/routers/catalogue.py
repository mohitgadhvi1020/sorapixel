from __future__ import annotations

"""Catalogue / UGC / Branding router — Flyr-style: product on AI model."""

import logging
import random
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.schemas.catalogue import GenerateCatalogueRequest, CatalogueResponse
from app.services.gemini_service import (
    generate_image, generate_image_multi,
    generate_image_pro, generate_image_pro_multi,
)
from app.services.image_service import crop_to_ratio_top, add_branding_bar
from app.services.credit_service import get_jewelry_credits, deduct_jewelry_tokens, get_operation_cost
from app.services.tracking_service import track_generation
from app.services.prompt_service import (
    build_catalogue_prompt, build_branding_prompt, get_ratio,
    CATALOGUE_BACKGROUNDS, CATALOGUE_POSES, AI_MODEL_FACES,
)
from app.services.project_service import save_project
from app.services.session_service import add_session_action
from app.services.detection_service import detect_jewelry_input

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/catalogue", tags=["Catalogue"])


def _gen_ugc_image(quality: str, prompt: str, image_b64: str) -> dict:
    if quality == "pro":
        return generate_image_pro(prompt, image_b64)
    return generate_image(prompt, image_b64)


def _gen_ugc_image_multi(quality: str, prompt: str, images: list[dict]) -> dict:
    if quality == "pro":
        return generate_image_pro_multi(prompt, images)
    return generate_image_multi(prompt, images)


@router.get("/models")
async def list_models():
    return {"models": AI_MODEL_FACES}


@router.get("/poses")
async def list_poses():
    return {"poses": CATALOGUE_POSES}


@router.get("/backgrounds")
async def list_backgrounds():
    return {"backgrounds": CATALOGUE_BACKGROUNDS}


@router.post("/generate", response_model=CatalogueResponse)
async def generate_catalogue(req: GenerateCatalogueRequest, user: dict = Depends(get_current_user)):
    poses_to_gen = (req.poses or ["standing", "side_view", "back_view", "sitting"])[:4]
    quality = req.quality if req.quality in ("standard", "pro") else "standard"
    per_pose_cost = get_operation_cost("ugcPerPose", quality)
    total_cost = len(poses_to_gen) * per_pose_cost

    credits = get_jewelry_credits(user["id"])
    if not credits or credits["token_balance"] < total_cost:
        raise HTTPException(
            status_code=403,
            detail=f"Need {total_cost} tokens, have {credits['token_balance'] if credits else 0}",
        )

    ratio = get_ratio(req.aspect_ratio_id)
    category_slug = user.get("category_slug")
    is_branding = req.add_logo and user.get("company_name")

    OUTFIT_OPTIONS = [
        "a simple elegant navy blue dress with minimal accessories",
        "a classic black fitted dress, clean and professional",
        "a sophisticated maroon/wine-colored outfit, elegant draping",
        "a crisp white blouse with dark formal trousers",
        "a deep emerald green ethnic kurta with subtle gold accents",
    ]
    outfit = random.choice(OUTFIT_OPTIONS)

    # Run detection for jewelry category to get component-level awareness
    detection_dict = None
    if req.jewelry_type and category_slug == "jewellery":
        try:
            detection = detect_jewelry_input(req.image_base64, req.jewelry_type)
            detection_dict = detection.to_dict()
            logger.info(f"[UGC DETECTION] type={req.jewelry_type}, detection={detection_dict}")
        except Exception as det_err:
            logger.warning(f"[UGC] Detection step failed (non-blocking): {det_err}")

    images = []
    for pose in poses_to_gen:
        if is_branding:
            prompt = build_branding_prompt(
                model_type=req.model_type, pose=pose,
                background=req.background, category_slug=category_slug,
                special_instructions=req.special_instructions,
                outfit_description=outfit,
            )
        else:
            prompt = build_catalogue_prompt(
                model_type=req.model_type, pose=pose,
                background=req.background, category_slug=category_slug,
                special_instructions=req.special_instructions,
                key_highlights=req.key_highlights,
                outfit_description=outfit,
                jewelry_type=req.jewelry_type,
                gender=req.gender,
                nationality=req.nationality,
                skin_tone=req.skin_tone,
                detection=detection_dict,
            )

        if pose == poses_to_gen[0]:
            logger.info(f"[UGC PROMPT] type={req.jewelry_type}, pose={pose}, detection={detection_dict is not None}")
            logger.info(f"[UGC PROMPT] Full prompt ({len(prompt)} chars):\n{prompt}")

        try:
            if req.additional_images:
                all_images = [{"base64": req.image_base64, "mime_type": "image/png"}]
                for extra in req.additional_images[:3]:
                    all_images.append({"base64": extra, "mime_type": "image/png"})
                result = _gen_ugc_image_multi(quality, prompt, all_images)
            else:
                result = _gen_ugc_image(quality, prompt, req.image_base64)

            image_b64 = result["base64"]
            try:
                image_b64 = crop_to_ratio_top(image_b64, ratio["width"], ratio["height"])
            except Exception:
                pass

            if is_branding:
                image_b64 = add_branding_bar(
                    image_b64,
                    business_name=user.get("company_name", ""),
                    phone=user.get("phone", ""),
                    website=user.get("business_website", ""),
                    logo_url=user.get("business_logo_url"),
                    background=req.background or "",
                )

            usage = result.get("usage", {})
            track_generation(
                client_id=user["id"],
                generation_type="branding" if is_branding else "catalogue",
                input_tokens=usage.get("input_tokens", 0),
                output_tokens=usage.get("output_tokens", 0),
                metadata={"model_type": req.model_type, "pose": pose, "category": category_slug, "quality": quality},
            )

            images.append({"base64": image_b64, "mime_type": "image/png", "label": pose.replace("_", " ").title()})
        except Exception as e:
            logger.error(f"Catalogue generation error (pose={pose}): {e}")
            images.append({"base64": "", "label": f"{pose.replace('_', ' ').title()} (failed)"})

    valid_images = [img for img in images if img.get("base64")]

    # Only charge for images that actually succeeded
    successful_count = len(valid_images)
    if successful_count > 0:
        actual_cost = successful_count * per_pose_cost
        deduct_jewelry_tokens(user["id"], actual_cost, operation="ugcPerPose", quality=quality, session_id=req.session_id)
    else:
        raise HTTPException(status_code=500, detail="All image generations failed. No tokens were deducted.")

    if valid_images:
        try:
            ptype = "branding" if is_branding else "catalogue"
            save_project(
                client_id=user["id"],
                project_type=ptype,
                title=f"Catalogue – {req.model_type.replace('_', ' ').title()}",
                images=valid_images,
                metadata={"model_type": req.model_type, "poses": poses_to_gen, "category": category_slug},
            )
        except Exception as save_err:
            logger.warning(f"Project save failed (non-blocking): {save_err}")

    if req.session_id and valid_images:
        try:
            add_session_action(
                session_id=req.session_id,
                action_type="ugc",
                quality=quality,
                tokens_used=actual_cost,
                input_data={
                    "poses": poses_to_gen,
                    "model_type": req.model_type,
                    "gender": req.gender,
                    "nationality": req.nationality,
                    "skin_tone": req.skin_tone,
                    "jewelry_type": req.jewelry_type,
                    "background": req.background,
                },
                output_images_b64=[{"base64": img["base64"], "label": img.get("label", "")} for img in valid_images],
            )
        except Exception as e:
            logger.warning(f"Session action save failed: {e}")

    return CatalogueResponse(success=True, images=images)
