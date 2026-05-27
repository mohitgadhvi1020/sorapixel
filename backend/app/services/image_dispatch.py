from __future__ import annotations

"""Smart model routing for image generation.

Routes to the best model per task:
  - GPT Image 2:  Primary model for most generation (best prompt comprehension,
                   highest consistency, #1 ranked on Artificial Analysis arena)
  - FLUX Fill:    Hero/studio shots when mask-based inpainting is available
                  (product pixels physically untouched — strongest fidelity mechanism)
  - Gemini Pro:   Fallback when GPT Image 2 fails, or for edge cases (5+ piece sets)

All paths include an invisible piece-count guard that catches the most visible
failure ("pair became single") without adding perceptible latency.

The full fidelity analysis (score_fidelity) is NOT run automatically —
it is exposed via `auto_fix_image()` for user-triggered "Improve" calls.
"""

import logging

from app.services.openai_image_service import (
    generate_image as gpt_image_single,
    generate_image_multi as gpt_image_multi,
)
from app.services.gemini_service import (
    generate_image as gemini_flash_single,
    generate_image_pro as gemini_pro_single,
    generate_image_multi as gemini_flash_multi,
    generate_image_pro_multi as gemini_pro_multi,
)
from app.services.fal_image_service import generate_inpaint as flux_fill_inpaint
from app.services.fidelity_check import (
    fidelity_check_enabled, score_fidelity, fidelity_preserve_instruction,
)
from app.services.detection_service import detect_jewelry_input, JewelryDetection

logger = logging.getLogger(__name__)


# ── piece-count guard ──

def _check_piece_count(
    output_b64: str,
    jewelry_type: str,
    input_detection: dict | None,
) -> bool:
    """Fast check: does the output have the same piece count as the input?

    Returns True if counts match or if check cannot be performed.
    Returns False if there is a definite mismatch (e.g. pair became single).
    """
    if not input_detection or not jewelry_type:
        return True

    input_count = input_detection.get("item_count", 1)
    input_is_pair = input_detection.get("is_pair", False)

    try:
        output_detection = detect_jewelry_input(output_b64, jewelry_type)
    except Exception as e:
        logger.warning("piece-count check failed (non-blocking): %s", str(e)[:120])
        return True

    output_count = output_detection.item_count
    output_is_pair = output_detection.is_pair

    if input_is_pair and not output_is_pair:
        logger.info("piece-count MISMATCH: input is pair (%d) but output is not (%d)",
                     input_count, output_count)
        return False

    if input_count >= 3 and abs(output_count - input_count) >= 2:
        logger.info("piece-count MISMATCH: input %d, output %d", input_count, output_count)
        return False

    if (input_count == 1 and output_count > 2) or (input_count > 2 and output_count == 1):
        logger.info("piece-count MISMATCH: input %d, output %d", input_count, output_count)
        return False

    return True


# ── main dispatch ──

def generate_with_fidelity(
    quality: str,
    prompt: str,
    image_b64: str,
    aspect_ratio_id: str | None = None,
    *,
    multi: bool = False,
    images: list[dict] | None = None,
    jewelry_type: str | None = None,
    input_detection: dict | None = None,
) -> dict:
    """Smart model router with invisible piece-count guard.

    Routing logic:
      - Default: GPT Image 2 (best quality)
      - Fallback on GPT failure: Gemini Pro
      - The `quality` param is kept for backward compat but all logged-in
        users now get GPT Image 2 ("pro" maps to GPT Image 2).

    Contract: result dict includes:
        effective_quality: str (model used)
        piece_check:       optional dict {passed, retried}
    """
    # Primary: GPT Image 2
    out = _generate_with_gpt(prompt, image_b64, aspect_ratio_id, multi, images)

    if out is None:
        # Fallback: Gemini Pro
        logger.warning("GPT Image 2 failed, falling back to Gemini Pro")
        out = _generate_with_gemini_pro(prompt, image_b64, aspect_ratio_id, multi, images)

    return _apply_piece_guard(out, prompt, image_b64, aspect_ratio_id,
                              multi, images, jewelry_type, input_detection)


def _generate_with_gpt(
    prompt: str,
    image_b64: str,
    aspect_ratio_id: str | None,
    multi: bool,
    images: list[dict] | None,
) -> dict | None:
    """Try GPT Image 2. Returns None on failure so caller can fallback."""
    try:
        if multi and images:
            out = gpt_image_multi(prompt, images, aspect_ratio_id=aspect_ratio_id)
        else:
            out = gpt_image_single(prompt, image_b64, aspect_ratio_id=aspect_ratio_id)
        out["effective_quality"] = "gpt-image-2"
        return out
    except Exception as e:
        logger.error("GPT Image 2 generation failed: %s", str(e)[:200])
        return None


