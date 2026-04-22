from __future__ import annotations

"""Post-generation composition gate for UGC jewelry outputs.

Runs a vision pass against the generated image and scores it on the four
criteria defined in the composition audit:

  1. jewelry_uncropped       — fully visible, not touching a frame edge
  2. jewelry_sharp_and_lit   — in focus, clear specular/key light on it
  3. composition_hero        — viewer's eye lands on the jewelry first
  4. face_framed_naturally   — no awkward head/chin/eye crop

Returns a `CompositionCheck` with per-criterion booleans, an overall `passed`
flag, and a `reason` string suitable for feeding back into a regen prompt.

Gated by env flag CATALOGUE_COMPOSITION_CHECK. Off by default so this does not
silently burn Gemini credits until retry budgets are tuned.

Usage:

    from app.services.composition_check import (
        composition_check_enabled, check_jewelry_composition,
    )

    if composition_check_enabled():
        report = check_jewelry_composition(image_b64, jewelry_type)
        if not report.passed:
            # retry with strengthened prompt (see catalogue.py)
            ...
"""

import json
import logging
import os
import re
from dataclasses import asdict, dataclass

from app.services.gemini_service import generate_text

logger = logging.getLogger(__name__)

_CRITERIA = (
    "jewelry_uncropped",
    "jewelry_sharp_and_lit",
    "composition_hero",
    "face_framed_naturally",
)


@dataclass
class CompositionCheck:
    passed: bool
    jewelry_uncropped: bool
    jewelry_sharp_and_lit: bool
    composition_hero: bool
    face_framed_naturally: bool
    reason: str

    def to_dict(self) -> dict:
        return asdict(self)

    def failed_criteria(self) -> list[str]:
        return [c for c in _CRITERIA if not getattr(self, c)]


def composition_check_enabled() -> bool:
    return os.getenv("CATALOGUE_COMPOSITION_CHECK", "").lower() in ("1", "true", "yes")


def composition_retry_budget() -> int:
    try:
        return max(0, int(os.getenv("COMPOSITION_RETRIES", "1")))
    except ValueError:
        return 1


def _prompt(jewelry_type: str) -> str:
    return (
        "You are a strict jewelry photography reviewer. The goal of this image "
        f"is for the {jewelry_type} to be the HERO of the frame — fully visible, in "
        "sharp focus with clear light on it, and the first thing a viewer's eye "
        "lands on. The model may be present and wearing it, but the jewelry is "
        "the subject.\n\n"
        "Inspect this generated image and return strict JSON with these exact keys, "
        "all booleans:\n"
        '  "jewelry_uncropped":      true if the entire jewelry piece is inside the frame and not touching any edge; false otherwise.\n'
        '  "jewelry_sharp_and_lit":  true if the jewelry is in sharp focus and has visible key/specular light on stones or metal; false if blurry or flat-lit.\n'
        '  "composition_hero":       true if the jewelry is the primary focal point (size, placement, contrast) — NOT just incidentally present.\n'
        '  "face_framed_naturally":  true if the model\'s face is either fully visible or cropped tastefully (e.g. deliberate close-up) — false if awkwardly cut (top of head missing, eyes cut off, chin cut).\n'
        '  "reason":                 one short sentence explaining the biggest problem, or "ok" if all four pass.\n\n'
        "Return JSON only, no markdown fences, no prose."
    )


def _coerce_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ("true", "yes", "1", "pass")
    return bool(value)


def check_jewelry_composition(image_b64: str, jewelry_type: str) -> CompositionCheck | None:
    """Run the vision gate. Returns None if the check itself failed (network,
    parse error). Callers should treat None as 'skip the gate', not as a fail."""
    try:
        result = generate_text(_prompt(jewelry_type), image_b64, json_mode=True)
    except Exception as e:
        logger.warning("composition check call failed: %s", str(e)[:160])
        return None

    text = (result.get("text") or "").strip()
    if not text:
        return None

    try:
        text_clean = re.sub(r"^```json\s*", "", text)
        text_clean = re.sub(r"\s*```$", "", text_clean)
        parsed = json.loads(text_clean)
    except Exception as e:
        logger.warning("composition check JSON parse failed: %s | text=%r", e, text[:200])
        return None

    flags = {c: _coerce_bool(parsed.get(c, False)) for c in _CRITERIA}
    reason = str(parsed.get("reason", "")).strip() or "ok"
    passed = all(flags.values())

    return CompositionCheck(passed=passed, reason=reason, **flags)


def regen_instruction_from_failure(report: CompositionCheck) -> str:
    """Build a short, targeted instruction to append to the prompt on retry."""
    fixes = {
        "jewelry_uncropped":     "Reframe so the ENTIRE jewelry piece is inside the canvas with padding on all sides — it is currently touching or crossing a frame edge.",
        "jewelry_sharp_and_lit": "Put the jewelry in the focal plane and add a clear key light that catches the stones/metal — it currently looks blurry or flatly lit.",
        "composition_hero":      "Recompose so the jewelry is the primary focal point (larger in frame, placed on a rule-of-thirds intersection, sharper than the background).",
        "face_framed_naturally": "Fix the face framing — include the full head with headroom OR commit to a deliberate tight close-up; do not awkwardly cut the head/eyes/chin.",
    }
    lines = ["⚠️ PRIOR ATTEMPT FAILED COMPOSITION CHECK — fix these issues:"]
    for c in report.failed_criteria():
        lines.append(f"- {fixes[c]}")
    if report.reason and report.reason != "ok":
        lines.append(f"- Reviewer note: {report.reason}")
    return "\n".join(lines)
