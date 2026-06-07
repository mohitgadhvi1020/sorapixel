from __future__ import annotations

"""Prompt engineering service — category-aware prompts for Studio + Catalogue + Branding.
Matches Flyr's feature set: backgrounds and model interaction change per user category.
"""

from app.services.detection_service import build_product_description

PRODUCT_ISOLATION_PROMPT = (
    "CRITICAL PRODUCT PRESERVATION RULES — these override any other instruction:\n"
    "1. The product must be the EXACT same product from the input image. Preserve every visual attribute pixel-perfectly:\n"
    "   - Exact COLOR and color shade (do not shift hue, saturation, or brightness of the product itself — e.g. dark emerald green must stay dark emerald green, not turn lighter/olive/teal)\n"
    "   - Exact DESIGN pattern, motifs, engravings, stones, beads, embellishments, prints, textures, and material finish\n"
    "   - Exact SHAPE, proportions, thickness, and silhouette\n"
    "2. If the product is a MULTI-PIECE or STACKED/LAYERED set (e.g. a stack of bangles, a set of rings, a pair of earrings, a multi-strand necklace, bundled items), preserve the EXACT COUNT of individual pieces/layers/strands visible in the input image. Do not merge them into one thicker piece, do not add extra pieces, do not remove pieces. Count them carefully from the input and reproduce the same count.\n"
    "3. Preserve the exact arrangement and stacking order of layered items, including any decorative elements attached to them (e.g. golden ghungroo/bells, charms, tassels) — same count, same placement, same size.\n"
    "4. Do NOT redesign, restyle, reimagine, 'improve', or 'clean up' the product. Do not substitute it with a similar-looking product.\n"
    "5. Only the BACKGROUND, SURFACE, and LIGHTING may change. The product itself must remain identical to the input.\n"
    "6. If you are unsure about a product detail, copy it directly from the input image rather than inventing.\n\n"
    "EXPLICIT FORBIDDEN TRANSFORMATIONS (do NOT do any of these):\n"
    "  - DO NOT merge a stack of thin bangles into a single thicker bangle or into fewer thicker bangles.\n"
    "  - DO NOT replace a beaded, faceted, or textured surface with smooth polished metal.\n"
    "  - DO NOT reduce, add, resize, or relocate bells, ghungroo, charms, tassels, or other attached ornaments.\n"
    "  - DO NOT shift the hue of colored gemstones or colored glass (green stays the same green; red stays the same red).\n"
    "  - DO NOT convert a multi-strand necklace into a single strand, or a pair of earrings into one earring.\n"
    "  - DO NOT smooth over intentional texture like gold thread wrapping, cording, or engravings."
)


GENERAL_PRODUCT_PRESERVATION_PROMPT = (
    "Keep the product identical to the input image: same design, shape, proportions, colors, materials, labels, visible details, and camera/viewing angle. "
    "Do not redesign, replace, simplify, add, remove, recolor, or alter any part of the product."
)


def _detected_product_conflicts_with_category(category_slug: str | None, ps: dict | None) -> bool:
    """Avoid injecting category styling when the vision pass clearly found a different product."""
    if not category_slug or not ps:
        return False

    detected = " ".join([
        ps.get("product_type", ""),
        ps.get("piece_count", ""),
        ps.get("critical_details", ""),
    ]).lower()
    industrial_terms = (
        "industrial", "machine", "machinery", "oven", "dryer", "incubator",
        "cabinet", "chamber", "control panel", "chart recorder", "gauge",
        "equipment", "appliance",
    )
    if any(term in detected for term in industrial_terms):
        return category_slug in {
            "fashion-clothing", "kids", "jewellery", "beauty-wellness",
            "food-beverages", "art-craft",
        }
    return False


def _format_product_structure(ps: dict | None) -> str:
    """Render the vision pre-pass output as a ground-truth anchor block for the image-gen prompt."""
    if not ps:
        return ""
    lines = [
        "Input product details detected from the image — use these as ground truth:",
        f"  - Type: {ps.get('product_type', '')}",
        f"  - Piece / layer count: {ps.get('piece_count', '')}",
        f"  - Color: {ps.get('primary_color', '')}",
        f"  - Material / finish: {ps.get('material_finish', '')}",
        f"  - Ornaments: {ps.get('ornaments', '')}",
        f"  - Critical: {ps.get('critical_details', '')}",
    ]
    return "\n".join(lines) + "\n\n"


# ─── Studio Backgrounds (Photo Shoot) ───
# Each background has an id, label, color_hex (for solid), and prompt description.
# Scene backgrounds are universal; solid colors are universal.
# Some categories get extra category-specific backgrounds.