def _generate_with_gemini_pro(
    prompt: str,
    image_b64: str,
    aspect_ratio_id: str | None,
    multi: bool,
    images: list[dict] | None,
) -> dict:
    """Gemini Pro fallback. Raises on failure (no further fallback)."""
    if multi and images:
        out = gemini_pro_multi(prompt, images, aspect_ratio_id=aspect_ratio_id)
    else:
        out = gemini_pro_single(prompt, image_b64, aspect_ratio_id=aspect_ratio_id)
    out["effective_quality"] = "gemini-pro"
    return out


def _apply_piece_guard(
    out: dict,
    prompt: str,
    image_b64: str,
    aspect_ratio_id: str | None,
    multi: bool,
    images: list[dict] | None,
    jewelry_type: str | None,
    input_detection: dict | None,
) -> dict:
    """Run the fast piece-count check; retry once on mismatch."""
    if not jewelry_type or not input_detection:
        return out

    if _check_piece_count(out["base64"], jewelry_type, input_detection):
        out["piece_check"] = {"passed": True, "retried": False}
        return out

    # Mismatch — retry once with count-preservation suffix
    input_count = input_detection.get("item_count", 1)
    retry_prompt = (
        f"{prompt} CRITICAL: The input contains exactly {input_count} pieces. "
        f"Output MUST contain exactly {input_count} pieces."
    )

    logger.info("piece-count retry (input=%d, jewelry_type=%s)", input_count, jewelry_type)
    try:
        out2 = _generate_with_gpt(retry_prompt, image_b64, aspect_ratio_id, multi, images)
        if out2 is None:
            out2 = _generate_with_gemini_pro(retry_prompt, image_b64, aspect_ratio_id, multi, images)
        out2["piece_check"] = {"passed": True, "retried": True}
        return out2
    except Exception as e:
        logger.warning("piece-count retry failed, keeping original: %s", str(e)[:160])
        out["piece_check"] = {"passed": False, "retried": True}
        return out


# ── user-triggered auto-fix ──

def auto_fix_image(
    quality: str,
    prompt: str,
    input_b64: str,
    output_b64: str,
    aspect_ratio_id: str | None = None,
) -> dict:
    """User-triggered fidelity repair: analyze what drifted, then regenerate
    with a targeted fix prompt using GPT Image 2.
    """
    report = score_fidelity(input_b64, output_b64)
    if report is None:
        logger.warning("auto-fix: fidelity analysis failed, regenerating blind")
        out = _generate_with_gpt(prompt, input_b64, aspect_ratio_id, False, None)
        if out is None:
            out = _generate_with_gemini_pro(prompt, input_b64, aspect_ratio_id, False, None)
        out["auto_fix"] = {"fidelity_score": None, "action": "blind_regen"}
        return out

    if report.is_clean:
        return {
            "base64": output_b64,
            "mime_type": "image/png",
            "auto_fix": {
                "fidelity_score": report.score,
                "reason": report.reason,
                "action": "no_fix_needed",
            },
            "effective_quality": "gpt-image-2",
        }

    fix_prompt = f"{prompt}\n\n{fidelity_preserve_instruction(report)}"
    logger.info("auto-fix: score=%d, reason=%s — regenerating", report.score, report.reason[:80])

    try:
        out = _generate_with_gpt(fix_prompt, input_b64, aspect_ratio_id, False, None)
        if out is None:
            out = _generate_with_gemini_pro(fix_prompt, input_b64, aspect_ratio_id, False, None)
    except Exception as e:
        logger.error("auto-fix regeneration failed: %s", str(e)[:160])
        raise

    out["auto_fix"] = {
        "fidelity_score": report.score,
        "reason": report.reason,
        "differences": report.differences,
        "action": "targeted_regen",
    }
    return out


# ── FLUX Fill inpainting (mask-based background replacement) ──

def generate_with_inpaint(
    prompt: str,
    image_b64: str,
    mask_b64: str | None = None,
    aspect_ratio_id: str | None = None,
    *,
    seed: int | None = None,
) -> dict:
    """Mask-based inpainting via FLUX Fill Pro.

    Product pixels are physically untouched — only the masked (background)
    area is modified. If no mask is provided, one is auto-generated.

    Falls back to GPT Image 2 if FLUX Fill fails.
    """
    try:
        out = flux_fill_inpaint(
            prompt=prompt,
            image_b64=image_b64,
            mask_b64=mask_b64,
            aspect_ratio_id=aspect_ratio_id,
            seed=seed,
        )
        out["effective_quality"] = "flux-fill"
        return out
    except Exception as e:
        logger.error("FLUX Fill failed: %s — falling back to GPT Image 2", str(e)[:200])
        out = _generate_with_gpt(prompt, image_b64, aspect_ratio_id, False, None)
        if out is None:
            out = _generate_with_gemini_pro(prompt, image_b64, aspect_ratio_id, False, None)
        out["flux_fallback"] = True
        return out
