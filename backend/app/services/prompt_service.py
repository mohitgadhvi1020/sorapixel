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
    "best_match": "in a natural, confident pose that best showcases the product. Frame as a 3/4-length portrait (head to mid-thigh). The head must sit in the upper 20% of the canvas with empty space above the crown",
    "standing": "standing upright in a confident stance facing the camera. Full-length shot from feet to well above the head. Zoom out enough so the full body fits with generous headroom — the head should be at roughly 15-20% from the top edge",
    "side_view": "in a side profile pose, head to knees visible. The head in profile must be fully within frame with clear sky/background above the hair",
    "back_view": "showing the back from head to knees, looking slightly over shoulder. The complete top of the head and all hair must be well within the frame, not touching the top edge",
    "sitting": "sitting elegantly on a chair or stool. Frame from well above the head to the knees. Head positioned in upper 20% of image with clear space above",
    "close_up": "a close-up portrait from chest/shoulders up. Face centered and fully visible (forehead to chin) with clear space above the head. Beauty shot — face sharp, well-lit, primary focus",
    "walking": "in a natural walking pose, full-body mid-stride. Zoom out to fit entire body with the head at roughly 15% from the top edge of the frame",
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
        "⚠️ MANDATORY FRAMING RULE — READ FIRST:\n"
        "This image MUST include the model's COMPLETE HEAD AND FACE. "
        "The top of the head, forehead, eyes, nose, mouth, and chin must ALL be visible. "
        "Compose the shot so the head is in the upper 25%% of the canvas with at least 8-10%% "
        "empty space above the crown. Think of how a professional e-commerce photographer frames "
        "a catalogue shot — the face is ALWAYS fully visible. If any part of the head is cut off, "
        "the image is UNUSABLE. Imagine the final image printed on a product page — the customer "
        "must see the model's full face to trust the product.\n\n"
        f"Subject: {model_desc} {interaction}.\n"
        f"Pose: {pose_desc}\n"
        f"Background: {bg_desc}\n"
        f"{outfit_line}\n"
        f"{PRODUCT_ISOLATION_PROMPT}\n\n"
        "COMPOSITION GUIDE:\n"
        "- Frame as a 3/4-length or full-length portrait (head to below knees minimum)\n"
        "- Camera at chest/waist height, angled slightly up toward the face\n"
        "- The model's face should be sharp, well-lit, and the anchor point of the composition\n"
        "- Leave generous headroom — the top of the frame should have empty background above the hair\n"
        "- NEVER frame so tight that the head touches or exits the top edge\n\n"
        "QUALITY RULES:\n"
        "- The model should look natural, authentic, and Indian\n"
        "- Product must be clearly visible, well-lit, and the focal point\n"
        "- Commercial quality, suitable for e-commerce catalogue\n"
        "- Realistic proportions between model and product\n"
        "- Output should look like a real professional photograph\n"
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


# ─── Jewelry-specific prompts ───

JEWELRY_BACKGROUND_PROMPTS = {
    "black-velvet": "on a solid, uniform deep black velvet surface, soft even studio lighting",
    "white-marble": "on a clean white marble surface with faint grey veining, bright even lighting",
    "pure-white": "on a pure white seamless background, clean even studio lighting, e-commerce style",
    "burgundy-velvet": "on a deep burgundy velvet surface, warm even studio lighting",
    "gold-gradient": "on a smooth warm golden gradient background, soft even lighting",
}

ANGLE_BY_TYPE = {
    "ring": "tilted 45 degrees toward camera showing both the top face and the side band profile",
    "necklace": "flat-lay overhead, the full necklace laid in a natural open arc showing its length and pendant",
    "earring": "side angle at 30 degrees showing the drop depth, hook, and three-dimensional form",
    "bracelet": "standing upright in its circular form, eye-level, showing the full shape and clasp",
    "bangle": "standing upright, slightly above eye-level, showing the round silhouette and width",
    "pendant": "tilted 45 degrees from the side showing depth, bail, and how it hangs",
    "brooch": "slight 30-degree tilt showing three-dimensional relief and raised elements",
    "anklet": "flat-lay overhead, laid in a gentle curve showing full length and charm detail",
    "chain": "flat-lay overhead, arranged in an S-curve showing link detail and full length",
    "set": "flat-lay overhead, each piece spaced apart in a balanced editorial layout",
}

