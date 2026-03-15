from __future__ import annotations

"""Video generation router — 360 spin, hero reveal, lifestyle, sparkle, custom prompt, first/last frame."""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.middleware.auth import get_current_user
from app.services.video_service import generate_video, generate_video_first_last_frame, VIDEO_MODES
from app.services.credit_service import (
    get_jewelry_credits, check_and_deduct_jewelry, JEWELRY_PRICING,
)
from app.services.tracking_service import track_generation
from app.services.project_service import save_project, save_video_project

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/video", tags=["Video"])

VIDEO_PRICING = {
    "standard": 25,
    "pro": 50,
}


class GenerateVideoRequest(BaseModel):
    image_b64: str
    mode: str = "360_spin"
    jewelry_type: str = "jewelry"
    aspect_ratio: str = "landscape"
    quality: str = "standard"
    custom_prompt: str | None = None
    session_id: str | None = None


class FirstLastFrameRequest(BaseModel):
    first_frame_b64: str
    last_frame_b64: str
    prompt: str = "Smooth cinematic transition between these two frames."
    aspect_ratio: str = "landscape"
    quality: str = "standard"
    session_id: str | None = None


@router.get("/modes")
async def list_video_modes():
    """List available video generation modes."""
    modes = []
    for mode_id, config in VIDEO_MODES.items():
        modes.append({
            "id": mode_id,
            "label": mode_id.replace("_", " ").title(),
            "description": config["prompt_template"][:100] + "..." if len(config["prompt_template"]) > 100 else config["prompt_template"],
        })
    return {"modes": modes, "pricing": VIDEO_PRICING}


@router.get("/credits")
async def video_credits(user: dict = Depends(get_current_user)):
    """Get current credit balance for video generation."""
    credits = get_jewelry_credits(user["id"])
    if not credits:
        raise HTTPException(status_code=404, detail="Client not found")
    return {
        "token_balance": credits["token_balance"],
        "video_cost_standard": VIDEO_PRICING["standard"],
        "video_cost_pro": VIDEO_PRICING["pro"],
        "can_generate_standard": credits["token_balance"] >= VIDEO_PRICING["standard"],
        "can_generate_pro": credits["token_balance"] >= VIDEO_PRICING["pro"],
    }


@router.post("/generate")
async def generate_video_endpoint(req: GenerateVideoRequest, user: dict = Depends(get_current_user)):
    """Generate a video from a jewelry image."""
    if req.mode not in VIDEO_MODES:
        raise HTTPException(status_code=400, detail=f"Invalid mode. Choose from: {list(VIDEO_MODES.keys())}")

    if req.mode == "custom" and not req.custom_prompt:
        raise HTTPException(status_code=400, detail="Custom prompt required for custom mode")

    cost = VIDEO_PRICING.get(req.quality, VIDEO_PRICING["standard"])
    credits = get_jewelry_credits(user["id"])
    if not credits:
        raise HTTPException(status_code=404, detail="Client not found")

    if credits["token_balance"] < cost:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient tokens. Need {cost} but have {credits['token_balance']}.",
        )

    try:
        result = await generate_video(
            image_b64=req.image_b64,
            mode=req.mode,
            jewelry_type=req.jewelry_type,
            aspect_ratio=req.aspect_ratio,
            custom_prompt=req.custom_prompt,
            client_id=user["id"],
        )
    except Exception as e:
        logger.error("Video generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

    from app.services.credit_service import deduct_jewelry_tokens
    deduct_jewelry_tokens(user["id"], cost, operation="videoGen", quality=req.quality, session_id=req.session_id)

    track_generation(client_id=user["id"], generation_type="video", model_used=result["model"])

    try:
        save_video_project(
            client_id=user["id"],
            title=f"Video – {req.mode.replace('_', ' ').title()}",
            video_storage_path=result["storage_path"],
            source_image_b64=req.image_b64[:500000] if len(req.image_b64) < 500000 else None,
            metadata={"mode": req.mode, "aspect_ratio": req.aspect_ratio, "duration": result["duration"]},
        )
    except Exception as save_err:
        logger.warning(f"Video project save failed (non-blocking): {save_err}")

    return {
        "success": True,
        "video_url": result["video_url"],
        "storage_path": result["storage_path"],
        "duration": result["duration"],
        "mode": result["mode"],
        "tokens_used": cost,
    }


@router.post("/generate-first-last")
async def generate_first_last_endpoint(req: FirstLastFrameRequest, user: dict = Depends(get_current_user)):
    """Generate a video interpolating between first and last frame."""
    cost = VIDEO_PRICING.get(req.quality, VIDEO_PRICING["standard"])
    credits = get_jewelry_credits(user["id"])
    if not credits:
        raise HTTPException(status_code=404, detail="Client not found")

    if credits["token_balance"] < cost:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient tokens. Need {cost} but have {credits['token_balance']}.",
        )

    try:
        result = await generate_video_first_last_frame(
            first_frame_b64=req.first_frame_b64,
            last_frame_b64=req.last_frame_b64,
            prompt=req.prompt,
            aspect_ratio=req.aspect_ratio,
            client_id=user["id"],
        )
    except Exception as e:
        logger.error("First-last frame video generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

    from app.services.credit_service import deduct_jewelry_tokens
    deduct_jewelry_tokens(user["id"], cost, operation="videoGen", quality=req.quality, session_id=req.session_id)

    track_generation(client_id=user["id"], generation_type="video", model_used=result["model"])

    try:
        save_video_project(
            client_id=user["id"],
            title="Video – First/Last Frame",
            video_storage_path=result["storage_path"],
            source_image_b64=req.first_frame_b64[:500000] if len(req.first_frame_b64) < 500000 else None,
            metadata={"mode": "first_last_frame", "aspect_ratio": req.aspect_ratio, "duration": result["duration"]},
        )
    except Exception as save_err:
        logger.warning(f"Video project save failed (non-blocking): {save_err}")

    return {
        "success": True,
        "video_url": result["video_url"],
        "storage_path": result["storage_path"],
        "duration": result["duration"],
        "mode": "first_last_frame",
        "tokens_used": cost,
    }
