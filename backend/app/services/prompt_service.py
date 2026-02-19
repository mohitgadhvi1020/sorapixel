from __future__ import annotations

"""Prompt engineering service -- ported from lib/styles.ts and lib/jewelry-styles.ts.
Contains all prompt templates for studio, jewelry, catalogue, and try-on.
"""

# ─── Studio Style Presets ───

STUDIO_STYLES = {
    "clean_white": {
        "label": "Clean White",
        "prompt": "Professional product photo on pure white background, studio lighting, commercial quality, centered composition",
    },
    "lifestyle": {
        "label": "Lifestyle",
        "prompt": "Lifestyle product photography, natural setting, warm ambient lighting, editorial style",
    },
    "luxury": {
        "label": "Luxury",
        "prompt": "Luxury product photography, dark moody background, dramatic lighting, premium feel, high-end commercial",
    },
    "nature": {
        "label": "Nature",
        "prompt": "Product on natural surface, botanical elements, soft daylight, organic aesthetic",
    },
    "minimal": {
        "label": "Minimal",
        "prompt": "Minimalist product shot, clean gradient background, single light source, modern aesthetic",
    },
    "festive": {
        "label": "Festive",
        "prompt": "Festive product photography, warm golden tones, bokeh lights, celebration mood",
    },
}

PRODUCT_ISOLATION_PROMPT = (
    "CRITICAL RULES:\n"
    "1. The product must be the EXACT same product from the input image — same shape, design, color, details\n"
    "2. Do NOT redesign, modify, or reimagine the product\n"
    "3. The product must be pixel-perfect preserved\n"
    "4. Only change the BACKGROUND and LIGHTING, never the product itself"
)


def build_studio_prompt(style: str | None, custom_prompt: str | None, isolate: bool = True) -> str:
    """Build the full studio generation prompt."""
    parts = []

    if custom_prompt:
        parts.append(custom_prompt)
    elif style and style in STUDIO_STYLES:
        parts.append(STUDIO_STYLES[style]["prompt"])
    else:
        parts.append(STUDIO_STYLES["clean_white"]["prompt"])

    if isolate:
        parts.append(PRODUCT_ISOLATION_PROMPT)

    return "\n\n".join(parts)


def build_pack_prompts(style: str | None, custom_prompt: str | None, isolate: bool = True) -> list[dict]:
    """Build prompts for a 3-image marketplace pack (hero, angle, closeup)."""
    base = custom_prompt if custom_prompt else (STUDIO_STYLES.get(style, STUDIO_STYLES["clean_white"])["prompt"])
    isolation = f"\n\n{PRODUCT_ISOLATION_PROMPT}" if isolate else ""

    return [
        {
            "label": "Hero Shot",
            "prompt": f"{base}\n\nHERO SHOT: Front-facing, perfectly centered, this is the main product listing image.{isolation}",
        },
        {
            "label": "Alternate Angle",
            "prompt": f"{base}\n\nALTERNATE ANGLE: Slight 30-degree angle, showing depth and dimension of the product.{isolation}",
        },
        {
            "label": "Close-up Detail",
            "prompt": f"{base}\n\nCLOSE-UP: Macro-style detail shot, showing texture, craftsmanship, and fine details.{isolation}",
        },
    ]


# ─── Jewelry Style Presets ───

JEWELRY_BACKGROUNDS = {
    "black_velvet": "Rich black velvet background with subtle texture, dramatic studio lighting",
    "white_marble": "Polished white marble surface, clean bright lighting, luxury feel",
    "pure_white": "Pure white seamless background, soft even lighting, e-commerce ready",
    "burgundy_velvet": "Deep burgundy velvet background, warm golden lighting, royal aesthetic",
    "gold_gradient": "Warm gold gradient background, soft metallic sheen, premium presentation",
}

JEWELRY_TYPES = [
    "ring", "necklace", "earring", "bracelet", "bangle",
    "pendant", "brooch", "anklet", "chain", "set",
]


