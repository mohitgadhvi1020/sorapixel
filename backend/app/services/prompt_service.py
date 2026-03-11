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
        f"Commercial quality, high resolution, perfectly lit.\n"
        f"The product must cast a natural, soft shadow on the surface beneath it — "
        f"a realistic contact shadow and a subtle diffused drop shadow to give the product a grounded, three-dimensional appearance. "
        f"The shadow should look physically accurate as if the product is sitting on the surface under studio lighting.\n\n"
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
        "poses": ["finger_macro", "hand_closeup", "standing", "side_view"],
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
    "best_match": "in a natural, confident pose that best showcases the product. Frame as a 3/4-length portrait (head to mid-thigh). The head must sit in the upper 20% of the canvas with empty space above the crown",
    "standing": "standing upright in a confident stance facing the camera. Full-length shot from feet to well above the head. Zoom out enough so the full body fits with generous headroom — the head should be at roughly 15-20% from the top edge",
    "side_view": "in a side profile pose, head to knees visible. The head in profile must be fully within frame with clear sky/background above the hair",
    "back_view": "showing the back from head to knees, looking slightly over shoulder. The complete top of the head and all hair must be well within the frame, not touching the top edge",
    "sitting": "sitting elegantly on a chair or stool. Frame from well above the head to the knees. Head positioned in upper 20% of image with clear space above",
    "close_up": "a close-up portrait from chest/shoulders up. Face centered and fully visible (forehead to chin) with clear space above the head. Beauty shot — face sharp, well-lit, primary focus",
    "walking": "in a natural walking pose, full-body mid-stride. Zoom out to fit entire body with the head at roughly 15% from the top edge of the frame",
    "hand_closeup": "a close-up of the hand and wrist area, elegantly posed to showcase jewelry on the fingers or wrist. Shallow depth of field, hand sharp and well-lit",
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

