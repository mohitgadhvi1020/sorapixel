from __future__ import annotations

"""Flow Video router — product-to-lifestyle video pipeline.

Pipeline:
1. Generate styled first frame (product in context) via Gemini
2. Generate UGC last frame (model wearing product) via Gemini
3. Interpolate between frames using Seedance 2.0 / Kling O1 / Veo 2
"""

import logging
import random
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal

from app.middleware.auth import get_current_user
from app.services.gemini_service import generate_image, generate_image_pro
from app.services.image_service import crop_to_ratio
from app.services.credit_service import get_jewelry_credits, deduct_jewelry_tokens
from app.services.tracking_service import track_generation
from app.services.project_service import save_project
from app.services.prompt_service import (
    build_catalogue_prompt, get_ratio,
    JEWELRY_UGC_POSES, JEWELRY_SIZE_HINTS, JEWELRY_UGC_RULES,
)
from app.services.flow_presets import (
    FLOW_PRESETS, VIDEO_ENGINES,
    get_presets_for_category, get_preset,
)
from app.services.fal_video_service import generate_flow_video
from app.services.video_service import generate_video_first_last_frame

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/flow-video", tags=["Flow Video"])

FLOW_PRICING = {
    "standard": 40,
    "pro": 80,
}

OUTFITS_MODERN = [
    "a crisp white blouse with dark formal trousers, clean and professional",
    "a classic black fitted dress, minimal and elegant",
    "a simple elegant navy blue dress with minimal accessories",
    "a tailored charcoal blazer over a white top with dark trousers",
    "a sophisticated cream silk blouse with high-waisted black pants",
]

OUTFITS_TRADITIONAL = [
    "a deep emerald green silk saree with subtle gold border, elegantly draped",
    "a rich maroon/wine-colored silk saree with intricate gold zari work",
    "a royal blue lehenga choli with delicate gold embroidery",
    "a pastel pink anarkali suit with subtle gold thread work",
    "a deep purple banarasi silk saree with traditional gold motifs",
]


class FlowVideoRequest(BaseModel):
    image_b64: str
    jewelry_type: str = "necklace"
    preset_id: str = ""
    engine: Literal["seedance", "kling", "veo2"] = "seedance"
    quality: Literal["standard", "pro"] = "standard"
    aspect_ratio: str = "landscape"
    gender: str = "woman"
    nationality: str = "Indian"
    skin_tone: str = "medium"
    outfit_style: str = "modern"
    custom_transition_prompt: str | None = None
    session_id: str | None = None


class GenerateFrameRequest(BaseModel):
    """Generate just a single frame (first or last) for preview."""
    image_b64: str
    jewelry_type: str = "necklace"
    preset_id: str = ""
    frame_type: Literal["first", "last"] = "first"
    quality: Literal["standard", "pro"] = "standard"
    gender: str = "woman"
    nationality: str = "Indian"
    skin_tone: str = "medium"
    outfit_style: str = "modern"


class FlowVideoResponse(BaseModel):
    success: bool
    video_url: str = ""
    first_frame_b64: str = ""
    last_frame_b64: str = ""
    duration: int = 0
    engine: str = ""
    preset_label: str = ""
    tokens_used: int = 0
    error: str | None = None


class FramePreviewResponse(BaseModel):
    success: bool
    frame_b64: str = ""
    frame_type: str = ""
    error: str | None = None


@router.get("/presets")
async def list_presets():
    """List all flow presets grouped by category."""
    return {"presets": FLOW_PRESETS, "engines": VIDEO_ENGINES, "pricing": FLOW_PRICING}


@router.get("/presets/{category}")
async def get_category_presets(category: str):
    """Get flow presets for a specific jewelry category."""
    presets = get_presets_for_category(category)
    return {"category": category, "presets": presets, "engines": VIDEO_ENGINES}


@router.get("/credits")
async def flow_video_credits(user: dict = Depends(get_current_user)):
    credits = get_jewelry_credits(user["id"])
    if not credits:
        raise HTTPException(status_code=404, detail="Client not found")
    return {
        "token_balance": credits["token_balance"],
        "flow_cost_standard": FLOW_PRICING["standard"],
        "flow_cost_pro": FLOW_PRICING["pro"],
        "can_generate_standard": credits["token_balance"] >= FLOW_PRICING["standard"],
        "can_generate_pro": credits["token_balance"] >= FLOW_PRICING["pro"],
    }