def build_jewelry_prompt(
    jewelry_type: str,
    background: str,
    shot_type: str = "hero",
    description: str = "",
) -> str:
    """Build jewelry photography prompt."""
    bg_desc = JEWELRY_BACKGROUNDS.get(background, JEWELRY_BACKGROUNDS["black_velvet"])

    shot_instructions = {
        "hero": "HERO SHOT: Front-facing, perfectly centered, showing the full piece in its best light",
        "angle": "ALTERNATE ANGLE: Slight angle showing depth, dimension, and how light plays on the metal",
        "closeup": "CLOSE-UP: Macro detail shot showing stone settings, metalwork, and craftsmanship",
    }

    prompt = (
        f"Professional jewelry product photography of a {jewelry_type}.\n"
        f"Background: {bg_desc}\n"
        f"{shot_instructions.get(shot_type, shot_instructions['hero'])}\n\n"
        f"{'Product details: ' + description if description else ''}\n\n"
        f"{PRODUCT_ISOLATION_PROMPT}\n\n"
        "Additional jewelry rules:\n"
        "- Preserve exact stone colors, metal finish, and design details\n"
        "- Lighting should enhance sparkle and reflections naturally\n"
        "- No props or hands unless specified\n"
        "- The piece should look like a real photograph, not a render"
    )
    return prompt


def build_recolor_prompt(jewelry_type: str, target_metal: str) -> str:
    """Build prompt for metal recoloring."""
    metal_descriptions = {
        "gold": "warm yellow gold with rich metallic luster",
        "silver": "bright polished silver with cool white metallic sheen",
        "rose_gold": "soft warm rose gold with pink-copper metallic tones",
    }
    metal_desc = metal_descriptions.get(target_metal, metal_descriptions["gold"])

    return (
        f"Change the metal color of this {jewelry_type} to {metal_desc}.\n\n"
        "CRITICAL RULES:\n"
        "1. ONLY change the metal color — preserve ALL stone colors exactly\n"
        "2. Keep the exact same design, shape, and details\n"
        "3. Maintain realistic metallic reflections for the new color\n"
        "4. Background and lighting must stay identical\n"
        "5. This should look like the same piece in a different metal, nothing else changed"
    )


# ─── Try-On Prompts ───

TRYON_PROMPTS = {
    "necklace": (
        "Place this necklace naturally on the person in the photo. "
        "The necklace should sit perfectly on the neckline, following the natural curve. "
        "Maintain realistic shadows, reflections, and how it drapes on the body."
    ),
    "earring": (
        "Place these earrings naturally on the person in the photo. "
        "They should hang from the earlobes naturally with proper perspective and shadows."
    ),
    "bracelet": (
        "Place this bracelet on the person's wrist naturally. "
        "It should follow the wrist curve with realistic fit and shadows."
    ),
    "ring": (
        "Place this ring on the person's finger naturally. "
        "It should fit properly with realistic shadows and perspective."
    ),
}

JEWELRY_TRYON_PROMPTS = {
    "necklace": (
        "ULTRA-FIDELITY VIRTUAL TRY-ON:\n"
        "Place this exact necklace on the person. The necklace must be pixel-perfect — "
        "same stones, same metalwork, same design. It should drape naturally following "
        "the neckline. Match lighting and shadows to the person photo. "
        "Output should be indistinguishable from a real photograph."
    ),
    "earring": (
        "ULTRA-FIDELITY VIRTUAL TRY-ON:\n"
        "Place these exact earrings on the person. Pixel-perfect preservation of the jewelry. "
        "Proper perspective, natural hang from earlobes, matching lighting."
    ),
    "bracelet": (
        "ULTRA-FIDELITY VIRTUAL TRY-ON:\n"
        "Place this exact bracelet on the person's wrist. Perfect preservation, natural fit."
    ),
    "ring": (
        "ULTRA-FIDELITY VIRTUAL TRY-ON:\n"
        "Place this exact ring on the person's finger. Perfect fit, realistic shadows."
    ),
}


# ─── Catalogue/UGC Prompts ───

