from __future__ import annotations

"""Studio (Photo Shoot) router — Flyr-style: upload product + pick background."""

import base64
import io
import logging
import re
from fastapi import APIRouter, Depends, HTTPException
from PIL import Image as PILImage
from app.middleware.auth import get_current_user
from app.schemas.studio import GenerateStudioRequest, GenerateResponse, ImageResult
from app.database import get_supabase
from app.services.gemini_service import analyze_product_structure
from app.services.image_dispatch import generate_with_fidelity
from app.services.image_service import crop_to_ratio
from app.services.credit_service import check_studio_balance, deduct_studio_tokens, get_studio_credits, STUDIO_PRICING
from app.services.tracking_service import track_generation
from app.services.prompt_service import build_studio_prompt, get_ratio, get_studio_backgrounds
from app.services.project_service import save_project
from app.services.studio_session_service import update_studio_session

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
        "tokens_per_image": STUDIO_PRICING,
    }


@router.get("/backgrounds")
async def list_backgrounds(user: dict = Depends(get_current_user)):
    """Return available backgrounds — may include category-specific ones."""
    category_slug = user.get("category_slug")
    return {"backgrounds": get_studio_backgrounds(category_slug)}


@router.post("/generate", response_model=GenerateResponse)
async def generate_studio_image(req: GenerateStudioRequest, user: dict = Depends(get_current_user)):
    credit_check = check_studio_balance(user["id"], req.quality)
    if not credit_check["allowed"]:
        raise HTTPException(status_code=403, detail=credit_check["error"])

    category_slug = user.get("category_slug")

    # Vision pre-pass: analyze the input image first so the downstream image generator has
    # explicit ground-truth anchors (product type, structural sections, finish, components).
    # Run for ALL categories — industrial machinery, furniture, electronics etc. drift just
    # as badly as multi-piece jewelry without an anchor block. Best-effort: failures return
    # None and we fall back to the prompt-only path.
    product_structure: dict | None = None
    try:
        product_structure = analyze_product_structure(req.image_base64, category_slug)
        if product_structure:
            logger.info(
                "Studio pre-pass [%s]: type=%r count=%r critical=%r",
                category_slug,
                product_structure.get("product_type"),
                product_structure.get("piece_count"),
                product_structure.get("critical_details"),
            )
    except Exception as e:
        logger.warning("Product structure pre-pass errored (non-blocking): %s", e)

    # Respect the user's selected quality. The vision pre-pass is used only to
    # ground the prompt, not to silently change the model tier.
    effective_quality = req.quality

    prompt = build_studio_prompt(
        background_id=req.background_id or "studio",
        category_slug=category_slug,
        special_instructions=req.special_instructions,
        product_structure=product_structure,
    )

    # Aspect-ratio inference: when the client doesn't pick a ratio, infer from
    # the input photo so a tall product never gets squashed into a 1:1 canvas.
    # Never override an explicit user choice.
    effective_aspect_ratio_id = req.aspect_ratio_id
    aspect_inferred = False
    if effective_aspect_ratio_id is None:
        try:
            clean = re.sub(r"^data:image/\w+;base64,", "", req.image_base64)
            img = PILImage.open(io.BytesIO(base64.b64decode(clean)))
            w, h = img.size
            ratio_wh = w / h if h else 1.0
            if ratio_wh < 0.9:
                effective_aspect_ratio_id = "portrait"
            elif ratio_wh > 1.1:
                effective_aspect_ratio_id = "landscape"
            else:
                effective_aspect_ratio_id = "square"
            aspect_inferred = True
            logger.info("Studio aspect inferred: %dx%d -> %s", w, h, effective_aspect_ratio_id)
        except Exception as e:
            logger.warning("Aspect inference failed (%s), using default", str(e)[:80])

    ratio = get_ratio(effective_aspect_ratio_id)

    try:
        if effective_quality == "ultra":
            # gpt-image-2 — highest fidelity, higher cost. Gated by token price upstream.
            # Defensive fallback to Pro (with fidelity gate) if OpenAI fails.
            try:
                result = generate_with_fidelity(
                    "ultra", prompt, req.image_base64,
                    aspect_ratio_id=effective_aspect_ratio_id,
                )
            except Exception as oe:
                logger.warning("OpenAI ultra failed (%s), falling back to Gemini Pro", str(oe)[:100])
                result = generate_with_fidelity(
                    "pro", prompt, req.image_base64,
                    aspect_ratio_id=effective_aspect_ratio_id,
                )
                result["model"] = f"{result.get('model', 'gemini-3-pro')} (fallback from ultra)"
                result["fallback"] = True
        else:
            # Standard / Pro — fidelity dispatcher will silently retry / escalate
            # to Pro on drift if quality == "standard" and FIDELITY_CHECK_ENABLED.
            result = generate_with_fidelity(
                effective_quality, prompt, req.image_base64,
                aspect_ratio_id=effective_aspect_ratio_id,
            )

        image_b64 = result["base64"]
        try:
            image_b64 = crop_to_ratio(image_b64, ratio["width"], ratio["height"])
        except Exception as e:
            logger.warning(f"Crop failed: {e}")

        deducted = deduct_studio_tokens(user["id"], req.quality)

        usage = result.get("usage", {})
        gen_id = track_generation(
            client_id=user["id"],
            generation_type="studio",
            input_tokens=usage.get("input_tokens", 0),
            output_tokens=usage.get("output_tokens", 0),
            model_used=result.get("model", "gemini-2.5-flash-image"),
            metadata={
                "background": req.background_id,
                "category": category_slug,
                "quality": req.quality,
                "effective_quality": result.get("effective_quality", effective_quality),
                "fidelity": result.get("fidelity"),
                "aspect_ratio": effective_aspect_ratio_id,
                "aspect_inferred": aspect_inferred,
            },
        )

        saved_project_id: str | None = None
        try:
            studio_original_image_path = None
            if req.studio_session_id:
                try:
                    session_result = (
                        get_supabase()
                        .table("studio_sessions")
                        .select("original_image_path")
                        .eq("id", req.studio_session_id)
                        .eq("client_id", user["id"])
                        .maybe_single()
                        .execute()
                    )
                    studio_original_image_path = (session_result.data or {}).get("original_image_path")
                except Exception as session_meta_err:
                    logger.warning("Studio session metadata lookup failed: %s", str(session_meta_err)[:120])

            saved_project = save_project(
                client_id=user["id"],
                project_type="photoshoot",
                title=f"Studio Shot – {req.background_id or 'auto'}",
                images=[
                    {"base64": req.image_base64, "label": "Original Upload"},
                    {"base64": image_b64, "label": "Studio Shot"},
                ],
                metadata={
                    "background": req.background_id,
                    "category": category_slug,
                    "quality": req.quality,
                    "aspect_ratio": effective_aspect_ratio_id,
                    "studio_session_id": req.studio_session_id,
                    "original_image_path": studio_original_image_path,
                    "special_instructions": req.special_instructions,
                },
                generation_ids=[gen_id] if gen_id else None,
            )
            if saved_project:
                saved_project_id = saved_project.get("id")
        except Exception as save_err:
            logger.warning(f"Project save failed (non-blocking): {save_err}")

        if req.studio_session_id:
            try:
                update_studio_session(
                    session_id=req.studio_session_id,
                    client_id=user["id"],
                    current_step="done",
                    result_project_id=saved_project_id,
                )
            except Exception as link_err:
                logger.warning(f"Studio session link failed (non-blocking): {link_err}")

        return GenerateResponse(
            success=True,
            images=[ImageResult(base64=image_b64, mime_type="image/png", label="Studio Shot")],
            credits_remaining=deducted["remaining"],
        )
    except Exception as e:
        logger.error(f"Studio generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
