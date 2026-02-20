from __future__ import annotations

"""Catalogue / UGC / Branding router — Flyr-style: product on AI model."""

import logging
import random
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.schemas.catalogue import GenerateCatalogueRequest, CatalogueResponse
from app.services.gemini_service import generate_image, generate_image_multi
from app.services.image_service import crop_to_ratio, add_watermark, add_branding_bar
from app.services.credit_service import get_jewelry_credits, deduct_jewelry_tokens
from app.services.tracking_service import track_generation
from app.services.prompt_service import (
    build_catalogue_prompt, build_branding_prompt, get_ratio,
    CATALOGUE_BACKGROUNDS, CATALOGUE_POSES, AI_MODEL_FACES,
)
from app.services.project_service import save_project

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/catalogue", tags=["Catalogue"])

CATALOGUE_COST_PER_IMAGE = 1

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
    total_cost = len(poses_to_gen) * CATALOGUE_COST_PER_IMAGE

    credits = get_jewelry_credits(user["id"])
    if not credits or credits["token_balance"] < total_cost:
        raise HTTPException(
            status_code=403,
            detail=f"Need {total_cost} credits, have {credits['token_balance'] if credits else 0}",
        )

    deduct_jewelry_tokens(user["id"], total_cost)
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
            )

        try:
            if req.additional_images:
                all_images = [{"base64": req.image_base64, "mime_type": "image/png"}]
                for extra in req.additional_images[:3]:
                    all_images.append({"base64": extra, "mime_type": "image/png"})
                result = generate_image_multi(prompt, all_images)
            else:
                result = generate_image(prompt, req.image_base64)

            image_b64 = result["base64"]
            try:
                image_b64 = crop_to_ratio(image_b64, ratio["width"], ratio["height"])
            except Exception:
                pass

            if is_branding:
                image_b64 = add_branding_bar(
                    image_b64,
                    business_name=user.get("company_name", ""),
                    phone=user.get("phone", ""),
                    website=user.get("business_website", ""),
                    logo_url=user.get("business_logo_url"),
                )

            watermarked = add_watermark(image_b64)

            usage = result.get("usage", {})
            track_generation(
                client_id=user["id"],
                generation_type="branding" if is_branding else "catalogue",
                input_tokens=usage.get("input_tokens", 0),
                output_tokens=usage.get("output_tokens", 0),
                metadata={"model_type": req.model_type, "pose": pose, "category": category_slug},
            )

            images.append({"base64": watermarked, "mime_type": "image/png", "label": pose.replace("_", " ").title()})
        except Exception as e:
            logger.error(f"Catalogue generation error (pose={pose}): {e}")
            images.append({"base64": "", "label": f"{pose.replace('_', ' ').title()} (failed)"})

    valid_images = [img for img in images if img.get("base64")]
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

    return CatalogueResponse(success=True, images=images)