CLOSEUP_BY_TYPE = {
    "ring": "Zoom into the center stone and setting — show facets, prongs, metal texture around the stone.",
    "necklace": "Zoom into the pendant or most ornate section — show stonework, bail, metal detail.",
    "earring": "Zoom into the main decorative element — stones, drop design, or filigree detail.",
    "bracelet": "Zoom into the most detailed section — clasp, stone settings, or link pattern.",
    "bangle": "Zoom into the surface — show engravings, stone settings, or textured patterns.",
    "pendant": "Zoom into the pendant face — show stone setting, bail, surface finish detail.",
    "brooch": "Zoom into the central motif — show stones, enamel, or filigree relief.",
    "anklet": "Zoom into the charm or most decorative element — show chain links and dangling pieces.",
    "chain": "Zoom into 4-6 individual links — show metal texture and connection craftsmanship.",
    "set": "Zoom into the most prominent piece's finest detail — typically the pendant or center stone.",
}

JEWELRY_CORE_RULE = (
    "The jewelry must be IDENTICAL to the input photo — same stones, same design, same metal color, "
    "same proportions. Do NOT add, remove, or change any detail. Remove all hands, stands, boxes, "
    "and props — show ONLY the jewelry."
)

OUTPUT_RULES = (
    "OUTPUT RULES: Generate a SQUARE image. The COMPLETE jewelry piece must be fully visible "
    "within the frame — nothing cropped or cut off at any edge. Center the jewelry with even "
    "padding on all sides. The background must be uniform and consistent edge-to-edge with no "
    "vignette or dark borders."
)


def build_jewelry_prompt(jewelry_type: str, background_id: str, shot_type: str, special_instructions: str | None = None) -> str:
    bg_prompt = JEWELRY_BACKGROUND_PROMPTS.get(background_id, JEWELRY_BACKGROUND_PROMPTS["black-velvet"])
    extras = f"\nAdditional request: {special_instructions}" if special_instructions else ""

    if shot_type == "hero":
        return (
            f"Professional product photo of this {jewelry_type}. "
            f"Keep the EXACT same camera angle and perspective as the input photo. "
            f"Replace the background: {bg_prompt}. "
            f"The ENTIRE {jewelry_type} must be fully visible — nothing cut off. "
            f"Center it with even padding on all sides. "
            f"{JEWELRY_CORE_RULE} "
            f"{OUTPUT_RULES}"
            f"{extras}"
        )

    if shot_type == "closeup":
        closeup_desc = CLOSEUP_BY_TYPE.get(jewelry_type, CLOSEUP_BY_TYPE["ring"])
        return (
            f"Close-up detail photo of this {jewelry_type}. "
            f"{closeup_desc} "
            f"Background: {bg_prompt}. "
            f"Shallow depth of field — jewelry sharp, background softly blurred. "
            f"The close-up should show roughly 30-40% of the piece, focused on the finest detail. "
            f"{JEWELRY_CORE_RULE} "
            f"{OUTPUT_RULES}"
            f"{extras}"
        )

    angle_desc = ANGLE_BY_TYPE.get(jewelry_type, ANGLE_BY_TYPE["ring"])
    return (
        f"Alternate angle product photo of this {jewelry_type}: {angle_desc}. "
        f"Background: {bg_prompt}. "
        f"The ENTIRE {jewelry_type} must be fully visible — nothing cut off at any edge. "
        f"Center the piece with even padding. "
        f"{JEWELRY_CORE_RULE} "
        f"{OUTPUT_RULES}"
        f"{extras}"
    )


def build_recolor_prompt(jewelry_type: str, target_metal: str) -> str:
    return (
        f"Change the metal color of this {jewelry_type} to {target_metal}. "
        f"Keep every detail exactly the same — same stones, design, shape, proportions. "
        f"ONLY change the metal color/finish. Background, lighting, and angle stay identical. "
        f"{JEWELRY_CORE_RULE}"
    )


