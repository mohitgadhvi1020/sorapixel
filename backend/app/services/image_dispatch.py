from __future__ import annotations

"""Quality-aware image generation dispatcher with silent fidelity escalation.

For standard-tier calls, optionally runs a post-gen fidelity check against the
user's input image and retries (same model with a preserve-product instruction)
or escalates to Pro if the product drifted. The user never sees the swap — the
final image is returned with the quality tier that was actually used attached
as result['effective_quality'].

Pro and Ultra calls are passed through unchanged.
"""

import logging
from typing import Callable

from app.services.gemini_service import generate_image, generate_image_pro, generate_image_multi, generate_image_pro_multi
from app.services.openai_image_service import (
    generate_image as generate_image_ultra,
    generate_image_multi as generate_image_ultra_multi,
)
from app.services.fidelity_check import (
    fidelity_check_enabled, score_fidelity, fidelity_preserve_instruction,
)

logger = logging.getLogger(__name__)


def _standard_single(prompt, image_b64, aspect_ratio_id=None):
    return generate_image(prompt, image_b64, aspect_ratio_id=aspect_ratio_id)


def _pro_single(prompt, image_b64, aspect_ratio_id=None):
    return generate_image_pro(prompt, image_b64, aspect_ratio_id=aspect_ratio_id)


def _ultra_single(prompt, image_b64, aspect_ratio_id=None):
    return generate_image_ultra(prompt, image_b64, aspect_ratio_id=aspect_ratio_id)


def generate_with_fidelity(
    quality: str,
    prompt: str,
    image_b64: str,
    aspect_ratio_id: str | None = None,
    *,
    multi: bool = False,
    images: list[dict] | None = None,
) -> dict:
    """Quality router with a silent fidelity gate on standard-tier calls.

    Contract: result dict matches generate_image's shape plus:
        effective_quality: 'standard' | 'pro' | 'ultra'
        fidelity:          optional dict {score, reason, retried, escalated}
    """
    # Pro / Ultra — no fidelity gate, just dispatch.
    if quality == "ultra":
        if multi and images:
            out = generate_image_ultra_multi(prompt, images)
        else:
            out = _ultra_single(prompt, image_b64, aspect_ratio_id)
        out["effective_quality"] = "ultra"
        return out

    if quality == "pro":
        if multi and images:
            out = generate_image_pro_multi(prompt, images, aspect_ratio_id=aspect_ratio_id)
        else:
            out = _pro_single(prompt, image_b64, aspect_ratio_id)
        out["effective_quality"] = "pro"
        return out

    # ── Standard ──
    if multi and images:
        out = generate_image_multi(prompt, images, aspect_ratio_id=aspect_ratio_id)
    else:
        out = _standard_single(prompt, image_b64, aspect_ratio_id)
    out["effective_quality"] = "standard"

    if not fidelity_check_enabled() or not image_b64:
        return out

    report = score_fidelity(image_b64, out["base64"])
    if report is None:
        return out  # gate failed — don't block user

    fidelity_meta: dict = {"score": report.score, "reason": report.reason, "retried": False, "escalated": False}

    if report.is_clean:
        out["fidelity"] = fidelity_meta
        return out

    # Mild drift — retry same (standard) model with a preserve-product suffix.
    retry_prompt = f"{prompt}\n\n{fidelity_preserve_instruction(report)}"
    logger.info("fidelity retry on standard (score=%d, reason=%s)", report.score, report.reason[:80])
    try:
        if multi and images:
            out2 = generate_image_multi(retry_prompt, images, aspect_ratio_id=aspect_ratio_id)
        else:
            out2 = _standard_single(retry_prompt, image_b64, aspect_ratio_id)
        out2["effective_quality"] = "standard"
        fidelity_meta["retried"] = True
    except Exception as e:
        logger.warning("fidelity retry failed, keeping original: %s", str(e)[:160])
        out["fidelity"] = fidelity_meta
        return out

    report2 = score_fidelity(image_b64, out2["base64"])
    if report2 is None or not report2.needs_escalation:
        out2["fidelity"] = {**fidelity_meta, "score_after_retry": report2.score if report2 else None}
        return out2

    # Still bad — escalate silently to Pro.
    logger.info("fidelity escalate to Pro (score=%d after retry)", report2.score)
    try:
        if multi and images:
            out3 = generate_image_pro_multi(retry_prompt, images, aspect_ratio_id=aspect_ratio_id)
        else:
            out3 = _pro_single(retry_prompt, image_b64, aspect_ratio_id)
        out3["effective_quality"] = "pro"
        out3["fidelity"] = {
            **fidelity_meta,
            "retried": True, "escalated": True,
            "score_after_retry": report2.score,
        }
        return out3
    except Exception as e:
        logger.warning("fidelity pro escalation failed, keeping retry: %s", str(e)[:160])
        out2["fidelity"] = {**fidelity_meta, "score_after_retry": report2.score}
        return out2
