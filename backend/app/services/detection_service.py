from __future__ import annotations

"""Pre-generation image analysis — deep product inspection before generation.

Uses gemini-2.5-pro (text) for maximum detail extraction.
The richer the detection, the better the generation prompt, the more faithful
the output. This is the MOST IMPORTANT step in the pipeline.

Returns structured detection results that feed directly into prompt building.
"""

import json
import logging
import re
from dataclasses import dataclass, field, asdict

from app.services.gemini_service import generate_text_pro

logger = logging.getLogger(__name__)

_DETECTION_TEMPLATE = """You are an expert jewelry product analyst. Analyze this jewelry product image with EXTREME attention to detail. Your analysis directly controls an AI image generation model — every detail you miss or get wrong will cause the output image to be wrong.

The user says the PRIMARY product being photographed is: {jewelry_type}.

CRITICAL RULES:
- Count ONLY the primary {jewelry_type} item(s) being photographed.
- Do NOT count jewelry worn on hands/body as primary items (e.g. a ring on a finger holding a pendant is a PROP, not the primary product).
- Be EXTREMELY precise about metal color, stone details, and design elements — the generation model will reproduce exactly what you describe.

Analyze and return this JSON:
{{
  "item_count": <integer — count of primary product pieces only>,
  "is_pair": <boolean — true if this is a matching pair like earrings>,
  "is_set": <boolean — true if this is a multi-piece set>,
  "components": ["<string>", ...],

  "metal": {{
    "primary_type": "<e.g. yellow gold, rose gold, white gold, silver, platinum, oxidized silver, gunmetal>",
    "finish": "<e.g. polished, matte, brushed, hammered, satin, oxidized, antique patina>",
    "color_hex_approx": "<approximate hex color of the metal, e.g. #D4A843>",
    "secondary_metal": "<if two-tone, describe secondary metal, else null>",
    "plating": "<e.g. rhodium-plated, gold-plated, rose gold-plated, or null>"
  }},

  "stones": [
    {{
      "type": "<e.g. diamond, ruby, emerald, sapphire, pearl, cubic zirconia, crystal, kundan, polki, meenakari, ad stone>",
      "color": "<e.g. clear, red, green, blue, white, pink, multi-color>",
      "shape": "<e.g. round, oval, marquise, pear, princess, cushion, emerald-cut, cabochon, irregular>",
      "setting": "<e.g. prong, bezel, pave, channel, cluster, halo, invisible, kundan-set>",
      "size": "<e.g. small, medium, large, mixed sizes>",
      "count_approx": "<e.g. 1, 3, many, clustered>",
      "position": "<e.g. center, surrounding, border, scattered, pendant drop>"
    }}
  ],

  "design": {{
    "style": "<e.g. modern minimalist, traditional Indian, art deco, vintage, boho, classical, filigree, temple, ethnic>",
    "pattern": "<e.g. floral, geometric, chain link, rope, twisted, plain, openwork, jali, mesh, vine>",
    "texture": "<surface texture — e.g. smooth, textured, engraved, embossed, granulated, rope-textured>",
    "shape_outline": "<overall silhouette — e.g. circular, teardrop, oval, rectangular, freeform, elongated, chandelier>",
    "symmetry": "<symmetric, asymmetric, mostly symmetric>",
    "special_features": ["<e.g. dangling elements, movable parts, clasp visible, adjustable chain, charm, tassel, jhumka bells>"]
  }},

  "dimensions": {{
    "relative_size": "<e.g. delicate/fine, medium, statement/large, oversized>",
    "thickness": "<e.g. thin, medium, chunky, varied>",
    "length_if_applicable": "<e.g. choker length, princess length, matinee, long, N/A>"
  }},

  "visual_details": {{
    "primary_description": "<2-3 sentence rich description of the complete piece — metal, stones, design, overall look. Be specific enough that someone could recreate it.>",
    "distinguishing_features": ["<unique elements that make this piece identifiable — e.g. specific stone arrangement, unusual clasp, distinctive pendant shape, specific engraving>"],
    "color_palette": ["<list the 2-4 dominant colors as descriptive names, e.g. warm yellow gold, deep red ruby, clear diamond sparkle>"]
  }},

  "image_quality": {{
    "has_reflections": <boolean — camera/photographer reflections on metal>,
    "has_props": <boolean — hands, stands, mannequins, boxes, tags visible>,
    "props_list": ["<string>", ...],
    "is_cropped": <boolean — primary product cut off at edges>,
    "is_low_quality": <boolean — blurry, pixelated, very low resolution>,
    "background_type": "<e.g. white, black, gradient, fabric, lifestyle, transparent, colored>",
    "lighting": "<e.g. studio, natural, harsh, soft, warm, cool, mixed>"
  }}
}}"""


