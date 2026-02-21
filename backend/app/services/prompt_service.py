from __future__ import annotations

"""Prompt engineering service — category-aware prompts for Studio + Catalogue + Branding.
Matches Flyr's feature set: backgrounds and model interaction change per user category.
"""

PRODUCT_ISOLATION_PROMPT = (
    "CRITICAL RULES:\n"
    "1. The product must be the EXACT same product from the input image — same shape, design, color, details\n"
    "2. Do NOT redesign, modify, or reimagine the product\n"
    "3. The product must be pixel-perfect preserved\n"
    "4. Only change the BACKGROUND and LIGHTING, never the product itself"
)

# ─── Studio Backgrounds (Photo Shoot) ───
# Each background has an id, label, color_hex (for solid), and prompt description.
# Scene backgrounds are universal; solid colors are universal.
# Some categories get extra category-specific backgrounds.

SCENE_BACKGROUNDS = [
    {"id": "indoor", "label": "Indoor", "thumb": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=200&h=200&fit=crop&q=80", "prompt": "a well-decorated modern indoor room, warm ambient lighting"},
    {"id": "livingroom", "label": "Livingroom", "thumb": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop&q=80", "prompt": "a stylish modern living room with soft natural light"},
    {"id": "brickwall", "label": "Brickwall", "thumb": "https://images.unsplash.com/photo-1517329782449-810562a4ec2f?w=200&h=200&fit=crop&q=80", "prompt": "exposed brick wall background, warm industrial aesthetic, soft spotlight"},
    {"id": "studio", "label": "Studio", "thumb": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&h=200&fit=crop&q=80", "prompt": "a clean professional photography studio with soft even lighting, seamless backdrop"},
    {"id": "wooden", "label": "Wooden", "thumb": "https://images.unsplash.com/photo-1541123603104-512919d6a96c?w=200&h=200&fit=crop&q=80", "prompt": "a warm wooden surface/interior, rustic yet elegant, natural textures"},
    {"id": "flora", "label": "Flora", "thumb": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200&fit=crop&q=80", "prompt": "a lush green garden or floral setting with natural sunlight filtering through"},
    {"id": "marble", "label": "Marble", "thumb": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=200&h=200&fit=crop&q=80", "prompt": "a polished white marble surface, clean and luxurious, soft diffused lighting"},
]

COLOR_BACKGROUNDS = [
    {"id": "grey", "label": "Grey", "color": "#808080", "prompt": "solid neutral grey background, even studio lighting"},
    {"id": "green", "label": "Green", "color": "#1B5E20", "prompt": "solid rich green background, even studio lighting"},
    {"id": "pink", "label": "Pink", "color": "#F8BBD0", "prompt": "solid soft pink background, even studio lighting"},
    {"id": "purple", "label": "Purple", "color": "#7B1FA2", "prompt": "solid deep purple background, even studio lighting"},
    {"id": "yellow", "label": "Yellow", "color": "#FDD835", "prompt": "solid warm golden yellow background, even studio lighting"},
    {"id": "white", "label": "White", "color": "#FFFFFF", "prompt": "pure white seamless background, soft even lighting, e-commerce ready"},
    {"id": "black", "label": "Black", "color": "#1A1A1A", "prompt": "solid deep black background, dramatic spotlight, premium feel"},
]

CATEGORY_EXTRA_BACKGROUNDS = {
    "jewellery": [
        {"id": "velvet_black", "label": "Black Velvet", "thumb": "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=200&h=200&fit=crop&q=80", "prompt": "rich black velvet background with subtle texture, dramatic studio lighting"},
        {"id": "velvet_burgundy", "label": "Burgundy Velvet", "thumb": "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=200&h=200&fit=crop&q=80", "prompt": "deep burgundy velvet background, warm golden lighting, royal aesthetic"},
        {"id": "satin_gold", "label": "Gold Satin", "thumb": "https://images.unsplash.com/photo-1574169208507-84376144848b?w=200&h=200&fit=crop&q=80", "prompt": "luxurious gold satin fabric background, warm metallic sheen"},
    ],
    "food-beverages": [
        {"id": "restaurant", "label": "Restaurant", "thumb": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop&q=80", "prompt": "elegant restaurant table setting, warm ambient lighting, fine dining ambiance"},
        {"id": "rustic_table", "label": "Rustic Table", "thumb": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=200&fit=crop&q=80", "prompt": "rustic wooden table with napkin and utensils, warm homestyle feel"},
    ],
    "electronics": [
        {"id": "tech_desk", "label": "Tech Desk", "thumb": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop&q=80", "prompt": "modern minimalist desk setup, sleek tech aesthetic, cool blue accent lighting"},
    ],
    "beauty-wellness": [
        {"id": "spa", "label": "Spa", "thumb": "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=200&h=200&fit=crop&q=80", "prompt": "spa-like setting with soft towels and greenery, calm pastel tones, serene lighting"},
    ],
}


def get_studio_backgrounds(category_slug: str | None = None) -> list[dict]:
    """Return available backgrounds for the Studio (Photo Shoot) mode."""
    bgs = []
    for s in SCENE_BACKGROUNDS:
        bgs.append({"id": s["id"], "label": s["label"], "type": "scene", "thumb": s.get("thumb")})
    if category_slug and category_slug in CATEGORY_EXTRA_BACKGROUNDS:
        for s in CATEGORY_EXTRA_BACKGROUNDS[category_slug]:
            bgs.append({"id": s["id"], "label": s["label"], "type": "scene", "thumb": s.get("thumb")})
    for c in COLOR_BACKGROUNDS:
        bgs.append({"id": c["id"], "label": c["label"], "type": "color", "color": c["color"]})
    return bgs


def _get_bg_prompt(bg_id: str, category_slug: str | None = None) -> str:
    """Resolve a background id to its prompt description."""
    for s in SCENE_BACKGROUNDS:
        if s["id"] == bg_id:
            return s["prompt"]
    for c in COLOR_BACKGROUNDS:
        if c["id"] == bg_id:
            return c["prompt"]
    if category_slug and category_slug in CATEGORY_EXTRA_BACKGROUNDS:
        for s in CATEGORY_EXTRA_BACKGROUNDS[category_slug]:
            if s["id"] == bg_id:
                return s["prompt"]
    return "a professional studio background, clean and well-lit"


# ─── Category-specific product presentation ───

CATEGORY_STUDIO_CONTEXT = {
    "jewellery": "Professional jewelry product photography. Place the jewelry piece elegantly on the surface. Enhance sparkle and reflections. No hands or props unless specified.",
    "fashion-clothing": "Professional fashion product photography. Display the garment neatly — either flat-lay on the surface or draped naturally to show its design and fabric.",
    "accessories": "Professional accessories product photography. Place the product elegantly on the surface, showing its details, craftsmanship, and design.",
    "kids": "Professional kids product photography. Display the product in a bright, playful, cheerful setting with soft colors.",
    "home-living": "Professional home & living product photography. Show the product in a beautifully styled room or surface, lifestyle context.",
    "art-craft": "Professional art & craft product photography. Display on a creative workspace surface with artistic lighting.",
    "beauty-wellness": "Professional beauty product photography. Clean, spa-like presentation with soft diffused lighting. Premium aesthetic.",
    "electronics": "Professional tech product photography. Sleek, modern presentation with clean lines and cool-toned lighting.",
    "food-beverages": "Professional food photography. Beautiful plating, appetizing presentation with warm inviting lighting and styled table.",
}

CATEGORY_CATALOGUE_INTERACTION = {
    "jewellery": "wearing the jewelry from the input image — if necklace: on the neck with natural drape; if earrings: on the ears; if ring: on the finger; if bracelet: on the wrist; if bangle set: on the forearm",
    "fashion-clothing": "wearing the outfit/garment from the input image, showing the full outfit naturally with proper fit and drape",
    "accessories": "using/carrying the accessory from the input image — if bag: holding it naturally; if watch: wearing on wrist; if sunglasses: wearing them; if belt: wearing it; if scarf/shawl: draped around shoulders",
    "kids": "wearing/playing with the product from the input image in a playful, natural way",
    "home-living": "interacting with or positioned next to the product from the input image in a styled home setting",
    "art-craft": "using or displaying the product from the input image in a creative setting",
    "beauty-wellness": "using/applying the beauty product from the input image in a natural, lifestyle way",
    "electronics": "using the electronic product/gadget from the input image naturally in a modern setting",
    "food-beverages": "seated at a dining table with the food/beverage from the input image presented beautifully",
}


def build_studio_prompt(background_id: str, category_slug: str | None = None, special_instructions: str | None = None) -> str:
    """Build prompt for Studio (Photo Shoot) generation — category-aware."""
    context = CATEGORY_STUDIO_CONTEXT.get(category_slug or "", CATEGORY_STUDIO_CONTEXT.get("accessories", "Professional product photography."))
    bg_prompt = _get_bg_prompt(background_id, category_slug)

    prompt = (
        f"{context}\n"
        f"Background: {bg_prompt}\n"
        f"Commercial quality, high resolution, perfectly lit.\n\n"
        f"{PRODUCT_ISOLATION_PROMPT}"
    )

    if special_instructions:
        prompt += f"\n\nSPECIAL INSTRUCTIONS: {special_instructions}"

    return prompt


# ─── Catalogue / UGC ───

MODEL_DESCRIPTIONS = {
    "indian_woman": "a stylish Indian woman in her late 20s with natural beauty",
    "indian_man": "a well-groomed Indian man in his early 30s",
    "indian_boy": "an Indian boy, around 14-16 years old",
    "indian_girl": "an Indian girl, around 14-16 years old",
}

POSE_DESCRIPTIONS = {
    "best_match": "in a natural, confident pose that best showcases the product, framed from head to mid-thigh with space above the head",
    "standing": "standing upright in a full-body shot from head to toe, confident stance facing camera — ensure the full head including hair is visible with clear space above it",
    "side_view": "in a side profile pose from head to knees, showing how the product looks from the side — the model's full head and hair must be within the frame",
    "back_view": "showing the back view from head to knees, looking over shoulder slightly — ensure the top of the head is not cropped",
    "sitting": "sitting elegantly on a chair or stool, framed from above the head to the knees, product clearly visible, poised posture",
    "close_up": "a close-up portrait shot from chest/shoulders up to above the head, product prominently featured, detailed view — leave clear space above the model's head",
    "walking": "in a natural walking pose, full-body mid-stride shot from head to feet, dynamic movement — ensure the entire head is within the frame",
}

CATALOGUE_BACKGROUNDS = [
    {"id": "best_match", "label": "Best Match", "thumb": "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=200&h=200&fit=crop&q=80", "prompt": "a professional studio or lifestyle setting that complements the product"},
    {"id": "studio", "label": "Studio", "thumb": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&h=200&fit=crop&q=80", "prompt": "a clean professional photography studio with soft even lighting"},
    {"id": "flora", "label": "Flora", "thumb": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200&fit=crop&q=80", "prompt": "a lush green garden or floral setting with natural light"},
    {"id": "wooden", "label": "Wooden", "thumb": "https://images.unsplash.com/photo-1541123603104-512919d6a96c?w=200&h=200&fit=crop&q=80", "prompt": "a warm wooden interior with natural textures"},
    {"id": "indoor", "label": "Indoor", "thumb": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=200&h=200&fit=crop&q=80", "prompt": "a well-decorated modern indoor setting with warm lighting"},
    {"id": "livingroom", "label": "Living Room", "thumb": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop&q=80", "prompt": "a stylish modern living room"},
]

CATALOGUE_BG_DESCRIPTIONS = {b["id"]: b["prompt"] for b in CATALOGUE_BACKGROUNDS}

CATALOGUE_POSES = [
    {"id": "standing", "label": "Standing", "thumb": "/thumbnails/pose_standing.png"},
    {"id": "side_view", "label": "Side View", "thumb": "/thumbnails/pose_side_view.png"},
    {"id": "back_view", "label": "Back View", "thumb": "/thumbnails/pose_back_view.png"},
    {"id": "sitting", "label": "Sitting", "thumb": "/thumbnails/pose_sitting.png"},
    {"id": "close_up", "label": "Close Up", "thumb": "/thumbnails/pose_close_up.png"},
    {"id": "walking", "label": "Walking", "thumb": "/thumbnails/pose_walking.png"},
]

AI_MODEL_FACES = [
    {"id": "indian_man", "name": "Indian Man", "thumb": "/thumbnails/model_indian_man.png"},
    {"id": "indian_woman", "name": "Indian Woman", "thumb": "/thumbnails/model_indian_woman.png"},
    {"id": "indian_boy", "name": "Indian Boy", "thumb": "/thumbnails/model_indian_boy.png"},
    {"id": "indian_girl", "name": "Indian Girl", "thumb": "/thumbnails/model_indian_girl.png"},
]


def build_catalogue_prompt(
    model_type: str,
    pose: str,
    background: str,
    category_slug: str | None = None,
    special_instructions: str | None = None,
    key_highlights: str | None = None,
    outfit_description: str | None = None,
) -> str:
    """Build prompt for Catalogue/UGC generation — category-aware model interaction."""
    model_desc = MODEL_DESCRIPTIONS.get(model_type, MODEL_DESCRIPTIONS["indian_woman"])
    pose_desc = POSE_DESCRIPTIONS.get(pose, POSE_DESCRIPTIONS["best_match"])
    bg_desc = CATALOGUE_BG_DESCRIPTIONS.get(background, CATALOGUE_BG_DESCRIPTIONS["best_match"])

    interaction = CATEGORY_CATALOGUE_INTERACTION.get(
        category_slug or "",
        "wearing/holding/using the product from the input image"
    )

    outfit_line = ""
    if outfit_description:
        outfit_line = f"Outfit: The model MUST wear exactly this outfit: {outfit_description}\n"

    prompt = (
        f"Professional catalogue photography: {model_desc} {interaction}.\n"
        f"Pose: {pose_desc}\n"
        f"Background: {bg_desc}\n"
        f"{outfit_line}\n"
        f"{PRODUCT_ISOLATION_PROMPT}\n\n"
        "Additional rules:\n"
        "- FRAMING: ALWAYS include the model's FULL HEAD including all hair in the frame. "
        "Leave visible breathing room (at least 5-10%% of image height) above the top of the head. "
        "NEVER crop or cut off the top of the model's head, forehead, or hair.\n"
        "- The model should look natural, authentic, and Indian\n"
        "- Product must be clearly visible, well-lit, and the focal point\n"
        "- Commercial quality, suitable for e-commerce catalogue\n"
        "- Realistic proportions between model and product\n"
        "- Output should look like a real professional photograph, properly framed like a studio shoot\n"
        "- CRITICAL: The model's clothing color, style, and fabric must be EXACTLY "
        "the same across all images in this set. Do NOT change the outfit between poses."
    )

    if key_highlights:
        prompt += f"\n\nPRODUCT HIGHLIGHTS to emphasize visually: {key_highlights}"

    if special_instructions:
        prompt += f"\n\nSPECIAL INSTRUCTIONS: {special_instructions}"

    return prompt


def build_branding_prompt(
    model_type: str,
    pose: str,
    background: str,
    category_slug: str | None = None,
    special_instructions: str | None = None,
    outfit_description: str | None = None,
) -> str:
    """Same as catalogue but instructs to leave space at bottom for branding overlay."""
    base = build_catalogue_prompt(model_type, pose, background, category_slug, special_instructions, outfit_description=outfit_description)
    return base + (
        "\n\nIMPORTANT: Leave clean space at the very bottom of the image (about 15% height) "
        "for a branding bar to be overlaid later. The model's feet or product should NOT be "
        "cut off at the bottom — frame the shot so there's breathing room at the bottom edge."
    )


# ─── Aspect Ratios ───

ASPECT_RATIOS = {
    "square": {"width": 1024, "height": 1024, "label": "Square (1:1)"},
    "portrait": {"width": 768, "height": 1024, "label": "Portrait (3:4)"},
    "story": {"width": 576, "height": 1024, "label": "Story (9:16)"},
    "landscape": {"width": 1024, "height": 768, "label": "Landscape (4:3)"},
}

DEFAULT_RATIO = ASPECT_RATIOS["square"]


def get_ratio(ratio_id: str | None) -> dict:
    if not ratio_id or ratio_id not in ASPECT_RATIOS:
        return DEFAULT_RATIO
    return ASPECT_RATIOS[ratio_id]