MACRO_POSE_TYPES = {"finger_macro", "ear_macro", "neck_macro", "wrist_macro", "ankle_macro", "lapel_macro"}

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

    if is_macro_pose:
        prompt = (
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
        prompt += (
            "\nCOMPOSITION GUIDE:\n"
            "- Frame as a 3/4-length or full-length portrait (head to below knees minimum)\n"
            "- Camera at chest/waist height, angled slightly up toward the face\n"
            "- The model's face should be sharp, well-lit, and the anchor point of the composition\n"
            "- Leave generous headroom — the top of the frame should have empty background above the hair\n"
            "- NEVER frame so tight that the head touches or exits the top edge\n\n"
            "QUALITY RULES:\n"
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


def build_jewelry_prompt(
    jewelry_type: str,
    background_id: str,
    shot_type: str = "hero",
    special_instructions: str | None = None,
    ratio_id: str | None = None,
    detection: dict | None = None,
) -> str:
    """Master hero prompt — structured sections for Gemini image models.
    When `detection` dict is provided (from detect_jewelry_input), uses real
    item counts and injects conditional defense layers for reflections/quality/cropping.
    """
    bg_prompt = JEWELRY_BACKGROUND_PROMPTS.get(background_id, JEWELRY_BACKGROUND_PROMPTS["black-velvet"])
    type_rules = JEWELRY_TYPE_RULES.get(jewelry_type, JEWELRY_TYPE_RULES.get("ring", ""))
    shape_hint = RATIO_SHAPE_HINTS.get(ratio_id or "square", RATIO_SHAPE_HINTS["square"])

    # Use detection results for object count, fall back to static defaults
    if detection:
        count = detection.get("item_count", 1)
        components = detection.get("components", [])
        if detection.get("is_set") and components:
            count_str = f"EXACTLY these {count} items: {', '.join(components)}"
        elif detection.get("is_pair"):
            count_str = f"EXACTLY {count} items (a matching pair). BOTH pieces MUST be visible"
        else:
            count_str = f"EXACTLY {count} {jewelry_type}{'s' if count > 1 else ''}"
    else:
        count_str = JEWELRY_OBJECT_COUNT.get(jewelry_type, f"EXACTLY 1 {jewelry_type}")

    sections = []

    # SECTION 1: Role
    sections.append(
        "You are a professional high-end jewelry product photographer and retouching expert."
    )

    # SECTION 2: Object preservation — the most critical block
    sections.append(
        "OBJECT PRESERVATION — CRITICAL\n"
        "- The jewelry design MUST remain 100% IDENTICAL to the input image.\n"
        "- Do NOT redesign, enhance, beautify, or modify stones.\n"
        "- Do NOT change stone shape, count, size, setting, metal color, engraving, or proportions.\n"
        "- Do NOT add or remove parts.\n"
        "- If multiple items are present, preserve ALL items.\n"
        "- Maintain exact geometry and symmetry.\n"
        "- Preserve the EXACT color palette — every metal tone, gemstone hue, and surface finish.\n"
        "- This is a background replacement and professional cleanup task ONLY."
    )

    # SECTION 3: Object count — uses real detection when available
    sections.append(
        f"OBJECT COUNT — MANDATORY\n"
        f"- The output MUST contain {count_str}.\n"
        f"- Do NOT merge, duplicate, remove, or hide items.\n"
        f"- If it is a pair (like earrings), both pieces MUST be visible."
    )

    # SECTION 3b: Reference description — helps reduce hallucinations
    if detection and detection.get("primary_description"):
        sections.append(
            "REFERENCE DESCRIPTION (from input analysis)\n"
            f"- {str(detection.get('primary_description')).strip()}"
        )

    # SECTION 4: Category-specific geometry rules
    sections.append(
        f"CATEGORY RULES — {jewelry_type.upper()}\n"
        f"{type_rules}"
    )

    # SECTION 5: Category consistency — prevents AI from reinterpreting
    sections.append(
        "CATEGORY CONSISTENCY RULE\n"
        f"- This is a {jewelry_type}. Do NOT reinterpret as another category.\n"
        "- Do NOT convert between ring, bracelet, bangle, chain, necklace, or pendant."
    )

    # SECTION 6: Background
    sections.append(
        f"BACKGROUND\n"
        f"- Replace the background with: {bg_prompt}.\n"
        f"- Keep realistic natural contact shadows under the jewelry.\n"
        f"- Lighting must look like a real studio photograph (soft diffusion, controlled highlights).\n"
        f"- Do NOT introduce harsh directional shadows, blown highlights, or mirror-like chrome reflections."
    )

    # SECTION 7: Cleanup — handle messy user uploads
    cleanup_lines = [
        "CLEANUP RULES",
        "- Remove all hands, stands, boxes, tags, and props — show ONLY the jewelry.",
        "- Remove dust, scratches, and fingerprints from surfaces.",
        "- Do NOT oversharpen.",
        "- Do NOT smooth fine details.",
        "- No text, logos, watermarks, frames, or borders.",
        "",
        "REFLECTION CLEANUP — CRITICAL",
        "- Remove camera reflections, photographer reflections, and environmental glare.",
        "- Eliminate mirror-like artifacts on metal surfaces.",
        "- Preserve original metal color and finish.",
        "- Do NOT blur surface details.",
        "- Do NOT alter engraving or stone edges.",
        "- Use soft diffused studio lighting.",
        "- Avoid harsh specular hotspots.",
        "- Maintain natural metal sheen without mirror reflections.",
        "",
        "MATERIAL REALISM — CRITICAL",
        "- Metal must look like real jewelry metal (gold/silver/platinum) — not plastic, not painted, not chrome.",
        "- Gemstones must keep their true cut and color; no neon glow, no color shifts, no shape changes.",
    ]
    sections.append("\n".join(cleanup_lines))

    # SECTION 8: Color fidelity — prevents AI from recoloring or filling open areas
    sections.append(
        "COLOR FIDELITY — CRITICAL\n"
        "- Preserve the EXACT color palette from the input image.\n"
        "- Metal tone must match precisely: if input shows antique gold, output must be the same antique gold — not brighter, not rosier, not shinier.\n"
        "- Gemstone and stone colors must be pixel-accurate — do NOT shift hues.\n"
        "- Do NOT reinterpret transparent, open, or see-through areas as solid colored surfaces.\n"
        "- If the jewelry has filigree, jali work, cutout patterns, or openwork mesh, those openings MUST remain open/transparent — do NOT fill them with solid enamel or color.\n"
        "- If the input shows bare metal behind openwork, reproduce bare metal — do NOT add enamel, paint, or colored fill.\n"
        "- Enamel areas must retain their exact original color — do NOT intensify, brighten, or change the hue.\n"
        "- Pearl, kundan, polki, and meenakari elements must retain their original appearance without color shifts."
    )

    # SECTION 9: Conditional defense layers — injected from detection
    if detection:
        defenses = []

        if detection.get("has_reflections"):
            defenses.append(
                "⚠️ REFLECTION DETECTED — HIGH PRIORITY\n"
                "- The input contains visible camera or environment reflections on metal surfaces.\n"
                "- Remove these reflections COMPLETELY while preserving surface geometry.\n"
                "- Do NOT modify design or metal tone.\n"
                "- Normalize metal reflections to clean studio finish.\n"
                "- Maintain realistic metallic shine without mirror artifacts.\n"
                "- If reflection overlaps a stone or engraving, carefully separate and preserve the detail underneath."
            )

        if detection.get("has_props"):
            props = detection.get("props_list", [])
            props_str = ", ".join(props) if props else "hands/stands/props"
            defenses.append(
                f"PROPS DETECTED\n"
                f"- The input contains: {props_str}.\n"
                f"- Remove ALL props completely.\n"
                f"- Reconstruct any jewelry geometry hidden behind props.\n"
                f"- Show ONLY the jewelry on the background."
            )

        if detection.get("is_low_quality"):
            defenses.append(
                "LOW QUALITY INPUT\n"
                "- The input image is low resolution or blurry.\n"
                "- Preserve all EXISTING fine details — do NOT hallucinate new ones.\n"
                "- Do NOT invent stone shapes, engravings, or patterns not visible in the input.\n"
                "- Enhance clarity only where details are already visible."
            )

        if detection.get("is_cropped"):
            defenses.append(
                "CROPPED INPUT\n"
                "- Parts of the jewelry may be cut off at the image edges.\n"
                "- Do NOT crop further. Preserve full geometry as visible.\n"
                "- If reconstructing cropped edges, match the existing design exactly."
            )

        for d in defenses:
            sections.append(d)

    # SECTION 10: Framing
    sections.append(
        "FRAMING\n"
        "- Entire jewelry MUST be fully visible — nothing cropped or cut off at any edge.\n"
        "- Even padding on all sides.\n"
        "- Center composition.\n"
        "- Keep exact original perspective and angle."
    )

    # SECTION 11: Output spec
    sections.append(
        f"OUTPUT\n"
        f"- Generate {shape_hint}.\n"
        f"- Professional studio product photo.\n"
        f"- Ultra clean, commercial catalog ready.\n"
        f"- Background MUST be uniform and consistent edge-to-edge — no vignette or dark borders."
    )

    # SECTION 12: Special instructions (optional)
    if special_instructions and special_instructions.strip():
        sections.append(
            f"ADDITIONAL REQUEST\n"
            f"- {special_instructions.strip()}"
        )

    return "\n\n".join(sections)


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
    """Build a jewelry prompt using the theme system instead of simple background IDs.

    This wraps build_jewelry_prompt but replaces the background with a full
    theme scene prompt + shot-specific instructions.
    """
    from app.services.theme_service import build_theme_prompt, get_theme_by_id

    theme = get_theme_by_id(theme_id)
    if not theme:
        return build_jewelry_prompt(jewelry_type, "black-velvet", "hero", special_instructions, ratio_id, detection)

    scene_prompt = build_theme_prompt(theme_id, shot_id, additional_details, theme_color_override)
    type_rules = JEWELRY_TYPE_RULES.get(jewelry_type, JEWELRY_TYPE_RULES.get("ring", ""))
    shape_hint = RATIO_SHAPE_HINTS.get(ratio_id or "square", RATIO_SHAPE_HINTS["square"])

    if detection:
        count = detection.get("item_count", 1)
        components = detection.get("components", [])
        if detection.get("is_set") and components:
            count_str = f"EXACTLY these {count} items: {', '.join(components)}"
        elif detection.get("is_pair"):
            count_str = f"EXACTLY {count} items (a matching pair). BOTH pieces MUST be visible"
        else:
            count_str = f"EXACTLY {count} {jewelry_type}{'s' if count > 1 else ''}"
    else:
        count_str = JEWELRY_OBJECT_COUNT.get(jewelry_type, f"EXACTLY 1 {jewelry_type}")

    sections = []

    sections.append(
        "You are a professional high-end jewelry product photographer and retouching expert."
    )

    sections.append(
        "OBJECT PRESERVATION — CRITICAL\n"
        "- The jewelry design MUST remain 100% IDENTICAL to the input image.\n"
        "- Do NOT redesign, enhance, beautify, or modify stones.\n"
        "- Do NOT change stone shape, count, size, setting, metal color, engraving, or proportions.\n"
        "- Do NOT add or remove parts.\n"
        "- Preserve the EXACT color palette — every metal tone, gemstone hue, and surface finish.\n"
        "- This is a background replacement and professional cleanup task ONLY."
    )

    sections.append(
        f"OBJECT COUNT — MANDATORY\n"
        f"- The output MUST contain {count_str}.\n"
        f"- Do NOT merge, duplicate, remove, or hide items.\n"
        f"- If it is a pair (like earrings), both pieces MUST be visible."
    )

    if detection and detection.get("primary_description"):
        sections.append(
            "REFERENCE DESCRIPTION (from input analysis)\n"
            f"- {str(detection.get('primary_description')).strip()}"
        )

    sections.append(
        f"CATEGORY RULES — {jewelry_type.upper()}\n"
        f"{type_rules}"
    )

    sections.append(
        f"SCENE & COMPOSITION\n"
        f"- {scene_prompt}"
    )

    if shot_id in {"angle_3_4", "angle_side", "top_down"}:
        sections.append(
            "ANGLE VARIANT SAFETY RULES\n"
            "- Preserve exact design, proportions, and item count.\n"
            "- Do NOT warp, stretch, melt, or change thickness.\n"
            "- If the requested angle would require guessing hidden geometry, keep the variation subtle rather than inventing details."
        )

    cleanup_lines = [
        "CLEANUP RULES",
        "- Remove all hands, stands, boxes, tags, and props — show ONLY the jewelry.",
        "- Remove dust, scratches, and fingerprints from surfaces.",
        "",
        "REFLECTION CLEANUP — CRITICAL",
        "- Remove camera reflections, photographer reflections, and environmental glare.",
        "- Eliminate mirror-like artifacts on metal surfaces.",
        "- Preserve original metal color and finish.",
        "- Do NOT blur surface details.",
        "- Do NOT alter engraving or stone edges.",
        "- Use soft diffused studio lighting.",
        "- Avoid harsh specular hotspots.",
        "- Maintain natural metal sheen without mirror reflections.",
        "- No text, logos, watermarks, frames, or borders.",
        "",
        "MATERIAL REALISM — CRITICAL",
        "- Metal must look like real jewelry metal — not plastic, not painted, not chrome.",
        "- Gemstones must keep their true cut and color; no glow effects or hue shifts.",
    ]
    sections.append("\n".join(cleanup_lines))

    sections.append(
        "COLOR FIDELITY — CRITICAL\n"
        "- Preserve the EXACT color palette from the input image.\n"
        "- Metal tone must match precisely.\n"
        "- Gemstone and stone colors must be pixel-accurate — do NOT shift hues.\n"
        "- Do NOT reinterpret transparent or open areas as solid colored surfaces.\n"
        "- If the jewelry has filigree or openwork, those openings MUST remain open."
    )

    if detection:
        defenses = []
        if detection.get("has_reflections"):
            defenses.append(
                "⚠️ REFLECTION DETECTED — HIGH PRIORITY\n"
                "- The input contains visible camera or environment reflections on metal surfaces.\n"
                "- Remove these reflections COMPLETELY while preserving surface geometry.\n"
                "- Do NOT modify design or metal tone.\n"
                "- Normalize metal reflections to clean studio finish.\n"
                "- Maintain realistic metallic shine without mirror artifacts.\n"
                "- If reflection overlaps a stone or engraving, carefully separate and preserve the detail underneath."
            )
        if detection.get("has_props"):
            props = detection.get("props_list", [])
            props_str = ", ".join(props) if props else "hands/stands/props"
            defenses.append(
                f"PROPS DETECTED\n"
                f"- Remove ALL props ({props_str}). Show ONLY the jewelry on the background."
            )
        if detection.get("is_low_quality"):
            defenses.append(
                "LOW QUALITY INPUT\n"
                "- Preserve all EXISTING fine details — do NOT hallucinate new ones."
            )
        if detection.get("is_cropped"):
            defenses.append(
                "CROPPED INPUT\n"
                "- Parts of the jewelry may be cut off at the image edges.\n"
                "- Do NOT crop further. Preserve full geometry as visible.\n"
                "- If reconstructing cropped edges, match the existing design exactly."
            )
        for d in defenses:
            sections.append(d)

    sections.append(
        "FRAMING\n"
        "- Entire jewelry MUST be fully visible — nothing cropped.\n"
        "- Even padding on all sides.\n"
        "- Center composition."
    )

    sections.append(
        f"OUTPUT\n"
        f"- Generate {shape_hint}.\n"
        f"- Professional studio product photo.\n"
        f"- Ultra clean, commercial catalog ready."
    )

    if special_instructions and special_instructions.strip():
        sections.append(
            f"ADDITIONAL REQUEST\n"
            f"- {special_instructions.strip()}"
        )

    return "\n\n".join(sections)


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