def build_listing_prompt(jewelry_type: str) -> str:
    return (
        f"You are an expert jewelry copywriter. Analyze this {jewelry_type} image and generate a "
        f"Shopify-ready product listing as JSON with these fields:\n"
        f'{{"title": "...", "description": "...(HTML-formatted, 150-200 words)...", '
        f'"metaDescription": "...(under 160 chars)...", "altText": "...(under 125 chars)...", '
        f'"attributes": {{"jewelryMaterial": "...", "gemstoneType": "...", "collection": "...", '
        f'"occasion": "...", "material": "...", "stone": "...", "closure": "..."}}}}\n'
        f"Be specific and detailed based on what you see in the image. Use enticing language."
    )


LISTING_JSON_SCHEMA = """{
  "title": "Product title",
  "description": "<p>Paragraph 1...</p><p>Paragraph 2...</p><ul><li>Material: ...</li><li>Stones: ...</li><li>Closure: ...</li></ul>",
  "metaDescription": "Meta description for SEO",
  "altText": "Descriptive alt text",
  "attributes": {
    "jewelryMaterial": "...",
    "gemstoneType": "...",
    "collection": "...",
    "occasion": "...",
    "material": "...",
    "stone": "...",
    "closure": "..."
  }
}"""


def build_brand_listing_prompt(brand_config: dict, jewelry_type: str) -> str:
    """Dynamically assemble a brand-specific listing prompt from structured config."""
    name = brand_config.get("brandName", "the brand")
    website = brand_config.get("website", "")
    tagline = brand_config.get("tagline", "")
    product_type = brand_config.get("productType", "jewelry")
    audience = brand_config.get("targetAudience", "")

    voice = brand_config.get("voice", {})
    tone = voice.get("tone", "Professional and clear")
    do_rules = voice.get("doRules", [])
    dont_rules = voice.get("dontRules", [])

    mat = brand_config.get("materialRules", {})
    mat_note = mat.get("note", "")
    never_say = mat.get("neverSay", {})
    banned = mat.get("bannedWords", [])
    replacements = mat.get("replacements", {})
    acceptable = mat.get("acceptableExamples", [])

    tax = brand_config.get("taxonomy", {})
    categories = tax.get("categories", {})
    collections = tax.get("collections", [])
    occasions = tax.get("occasions", [])

    fmt = brand_config.get("outputFormat", {})
    title_format = fmt.get("titleFormat", "[Descriptive Name] | {brandName}")
    title_range = fmt.get("titleCharRange", [50, 65])
    title_exclude = fmt.get("titleExclude", [])
    desc_range = fmt.get("descriptionWordRange", [100, 160])
    desc_structure = fmt.get("descriptionStructure", "")
    meta_range = fmt.get("metaDescCharRange", [140, 155])
    alt_max = fmt.get("altTextMaxChars", 125)
    attr_fields = fmt.get("attributeFields", {})

    sections = []

    sections.append(
        f"You are a product copywriter for {name}"
        + (f" ({website})" if website else "")
        + (f" — {tagline}" if tagline else "")
        + "."
    )

    if product_type:
        sections.append(f"\nWHAT {name.upper()} SELLS: {product_type}")

    if audience:
        sections.append(f"\nTARGET AUDIENCE: {audience}")

    voice_block = f"\nBRAND VOICE:\nTone: {tone}"
    if do_rules:
        voice_block += "\n\nDO:\n" + "\n".join(f"- {r}" for r in do_rules)
    if dont_rules:
        voice_block += "\n\nDON'T:\n" + "\n".join(f"- {r}" for r in dont_rules)
    sections.append(voice_block)

    if mat_note or never_say or banned:
        mat_block = "\nMATERIAL LANGUAGE RULES:"
        if mat_note:
            mat_block += f"\n{mat_note}"
        if never_say:
            mat_block += "\n\nNEVER write → ALWAYS write:"
            for bad, good in never_say.items():
                mat_block += f'\n- "{bad}" → "{good}"'
        if banned:
            mat_block += f"\n\nBANNED WORDS (never use anywhere): {', '.join(banned)}"
        if replacements:
            for bad, good in replacements.items():
                mat_block += f'\nUse "{good}" instead of "{bad}"'
        if acceptable:
            mat_block += "\n\nAcceptable examples:\n" + "\n".join(f"- {ex}" for ex in acceptable)
        sections.append(mat_block)

    if categories or collections or occasions:
        tax_block = "\nPRODUCT TAXONOMY:"
        if categories:
            tax_block += "\nCategories:"
            for cat, subs in categories.items():
                tax_block += f"\n- {cat}: {', '.join(subs)}"
        if collections:
            tax_block += f"\nCollections: {', '.join(collections)}"
        if occasions:
            tax_block += f"\nOccasions: {', '.join(occasions)}"
        sections.append(tax_block)

    title_fmt_resolved = title_format.replace("{brandName}", name)
    out_block = f"\nOUTPUT SPECIFICATION:"
    out_block += f"\n\n1. TITLE ({title_range[0]}-{title_range[1]} characters):"
    out_block += f"\n   Format: {title_fmt_resolved}"
    if title_exclude:
        out_block += f"\n   NEVER include in title: {', '.join(title_exclude)}"

    out_block += f"\n\n2. DESCRIPTION (HTML-ready, {desc_range[0]}-{desc_range[1]} words):"
    if desc_structure:
        out_block += f"\n   {desc_structure}"

    out_block += f"\n\n3. META DESCRIPTION ({meta_range[0]}-{meta_range[1]} characters):"
    out_block += "\n   Action-oriented, includes product type + key differentiator + brand name."

    out_block += f"\n\n4. ALT TEXT (under {alt_max} characters):"
    out_block += "\n   Descriptive, not salesy. No brand name."

    out_block += "\n\n5. ATTRIBUTES (structured):"
    if attr_fields:
        for field, desc in attr_fields.items():
            out_block += f"\n   - {field}: {desc}"
    sections.append(out_block)

    prompt = "\n".join(sections)
    prompt += f"\n\nTASK: Analyze this {jewelry_type} product image and generate a COMPLETE listing following ALL guidelines above."
    prompt += f"\n\nOUTPUT FORMAT (strict JSON, nothing else):\n{LISTING_JSON_SCHEMA}"

    return prompt


