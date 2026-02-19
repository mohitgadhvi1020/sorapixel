from __future__ import annotations

"""Catalogue/UGC generation router -- NEW feature (product on AI model)."""

import logging
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import get_current_user
from app.schemas.catalogue import GenerateCatalogueRequest, CatalogueResponse
from app.schemas.studio import ImageResult
from app.services.gemini_service import generate_image, generate_image_multi
from app.services.image_service import crop_to_ratio, add_watermark, overlay_logo
from app.services.credit_service import get_jewelry_credits, deduct_jewelry_tokens
from app.services.tracking_service import track_generation
from app.services.prompt_service import build_catalogue_prompt, get_ratio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/catalogue", tags=["Catalogue"])

CATALOGUE_COST = 40  # tokens per catalogue generation

AI_MODELS = [
    {"id": "indian_woman", "name": "Indian Woman", "gender": "female", "age_group": "adult", "thumbnail_url": "/models/indian_woman.jpg"},
    {"id": "indian_man", "name": "Indian Man", "gender": "male", "age_group": "adult", "thumbnail_url": "/models/indian_man.jpg"},
    {"id": "indian_boy", "name": "Indian Boy", "gender": "male", "age_group": "child", "thumbnail_url": "/models/indian_boy.jpg"},
    {"id": "indian_girl", "name": "Indian Girl", "gender": "female", "age_group": "child", "thumbnail_url": "/models/indian_girl.jpg"},
]

POSES = [
    {"id": "best_match", "label": "Best Match"},
    {"id": "standing", "label": "Standing"},
    {"id": "side_view", "label": "Side View"},
    {"id": "back_view", "label": "Back View"},
    {"id": "walking", "label": "Walking"},
]

BACKGROUNDS = [
    {"id": "best_match", "label": "Best Match"},
    {"id": "studio", "label": "Studio"},
    {"id": "flora", "label": "Flora"},
    {"id": "wooden", "label": "Wooden"},
    {"id": "indoor", "label": "Indoor"},
    {"id": "livingroom", "label": "Living Room"},
]


@router.get("/models")
async def list_models():
    return {"models": AI_MODELS}


@router.get("/poses")
async def list_poses():
    return {"poses": POSES}


@router.get("/backgrounds")
async def list_backgrounds():
    return {"backgrounds": BACKGROUNDS}


@router.post("/generate", response_model=CatalogueResponse)
async def generate_catalogue(req: GenerateCatalogueRequest, user: dict = Depends(get_current_user)):
    credits = get_jewelry_credits(user["id"])
    if not credits or credits["token_balance"] < CATALOGUE_COST:
        raise HTTPException(
            status_code=403,
            detail=f"Need {CATALOGUE_COST} tokens, have {credits['token_balance'] if credits else 0}",
        )

    deduct_jewelry_tokens(user["id"], CATALOGUE_COST)
    ratio = get_ratio(req.aspect_ratio_id)

    prompt = build_catalogue_prompt(
        product_description="the product from the input image",
        model_type=req.model_type,
        pose=req.pose,
        background=req.background,
        special_instructions=req.special_instructions,
    )

    images = []
    poses_to_generate = ["standing", "side_view", "walking", "best_match", "back_view"]
    generate_poses = [req.pose] if req.pose != "best_match" else poses_to_generate[:3]

    for pose in generate_poses:
        pose_prompt = prompt.replace(req.pose, pose) if pose != req.pose else prompt
        try:
            if req.additional_images:
                all_images = [{"base64": req.image_base64, "mime_type": "image/png"}]
                for extra in req.additional_images[:3]:
                    all_images.append({"base64": extra, "mime_type": "image/png"})
                result = generate_image_multi(pose_prompt, all_images)
            else:
                result = generate_image(pose_prompt, req.image_base64)

            image_b64 = result["base64"]
            try:
                image_b64 = crop_to_ratio(image_b64, ratio["width"], ratio["height"])
            except Exception:
                pass

            if req.add_logo and user.get("business_logo_url"):
                pass

            watermarked = add_watermark(image_b64)

            usage = result.get("usage", {})
            track_generation(
                client_id=user["id"],
                generation_type="catalogue",
                input_tokens=usage.get("input_tokens", 0),
                output_tokens=usage.get("output_tokens", 0),
                metadata={"model_type": req.model_type, "pose": pose},
            )

            images.append({"base64": watermarked, "mime_type": "image/png", "label": pose.replace("_", " ").title()})
        except Exception as e:
            logger.error(f"Catalogue generation error (pose={pose}): {e}")
            images.append({"base64": "", "label": f"{pose} (failed)"})

    return CatalogueResponse(success=True, images=images)