def _build_first_frame_prompt(preset: dict, jewelry_type: str) -> str:
    """Build prompt to generate the styled first frame from a product image."""
    style = preset["first_frame_style"]
    return (
        f"Create a photorealistic product photograph of this {jewelry_type}.\n\n"
        f"SCENE: {style}\n\n"
        "PRODUCT RULES (NON-NEGOTIABLE):\n"
        "- Reproduce the EXACT product from the reference image with perfect fidelity.\n"
        "- Same shape, color, logo, label, texture, material, proportions — change NOTHING.\n"
        "- The product is the hero. It must be sharp, well-lit, and the clear focal point.\n"
        "- Do NOT add any other products or branded items.\n\n"
        "PHOTO REALISM:\n"
        "- This must look like a REAL photo taken by a professional photographer.\n"
        "- Natural sensor noise, realistic shadow falloff, specular highlights.\n"
        "- No HDR glow, no AI smoothness, no uncanny symmetry.\n"
    )


def _build_last_frame_prompt(
    preset: dict,
    jewelry_type: str,
    gender: str,
    nationality: str,
    skin_tone: str,
    outfit: str,
) -> str:
    """Build prompt to generate the UGC last frame — model wearing the product."""
    pose = preset["last_frame_pose"]

    ugc_config = JEWELRY_UGC_POSES.get(jewelry_type, JEWELRY_UGC_POSES.get("necklace", {}))
    interaction = ugc_config.get("interaction", f"wearing the {jewelry_type}")

    size_hint = JEWELRY_SIZE_HINTS.get(jewelry_type, "")
    ugc_rules = JEWELRY_UGC_RULES.get(jewelry_type, "")

    from app.services.prompt_service import (
        build_model_description, POSE_DESCRIPTIONS, MACRO_POSE_TYPES,
    )
    model_desc = build_model_description(gender=gender, nationality=nationality, skin_tone=skin_tone)
    pose_desc = POSE_DESCRIPTIONS.get(pose, POSE_DESCRIPTIONS.get("standing", ""))
    is_macro = pose in MACRO_POSE_TYPES

    prompt = (
        f"Create a photorealistic image of {model_desc} {interaction}.\n\n"
        f"POSE: {pose_desc}\n"
        f"OUTFIT: {outfit}\n"
        f"BACKGROUND: Soft, natural lifestyle setting with warm lighting.\n\n"
    )

    if is_macro:
        prompt += (
            "FRAMING: This is an EXTREME CLOSE-UP macro shot.\n"
            "The jewelry MUST fill at least 40-50% of the frame.\n"
            "Very shallow depth of field — jewelry tack-sharp, everything else softly blurred.\n\n"
        )
    else:
        prompt += (
            "FRAMING: The model's COMPLETE HEAD AND FACE must be visible.\n"
            "Frame as a 3/4-length portrait with generous headroom.\n\n"
        )

    prompt += (
        "PRODUCT PRESERVATION — CRITICAL:\n"
        "- The jewelry MUST be EXACTLY identical to the provided product image.\n"
        "- Do NOT resize, redesign, or modify the jewelry in any way.\n"
        "- Preserve exact color palette, metal tone, gemstone hue, and surface finish.\n"
    )

    if size_hint:
        prompt += f"- Size reference: {size_hint}\n"

    if ugc_rules:
        prompt += f"\n{jewelry_type.upper()} WEARING RULES:\n{ugc_rules}\n"

    prompt += (
        "\nNO EXTRA JEWELRY:\n"
        "- The model must wear ONLY the jewelry from the input image.\n"
        "- Do NOT add any additional jewelry.\n\n"
        "QUALITY:\n"
        f"- The model should look natural, authentic, and {nationality}.\n"
        "- Commercial quality, suitable for e-commerce.\n"
        "- Realistic proportions between model and product.\n"
        "- Output should look like a real professional photograph.\n"
    )

    return prompt


@router.post("/preview-frame", response_model=FramePreviewResponse)
async def preview_frame(req: GenerateFrameRequest, user: dict = Depends(get_current_user)):
    """Generate a single frame preview (first or last) without generating the video."""
    preset = get_preset(req.jewelry_type, req.preset_id)
    if not preset:
        presets = get_presets_for_category(req.jewelry_type)
        preset = presets[0] if presets else None
    if not preset:
        raise HTTPException(status_code=400, detail=f"No presets available for {req.jewelry_type}")

    try:
        gen_fn = generate_image_pro if req.quality == "pro" else generate_image

        if req.frame_type == "first":
            prompt = _build_first_frame_prompt(preset, req.jewelry_type)
        else:
            outfit = random.choice(OUTFITS_TRADITIONAL if req.outfit_style == "traditional" else OUTFITS_MODERN)
            prompt = _build_last_frame_prompt(
                preset, req.jewelry_type, req.gender, req.nationality, req.skin_tone, outfit
            )

        result = gen_fn(prompt, req.image_b64)
        frame_b64 = result["base64"]

        return FramePreviewResponse(success=True, frame_b64=frame_b64, frame_type=req.frame_type)
    except Exception as e:
        logger.error(f"Frame preview failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate", response_model=FlowVideoResponse)