def build_catalogue_prompt(
    product_description: str,
    model_type: str,
    pose: str,
    background: str,
    special_instructions: str | None = None,
) -> str:
    """Build prompt for catalogue/UGC generation (product on AI model)."""
    model_descriptions = {
        "indian_woman": "a stylish Indian woman in her late 20s",
        "indian_man": "a well-groomed Indian man in his early 30s",
        "indian_boy": "an Indian teenage boy, around 14-16 years old",
        "indian_girl": "an Indian teenage girl, around 14-16 years old",
    }

    pose_descriptions = {
        "best_match": "in a natural, confident pose that best showcases the product",
        "standing": "standing upright in a full-body shot, confident stance",
        "side_view": "in a side profile pose, showing how the product looks from the side",
        "back_view": "showing the back view, looking over shoulder slightly",
        "walking": "in a natural walking pose, mid-stride, dynamic movement",
    }

    bg_descriptions = {
        "best_match": "a professional studio or lifestyle setting that complements the product",
        "studio": "a clean professional photography studio with soft even lighting",
        "flora": "a lush green garden or floral setting with natural light",
        "wooden": "a warm wooden interior with natural textures",
        "indoor": "a well-decorated modern indoor setting",
        "livingroom": "a stylish modern living room",
    }

    model_desc = model_descriptions.get(model_type, model_descriptions["indian_woman"])
    pose_desc = pose_descriptions.get(pose, pose_descriptions["best_match"])
    bg_desc = bg_descriptions.get(background, bg_descriptions["best_match"])

    prompt = (
        f"Professional catalogue photography: {model_desc} wearing/holding/using the product from the input image.\n"
        f"Pose: {pose_desc}\n"
        f"Background: {bg_desc}\n\n"
        f"{PRODUCT_ISOLATION_PROMPT}\n\n"
        "Additional catalogue rules:\n"
        "- The model should look natural and authentic\n"
        "- Product must be clearly visible and well-lit\n"
        "- Commercial quality, suitable for e-commerce catalogue\n"
        "- Realistic proportions between model and product"
    )

    if special_instructions:
        prompt += f"\n\nSPECIAL INSTRUCTIONS: {special_instructions}"

    return prompt


# ─── Aspect Ratios ───

ASPECT_RATIOS = {
    "square": {"width": 1024, "height": 1024, "label": "Square (1:1)", "hint": "Centered, equal framing"},
    "portrait": {"width": 768, "height": 1024, "label": "Portrait (3:4)", "hint": "Vertical, full product view"},
    "story": {"width": 576, "height": 1024, "label": "Story (9:16)", "hint": "Tall vertical, social media story"},
    "landscape": {"width": 1024, "height": 768, "label": "Landscape (4:3)", "hint": "Wide horizontal, banner style"},
    "wide": {"width": 1024, "height": 576, "label": "Wide (16:9)", "hint": "Ultra-wide, cinematic"},
}

DEFAULT_RATIO = ASPECT_RATIOS["square"]


def get_ratio(ratio_id: str | None) -> dict:
    if not ratio_id or ratio_id not in ASPECT_RATIOS:
        return DEFAULT_RATIO
    return ASPECT_RATIOS[ratio_id]


# ─── Listing Generation (Stylika guidelines) ───

def build_listing_prompt(jewelry_type: str) -> str:
    """Build prompt for generating Shopify-ready product listing."""
    return (
        f"You are a professional jewelry copywriter for Stylika (Indian fashion jewelry brand).\n"
        f"Analyze this {jewelry_type} image and generate a complete Shopify product listing.\n\n"
        "Return a JSON object with these fields:\n"
        '{\n'
        '  "title": "50-65 chars, format: [Description] | Stylika",\n'
        '  "description": "HTML with <p> and <ul><li>, 100-160 words, 2 paragraphs + bullet specs",\n'
        '  "meta_description": "140-155 chars, SEO-optimized",\n'
        '  "alt_text": "under 125 chars, descriptive",\n'
        '  "attributes": { "material": "", "stone": "", "color": "", "collection": "", "occasion": "", "style": "", "product_type": "" }\n'
        '}\n\n'
        "CRITICAL MATERIAL LANGUAGE RULES:\n"
        "- Never write 'gold earrings' — write 'gold-tone earrings'\n"
        "- Never write 'silver ring' — write 'silver-tone ring'\n"
        "- Use 'CZ' not 'diamond', 'faux pearls' not 'pearls' for fake stones\n"
        "- Base metals: brass, alloy with plating description\n\n"
        "BRAND VOICE: Confident, modern, accessible. Not flowery or salesy.\n"
        "JSON only, no markdown fences."
    )
