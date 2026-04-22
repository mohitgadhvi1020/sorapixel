from __future__ import annotations

"""Product fidelity check — compares a generated image to the user's original
input and returns a deviation score 0..10 (0 = identical product, 10 = totally
different). Used to silently escalate standard-tier generations to a stronger
model when the diffusion model drifts on product details (stones, prong count,
metal color, charm shape, etc.).

Gated by env FIDELITY_CHECK_ENABLED. Disabled by default.
"""

import base64
import io
import json
import logging
import os
import re
import time
from dataclasses import dataclass
from typing import Literal

from PIL import Image as PILImage
from google.genai.types import GenerateContentConfig

from app.services.gemini_service import (
    MODEL_TEXT, _is_transient_error, get_text_client,
)

logger = logging.getLogger(__name__)

MAX_DIM = 768
JPEG_Q = 80


def fidelity_check_enabled() -> bool:
    return os.getenv("FIDELITY_CHECK_ENABLED", "").lower() in ("1", "true", "yes")


def _retry_threshold() -> int:
    # score strictly ABOVE this triggers a same-model retry
    try:
        return int(os.getenv("FIDELITY_RETRY_THRESHOLD", "4"))
    except ValueError:
        return 4


def _escalate_threshold() -> int:
    # score strictly ABOVE this (after retry) triggers Pro escalation
    try:
        return int(os.getenv("FIDELITY_ESCALATE_THRESHOLD", "5"))
    except ValueError:
        return 5


@dataclass
class FidelityReport:
    score: int          # 0..10, 0 = perfect match, 10 = totally different product
    reason: str
    differences: list[str]

    @property
    def is_clean(self) -> bool:
        return self.score <= _retry_threshold()

    @property
    def needs_escalation(self) -> bool:
        return self.score > _escalate_threshold()


_PROMPT = (
    "You are a strict product-fidelity auditor for jewelry photography. You are given "
    "two images:\n"
    "  IMAGE 1 = the original product reference (ground truth).\n"
    "  IMAGE 2 = an AI-regenerated scene that MUST depict the SAME physical product.\n\n"
    "Compare IMAGE 2 against IMAGE 1 focusing ONLY on the jewelry product itself "
    "(ignore background, model, pose, lighting mood, aspect ratio). Check:\n"
    "  • Stone count, shape, cut, color, arrangement\n"
    "  • Metal color (yellow/white/rose gold, silver)\n"
    "  • Charm / pendant shape and silhouette\n"
    "  • Chain style and thickness\n"
    "  • Overall structural design\n\n"
    "Return STRICT JSON with these exact keys:\n"
    '  "score":       integer 0..10.  0 = identical product, 3 = minor cosmetic drift, '
    '5 = noticeable changes a buyer would flag, 8 = clearly different piece, 10 = totally different product.\n'
    '  "reason":      one short sentence naming the single biggest deviation, or "identical" if none.\n'
    '  "differences": array of short strings, one per distinct deviation. Empty array if none.\n\n'
    "Return JSON only, no markdown fences, no prose."
)


def _shrink(b64: str) -> tuple[str, str]:
    """Aggressively compress for the vision call — we don't need detail, just identity."""
    clean = re.sub(r"^data:image/\w+;base64,", "", b64)
    try:
        img = PILImage.open(io.BytesIO(base64.b64decode(clean)))
    except Exception:
        return clean, "image/jpeg"
    if max(img.size) > MAX_DIM:
        scale = MAX_DIM / max(img.size)
        img = img.resize((int(img.size[0] * scale), int(img.size[1] * scale)), PILImage.LANCZOS)
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_Q, optimize=True)
    return base64.b64encode(buf.getvalue()).decode("utf-8"), "image/jpeg"


def score_fidelity(input_b64: str, output_b64: str) -> FidelityReport | None:
    """Returns None on network/parse failure — callers should treat None as
    'skip the gate', never as a failure."""
    t0 = time.time()
    client = get_text_client()
    in_b64, in_mime = _shrink(input_b64)
    out_b64, out_mime = _shrink(output_b64)

    contents = [
        {"text": _PROMPT},
        {"text": "IMAGE 1 (ground-truth product):"},
        {"inline_data": {"mime_type": in_mime, "data": in_b64}},
        {"text": "IMAGE 2 (generated result):"},
        {"inline_data": {"mime_type": out_mime, "data": out_b64}},
    ]

    try:
        response = client.models.generate_content(
            model=MODEL_TEXT,
            contents=contents,
            config=GenerateContentConfig(response_mime_type="application/json"),
        )
    except Exception as e:
        if _is_transient_error(e):
            logger.warning("fidelity check transient fail (%s), retrying once", str(e)[:80])
            time.sleep(1.5)
            try:
                response = client.models.generate_content(
                    model=MODEL_TEXT,
                    contents=contents,
                    config=GenerateContentConfig(response_mime_type="application/json"),
                )
            except Exception as e2:
                logger.warning("fidelity check retry failed: %s", str(e2)[:160])
                return None
        else:
            logger.warning("fidelity check error: %s", str(e)[:160])
            return None

    parts = response.candidates[0].content.parts if response.candidates else []
    text = " ".join(p.text for p in parts if hasattr(p, "text") and p.text).strip()
    if not text:
        return None

    try:
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        parsed = json.loads(text)
    except Exception as e:
        logger.warning("fidelity check JSON parse failed: %s | text=%r", e, text[:200])
        return None

    try:
        score = int(parsed.get("score", 0))
    except (TypeError, ValueError):
        score = 0
    score = max(0, min(10, score))
    reason = str(parsed.get("reason", "")).strip() or "ok"
    diffs_raw = parsed.get("differences") or []
    diffs = [str(d).strip() for d in diffs_raw if str(d).strip()] if isinstance(diffs_raw, list) else []

    logger.info("fidelity check: score=%d reason=%r (%.1fs)", score, reason, time.time() - t0)
    return FidelityReport(score=score, reason=reason, differences=diffs)


def fidelity_preserve_instruction(report: FidelityReport) -> str:
    """Build a prompt suffix to inject when re-rendering after a low score."""
    lines = [
        "⚠️ CRITICAL PRODUCT FIDELITY — the previous render altered the jewelry. "
        "You MUST preserve the EXACT product from the reference image:",
    ]
    if report.differences:
        for d in report.differences[:6]:
            lines.append(f"- Preserve: {d}")
    if report.reason and report.reason.lower() != "identical":
        lines.append(f"- Reviewer note: {report.reason}")
    lines.append(
        "- Do NOT change stone count, cut, color, metal finish, or structural design. "
        "Only re-render the scene/pose/lighting around the same product."
    )
    return "\n".join(lines)


Tier = Literal["standard", "pro", "ultra"]
