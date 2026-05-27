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
from app.services.image_dispatch import generate_with_fidelity
from app.services.image_service import crop_to_ratio_top, add_branding_bar, jewelry_zoom_crop
from app.services.credit_service import get_jewelry_credits, deduct_jewelry_tokens, get_operation_cost
from app.services.tracking_service import track_generation
from app.services.prompt_service import (
    build_catalogue_prompt, build_branding_prompt, get_ratio,
    CATALOGUE_BACKGROUNDS, CATALOGUE_POSES, AI_MODEL_FACES,
)
from app.services.project_service import save_project
from app.services.session_service import add_session_action
from app.services.detection_service import detect_jewelry_input
from app.services.composition_check import (
    check_jewelry_composition,
    composition_check_enabled,
    composition_retry_budget,
    regen_instruction_from_failure,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/catalogue", tags=["Catalogue"])


def _gen_ugc_image(quality: str, prompt: str, image_b64: str) -> dict:
    return generate_with_fidelity(quality, prompt, image_b64)


def _gen_ugc_image_multi(quality: str, prompt: str, images: list[dict]) -> dict:
    # For multi-ref, use the first image as the fidelity anchor.
    anchor = (images[0].get("base64") or images[0].get("image_base64") or "") if images else ""
    return generate_with_fidelity(quality, prompt, anchor, multi=True, images=images)


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
    quality = req.quality if req.quality in ("standard", "pro", "ultra") else "standard"
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

    OUTFIT_MODERN = [
        "a crisp white blouse with dark formal trousers, clean and professional",
        "a classic black fitted dress, minimal and elegant",
        "a simple elegant navy blue dress with minimal accessories",
        "a tailored charcoal blazer over a white top with dark trousers",
        "a sophisticated cream silk blouse with high-waisted black pants",
    ]
    OUTFIT_TRADITIONAL = [
        "a deep emerald green silk saree with subtle gold border, elegantly draped",
        "a rich maroon/wine-colored silk saree with intricate gold zari work",
        "a royal blue lehenga choli with delicate gold embroidery",
        "a pastel pink anarkali suit with subtle gold thread work",
        "a deep purple banarasi silk saree with traditional gold motifs",
    ]
    OUTFIT_MINIMAL = [
        "a plain solid black sleeveless top, no patterns, no accessories — the jewelry is the only focal point",
        "a simple solid white t-shirt, clean and minimal — letting the jewelry stand out completely",
        "a plain solid grey crew-neck top, no prints, no distractions — all attention on the jewelry",
    ]

    if req.outfit_custom and req.outfit_custom.strip():
        outfit = req.outfit_custom.strip()
    elif req.outfit_style == "traditional":
        outfit = random.choice(OUTFIT_TRADITIONAL)
    elif req.outfit_style == "minimal":
        outfit = random.choice(OUTFIT_MINIMAL)
    else:
        outfit = random.choice(OUTFIT_MODERN)

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
    generation_ids = []
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
            def _run_gen(current_prompt: str) -> dict:
                if req.additional_images:
                    all_images = [{"base64": req.image_base64, "mime_type": "image/png"}]
                    for extra in req.additional_images[:3]:
                        all_images.append({"base64": extra, "mime_type": "image/png"})
                    return _gen_ugc_image_multi(quality, current_prompt, all_images)
                return _gen_ugc_image(quality, current_prompt, req.image_base64)

            result = _run_gen(prompt)
            image_b64 = result["base64"]

            composition_report = None
            if req.jewelry_type and composition_check_enabled():
                retries_left = composition_retry_budget()
                composition_report = check_jewelry_composition(image_b64, req.jewelry_type)
                current_prompt = prompt
                while (
                    composition_report is not None
                    and not composition_report.passed
                    and retries_left > 0
                ):
                    logger.info(
                        "[UGC COMPOSITION] pose=%s failed: %s — retrying (%d left)",
                        pose, composition_report.failed_criteria(), retries_left,
                    )
                    current_prompt = (
                        prompt + "\n\n" + regen_instruction_from_failure(composition_report)
                    )
                    retries_left -= 1
                    result = _run_gen(current_prompt)
                    image_b64 = result["base64"]
                    composition_report = check_jewelry_composition(image_b64, req.jewelry_type)

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
            meta = {"model_type": req.model_type, "pose": pose, "category": category_slug, "quality": quality}
            if composition_report is not None:
                meta["composition_check"] = composition_report.to_dict()
                meta["needs_manual_review"] = not composition_report.passed
            gen_id = track_generation(
                client_id=user["id"],
                generation_type="branding" if is_branding else "catalogue",
                input_tokens=usage.get("input_tokens", 0),
                output_tokens=usage.get("output_tokens", 0),
                metadata=meta,
            )
            if gen_id:
                generation_ids.append(gen_id)

            pose_label = pose.replace("_", " ").title()
            if composition_report is not None and not composition_report.passed:
                pose_label = f"{pose_label} ⚠ review"
            images.append({"base64": image_b64, "mime_type": "image/png", "label": pose_label})

            if req.jewelry_type and not is_branding and pose not in ("hand_closeup", "feet_closeup"):
                try:
                    zoomed_b64 = jewelry_zoom_crop(image_b64, req.jewelry_type, pose)
                    images.append({"base64": zoomed_b64, "mime_type": "image/png", "label": f"{pose_label} · Zoom"})
                except Exception as zoom_err:
                    logger.warning(f"Zoom crop failed for pose={pose}: {zoom_err}")

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
            save_images = [{"base64": req.image_base64, "label": "Original Upload"}] + valid_images
            save_project(
                client_id=user["id"],
                project_type=ptype,
                title=f"Catalogue – {req.model_type.replace('_', ' ').title()}",
                images=save_images,
                metadata={"model_type": req.model_type, "poses": poses_to_gen, "category": category_slug},
                generation_ids=generation_ids,
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

    return CatalogueResponse(success=True, images=images, generation_ids=generation_ids)
