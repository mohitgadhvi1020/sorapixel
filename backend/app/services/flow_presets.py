from __future__ import annotations

"""Flow video presets — category-specific first→last frame story arcs.

Each preset defines:
- first_frame_style: how to re-shoot the product for the opening frame
- last_frame_pose: UGC pose for the closing frame
- transition_prompt: cinematic prompt for the video interpolation
- label / description for the UI
"""

FLOW_PRESETS: dict[str, list[dict]] = {
    "ring": [
        {
            "id": "proposal",
            "label": "Proposal Moment",
            "description": "Ring in velvet box → slid onto a finger",
            "first_frame_style": (
                "The ring resting inside an open dark velvet ring box on a soft surface. "
                "Dramatic warm spotlight from above, shallow depth of field, the ring is the hero. "
                "Moody, intimate atmosphere — like a proposal is about to happen."
            ),
            "last_frame_pose": "finger_macro",
            "transition_prompt": (
                "A hand gently lifts the ring from the velvet box and slowly slides it onto a finger. "
                "Intimate warm lighting, shallow depth of field, cinematic slow motion. "
                "The camera follows the ring from box to finger in one smooth movement."
            ),
        },
        {
            "id": "daily_wear",
            "label": "Morning Ritual",
            "description": "Ring on marble surface → hand holding a coffee cup",
            "first_frame_style": (
                "The ring placed on a white marble surface next to a ceramic coffee cup, "
                "soft morning window light streaming in from the left, warm tones, "
                "shallow depth of field with the ring sharp and the cup slightly blurred."
            ),
            "last_frame_pose": "hand_closeup",
            "transition_prompt": (
                "A hand reaches into frame and picks up the ring from the marble surface, "
                "slides it onto a finger, then wraps around the warm coffee cup. "
                "Soft morning light, gentle camera drift, cozy intimate mood."
            ),
        },
        {
            "id": "detail_reveal",
            "label": "Detail Reveal",
            "description": "Extreme macro of ring details → worn on hand",
            "first_frame_style": (
                "Extreme macro close-up of the ring showing every detail — the stone facets, "
                "the metal grain, the setting prongs. Tack-sharp focus, dark background, "
                "single dramatic spotlight catching the sparkle. Jewelry campaign quality."
            ),
            "last_frame_pose": "hand_closeup",
            "transition_prompt": (
                "Slow cinematic pull-back from an extreme close-up of the ring's details, "
                "gradually revealing it on a hand in natural light. "
                "Smooth continuous zoom out, transitioning from dramatic studio to warm lifestyle."
            ),
        },
    ],

    "necklace": [
        {
            "id": "getting_ready",
            "label": "Getting Ready",
            "description": "Necklace on vanity → clasped around the neck",
            "first_frame_style": (
                "The necklace draped elegantly on a vanity table near a mirror, "
                "surrounded by soft morning light. A few tasteful props — a small perfume bottle, "
                "a fresh flower. Warm, feminine, aspirational mood."
            ),
            "last_frame_pose": "neck_macro",
            "transition_prompt": (
                "Hands gently lift the necklace from the vanity and bring it up to the neck. "
                "The clasp closes, and the camera settles on a close-up of the necklace "
                "resting beautifully on the collarbone. Warm golden light, cinematic."
            ),
        },
        {
            "id": "grand_reveal",
            "label": "Grand Reveal",
            "description": "Necklace on dark velvet → model wearing it, walking in",
            "first_frame_style": (
                "The necklace displayed on a dark navy velvet surface, dramatically lit "
                "from above with a single warm spotlight. Deep shadows, luxury feel, "
                "the necklace glowing against the dark fabric."
            ),
            "last_frame_pose": "standing",
            "transition_prompt": (
                "Cinematic slow zoom out from the necklace on velvet, dissolving into "
                "a woman wearing the necklace, walking confidently toward the camera. "
                "Dramatic lighting transitions from moody studio to bright lifestyle."
            ),
        },
        {
            "id": "mirror_moment",
            "label": "Mirror Moment",
            "description": "Necklace flat lay → admiring it in a mirror",
            "first_frame_style": (
                "The necklace laid flat in a perfect circle on a soft cream silk fabric, "
                "shot from directly above. Even, soft lighting, minimal and elegant. "
                "Clean e-commerce aesthetic."
            ),
            "last_frame_pose": "close_up",
            "transition_prompt": (
                "The necklace is picked up from the silk fabric, and the scene transitions "
                "to a woman looking at herself in a mirror, touching the necklace at her neck. "
                "Warm natural light, intimate and personal moment."
            ),
        },
    ],

    "pendant": [
        {
            "id": "unboxing",
            "label": "Unboxing",
            "description": "Pendant in gift box → worn on chest",
            "first_frame_style": (
                "The pendant nestled in a luxury gift box with satin lining, "
                "the box lid partially open. Warm spotlight from above, "
                "the pendant catching light beautifully. Gift-giving mood."
            ),
            "last_frame_pose": "neck_macro",
            "transition_prompt": (
                "Hands carefully lift the pendant from the gift box by its chain, "
                "and the scene transitions to the pendant resting on the chest, "
                "catching light as the person breathes gently. Cinematic, warm."
            ),
        },
        {
            "id": "sparkle_catch",
            "label": "Light Catcher",
            "description": "Pendant catching dramatic light → worn casually",
            "first_frame_style": (
                "The pendant suspended in mid-air against a dark background, "
                "a beam of light hitting it and creating prismatic reflections. "
                "Dramatic, high-contrast, jewelry campaign photography."
            ),
            "last_frame_pose": "standing",
            "transition_prompt": (
                "The floating pendant descends and the scene transforms — "
                "a woman in casual elegant clothing with the pendant around her neck, "
                "walking through dappled sunlight. From fantasy to reality."
            ),
        },
    ],

    "earring": [
        {
            "id": "put_on",
            "label": "Putting On",
            "description": "Earrings on fabric → being worn, hair tucked back",
            "first_frame_style": (
                "A pair of earrings resting on a soft blush-pink fabric, "
                "shot from slightly above. Soft diffused lighting, "
                "delicate and feminine mood. Both earrings clearly visible."
            ),
            "last_frame_pose": "ear_macro",
            "transition_prompt": (
                "A hand picks up one earring and brings it to the ear. "
                "Hair is tucked behind the ear as the earring is put on. "
                "Camera settles on a close-up of the earring catching light "
                "as the head turns slightly. Elegant, slow motion."
            ),
        },
        {
            "id": "head_turn",
            "label": "Head Turn",
            "description": "Single earring studio shot → model turning head, earring swinging",
            "first_frame_style": (
                "A single earring photographed against a clean gradient background, "
                "perfectly lit to show every detail. Studio product photography, "
                "sharp and precise."
            ),
            "last_frame_pose": "side_view",
            "transition_prompt": (
                "The scene transitions from the studio shot to a model turning her head "
                "in profile. The earring swings gently with the movement, catching light. "
                "Cinematic slow motion, hair flowing, natural and graceful."
            ),
        },
    ],

    "bracelet": [
        {
            "id": "stack_style",
            "label": "Stack & Style",
            "description": "Bracelet on marble → stacked on wrist",
            "first_frame_style": (
                "The bracelet coiled on a white marble surface, "
                "shot from above at 45 degrees. Clean, bright lighting, "
                "minimal styling. The bracelet's details clearly visible."
            ),
            "last_frame_pose": "wrist_macro",
            "transition_prompt": (
                "A hand slides the bracelet onto the wrist, joining other subtle pieces. "
                "The camera settles on a close-up of the styled wrist, "
                "the bracelet catching light as the hand moves gracefully."
            ),
        },
        {
            "id": "gesture",
            "label": "In Motion",
            "description": "Bracelet on display → hand gesturing, bracelet catching light",
            "first_frame_style": (
                "The bracelet displayed on a small velvet jewelry stand, "
                "warm directional lighting creating elegant shadows. "
                "Luxury retail display aesthetic."
            ),
            "last_frame_pose": "hand_closeup",
            "transition_prompt": (
                "The bracelet slides onto a wrist and the hand begins to gesture naturally — "
                "reaching for a glass, touching a surface. The bracelet moves with the wrist, "
                "catching light with every motion. Natural, candid, lifestyle."
            ),
        },
    ],

    "bangle": [
        {
            "id": "slide_on",
            "label": "Slide On",
            "description": "Bangles arranged flat → sliding onto forearm",
            "first_frame_style": (
                "Multiple bangles arranged in a neat row on a dark wooden surface, "
                "warm overhead lighting. Each bangle's design clearly visible. "
                "Organized, satisfying arrangement."
            ),
            "last_frame_pose": "wrist_macro",
            "transition_prompt": (
                "Hands pick up the bangles one by one, sliding them onto the forearm. "
                "They stack naturally, clinking softly. Camera settles on the forearm "
                "with all bangles in place, catching warm light. Satisfying, ASMR-like."
            ),
        },
    ],

    "watch": [
        {
            "id": "power_move",
            "label": "Power Move",
            "description": "Watch face-up on dark surface → on wrist, hand on desk",
            "first_frame_style": (
                "The watch face-up on a dark leather surface or desk pad, "
                "dramatic side lighting highlighting the dial and case. "
                "The watch crown and bracelet details clearly visible. "
                "Masculine, powerful, executive mood."
            ),
            "last_frame_pose": "wrist_macro",
            "transition_prompt": (
                "A hand picks up the watch and straps it onto the wrist with a confident motion. "
                "The hand then rests on a dark desk surface. Camera settles on the watch face, "
                "the second hand ticking. Powerful, cinematic, executive energy."
            ),
        },
        {
            "id": "time_check",
            "label": "Time Check",
            "description": "Watch on display stand → wrist raised checking time",
            "first_frame_style": (
                "The watch displayed on a minimal watch stand, "
                "clean background with soft even lighting. "
                "The dial, hands, and strap clearly visible. "
                "Premium retail display photography."
            ),
            "last_frame_pose": "hand_closeup",
            "transition_prompt": (
                "Smooth transition from the display to the watch on a wrist. "
                "The person raises their arm to check the time, "
                "natural daylight catching the watch face. "
                "Casual, confident, everyday luxury."
            ),
        },
    ],

    "anklet": [
        {
            "id": "beach_walk",
            "label": "Beach Walk",
            "description": "Anklet on light fabric → feet walking on sand",
            "first_frame_style": (
                "The anklet laid on a light linen fabric, "
                "bright natural lighting, airy and summery mood. "
                "The delicate chain and charms clearly visible."
            ),
            "last_frame_pose": "ankle_macro",
            "transition_prompt": (
                "The anklet is clasped around an ankle, and the feet begin to walk "
                "on warm sand. The anklet catches sunlight with each step. "
                "Warm golden hour light, carefree summer mood, gentle slow motion."
            ),
        },
    ],

    "brooch": [
        {
            "id": "pin_it",
            "label": "Style It",
            "description": "Brooch on fabric → pinned on blazer lapel",
            "first_frame_style": (
                "The brooch resting on a folded piece of dark fabric, "
                "dramatic spotlight from above creating a pool of light. "
                "The brooch's details — stones, metalwork, pin — clearly visible."
            ),
            "last_frame_pose": "lapel_macro",
            "transition_prompt": (
                "Hands carefully pick up the brooch and pin it onto a blazer lapel. "
                "Camera pulls back slightly to show the brooch as the finishing touch "
                "on a well-styled outfit. Confident, polished, editorial."
            ),
        },
    ],

    "chain": [
        {
            "id": "layer_up",
            "label": "Layer Up",
            "description": "Chain on clean surface → layered on neck",
            "first_frame_style": (
                "The chain arranged in a gentle S-curve on a white surface, "
                "shot from directly above. Clean, bright, minimal. "
                "Every link clearly visible."
            ),
            "last_frame_pose": "neck_macro",
            "transition_prompt": (
                "The chain is lifted and draped around the neck, "
                "layered with the person's existing look. "
                "Camera settles on a close-up of the chain on the neck, "
                "catching light as the person moves slightly. Natural, effortless."
            ),
        },
    ],

    "set": [
        {
            "id": "full_look",
            "label": "Full Look",
            "description": "All pieces in flat lay → model wearing complete set",
            "first_frame_style": (
                "All jewelry pieces from the set arranged in a beautiful flat lay — "
                "necklace at top, earrings on sides, ring and bracelet below. "
                "Shot from directly above on a dark velvet surface. "
                "Perfectly organized, symmetrical, luxury editorial."
            ),
            "last_frame_pose": "standing",
            "transition_prompt": (
                "Cinematic transition from the flat lay arrangement to a model "
                "wearing every piece of the set. Slow reveal from a close-up "
                "of one piece to a full-body shot showing the complete styled look. "
                "Dramatic, editorial, fashion show energy."
            ),
        },
        {
            "id": "piece_by_piece",
            "label": "Piece by Piece",
            "description": "Set displayed on stand → close-up of pieces being worn",
            "first_frame_style": (
                "The jewelry set displayed on a tiered jewelry stand, "
                "each piece on its own level. Warm gallery lighting, "
                "museum-like presentation. Premium, aspirational."
            ),
            "last_frame_pose": "close_up",
            "transition_prompt": (
                "Quick montage-style transition — each piece lifts from the stand "
                "and appears on the model. The camera settles on a beauty shot "
                "of the model wearing the complete set, glowing with confidence."
            ),
        },
    ],

    "mangalsutra": [
        {
            "id": "sacred_moment",
            "label": "Sacred Moment",
            "description": "Mangalsutra on silk → worn with traditional outfit",
            "first_frame_style": (
                "The mangalsutra laid on a rich red silk fabric with gold border, "
                "traditional Indian aesthetic. Warm lighting, the black beads "
                "and gold pendant clearly visible. Auspicious, sacred mood."
            ),
            "last_frame_pose": "neck_macro",
            "transition_prompt": (
                "Hands reverently lift the mangalsutra and place it around the neck. "
                "The camera settles on the mangalsutra resting on the chest "
                "over a beautiful saree. Warm, emotional, traditional."
            ),
        },
    ],
}

VIDEO_ENGINES = [
    {
        "id": "seedance",
        "label": "Seedance 2.0",
        "description": "Best for smooth transitions between two frames",
        "supports_first_last": True,
        "provider": "fal",
    },
    {
        "id": "kling",
        "label": "Kling O1",
        "description": "Great for person-heavy cinematic transitions",
        "supports_first_last": True,
        "provider": "fal",
    },
    {
        "id": "veo2",
        "label": "Veo 2",
        "description": "Google's model — uses your existing credits",
        "supports_first_last": False,
        "provider": "google",
    },
]


def get_presets_for_category(category: str) -> list[dict]:
    return FLOW_PRESETS.get(category, FLOW_PRESETS.get("necklace", []))


def get_preset(category: str, preset_id: str) -> dict | None:
    for p in FLOW_PRESETS.get(category, []):
        if p["id"] == preset_id:
            return p
    return None