async def generate_flow(req: FlowVideoRequest, user: dict = Depends(get_current_user)):
    """Full pipeline: generate first frame → last frame → video."""
    cost = FLOW_PRICING.get(req.quality, FLOW_PRICING["standard"])
    credits = get_jewelry_credits(user["id"])
    if not credits or credits["token_balance"] < cost:
        raise HTTPException(
            status_code=402,
            detail=f"Need {cost} tokens, have {credits['token_balance'] if credits else 0}.",
        )

    preset = get_preset(req.jewelry_type, req.preset_id)
    if not preset:
        presets = get_presets_for_category(req.jewelry_type)
        preset = presets[0] if presets else None
    if not preset:
        raise HTTPException(status_code=400, detail=f"No presets available for {req.jewelry_type}")

    gen_fn = generate_image_pro if req.quality == "pro" else generate_image
    outfit = random.choice(OUTFITS_TRADITIONAL if req.outfit_style == "traditional" else OUTFITS_MODERN)

    video_aspect = "16:9" if req.aspect_ratio == "landscape" else "9:16" if req.aspect_ratio == "portrait" else "1:1"

    try:
        # ── Step 1: Generate first frame ──
        logger.info(f"Flow video — Step 1: generating first frame ({preset['id']})")
        first_prompt = _build_first_frame_prompt(preset, req.jewelry_type)
        first_result = gen_fn(first_prompt, req.image_b64, aspect_ratio_id=req.aspect_ratio)
        first_frame_b64 = first_result["base64"]
        logger.info("First frame generated successfully")

        # ── Step 2: Generate last frame (UGC) ──
        logger.info(f"Flow video — Step 2: generating last frame (pose={preset['last_frame_pose']})")
        last_prompt = _build_last_frame_prompt(
            preset, req.jewelry_type, req.gender, req.nationality, req.skin_tone, outfit
        )
        last_result = gen_fn(last_prompt, req.image_b64, aspect_ratio_id=req.aspect_ratio)
        last_frame_b64 = last_result["base64"]
        logger.info("Last frame generated successfully")

        # ── Step 3: Generate video ──
        transition_prompt = req.custom_transition_prompt or preset["transition_prompt"]
        logger.info(f"Flow video — Step 3: generating video (engine={req.engine})")

        if req.engine in ("seedance", "kling"):
            video_result = await generate_flow_video(
                engine=req.engine,
                first_frame_b64=first_frame_b64,
                last_frame_b64=last_frame_b64,
                prompt=transition_prompt,
                duration=8,
                aspect_ratio=video_aspect,
                client_id=user["id"],
            )
        else:
            video_result = await generate_video_first_last_frame(
                first_frame_b64=first_frame_b64,
                last_frame_b64=last_frame_b64,
                prompt=transition_prompt,
                aspect_ratio=req.aspect_ratio,
                client_id=user["id"],
            )

        logger.info(f"Flow video generated: engine={req.engine}, path={video_result.get('storage_path')}")

        deduct_jewelry_tokens(user["id"], cost, operation="flowVideo", quality=req.quality, session_id=req.session_id)

        track_generation(
            client_id=user["id"],
            generation_type="flow_video",
            model_used=video_result.get("model", req.engine),
            metadata={
                "engine": req.engine,
                "preset": preset["id"],
                "jewelry_type": req.jewelry_type,
                "quality": req.quality,
                "gender": req.gender,
                "nationality": req.nationality,
            },
        )

        try:
            save_project(
                client_id=user["id"],
                project_type="flow_video",
                title=f"Flow Video – {preset['label']}",
                images=[
                    {"base64": first_frame_b64, "label": "First Frame"},
                    {"base64": last_frame_b64, "label": "Last Frame"},
                ],
                metadata={
                    "video_url": video_result.get("video_url", ""),
                    "engine": req.engine,
                    "preset": preset["id"],
                    "jewelry_type": req.jewelry_type,
                },
            )
        except Exception as save_err:
            logger.warning(f"Project save failed (non-blocking): {save_err}")

        return FlowVideoResponse(
            success=True,
            video_url=video_result.get("video_url", ""),
            first_frame_b64=first_frame_b64,
            last_frame_b64=last_frame_b64,
            duration=video_result.get("duration", 8),
            engine=req.engine,
            preset_label=preset["label"],
            tokens_used=cost,
        )

    except Exception as e:
        logger.error(f"Flow video generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