def get_brand_config(client_id: str) -> dict | None:
    """Fetch the brand config JSONB for a client. Returns None if no brand assigned."""
    from app.database import get_supabase
    sb = get_supabase()
    result = sb.table("clients").select("brand_id").eq("id", client_id).single().execute()
    if not result.data or not result.data.get("brand_id"):
        return None
    brand_id = result.data["brand_id"]
    brand = sb.table("brand_profiles").select("config").eq("id", brand_id).single().execute()
    if not brand.data:
        return None
    return brand.data.get("config", {})


JEWELRY_TRYON_PROMPTS = {
    "ring": "Place the EXACT ring from image 1 onto the ring finger of the person in image 2. The ring must match perfectly. Show the hand naturally with the ring as the focal point.",
    "necklace": "Place the EXACT necklace from image 1 onto the person in image 2. The necklace should drape naturally around the neck following the collarbone curve. The pendant (if any) should hang centered.",
    "earring": "Place the EXACT earring from image 1 onto BOTH ears of the person in image 2. Mirror the earring for the other ear. Tuck hair if needed to reveal earlobes.",
    "bracelet": "Place the EXACT bracelet from image 1 onto the wrist of the person in image 2. The bracelet should sit naturally on the wrist.",
    "bangle": "Place the EXACT bangle from image 1 onto the wrist of the person in image 2. The bangle should be slightly loose as bangles naturally are.",
    "pendant": "Place the EXACT pendant from image 1 hanging from the person's neck in image 2. The chain should follow the natural curve of the neck.",
    "brooch": "Place the EXACT brooch from image 1 pinned to the clothing of the person in image 2. Place on the left lapel or upper left chest.",
    "anklet": "Place the EXACT anklet from image 1 onto the ankle of the person in image 2.",
    "chain": "Place the EXACT chain from image 1 around the neck of the person in image 2, draping naturally over the collarbones.",
    "set": "Place ALL pieces from the jewelry set in image 1 onto the person in image 2 — necklace on neck, earrings on ears, bracelet on wrist, ring on finger as applicable.",
}