SCENE_BACKGROUNDS = [
    {"id": "studio", "label": "Studio", "thumb": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&h=200&fit=crop&q=80", "prompt": "a clean professional photography studio with soft even lighting, seamless backdrop"},
    {"id": "marble", "label": "Marble", "thumb": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=200&h=200&fit=crop&q=80", "prompt": "a polished white marble surface, clean and luxurious, soft diffused lighting"},
    {"id": "wooden", "label": "Wooden", "thumb": "https://images.unsplash.com/photo-1541123603104-512919d6a96c?w=200&h=200&fit=crop&q=80", "prompt": "a warm wooden surface/interior, rustic yet elegant, natural textures"},
    {"id": "indoor", "label": "Indoor", "thumb": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=200&h=200&fit=crop&q=80", "prompt": "a well-decorated modern indoor room, warm ambient lighting"},
    {"id": "livingroom", "label": "Livingroom", "thumb": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop&q=80", "prompt": "a stylish modern living room with soft natural light"},
    {"id": "flora", "label": "Flora", "thumb": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200&fit=crop&q=80", "prompt": "a lush green garden or floral setting with natural sunlight filtering through"},
    {"id": "brickwall", "label": "Brickwall", "thumb": "https://images.unsplash.com/photo-1517329782449-810562a4ec2f?w=200&h=200&fit=crop&q=80", "prompt": "exposed brick wall background, warm industrial aesthetic, soft spotlight"},
]

COLOR_BACKGROUNDS = [
    {"id": "white", "label": "White", "color": "#FFFFFF", "prompt": "pure white seamless background, soft even lighting, e-commerce ready"},
    {"id": "cream", "label": "Cream", "color": "#F5F0E8", "prompt": "warm cream off-white background, soft natural lighting, elegant minimalist feel"},
    {"id": "beige", "label": "Beige", "color": "#E8DCC8", "prompt": "warm beige background, gentle diffused lighting, organic neutral tone"},
    {"id": "light_grey", "label": "Light Grey", "color": "#E0E0E0", "prompt": "soft light grey background, clean even studio lighting, modern minimal"},
    {"id": "grey", "label": "Grey", "color": "#808080", "prompt": "solid neutral grey background, even studio lighting"},
    {"id": "black", "label": "Black", "color": "#1A1A1A", "prompt": "solid deep black background, dramatic spotlight, premium feel"},
    {"id": "pink", "label": "Pink", "color": "#F8BBD0", "prompt": "solid soft pink background, even studio lighting"},
    {"id": "green", "label": "Green", "color": "#1B5E20", "prompt": "solid rich green background, even studio lighting"},
    {"id": "purple", "label": "Purple", "color": "#7B1FA2", "prompt": "solid deep purple background, even studio lighting"},
    {"id": "yellow", "label": "Yellow", "color": "#FDD835", "prompt": "solid warm golden yellow background, even studio lighting"},
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
    "jewellery": "Professional jewelry product photography. Place the jewelry piece elegantly on the surface. Enhance sparkle and reflections only — do NOT alter the jewelry's color, gemstone color, metal tone, or design. If the input shows a stacked or multi-layer set (e.g. a bangle stack with 6/8/12 bangles, layered necklaces, ring stacks), reproduce the exact same number of layers/pieces and the exact same ornamentation (bells, ghungroo, charms, beads) as in the input. No hands or props unless specified.",
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


def build_studio_prompt(
    background_id: str,
    category_slug: str | None = None,
    special_instructions: str | None = None,
    product_structure: dict | None = None,
) -> str:
    """Build prompt for Studio (Photo Shoot) generation.

    Concise, product-forward brief for general product categories. The selected
    background, studio polish, full visibility, and product preservation are all
    first-order requirements. Jewelry/accessories still get the stricter
    multi-piece preservation block because those categories fail differently.
    """
    bg_prompt = _get_bg_prompt(background_id, category_slug)
    category_context = "" if _detected_product_conflicts_with_category(category_slug, product_structure) else CATEGORY_STUDIO_CONTEXT.get(category_slug or "")
    structure_block = _format_product_structure(product_structure).strip()

    parts: list[str] = []

    if structure_block:
        parts.extend([structure_block, ""])

    parts.extend([
        GENERAL_PRODUCT_PRESERVATION_PROMPT,
        "",
        f"Create a professional studio-quality product photo using this selected background: {bg_prompt}.",
        "Only improve the presentation: selected background, studio lighting, exposure, shadows, and overall polish. On glass, screens, mirrors, and polished surfaces, remove reflections of the original environment, photographer, phone, ceiling, walls, and harsh light streaks. Replace them with subtle clean studio reflections only. Keep glass and glossy materials realistic, and keep the product details behind transparent surfaces visible. Add a soft, natural contact shadow beneath the product so it feels physically placed in the studio scene.",
        "The full product must be clearly visible, sharp, well-lit, and centered, with clean space around it. Do not crop the product.",
    ])

    if category_slug in ("jewellery", "accessories"):
        parts.extend(["", PRODUCT_ISOLATION_PROMPT])

    if category_context:
        parts.extend(["", f"Category guidance: {category_context}"])

    if special_instructions:
        parts.extend(["", f"Additional instructions, only if they keep the product identical: {special_instructions}"])

    return "\n".join(parts)


# ─── Catalogue / UGC ───

MODEL_DESCRIPTIONS = {
    "indian_woman": "a stylish Indian woman in her late 20s with natural beauty",
    "indian_man": "a well-groomed Indian man in his early 30s",
    "indian_boy": "an Indian boy, around 14-16 years old",
    "indian_girl": "an Indian girl, around 14-16 years old",
    # Global model diversity — sellers shipping "Jaipur to New York" need models
    # that match their audience.
    "western_woman": "a stylish Caucasian woman in her late 20s with natural beauty",
    "western_man": "a well-groomed Caucasian man in his early 30s",
    "east_asian_woman": "a stylish East Asian woman in her late 20s with natural beauty",
    "east_asian_man": "a well-groomed East Asian man in his early 30s",
    "african_woman": "a stylish Black woman in her late 20s with natural beauty",
    "african_man": "a well-groomed Black man in his early 30s",
    "latina_woman": "a stylish Latina woman in her late 20s with natural beauty",
    "middle_eastern_woman": "a stylish Middle Eastern woman in her late 20s with natural beauty",
}

GENDER_TEMPLATES = {
    "woman": "a stylish {nationality} woman in her late 20s with natural beauty",
    "man": "a well-groomed {nationality} man in his early 30s",
    "boy": "a {nationality} boy, around 14-16 years old",
    "girl": "a {nationality} girl, around 14-16 years old",
}

SKIN_TONE_DESCRIPTIONS = {
    "fair": "with fair, light skin tone",
    "light": "with light, wheat-ish skin tone",
    "medium": "with medium, warm brown skin tone",
    "tan": "with tan, olive skin tone",
    "brown": "with brown skin tone",
    "dark": "with deep dark brown skin tone",
}


def build_model_description(
    gender: str = "woman",
    nationality: str = "Indian",
    skin_tone: str | None = None,
    model_type: str | None = None,
) -> str:
    """Build a dynamic model description from gender, nationality, and skin tone.
    Falls back to legacy MODEL_DESCRIPTIONS if model_type is provided."""
    if model_type and model_type in MODEL_DESCRIPTIONS and not nationality:
        return MODEL_DESCRIPTIONS[model_type]
    template = GENDER_TEMPLATES.get(gender, GENDER_TEMPLATES["woman"])
    desc = template.format(nationality=nationality or "Indian")
    if skin_tone and skin_tone in SKIN_TONE_DESCRIPTIONS:
        desc += f" {SKIN_TONE_DESCRIPTIONS[skin_tone]}"
    return desc


JEWELRY_SIZE_HINTS = {
    "ring": "typically 1-2cm wide, fits snugly around a finger — must look proportional to a real human hand",
    "necklace": "varies by style — choker: 35-40cm sits tight at the neck; princess: 43-48cm rests at the collarbone; matinee: 50-60cm on the chest; opera: 70-90cm hangs below the bust. Match the length and thickness visible in the input image",
    "earring": "typically 1-5cm, hangs from the earlobe — studs are tiny (under 1cm), drops are 3-5cm, chandeliers can be 5-8cm. Match the size from the reference",
    "bracelet": "fits snugly around the wrist, 15-20cm circumference, typically 0.5-2cm wide — must look proportional to a real human wrist",
    "bangle": "rigid circular band, 6-8cm inner diameter, fits around the wrist/forearm — multiple bangles stack naturally",
    "pendant": "small decorative piece 1-4cm, hanging from a chain at chest level — the pendant should not appear larger than the model's palm",
    "brooch": "small decorative pin 3-6cm, attached flat to clothing — should not dominate the chest area",
    "anklet": "thin delicate chain wrapping the ankle, typically under 0.5cm wide — must look proportional to a real human ankle",
    "chain": "40-70cm length worn around the neck, links are typically 3-8mm — match the link size and chain thickness from the input image",
    "set": "multiple coordinated pieces, each at its natural body position and realistic size — no piece should look oversized or miniaturized",
}

JEWELRY_UGC_POSES = {
    "ring": {
        # Ring UGC should be hand-only closeups (no full-body by default)
        "poses": ["finger_macro", "hand_closeup"],
        "interaction": "wearing the ring on the finger — the ring must be realistically sized, fitting snugly around the finger as a real ring would, NOT oversized or miniaturized. The ring's design, stone size, and band width must exactly match the reference image",
    },
    "necklace": {
        "poses": ["neck_macro", "standing", "close_up", "side_view", "sitting"],
        "interaction": "wearing the necklace around the neck — the necklace must match the exact length, drape, and thickness visible in the reference image. If it's a short choker it sits tight at the base of the neck; if it's a long chain it drapes naturally down the chest. The outfit neckline must be low enough to fully reveal the necklace",
    },
    "earring": {
        "poses": ["ear_macro", "close_up", "side_view", "standing"],
        "interaction": "wearing the earrings with ears clearly visible, hair tucked or swept to one side — the earrings must be realistically sized relative to the ear (studs are tiny, drops hang 3-5cm, chandeliers up to 8cm). Match the exact size from the reference image",
    },
    "bracelet": {
        "poses": ["wrist_macro", "hand_closeup", "standing", "sitting"],
        "interaction": "wearing the bracelet on the wrist — the bracelet must fit naturally around the wrist at its real-world size, NOT enlarged or shrunk. Hand and forearm elegantly positioned to showcase it",
    },
    "bangle": {
        "poses": ["wrist_macro", "hand_closeup", "standing", "side_view"],
        "interaction": "wearing the bangles on the forearm — each bangle must be realistically proportioned to the wrist/forearm (6-8cm diameter). If multiple bangles, they stack naturally. Arm raised or posed to showcase them",
    },
    "pendant": {
        "poses": ["neck_macro", "close_up", "standing", "sitting"],
        "interaction": "wearing the pendant on a chain around the neck — the pendant must be its real-world size (typically smaller than the model's palm), resting naturally on the chest. The chain length and pendant size must match the reference image exactly",
    },
    "brooch": {
        "poses": ["lapel_macro", "close_up", "standing", "side_view"],
        "interaction": "wearing the brooch pinned to the outfit on the chest or lapel area — the brooch must be realistically sized (3-6cm), NOT enlarged to fill the frame. It should look like a natural accessory, not a dominant element",
    },
    "anklet": {
        "poses": ["ankle_macro", "feet_closeup", "sitting", "standing"],
        "interaction": "wearing the anklet around the ankle — the anklet must be a thin, delicate chain proportional to a real human ankle, NOT thick or oversized. Legs and feet visible and elegantly posed",
    },
    "chain": {
        "poses": ["neck_macro", "standing", "close_up", "side_view"],
        "interaction": "wearing the chain around the neck — the chain link size, thickness, and overall length must match the reference image exactly. It should drape naturally with realistic weight and movement",
    },
    "set": {
        "poses": ["standing", "close_up", "side_view", "sitting"],
        "interaction": "wearing the complete jewelry set with all pieces visible — each piece must be at its real-world size relative to the body (rings on fingers, necklace at neck, earrings at ears, bangles on wrists). No piece should look disproportionately large or small",
    },
}

JEWELRY_UGC_RULES: dict[str, str] = {
    "ring": (
        "- The model must wear ONLY the ring from the input — no other rings or jewelry.\n"
        "- The ring must sit naturally on the finger at its real size.\n"
        "- Preserve exact band thickness, stone shape, and setting style."
    ),
    "necklace": (
        "- The model must wear ONLY the necklace from the input — no earrings, rings, or other jewelry.\n"
        "- The necklace must drape naturally following the collarbone curve.\n"
        "- Chain thickness, pendant size, and overall length must match the input exactly.\n"
        "- The outfit neckline MUST be low enough to fully reveal the necklace."
    ),
    "earring": (
        "- The model must wear ONLY the earrings from the input — no necklace, rings, or other jewelry.\n"
        "- If the input shows a PAIR, BOTH earrings MUST be visible on the model.\n"
        "- Hair MUST be tucked or swept back to fully reveal both ears.\n"
        "- Earring size, drop length, and design must match the input exactly."
    ),
    "bracelet": (
        "- The model must wear ONLY the bracelet from the input — no rings, bangles, or other jewelry on the same hand.\n"
        "- The bracelet must sit naturally on the wrist at its real size.\n"
        "- Hand and forearm elegantly positioned to showcase the bracelet."
    ),
    "bangle": (
        "- The model must wear ONLY the bangle(s) from the input — no bracelets, rings, or other jewelry.\n"
        "- Bangle must appear as a rigid circular band at realistic proportions.\n"
        "- If multiple bangles in input, stack them naturally on the forearm."
    ),
    "pendant": (
        "- The model must wear ONLY the pendant from the input — no earrings, rings, or other jewelry.\n"
        "- The pendant hangs from a SIMPLE, THIN chain that does NOT distract from the pendant itself.\n"
        "- Do NOT invent an elaborate necklace chain — use a minimal plain chain.\n"
        "- Pendant size and design must match the input exactly.\n"
        "- The chain must be proportional — not thick, not overly decorative."
    ),
    "brooch": (
        "- The model must wear ONLY the brooch from the input — no other jewelry.\n"
        "- Brooch must be pinned to the outfit, not worn as a pendant.\n"
        "- Brooch size must be realistic (3-6cm), not enlarged."
    ),
    "anklet": (
        "- The model must wear ONLY the anklet from the input — no other jewelry on the feet or ankles.\n"
        "- The anklet must be a thin, delicate chain at realistic proportions.\n"
        "- Feet and ankles must be clearly visible."
    ),
    "chain": (
        "- The model must wear ONLY the chain from the input — no pendant, no earrings, no other jewelry.\n"
        "- Do NOT add a pendant to the chain — it must remain a plain chain.\n"
        "- Chain link size, thickness, and length must match the input exactly."
    ),
    "set": (
        "- The model must wear ONLY the pieces that are part of this set — NOTHING extra.\n"
        "- Do NOT add any jewelry that is not visible in the input image.\n"
        "- Do NOT hallucinate rings, bracelets, bangles, or any piece not shown in the input.\n"
        "- Each set piece must be worn at its correct body position.\n"
        "- All pieces must maintain their exact design from the input."
    ),
}

POSE_DESCRIPTIONS = {
    "best_match": (
        "Three-quarter-length portrait (head to mid-thigh), 85mm lens at eye level. "
        "Model in a relaxed confident stance angled 10-15° off-axis, weight on the back foot. "
        "Complete head in frame with 8-10% headroom above the crown. Soft even key light from the front-left"
    ),
    "standing": (
        "Three-quarter-length shot from just above the crown down to mid-thigh, 85mm lens at eye level. "
        "Model stands with weight shifted to one leg (contrapposto), shoulders open, hands relaxed at sides or lightly on hips. "
        "This is NOT a full-length shot to the feet and NOT a chest-up close-up — the jewelry must be clearly visible on the upper body"
    ),
    "side_view": (
        "3/4 profile portrait (head turned 70-80° from camera so the nose silhouette is crisp and one eye remains partly visible), 85mm lens at eye level. "
        "Framed from just above the crown to mid-chest. Hair tucked behind the ear facing camera so jewelry on that side is fully revealed. "
        "NOT a front-facing portrait"
    ),
    "back_view": (
        "Over-the-shoulder shot from behind, frame from head to mid-back, 85mm lens at eye level. "
        "Model's back faces camera; head turned to look back over the shoulder nearer camera so ~40% of the face is visible in 3/4 profile. "
        "Nape of neck and shoulders exposed — useful for clasp details and drop earrings from behind"
    ),
    "sitting": (
        "Seated mid-shot. Model is seated on a simple wooden stool or upholstered chair, body angled 15° off-axis, knees together or gently crossed. "
        "Frame from just above the crown down to the knees — the seated posture (bent knees, hips on the seat, torso upright) MUST be visibly readable in the shot. "
        "One hand rests in the lap, the other on the thigh or chair arm. 85mm lens, camera at the model's eye level. "
        "NOT a standing shot. NOT a face-only close-up"
    ),
    "close_up": (
        "Beauty portrait, chest-up, 85mm lens at eye level, shallow depth of field (f/2.8-equivalent). "
        "Head centered with 8-10% headroom, eyes on the upper-third line. Soft wrapping key light from front-left. "
        "Jewelry near the face (earrings, necklace, brooch) is tack-sharp and fully in frame"
    ),
    "walking": (
        "Full-body action shot, mid-stride, model walking toward the camera along a natural path. "
        "50mm lens, camera positioned at WAIST HEIGHT (camera is LOW — not at face height), subject filling the full vertical frame from the top of the head down to just below the feet. "
        "One leg clearly forward and one clearly back — the STRIDE MUST BE VISIBLE with both feet off-aligned and one heel lifting. Arms swing naturally at the sides. "
        "The entire body from crown to feet MUST be inside the frame. "
        "This is NOT a portrait, NOT a chest-up shot, NOT a face close-up. The face may be small and soft-focus in the frame — that is correct and intentional. "
        "If the head occupies more than 1/5 of the image height, the shot is WRONG and must be rejected"
    ),
    "hand_closeup": (
        "a close-up of the hand (wrist to fingertips) showcasing jewelry on the fingers or wrist as the HERO. "
        "Hand posed naturally in a lifestyle way (e.g., resting on a book, gently touching the face/lips, holding a cup). "
        "Shallow depth of field — jewelry tack-sharp, skin/background softly blurred. "
        "This is NOT a full-body shot; do NOT prioritize showing the full face."
    ),
    "feet_closeup": "a close-up of the feet and ankle area, elegantly posed to showcase ankle jewelry. Clean background, feet and ankles sharp and well-lit",
    # Macro close-ups for small jewelry — extreme tight framing
    "finger_macro": (
        "an EXTREME close-up macro shot of the hand showing ONLY the fingers and the ring. "
        "The ring MUST fill at least 40-50% of the frame. Fingers slightly spread or gently curved in an elegant pose. "
        "Very shallow depth of field — the ring is tack-sharp while the rest of the hand softly blurs. "
        "Soft, diffused studio lighting with a subtle highlight on the metal and stones. "
        "Think high-end jewelry campaign close-up — the viewer should feel they can touch the ring"
    ),
    "ear_macro": (
        "an EXTREME close-up of the ear and side of the face, showing the earring as the hero. "
        "The earring MUST fill at least 30-40% of the frame. Hair tucked or swept behind the ear to fully reveal the earring. "
        "Very shallow depth of field — earring tack-sharp, face and hair softly blurred. "
        "Soft side lighting that catches the metal and stones beautifully. "
        "Frame from jawline to just above the ear — no need to show the full face"
    ),
    "neck_macro": (
        "a close-up of the neck and upper chest area, showcasing the pendant/necklace as the hero. "
        "The pendant MUST fill at least 25-35% of the frame. Neckline of outfit low enough to reveal the full piece. "
        "Shallow depth of field — pendant and chain tack-sharp, skin and clothing softly blurred. "
        "Warm, diffused lighting that highlights the pendant's details and chain links"
    ),
    "wrist_macro": (
        "an EXTREME close-up of the wrist and forearm, showcasing the bracelet/bangle as the hero. "
        "The bracelet MUST fill at least 40-50% of the frame. Hand and wrist elegantly posed — "
        "fingers relaxed, wrist slightly turned to show the bracelet's full design. "
        "Very shallow depth of field — bracelet tack-sharp, hand and background softly blurred. "
        "Soft studio lighting that catches every detail of the metalwork and stones"
    ),
    "ankle_macro": (
        "an EXTREME close-up of the ankle and lower leg, showcasing the anklet as the hero. "
        "The anklet MUST fill at least 30-40% of the frame. Foot elegantly pointed or resting naturally. "
        "Very shallow depth of field — anklet tack-sharp, foot and background softly blurred. "
        "Soft, warm lighting that highlights the delicate chain and charms"
    ),
    "lapel_macro": (
        "a close-up of the upper chest and lapel area, showcasing the brooch as the hero. "
        "The brooch MUST fill at least 30-40% of the frame. Pinned naturally to the outfit fabric. "
        "Shallow depth of field — brooch tack-sharp, clothing texture softly blurred. "
        "Soft directional lighting that catches the brooch's details and pin structure"
    ),
}

# Poses that must be treated as tight close-ups (no portrait/full-body framing rules)
MACRO_POSE_TYPES = {"finger_macro", "ear_macro", "neck_macro", "wrist_macro", "ankle_macro", "lapel_macro", "hand_closeup", "feet_closeup"}

# Per-pose framing directives. Replaces the old one-size-fits-all "head in upper 25%"
# rule that was crushing walking/sitting/side_view into face close-ups.
# Each entry is the "⚠️ FRAMING RULE" block injected at the top of the prompt.
POSE_FRAMING = {
    "walking": (
        "⚠️ FRAMING RULE — FULL-BODY MID-STRIDE:\n"
        "This is a FULL-BODY shot. The model's entire body from the top of the head to just below the feet MUST be visible inside the frame.\n"
        "The camera is at WAIST HEIGHT, NOT at face height. The face is intentionally small in the frame (less than 1/5 of image height).\n"
        "The stride must be unmistakable — one leg clearly forward, one clearly back, one heel lifting off the ground.\n"
        "DO NOT crop to a portrait. DO NOT produce a face close-up or chest-up framing. If you cannot see both feet and both legs mid-stride, the shot is WRONG."
    ),
    "standing": (
        "⚠️ FRAMING RULE — THREE-QUARTER LENGTH STANDING:\n"
        "Frame from just above the crown of the head down to mid-thigh. The head sits in the upper 20-25% of the canvas with 8-10% headroom.\n"
        "This is NOT a full-length shot to the feet, and NOT a chest-up portrait. The jewelry on the upper body must be clearly readable.\n"
        "DO NOT crop to a face close-up."
    ),
    "sitting": (
        "⚠️ FRAMING RULE — SEATED MID-SHOT:\n"
        "The seated posture MUST be visible — bent knees, hips on the seat surface, torso upright on a stool or chair.\n"
        "Frame from just above the crown down to the knees. Head in the upper 25% of the canvas.\n"
        "DO NOT produce a face-only close-up. DO NOT show the model standing. If the seat and bent knees are not visible, the shot is WRONG."
    ),
    "side_view": (
        "⚠️ FRAMING RULE — 3/4 PROFILE PORTRAIT:\n"
        "Head turned 70-80° away from camera. The nose-and-chin silhouette MUST be crisp against the background, one eye partly visible.\n"
        "Frame from just above the crown down to mid-chest. The ear, jawline and neck on the camera-facing side are fully revealed.\n"
        "This is NOT a front-facing portrait. DO NOT produce a symmetrical face-forward shot."
    ),
    "back_view": (
        "⚠️ FRAMING RULE — OVER-THE-SHOULDER FROM BEHIND:\n"
        "Model's back faces the camera. Head turned to look back over the shoulder nearer camera; about 40% of the face visible in 3/4 profile.\n"
        "Frame from just above the crown down to mid-back. Nape of neck and shoulders exposed.\n"
        "DO NOT produce a front-facing portrait."
    ),
    "close_up": (
        "⚠️ FRAMING RULE — BEAUTY CLOSE-UP:\n"
        "Chest-up portrait, face centered with 8-10% headroom. Eyes on the upper-third line. Soft wrapping key light.\n"
        "The complete head and face must be visible (forehead to chin). Jewelry near the face is tack-sharp."
    ),
    "best_match": (
        "⚠️ FRAMING RULE — THREE-QUARTER LENGTH:\n"
        "Frame from just above the crown to mid-thigh. Complete head in frame with 8-10% headroom above the crown.\n"
        "Jewelry on the upper body must be clearly visible and well-lit."
    ),
}


# ─── Jewelry-as-hero composition system ───
# These blocks are injected into every UGC prompt so the model treats the jewelry
# as the subject of the frame, not an accessory on a model-subject shot.

JEWELRY_HERO_DIRECTIVE = (
    "⭐ JEWELRY IS THE HERO — READ BEFORE ANYTHING ELSE:\n"
    "- The JEWELRY is the SUBJECT of this photograph. The model wears it, but the viewer's eye must land on the jewelry first.\n"
    "- The jewelry must be FULLY visible — never cropped by the frame, never occluded by hair, fabric, hands, or props.\n"
    "- The jewelry must be in SHARP FOCUS; everything else may fall off focus if needed to make the piece pop.\n"
    "- Lighting must catch the stones and metal — specular highlights on gems, soft key light on metal surfaces.\n"
    "- Composition must lead the eye TO the jewelry (rule-of-thirds placement, framing with negative space, or shallow DoF).\n"
    "- The model's face must still be framed NATURALLY (no awkward top-of-head or chin crops) but the face is a supporting element, not the subject."
)

JEWELRY_NEGATIVE_PROMPTS = (
    "❌ NEGATIVE — the following are FAILURE MODES; do NOT produce any of these:\n"
    "- jewelry cropped or touching any frame edge\n"
    "- jewelry out of frame, partially hidden, or cut off at the image border\n"
    "- hair, collar, scarf, dupatta, pallu, sleeve, or hand occluding the jewelry\n"
    "- jewelry out of focus while background/face is sharp\n"
    "- jewelry lost against a busy or similar-tone background\n"
    "- face cropped awkwardly (top of head missing, chin cut off, eyes cut off)\n"
    "- jewelry rendered too small to see detail in a wide shot\n"
    "- motion blur on the jewelry\n"
    "- multiple pieces of extra jewelry not shown in the input image"
)

# Per-jewelry-type composition rules for NON-MACRO poses. Macro poses already
# enforce hero framing via POSE_DESCRIPTIONS, so we only inject these for
# standing / sitting / side_view / back_view / close_up / walking / best_match.
JEWELRY_UGC_COMPOSITION: dict[str, str] = {
    "ring": (
        "COMPOSITION FOR RING (non-macro pose):\n"
        "- Stage the hand wearing the ring so it is a prominent secondary focal point — resting at the collarbone, touching the face/chin, holding a prop, or raised near the shoulder.\n"
        "- The ring hand must be in the near focal plane with the ring tack-sharp; the face can be slightly softer if needed.\n"
        "- Place the ring near a rule-of-thirds intersection; do NOT let it sit at the absolute frame edge.\n"
        "- Key light should catch the stone / metal from a 45° angle — no flat front-on lighting.\n"
        "- The ring finger must be clear of other jewelry and unoccluded by cuffs, sleeves, or the other hand."
    ),
    "bracelet": (
        "COMPOSITION FOR BRACELET (non-macro pose):\n"
        "- Stage the wrist wearing the bracelet forward of the body — hand on hip, resting at the neckline, or holding an object at chest height.\n"
        "- The wrist must be in the near focal plane with the bracelet tack-sharp.\n"
        "- Sleeves MUST be short, pushed up, or sleeveless so the bracelet is fully uncovered end-to-end.\n"
        "- Key light angled to catch the metalwork; avoid shadowing the wrist with the body.\n"
        "- No other wristwear (watch, second bracelet) on the same hand."
    ),
    "bangle": (
        "COMPOSITION FOR BANGLE (non-macro pose):\n"
        "- Arm raised or forward so the full bangle stack is visible end-to-end (every piece, not merged).\n"
        "- Sleeves MUST be rolled back / sleeveless; no dupatta draped over the forearm.\n"
        "- Rim / side light on the forearm to separate the bangles from skin and clothing.\n"
        "- Bangles must sit in the near focal plane with the stack tack-sharp."
    ),
    "necklace": (
        "COMPOSITION FOR NECKLACE (non-macro pose):\n"
        "- Chest-up or upper-body framing so the full necklace drape is visible from clasp to pendant.\n"
        "- Outfit neckline MUST be low and wide — V-neck, scoop, or off-shoulder. No collar, no button-up shirt, no high-neck blouse.\n"
        "- Hair swept back, over one shoulder, or tied up — not a single strand may cross the pendant or chain.\n"
        "- No dupatta or scarf covering the décolletage.\n"
        "- Key light from above-front so it catches the chain links and any pendant stones; fill light keeps skin tone even.\n"
        "- The necklace centre (pendant or focal link) should sit near the upper rule-of-thirds line."
    ),
    "pendant": (
        "COMPOSITION FOR PENDANT (non-macro pose):\n"
        "- Chest-up framing; the pendant rests on bare skin at the sternum and is the clear focal point.\n"
        "- Minimal plain chain (no competing statement chain).\n"
        "- Outfit: low V-neck, scoop neck, or off-shoulder. No prints or patterns that fight the pendant.\n"
        "- Hair pulled back — zero strands across the pendant.\n"
        "- Key light catches the pendant face; background a stop darker than skin so the pendant pops."
    ),
    "earring": (
        "COMPOSITION FOR EARRING (non-macro pose):\n"
        "- Three-quarter or near-profile portrait so at least ONE earring is fully visible, preferably BOTH if framing allows.\n"
        "- Hair MUST be tucked fully behind the ear(s) or tied back — NO strand may drape across the earlobe.\n"
        "- Outfit neckline away from the earring (no high collar brushing the earring).\n"
        "- Side / rim light on the ear to separate the earring from the face and hair — avoid flat front lighting that lets the earring blend into the cheek.\n"
        "- The earring should sit on the upper-third horizontal line of the frame."
    ),
    "brooch": (
        "COMPOSITION FOR BROOCH (non-macro pose):\n"
        "- Upper-body framing angled slightly toward the brooch side.\n"
        "- Brooch pinned flat to a solid-colour lapel / jacket / saree pallu with no competing pattern under it.\n"
        "- Directional light from the brooch side to catch the relief / stones.\n"
        "- Hair and scarf clear of the brooch area."
    ),
    "anklet": (
        "COMPOSITION FOR ANKLET (non-macro pose):\n"
        "- Seated or stepping pose with the ankle forward; lower-body or full-body frame with the ankle in the near focal plane.\n"
        "- Bare ankle — no long hem, trouser, or saree border covering the anklet.\n"
        "- Warm key light from low-front to separate the anklet from the skin and ground.\n"
        "- Anklet should sit on a rule-of-thirds intersection; never at the frame edge."
    ),
    "chain": (
        "COMPOSITION FOR CHAIN (non-macro pose):\n"
        "- Chest-up framing; entire chain visible from clasp region to lowest point.\n"
        "- Low V-neck or scoop-neck outfit; hair fully swept back.\n"
        "- Soft key light angled to render each link — avoid top-down flat lighting that flattens the chain into a single line."
    ),
    "set": (
        "COMPOSITION FOR JEWELRY SET (non-macro pose):\n"
        "- Three-quarter framing so necklace, earrings, and any bangles/rings are simultaneously visible.\n"
        "- Hair tied up or swept back to reveal both ears.\n"
        "- Low neckline outfit in a solid, muted colour that contrasts the metal tone.\n"
        "- Multi-point lighting: a soft key light, plus a subtle fill that catches each piece. No single hot spot washing out one piece.\n"
        "- Compose so the necklace sits on the upper-third line and the bangles/ring on the lower-third line — the viewer's eye sweeps across all pieces."
    ),
}


def _jewelry_hero_block(jewelry_type: str | None, is_macro: bool) -> str:
    """Assemble the hero-composition block injected into every UGC prompt."""
    parts = [JEWELRY_HERO_DIRECTIVE]
    if jewelry_type and jewelry_type in JEWELRY_UGC_COMPOSITION and not is_macro:
        parts.append(JEWELRY_UGC_COMPOSITION[jewelry_type])
    if not is_macro:
        parts.append(
            "FOCAL PLANE & DEPTH OF FIELD:\n"
            "- Shoot with shallow depth of field (f/2.8–f/4 equivalent).\n"
            "- The JEWELRY is in the focal plane and tack-sharp.\n"
            "- The model's face is acceptably sharp but may be 1 stop softer than the jewelry if that helps the piece pop.\n"
            "- Background is soft / bokeh'd — never competing with the jewelry for attention."
        )
    return "\n\n".join(parts)

CATALOGUE_BACKGROUNDS = [
    {"id": "best_match", "label": "Best Match", "thumb": "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=200&h=200&fit=crop&q=80", "prompt": "a plain solid light-grey (#E0E0E0) seamless studio backdrop with soft diffused lighting from above — no patterns, no gradients, no props, no windows, no outdoor elements"},
    {"id": "studio", "label": "Studio", "thumb": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=200&h=200&fit=crop&q=80", "prompt": "a plain solid white seamless paper studio backdrop with soft even lighting from two softboxes — no shadows on the background, no props, no furniture, pure white (#FFFFFF) behind the model"},
    {"id": "flora", "label": "Flora", "thumb": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=200&fit=crop&q=80", "prompt": "a lush green garden with soft-focus pink and white flowers in the background, warm natural sunlight filtering through leaves — the greenery is blurred (bokeh) behind the model"},
    {"id": "wooden", "label": "Wooden", "thumb": "https://images.unsplash.com/photo-1541123603104-512919d6a96c?w=200&h=200&fit=crop&q=80", "prompt": "a warm honey-toned wooden panel wall backdrop with soft warm studio lighting — no furniture, no props, just the flat wooden wall texture behind the model"},
    {"id": "indoor", "label": "Indoor", "thumb": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=200&h=200&fit=crop&q=80", "prompt": "a soft beige/cream solid wall with warm ambient lighting — minimal, clean, no furniture or decor visible, just the neutral wall as backdrop"},
    {"id": "livingroom", "label": "Living Room", "thumb": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=200&h=200&fit=crop&q=80", "prompt": "a modern living room with a light grey sofa and white walls, soft natural window light from the left — the room is slightly blurred behind the model"},
]

CATALOGUE_BG_DESCRIPTIONS = {b["id"]: b["prompt"] for b in CATALOGUE_BACKGROUNDS}

CATALOGUE_POSES = [
    {"id": "standing", "label": "Standing", "thumb": "/thumbnails/pose_standing.png"},
    {"id": "side_view", "label": "Side View", "thumb": "/thumbnails/pose_side_view.png"},
    {"id": "back_view", "label": "Back View", "thumb": "/thumbnails/pose_back_view.png"},
    {"id": "sitting", "label": "Sitting", "thumb": "/thumbnails/pose_sitting.png"},
    {"id": "close_up", "label": "Close Up", "thumb": "/thumbnails/pose_close_up.png"},
    {"id": "walking", "label": "Walking", "thumb": "/thumbnails/pose_walking.png"},
    {"id": "finger_macro", "label": "Ring Macro", "thumb": "/thumbnails/pose_finger_macro.png"},
    {"id": "ear_macro", "label": "Earring Macro", "thumb": "/thumbnails/pose_ear_macro.png"},
    {"id": "neck_macro", "label": "Neck Macro", "thumb": "/thumbnails/pose_neck_macro.png"},
    {"id": "wrist_macro", "label": "Wrist Macro", "thumb": "/thumbnails/pose_wrist_macro.png"},
    {"id": "ankle_macro", "label": "Anklet Macro", "thumb": "/thumbnails/pose_ankle_macro.png"},
    {"id": "lapel_macro", "label": "Brooch Macro", "thumb": "/thumbnails/pose_lapel_macro.png"},
]

AI_MODEL_FACES = [
    {"id": "indian_woman", "name": "Indian Woman", "thumb": "/thumbnails/model_indian_woman.png"},
    {"id": "indian_man", "name": "Indian Man", "thumb": "/thumbnails/model_indian_man.png"},
    {"id": "western_woman", "name": "Western Woman", "thumb": "/thumbnails/model_western_woman.png"},
    {"id": "western_man", "name": "Western Man", "thumb": "/thumbnails/model_western_man.png"},
    {"id": "east_asian_woman", "name": "East Asian Woman", "thumb": "/thumbnails/model_east_asian_woman.png"},
    {"id": "east_asian_man", "name": "East Asian Man", "thumb": "/thumbnails/model_east_asian_man.png"},
    {"id": "african_woman", "name": "Black Woman", "thumb": "/thumbnails/model_african_woman.png"},
    {"id": "african_man", "name": "Black Man", "thumb": "/thumbnails/model_african_man.png"},
    {"id": "latina_woman", "name": "Latina Woman", "thumb": "/thumbnails/model_latina_woman.png"},
    {"id": "middle_eastern_woman", "name": "Middle Eastern Woman", "thumb": "/thumbnails/model_middle_eastern_woman.png"},
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
    jewelry_type: str | None = None,
    gender: str | None = None,
    nationality: str | None = None,
    skin_tone: str | None = None,
    detection: dict | None = None,
) -> str:
    """Build prompt for Catalogue/UGC generation — category-aware model interaction."""
    if gender and nationality:
        model_desc = build_model_description(gender=gender, nationality=nationality, skin_tone=skin_tone)
    else:
        model_desc = MODEL_DESCRIPTIONS.get(model_type, MODEL_DESCRIPTIONS["indian_woman"])
        if skin_tone and skin_tone in SKIN_TONE_DESCRIPTIONS:
            model_desc += f" {SKIN_TONE_DESCRIPTIONS[skin_tone]}"

    pose_desc = POSE_DESCRIPTIONS.get(pose, POSE_DESCRIPTIONS["best_match"])
    bg_desc = CATALOGUE_BG_DESCRIPTIONS.get(background, CATALOGUE_BG_DESCRIPTIONS["best_match"])

    if jewelry_type and jewelry_type in JEWELRY_UGC_POSES:
        interaction = JEWELRY_UGC_POSES[jewelry_type]["interaction"]
    else:
        interaction = CATEGORY_CATALOGUE_INTERACTION.get(
            category_slug or "",
            "wearing/holding/using the product from the input image"
        )

    outfit_line = ""
    if outfit_description:
        outfit_line = f"Outfit: The model MUST wear exactly this outfit: {outfit_description}\n"

    is_macro_pose = pose in MACRO_POSE_TYPES

    hero_block = _jewelry_hero_block(jewelry_type, is_macro_pose)

    if is_macro_pose:
        prompt = (
            f"{hero_block}\n\n"
            "⚠️ MACRO CLOSE-UP SHOT — READ FIRST:\n"
            "This is an EXTREME CLOSE-UP shot. The jewelry is the HERO of this image.\n"
            "The jewelry piece MUST fill a large portion of the frame (30-50%).\n"
            "Use very shallow depth of field — jewelry tack-sharp, everything else softly blurred.\n"
            "This is NOT a full-body or portrait shot. Frame ONLY the body part wearing the jewelry.\n"
            "Think high-end jewelry campaign macro photography — the viewer should see every detail.\n\n"
            f"Subject: {model_desc} {interaction}.\n"
            f"Pose: {pose_desc}\n"
            f"Background: {bg_desc}\n"
            "⚠️ BACKGROUND CONSISTENCY — The background MUST match EXACTLY the description above. "
            "Do NOT improvise, add outdoor elements, change the color, or use a different setting. "
            "The background must look identical across all shots in this series.\n"
            f"{outfit_line}\n"
            f"{PRODUCT_ISOLATION_PROMPT}\n\n"
            "⚠️ SIZE & PROPORTION RULE — CRITICAL:\n"
            "- The jewelry must appear at its REAL-WORLD physical size relative to the human body\n"
            "- Because this is a macro close-up, the jewelry should appear LARGE in frame but still proportional to the body part\n"
            "- Study the input image carefully to understand the actual dimensions of the piece\n"
            "- Do NOT enlarge or shrink the jewelry — maintain realistic proportions\n"
            "- The close-up framing naturally makes the jewelry prominent — do NOT additionally scale it up\n"
        )
    else:
        framing_block = POSE_FRAMING.get(pose, POSE_FRAMING["best_match"])
        prompt = (
            f"{hero_block}\n\n"
            f"{framing_block}\n\n"
            f"Subject: {model_desc} {interaction}.\n"
            f"Pose: {pose_desc}\n"
            f"Background: {bg_desc}\n"
            "⚠️ BACKGROUND CONSISTENCY — The background MUST match EXACTLY the description above. "
            "Do NOT improvise, add outdoor elements, change the color, or use a different setting. "
            "The background must look identical across all shots in this series.\n"
            f"{outfit_line}\n"
            f"{PRODUCT_ISOLATION_PROMPT}\n\n"
            "⚠️ SIZE & PROPORTION RULE — CRITICAL:\n"
            "- The jewelry must appear at its REAL-WORLD physical size relative to the human body\n"
            "- Study the input image carefully to understand the actual dimensions of the piece\n"
            "- Do NOT enlarge or shrink the jewelry — maintain realistic proportions as seen in real product photography\n"
            "- If the jewelry is small/delicate (e.g. a stud earring, thin anklet), it MUST appear small on the model\n"
            "- If the jewelry is large/statement (e.g. a chunky necklace, large jhumkas), it should appear proportionally large\n"
            "- Use the model's body parts as scale anchors: finger width for rings, earlobe for earrings, neck circumference for necklaces, wrist for bracelets\n"
        )

    if jewelry_type and jewelry_type in JEWELRY_SIZE_HINTS:
        prompt += f"- Size reference: {JEWELRY_SIZE_HINTS[jewelry_type]}\n"

    # Product preservation block — prevents AI from redesigning jewelry
    prompt += (
        "\nPRODUCT PRESERVATION — CRITICAL:\n"
        "- The jewelry MUST be EXACTLY identical to the provided product image.\n"
        "- Do NOT resize disproportionately.\n"
        "- Use realistic real-world scale.\n"
        "- Do NOT redesign, enhance, or modify the jewelry in any way.\n"
        "- Do NOT change stone shape, count, metal color, or proportions.\n"
        "- Preserve the EXACT color palette — every metal tone, gemstone hue, and surface finish.\n"
        "- Do NOT reinterpret transparent or open areas as solid colored surfaces.\n"
    )

    # Category-specific UGC rules — anti-hallucination per jewelry type
    if jewelry_type and jewelry_type in JEWELRY_UGC_RULES:
        prompt += f"\n{jewelry_type.upper()} — WEARING RULES:\n"
        prompt += JEWELRY_UGC_RULES[jewelry_type] + "\n"

    # Detection-aware component listing — tells AI exactly what to show and what NOT to add
    if detection and jewelry_type:
        components = detection.get("components", [])
        is_set = detection.get("is_set", False)
        is_pair = detection.get("is_pair", False)
        item_count = detection.get("item_count", 1)

        if is_set and components:
            comp_str = ", ".join(components)
            prompt += (
                f"\nSET COMPONENTS — EXACT (from input analysis):\n"
                f"- This set contains EXACTLY: {comp_str}.\n"
                f"- The model MUST wear ONLY these {item_count} pieces — nothing else.\n"
                f"- Do NOT add rings, bracelets, bangles, chains, or ANY jewelry not listed above.\n"
                f"- If the set does NOT include a ring, the model must NOT wear any ring.\n"
                f"- If the set does NOT include a necklace chain, use a minimal plain chain for the pendant only.\n"
            )
        elif is_pair:
            prompt += (
                f"\nPAIR DETECTED:\n"
                f"- The input contains a matching pair of {jewelry_type}s.\n"
                f"- BOTH pieces MUST be visible on the model.\n"
            )

        prompt += (
            "\nNO EXTRA JEWELRY — MANDATORY:\n"
            "- The model must wear ONLY the jewelry from the input image.\n"
            "- Do NOT add any additional jewelry (rings, bracelets, bangles, earrings, necklaces) that is not in the input.\n"
            "- The model's hands, wrists, ears, neck, and ankles should be bare EXCEPT for the input jewelry.\n"
        )
    elif jewelry_type:
        prompt += (
            "\nNO EXTRA JEWELRY — MANDATORY:\n"
            "- The model must wear ONLY the jewelry from the input image.\n"
            "- Do NOT add any additional jewelry (rings, bracelets, bangles, earrings, necklaces) that is not in the input.\n"
            "- The model's hands, wrists, ears, neck, and ankles should be bare EXCEPT for the input jewelry.\n"
        )

    if is_macro_pose:
        prompt += (
            "\nCOMPOSITION GUIDE — MACRO CLOSE-UP:\n"
            "- This is a TIGHT close-up — frame ONLY the body part wearing the jewelry\n"
            "- The jewelry MUST be the sharpest, most prominent element in the frame\n"
            "- Use very shallow depth of field (f/1.8-2.8 equivalent) — jewelry razor-sharp, background and skin softly blurred\n"
            "- Camera positioned close to the jewelry, angled to show maximum design detail\n"
            "- Soft, diffused lighting with a subtle highlight catch on metal and stones\n"
            "- Do NOT show the full body or full face — this is about the jewelry, not the model\n"
            "- The model's skin should look natural and well-groomed in the visible area\n\n"
            "QUALITY RULES:\n"
            f"- The model should look natural, authentic, and {nationality or 'Indian'}\n"
            "- Jewelry must be the clear focal point — sharp, well-lit, hero of the image\n"
            "- Commercial quality, suitable for e-commerce product detail shots\n"
            "- Realistic proportions — the jewelry must look like it belongs on the body, not pasted on\n"
            "- Output should look like a real high-end jewelry campaign macro photograph\n"
            "- CRITICAL: The model's skin tone and any visible clothing must be EXACTLY "
            "the same across all images in this set."
        )
    else:
        if pose == "walking":
            composition_guide = (
                "\nCOMPOSITION GUIDE — WALKING (FULL-BODY):\n"
                "- Frame the ENTIRE body from the top of the head to below the feet — do NOT crop the legs or feet\n"
                "- Camera at WAIST HEIGHT (camera is low), lens 50mm equivalent, subject fills the vertical frame\n"
                "- Stride MUST be visible: one leg forward, one leg back, one heel lifting off the ground\n"
                "- The face is SMALL in the frame — do NOT anchor composition to the face\n"
                "- If you produce a portrait or chest-up shot the output is REJECTED\n"
            )
        elif pose == "sitting":
            composition_guide = (
                "\nCOMPOSITION GUIDE — SEATED MID-SHOT:\n"
                "- Frame from just above the crown down to the knees — the seat and bent knees MUST be in frame\n"
                "- The seated posture (torso upright on stool/chair, hips on the seat, knees bent) is the whole point of this shot\n"
                "- Camera at the model's eye level, 85mm lens\n"
                "- Do NOT produce a face-only close-up. Do NOT show the model standing\n"
            )
        elif pose == "side_view":
            composition_guide = (
                "\nCOMPOSITION GUIDE — 3/4 PROFILE:\n"
                "- Head turned 70-80° from camera so the nose and chin silhouette is crisp\n"
                "- Frame from just above the crown down to mid-chest\n"
                "- Hair tucked behind the camera-facing ear; jewelry on that side fully revealed\n"
                "- Do NOT produce a front-facing symmetrical portrait\n"
            )
        else:
            composition_guide = (
                "\nCOMPOSITION GUIDE:\n"
                "- Frame as a 3/4-length portrait (head to mid-thigh) — head to below knees at widest\n"
                "- Camera at chest height, angled slightly up toward the face\n"
                "- The model's face should be sharp, well-lit, and the anchor point of the composition\n"
                "- Leave generous headroom — the top of the frame should have empty background above the hair\n"
                "- NEVER frame so tight that the head touches or exits the top edge\n"
            )
        prompt += composition_guide + (
            "\nQUALITY RULES:\n"
            f"- The model should look natural, authentic, and {nationality or 'Indian'}\n"
            "- Product must be clearly visible, well-lit, and the focal point\n"
            "- Commercial quality, suitable for e-commerce catalogue\n"
            "- Realistic proportions between model and product — the jewelry must look like it belongs on the model's body, not pasted on\n"
            "- Output should look like a real professional photograph\n"
            "- CRITICAL: The model's clothing color, style, and fabric must be EXACTLY "
            "the same across all images in this set. Do NOT change the outfit between poses."
        )

    if key_highlights:
        prompt += f"\n\nPRODUCT HIGHLIGHTS to emphasize visually: {key_highlights}"

    if special_instructions:
        prompt += f"\n\nSPECIAL INSTRUCTIONS: {special_instructions}"

    prompt += f"\n\n{JEWELRY_NEGATIVE_PROMPTS}"

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
    "widescreen": {"width": 1024, "height": 576, "label": "Widescreen (16:9)"},
}

DEFAULT_RATIO = ASPECT_RATIOS["square"]


def get_ratio(ratio_id: str | None) -> dict:
    if not ratio_id or ratio_id not in ASPECT_RATIOS:
        return DEFAULT_RATIO
    return ASPECT_RATIOS[ratio_id]


# ─── Jewelry Hero Prompt — Master System ───

JEWELRY_BACKGROUND_PROMPTS = {
    "black-velvet": "on a solid, uniform deep black velvet surface, soft even studio lighting, luxury feel",
    "pure-white": "on a pure white seamless background, clean even studio lighting, e-commerce marketplace style",
    "neutral-gray": "on a smooth neutral gray seamless paper background, balanced even studio lighting, professional catalog style",
    "white-marble": "on a clean white marble surface with faint grey veining, bright even lighting, lifestyle feel",
    "cream-silk": "on a soft cream silk satin fabric surface with gentle folds, warm golden-hour studio lighting, elegant luxury feel",
    "emerald-velvet": "on a rich emerald green velvet surface, warm studio lighting with soft highlights, opulent luxury feel",
    "burgundy-velvet": "on a deep burgundy wine velvet surface, warm even studio lighting, classic rich luxury feel",
    "navy-velvet": "on a deep navy blue velvet surface, cool-toned studio lighting with subtle highlights, sophisticated luxury feel",
}

# Object count defaults per category — earring = pair, set = multiple, rest = 1
JEWELRY_OBJECT_COUNT: dict[str, str] = {
    "ring": "EXACTLY 1 ring",
    "necklace": "EXACTLY 1 necklace",
    "earring": "EXACTLY 2 earrings (a pair). Both earrings MUST be visible",
    "bracelet": "EXACTLY 1 bracelet",
    "bangle": "EXACTLY 1 bangle (or the exact number shown in input if multiple)",
    "pendant": "EXACTLY 1 pendant",
    "brooch": "EXACTLY 1 brooch",
    "anklet": "EXACTLY 1 anklet",
    "chain": "EXACTLY 1 chain",
    "set": "ALL components of the set exactly as shown in input. Do NOT remove any piece",
}

# Type-specific geometry rules — short, strict, structural
JEWELRY_TYPE_RULES: dict[str, str] = {
    "ring": (
        "- The full circular band MUST be visible.\n"
        "- Maintain EXACT band thickness.\n"
        "- Stone MUST remain same size relative to band.\n"
        "- Do NOT alter prong count or setting style."
    ),
    "necklace": (
        "- Entire chain MUST be visible end to end.\n"
        "- Pendant (if present) MUST be centered.\n"
        "- Chain thickness MUST remain unchanged.\n"
        "- Maintain exact clasp and connector design."
    ),
    "earring": (
        "- If pair exists in input, BOTH earrings MUST be visible in output.\n"
        "- Maintain perfect symmetry between the pair.\n"
        "- Do NOT output a single earring if pair exists.\n"
        "- Preserve hook/post/clip-on mechanism as-is."
    ),
    "bracelet": (
        "- Bracelet MUST form a complete loop or natural open cuff shape.\n"
        "- Maintain EXACT thickness and pattern.\n"
        "- Do NOT alter clasp design.\n"
        "- Entire bracelet MUST be fully visible."
    ),
    "bangle": (
        "- MUST appear as a rigid circular band.\n"
        "- Maintain EXACT width and engraving.\n"
        "- Do NOT reshape into bracelet or cuff.\n"
        "- Full circumference MUST be visible."
    ),
    "pendant": (
        "- Pendant design MUST remain identical.\n"
        "- Chain (if present) MUST NOT change thickness.\n"
        "- Pendant MUST be centered.\n"
        "- Do NOT enlarge or shrink stone.\n"
        "- If pendant-only shot (no chain), do NOT hallucinate a chain."
    ),
    "brooch": (
        "- Preserve pin structure and backing.\n"
        "- Do NOT convert into pendant.\n"
        "- Maintain decorative symmetry.\n"
        "- Entire brooch MUST be visible."
    ),
    "anklet": (
        "- Maintain chain thickness and charm count.\n"
        "- Preserve clasp.\n"
        "- MUST form realistic ankle-sized loop.\n"
        "- Do NOT scale like bracelet — anklet is thinner and more delicate."
    ),
    "chain": (
        "- Maintain link size and density.\n"
        "- Preserve EXACT chain thickness.\n"
        "- Entire length MUST be visible.\n"
        "- Do NOT convert into necklace with pendant."
    ),
    "set": (
        "- Preserve ALL components of the set exactly as shown.\n"
        "- Maintain matching design language across all pieces.\n"
        "- Necklace centered, earrings symmetrically placed.\n"
        "- No component may be removed or hidden.\n"
        "- Arrange in balanced, catalog-style composition."
    ),
}

RATIO_SHAPE_HINTS = {
    "square": "a SQUARE (1:1) image",
    "portrait": "a PORTRAIT (3:4) image — taller than wide",
    "story": "a tall STORY (9:16) image — much taller than wide",
    "landscape": "a LANDSCAPE (4:3) image — wider than tall",
    "widescreen": "a WIDESCREEN (16:9) image — much wider than tall",
}


def _jewelry_count_str(detection: dict | None, jewelry_type: str) -> str:
    """Build the OBJECT COUNT directive from the detection dict.

    The detection service sometimes reports item_count=1 for a visible stack
    (e.g. a bangle stack) while flagging is_set=True. The raw
    "EXACTLY these 1 items: bangle" string that results is actively harmful —
    it suggests to the model that a single bangle is the correct output. This
    helper produces a count string that preserves the stack semantics instead.
    """
    if not detection:
        return JEWELRY_OBJECT_COUNT.get(jewelry_type, f"EXACTLY 1 {jewelry_type}")

    count = detection.get("item_count", 1)
    components = detection.get("components", []) or []
    is_set = bool(detection.get("is_set"))
    is_pair = bool(detection.get("is_pair"))

    if is_set:
        # Stacks / sets: item_count is often misleading (1). Defer to visual ground truth.
        comp_str = (", ".join(components)) if components else jewelry_type
        return (
            f"the FULL STACKED/LAYERED SET of {comp_str}s shown in the input image. "
            f"Count each individual piece/layer/strand visible in the input and reproduce "
            f"the SAME count in the output — do NOT merge layers into fewer thicker pieces, "
            f"do NOT drop any piece, do NOT add extras"
        )
    if is_pair:
        return f"EXACTLY {count} items (a matching pair). BOTH pieces MUST be visible"
    return f"EXACTLY {count} {jewelry_type}{'s' if count > 1 else ''}"


STACKED_SET_DEFENSE = (
    "STACKED / LAYERED SET — HIGH PRIORITY\n"
    "- The input shows a stacked or layered set of pieces (e.g. multi-bangle stack, multi-strand necklace, ring stack).\n"
    "- Reproduce the EXACT number of individual layers/strands/pieces from the input. Count them. Do NOT merge.\n"
    "- Preserve the material finish of each piece (beaded, faceted, threaded, engraved — NOT smooth polished metal unless the input is smooth polished metal).\n"
    "- Preserve EVERY attached ornament (bells / ghungroo / charms / tassels / beads) with the same count, placement, size, and color as the input.\n"
    "- Preserve the exact color shade of colored glass, enamel, or gemstones — do NOT shift hue or lighten/darken.\n"
    "- Do NOT substitute the product with a visually similar but different piece."
)


def build_jewelry_prompt(
    jewelry_type: str,
    background_id: str,
    shot_type: str = "hero",
    special_instructions: str | None = None,
    ratio_id: str | None = None,
    detection: dict | None = None,
) -> str:
    """Concise hero prompt — descriptive, not defensive.

    Research shows image gen models work best with 30-80 word prompts focused
    on WHAT to produce, not lists of DON'Ts. The input image already shows the
    product; the detection data tells the model what to preserve.
    """
    bg_prompt = JEWELRY_BACKGROUND_PROMPTS.get(background_id, JEWELRY_BACKGROUND_PROMPTS["black-velvet"])
    shape_hint = RATIO_SHAPE_HINTS.get(ratio_id or "square", RATIO_SHAPE_HINTS["square"])
    count_str = _jewelry_count_str(detection, jewelry_type)

    # Build rich product description from detection
    product_desc = ""
    if detection:
        from app.services.detection_service import JewelryDetection
        if isinstance(detection, dict):
            try:
                det_obj = JewelryDetection(**{k: v for k, v in detection.items() if k in JewelryDetection.__dataclass_fields__})
            except Exception:
                det_obj = JewelryDetection(primary_description=str(detection.get("primary_description", "")))
        else:
            det_obj = detection
        product_desc = build_product_description(det_obj)

    parts = []

    # 1. What to shoot
    parts.append(f"Professional product photography of this {jewelry_type} on {bg_prompt}.")

    # 2. Product identity (from detection)
    if product_desc:
        parts.append(f"THE PRODUCT: {product_desc}")

    # 3. Core task — one clear instruction
    parts.append(
        f"TASK: Replace background only. Keep the jewelry identical to input — "
        f"same metal, stones, design, proportions. Output must contain {count_str}."
    )

    # 4. Conditional one-liners from detection
    if detection:
        flags = []
        if detection.get("has_props"):
            props = detection.get("props_list", [])
            flags.append(f"Remove {', '.join(props) if props else 'all props'}")
        if detection.get("has_reflections"):
            flags.append("Remove camera reflections from metal surfaces")
        if detection.get("is_cropped"):
            flags.append("Product is partially cropped — preserve as-is, do not crop further")
        if detection.get("is_low_quality"):
            flags.append("Low quality input — preserve existing details, do not invent new ones")
        if flags:
            parts.append(". ".join(flags) + ".")

    # 5. Special instructions
    if special_instructions and special_instructions.strip():
        parts.append(special_instructions.strip())

    # 6. Output format
    parts.append(f"Output: {shape_hint}, clean studio lighting, catalog-ready, no watermarks.")

    return " ".join(parts)


def build_jewelry_regen_prompt(
    jewelry_type: str,
    background_id: str,
    special_instructions: str | None = None,
) -> str:
    """Focused regen/edit prompt — shorter, keeps Gemini on task."""
    bg_prompt = JEWELRY_BACKGROUND_PROMPTS.get(background_id, JEWELRY_BACKGROUND_PROMPTS["black-velvet"])
    object_count = JEWELRY_OBJECT_COUNT.get(jewelry_type, f"EXACTLY 1 {jewelry_type}")

    if special_instructions and special_instructions.strip():
        return (
            f"Edit this jewelry product photo.\n\n"
            f"APPLY THIS CHANGE:\n"
            f"- {special_instructions.strip()}\n\n"
            f"STRICT RULES:\n"
            f"- Jewelry MUST remain IDENTICAL in design.\n"
            f"- Do NOT change stones, metal, shape, or proportions.\n"
            f"- Do NOT alter item count. Output MUST contain {object_count}.\n"
            f"- Background MUST remain: {bg_prompt}.\n"
            f"- Keep professional product framing.\n"
            f"- Do NOT reinterpret this {jewelry_type} as another category."
        )

    return build_jewelry_prompt(jewelry_type, background_id, "hero")


def build_recolor_prompt(jewelry_type: str, target_metal: str) -> str:
    return (
        f"Recolor ONLY the metal parts of this {jewelry_type} to {target_metal}.\n\n"
        f"CRITICAL RULES:\n"
        f"- ONLY change the metal color/tone/finish (the gold, silver, platinum, copper, brass parts)\n"
        f"- DO NOT change diamonds, gemstones, pearls, beads, enamel, or any non-metal elements\n"
        f"- DO NOT change the color of any stones — they must remain exactly as they are\n"
        f"- Keep the exact same design, shape, proportions, engravings, and textures\n"
        f"- Background, lighting, shadows, and camera angle must stay identical\n"
        f"- The metal should look realistic with proper reflections and luster for {target_metal}\n"
        f"- The jewelry MUST be IDENTICAL to the input — same stones, same design, same proportions.\n"
        f"- Do NOT add, remove, or change any detail."
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


# ─── Theme-aware Jewelry Prompt Builder ───

def build_jewelry_theme_prompt(
    jewelry_type: str,
    theme_id: str,
    shot_id: str = "hero",
    additional_details: str | None = None,
    theme_color_override: str | None = None,
    special_instructions: str | None = None,
    ratio_id: str | None = None,
    detection: dict | None = None,
) -> str:
    """Concise theme prompt — scene description + product identity."""
    from app.services.theme_service import build_theme_prompt, get_theme_by_id

    theme = get_theme_by_id(theme_id)
    if not theme:
        return build_jewelry_prompt(jewelry_type, "black-velvet", "hero", special_instructions, ratio_id, detection)

    scene_prompt = build_theme_prompt(theme_id, shot_id, additional_details, theme_color_override)
    shape_hint = RATIO_SHAPE_HINTS.get(ratio_id or "square", RATIO_SHAPE_HINTS["square"])
    count_str = _jewelry_count_str(detection, jewelry_type)

    # Build rich product description from detection
    product_desc = ""
    if detection:
        from app.services.detection_service import JewelryDetection
        if isinstance(detection, dict):
            try:
                det_obj = JewelryDetection(**{k: v for k, v in detection.items() if k in JewelryDetection.__dataclass_fields__})
            except Exception:
                det_obj = JewelryDetection(primary_description=str(detection.get("primary_description", "")))
        else:
            det_obj = detection
        product_desc = build_product_description(det_obj)

    parts = []

    # 1. What to shoot
    parts.append(f"Professional product photography of this {jewelry_type}.")

    # 2. Product identity
    if product_desc:
        parts.append(f"THE PRODUCT: {product_desc}")

    # 3. Scene
    parts.append(f"SCENE: {scene_prompt}")

    # 4. Core task
    parts.append(
        f"TASK: Place jewelry in this scene. Keep it identical to input — "
        f"same metal, stones, design, proportions. Output must contain {count_str}."
    )

    # 5. Conditional flags
    if detection:
        flags = []
        if detection.get("has_props"):
            props = detection.get("props_list", [])
            flags.append(f"Remove {', '.join(props) if props else 'all props'}")
        if detection.get("has_reflections"):
            flags.append("Remove camera reflections from metal surfaces")
        if detection.get("is_cropped"):
            flags.append("Product is partially cropped — preserve as-is")
        if detection.get("is_low_quality"):
            flags.append("Low quality input — preserve existing details only")
        if flags:
            parts.append(". ".join(flags) + ".")

    # 6. Special instructions
    if special_instructions and special_instructions.strip():
        parts.append(special_instructions.strip())

    # 7. Output format
    parts.append(f"Output: {shape_hint}, natural lighting matching the scene, catalog-ready, no watermarks.")

    return " ".join(parts)


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