@dataclass
class JewelryDetection:
    """Structured detection result for a jewelry image."""
    item_count: int = 1
    is_pair: bool = False
    is_set: bool = False
    components: list[str] = field(default_factory=list)
    # Rich detail fields
    metal: dict = field(default_factory=dict)
    stones: list[dict] = field(default_factory=list)
    design: dict = field(default_factory=dict)
    dimensions: dict = field(default_factory=dict)
    visual_details: dict = field(default_factory=dict)
    image_quality: dict = field(default_factory=dict)
    # Legacy flat fields (for backward compat with existing prompt code)
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
    """Analyze a jewelry image before generation with deep detail extraction.
    Returns structured detection results. Falls back to static defaults on failure.
    """
    fallback = get_static_fallback(jewelry_type)
    logger.info(f"[DETECTION] Starting deep analysis for jewelry_type={jewelry_type}")
    try:
        prompt = _DETECTION_TEMPLATE.format(jewelry_type=jewelry_type)
        result = generate_text_pro(prompt, image_b64, json_mode=True)
        raw_text = result["text"].strip()
        usage = result.get("usage", {})

        logger.info(f"[DETECTION] Raw response length: {len(raw_text)} chars")
        logger.info(
            f"[DETECTION] Tokens used — input: {usage.get('input_tokens', 0)}, "
            f"output: {usage.get('output_tokens', 0)}"
        )

        text = re.sub(r"^```json\s*", "", raw_text)
        text = re.sub(r"\s*```$", "", text)
        data = json.loads(text)

        logger.info(f"[DETECTION] Parsed fields: {list(data.keys())}")

        # Extract nested objects safely
        metal = data.get("metal", {}) or {}
        stones = data.get("stones", []) or []
        design = data.get("design", {}) or {}
        dimensions = data.get("dimensions", {}) or {}
        visual_details = data.get("visual_details", {}) or {}
        image_quality = data.get("image_quality", {}) or {}

        # Build the rich primary_description from visual_details or fallback
        primary_desc = ""
        if visual_details.get("primary_description"):
            primary_desc = str(visual_details["primary_description"])
        elif data.get("primary_description"):
            primary_desc = str(data["primary_description"])

        detection = JewelryDetection(
            item_count=int(data.get("item_count", fallback.item_count)),
            is_pair=bool(data.get("is_pair", fallback.is_pair)),
            is_set=bool(data.get("is_set", fallback.is_set)),
            components=data.get("components", fallback.components) or fallback.components,
            metal=metal,
            stones=stones,
            design=design,
            dimensions=dimensions,
            visual_details=visual_details,
            image_quality=image_quality,
            # Legacy flat fields for backward compat
            has_reflections=bool(image_quality.get("has_reflections", False)),
            has_props=bool(image_quality.get("has_props", False)),
            props_list=image_quality.get("props_list", []) or [],
            is_cropped=bool(image_quality.get("is_cropped", False)),
            is_low_quality=bool(image_quality.get("is_low_quality", False)),
            primary_description=primary_desc,
        )

        # Sanity: earring type should have at least 2 if pair detected
        if jewelry_type == "earring" and detection.is_pair and detection.item_count < 2:
            detection.item_count = 2

        logger.info(
            f"[DETECTION] Final result for {jewelry_type}: "
            f"count={detection.item_count}, pair={detection.is_pair}, set={detection.is_set}, "
            f"metal={metal.get('primary_type', 'unknown')}, "
            f"stones={len(stones)} types, "
            f"style={design.get('style', 'unknown')}, "
            f"size={dimensions.get('relative_size', 'unknown')}"
        )
        return detection

    except json.JSONDecodeError as e:
        logger.error(f"[DETECTION] JSON parse failed: {e} — raw text: {raw_text[:300]}")
        return fallback
    except Exception as e:
        logger.error(f"[DETECTION] Failed, using static fallback: {e}", exc_info=True)
        return fallback


def build_product_description(detection: JewelryDetection) -> str:
    """Build a rich text description from detection data for injection into prompts.

    This is the key bridge between detection and generation — the more detail
    here, the more faithful the generated image will be.
    """
    parts = []

    # Primary description
    if detection.primary_description:
        parts.append(detection.primary_description)

    # Metal details
    m = detection.metal
    if m:
        metal_str = m.get("primary_type", "")
        if m.get("finish"):
            metal_str += f" with {m['finish']} finish"
        if m.get("secondary_metal"):
            metal_str += f", two-tone with {m['secondary_metal']}"
        if m.get("plating"):
            metal_str += f" ({m['plating']})"
        if metal_str:
            parts.append(f"Metal: {metal_str}.")

    # Stones
    if detection.stones:
        stone_descs = []
        for s in detection.stones:
            desc = s.get("type", "stone")
            if s.get("color"):
                desc = f"{s['color']} {desc}"
            if s.get("shape"):
                desc += f" ({s['shape']})"
            if s.get("setting"):
                desc += f" in {s['setting']} setting"
            if s.get("position"):
                desc += f" at {s['position']}"
            stone_descs.append(desc)
        parts.append(f"Stones: {'; '.join(stone_descs)}.")

    # Design
    d = detection.design
    if d:
        design_parts = []
        if d.get("style"):
            design_parts.append(f"{d['style']} style")
        if d.get("pattern"):
            design_parts.append(f"{d['pattern']} pattern")
        if d.get("texture"):
            design_parts.append(f"{d['texture']} texture")
        if d.get("shape_outline"):
            design_parts.append(f"{d['shape_outline']} silhouette")
        if design_parts:
            parts.append(f"Design: {', '.join(design_parts)}.")
        if d.get("special_features"):
            parts.append(f"Features: {', '.join(d['special_features'])}.")

    # Dimensions
    dim = detection.dimensions
    if dim and dim.get("relative_size"):
        parts.append(f"Size: {dim['relative_size']}, {dim.get('thickness', '')} thickness.")

    # Distinguishing features
    vd = detection.visual_details
    if vd and vd.get("distinguishing_features"):
        parts.append(f"Key identifiers: {', '.join(vd['distinguishing_features'])}.")

    return " ".join(parts)
