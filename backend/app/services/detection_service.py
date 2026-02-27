from __future__ import annotations

"""Pre-generation image analysis — detects item count, condition issues,
and props before sending to the image generation model.

Uses gemini-2.5-flash (text) for cheap, fast analysis (~1-2s).
Returns structured detection results that get injected into the master prompt.
"""

import json
import logging
import re
from dataclasses import dataclass, field, asdict

from app.services.gemini_service import generate_text

logger = logging.getLogger(__name__)

_DETECTION_TEMPLATE = """Analyze this jewelry product image.

The user says the PRIMARY product being photographed is: {jewelry_type}.

YOUR TASK: Identify the PRIMARY {jewelry_type} in the image — the one being showcased/photographed.

CRITICAL RULES:
- Count ONLY the primary {jewelry_type} item(s) being photographed.
- Do NOT count jewelry worn on hands/body as primary items (e.g. a ring on a finger holding a pendant is a PROP, not the primary product).
- "components" = list ONLY the primary product pieces (e.g. if primary is a pendant, components = ["pendant"]).
- "has_reflections" = true if you see camera/photographer reflections on the PRIMARY product's metal surface.
- "has_props" = true if hands, fingers, stands, mannequins, boxes, tags, packaging, or OTHER jewelry not part of the primary product are visible.
- "props_list" = list ALL props including hands AND any non-primary jewelry (e.g. ["hand", "ring on finger", "bangle on wrist"]).
- "is_cropped" = true if the PRIMARY {jewelry_type} is cut off at the image edges.
- "is_low_quality" = true if the image is blurry, pixelated, or very low resolution.
- "primary_description" = brief 1-sentence description of the primary {jewelry_type} (e.g. "gold pendant with filigree design and small diamonds").

JSON FORMAT (strict, no extra keys):
{{
  "item_count": <integer — count of primary product pieces only>,
  "is_pair": <boolean>,
  "is_set": <boolean>,
  "components": [<string>, ...],
  "has_reflections": <boolean>,
  "has_props": <boolean>,
  "props_list": [<string>, ...],
  "is_cropped": <boolean>,
  "is_low_quality": <boolean>,
  "primary_description": "<string>"
}}"""


@dataclass
class JewelryDetection:
    """Structured detection result for a jewelry image."""
    item_count: int = 1
    is_pair: bool = False
    is_set: bool = False
    components: list[str] = field(default_factory=list)
    has_reflections: bool = False
    has_props: bool = False
    props_list: list[str] = field(default_factory=list)
    is_cropped: bool = False
    is_low_quality: bool = False
    primary_description: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


# Static fallbacks when detection fails or is skipped
_STATIC_DEFAULTS: dict[str, JewelryDetection] = {
    "ring": JewelryDetection(item_count=1, components=["ring"]),
    "necklace": JewelryDetection(item_count=1, components=["necklace"]),
    "earring": JewelryDetection(item_count=2, is_pair=True, components=["earring", "earring"]),
    "bracelet": JewelryDetection(item_count=1, components=["bracelet"]),
    "bangle": JewelryDetection(item_count=1, components=["bangle"]),
    "pendant": JewelryDetection(item_count=1, components=["pendant"]),
    "brooch": JewelryDetection(item_count=1, components=["brooch"]),
    "anklet": JewelryDetection(item_count=1, components=["anklet"]),
    "chain": JewelryDetection(item_count=1, components=["chain"]),
    "set": JewelryDetection(item_count=3, is_set=True, components=["necklace", "earring", "earring"]),
}


def get_static_fallback(jewelry_type: str) -> JewelryDetection:
    return _STATIC_DEFAULTS.get(jewelry_type, JewelryDetection(item_count=1, components=[jewelry_type]))


def detect_jewelry_input(image_b64: str, jewelry_type: str) -> JewelryDetection:
    """Analyze a jewelry image before generation.
    Returns structured detection results. Falls back to static defaults on failure.
    """
    fallback = get_static_fallback(jewelry_type)
    logger.info(f"[DETECTION] Starting analysis for jewelry_type={jewelry_type}")
    try:
        prompt = _DETECTION_TEMPLATE.format(jewelry_type=jewelry_type)
        result = generate_text(prompt, image_b64, json_mode=True)
        raw_text = result["text"].strip()
        usage = result.get("usage", {})

        logger.info(f"[DETECTION] Raw Gemini response: {raw_text}")
        logger.info(
            f"[DETECTION] Tokens used — input: {usage.get('input_tokens', 0)}, "
            f"output: {usage.get('output_tokens', 0)}"
        )

        text = re.sub(r"^```json\s*", "", raw_text)
        text = re.sub(r"\s*```$", "", text)
        data = json.loads(text)

        logger.info(f"[DETECTION] Parsed JSON: {json.dumps(data, indent=2)}")

        detection = JewelryDetection(
            item_count=int(data.get("item_count", fallback.item_count)),
            is_pair=bool(data.get("is_pair", fallback.is_pair)),
            is_set=bool(data.get("is_set", fallback.is_set)),
            components=data.get("components", fallback.components) or fallback.components,
            has_reflections=bool(data.get("has_reflections", False)),
            has_props=bool(data.get("has_props", False)),
            props_list=data.get("props_list", []) or [],
            is_cropped=bool(data.get("is_cropped", False)),
            is_low_quality=bool(data.get("is_low_quality", False)),
            primary_description=str(data.get("primary_description", "")),
        )

        # Sanity: earring type should have at least 2 if pair detected
        if jewelry_type == "earring" and detection.is_pair and detection.item_count < 2:
            detection.item_count = 2

        logger.info(
            f"[DETECTION] Final result for {jewelry_type}: "
            f"count={detection.item_count}, pair={detection.is_pair}, set={detection.is_set}, "
            f"components={detection.components}, "
            f"reflections={detection.has_reflections}, props={detection.has_props}, "
            f"props_list={detection.props_list}, "
            f"cropped={detection.is_cropped}, low_q={detection.is_low_quality}"
        )
        return detection

    except json.JSONDecodeError as e:
        logger.error(f"[DETECTION] JSON parse failed: {e} — raw text: {raw_text}")
        return fallback
    except Exception as e:
        logger.error(f"[DETECTION] Failed, using static fallback: {e}", exc_info=True)
        return fallback
