from __future__ import annotations

"""Theme service — curated photography themes with scene compositions and shot variants.

Each theme is a complete visual identity: surface, props, lighting, mood, and color palette.
Themes are browsable in a gallery and each comes with multiple configurable shot types.
"""

from typing import Optional


# ─── Shot Types (prompt variants available per theme) ───

SHOT_TYPES = {
    "hero": {
        "id": "hero",
        "name": "Hero Product Shot",
        "short_name": "Hero",
        "description": "Classic catalog-style product shot",
        "type": "product",
        "prompt_suffix": (
            "Professional catalog-style hero shot of the jewelry.\n\n"
            "Maintain the EXACT original camera angle and perspective from the input image. "
            "Do NOT rotate, tilt, or reinterpret the viewpoint.\n\n"
            "The jewelry is the sole subject. "
            "Full item must be completely visible. "
            "Centered with even spacing on all sides.\n\n"
            "Sharp focus across the entire jewelry. "
            "Clean commercial studio lighting. "
            "No dramatic shadows. "
            "No perspective distortion.\n\n"
            "Use soft diffused studio lighting. "
            "Avoid harsh specular hotspots. "
            "Maintain natural metal sheen without mirror reflections.\n\n"
            "Maintain exact proportions, structural integrity, and item count. "
            "Do NOT modify design under any circumstance."
        ),
    },
    "dramatic": {
        "id": "dramatic",
        "name": "Dramatic Angle",
        "short_name": "Dramatic",
        "description": "Cinematic presentation with enhanced lighting",
        "type": "product",
        "prompt_suffix": (
            "Dramatic studio presentation of the jewelry.\n\n"
            "Preserve the original geometry and proportions exactly. "
            "You may enhance lighting for cinematic effect, but DO NOT alter angle or structure.\n\n"
            "Jewelry remains fully visible and unobstructed. "
            "No cropping of structural components.\n\n"
            "Controlled shallow depth of field is allowed, "
            "but the entire jewelry must remain readable and intact.\n\n"
            "Specular highlights may enhance metal surfaces, "
            "but do not change stone color, size, or shape.\n"
            "No camera reflections or mirror-like artifacts on metal. "
            "Maintain controlled cinematic highlights, not raw environmental reflections.\n\n"
            "Maintain exact proportions, structural integrity, and item count. "
            "Do NOT modify design under any circumstance."
        ),
    },
    "lifestyle": {
        "id": "lifestyle",
        "name": "Lifestyle Context",
        "short_name": "Lifestyle",
        "description": "Product in natural scene with props",
        "type": "product",
        "prompt_suffix": (
            "Lifestyle presentation of the jewelry within a natural scene.\n\n"
            "The jewelry remains the primary subject. "
            "Props and background elements must NOT cover, crop, or hide any part of the jewelry.\n\n"
            "Maintain exact geometry, proportions, and structure. "
            "Do NOT reinterpret or redesign.\n\n"
            "Slightly wider framing allowed, "
            "but the full jewelry must remain clearly visible.\n\n"
            "Natural editorial lighting permitted, "
            "without altering material appearance or color accuracy.\n\n"
            "Use soft diffused lighting. "
            "Avoid harsh specular hotspots. "
            "Maintain natural metal sheen without mirror reflections.\n\n"
            "Maintain exact proportions, structural integrity, and item count. "
            "Do NOT modify design under any circumstance."
        ),
    },
    "closeup": {
        "id": "closeup",
        "name": "Detail Close-Up",
        "short_name": "Close-Up",
        "description": "High-detail macro shot preserving true scale",
        "type": "product",
        "prompt_suffix": (
            "High-detail close-up product shot.\n\n"
            "Zoom into the jewelry while preserving its true proportions. "
            "Do NOT exaggerate stone size or alter band thickness.\n\n"
            "Do NOT crop out essential structural parts unless intentionally focusing on a detail area. "
            "If focusing on a detail, preserve accurate scale.\n\n"
            "Shallow depth of field allowed, "
            "but the focused area must remain physically accurate.\n\n"
            "No artificial enhancement of craftsmanship. "
            "No added details. "
            "Maintain true geometry.\n\n"
            "Use soft diffused macro lighting. "
            "Avoid harsh specular hotspots on metal surfaces. "
            "Maintain natural metal sheen without mirror reflections.\n\n"
            "Maintain exact proportions, structural integrity, and item count. "
            "Do NOT modify design under any circumstance."
        ),
    },
    "model_standing": {
        "id": "model_standing",
        "name": "Model — Standing",
        "short_name": "Model Full",
        "description": "Full-body model shot wearing the jewelry",
        "type": "model",
        "prompt_suffix": (
            "Full-body model shot, standing confidently. "
            "The jewelry is the focal point. "
            "Professional fashion photography quality.\n\n"
            "Maintain exact proportions, structural integrity, and item count. "
            "Do NOT modify design under any circumstance."
        ),
    },
    "model_closeup": {
        "id": "model_closeup",
        "name": "Model — Close-Up",
        "short_name": "Model Close",
        "description": "Close-up portrait showing the jewelry on the model",
        "type": "model",
        "prompt_suffix": (
            "Close-up portrait from chest/shoulders up showing the jewelry prominently. "
            "Beauty shot with the jewelry as the hero element. "
            "Soft, flattering light on the model.\n\n"
            "Maintain exact proportions, structural integrity, and item count. "
            "Do NOT modify design under any circumstance."
        ),
    },
    "hand_closeup": {
        "id": "hand_closeup",
        "name": "Hand Close-Up",
        "short_name": "Hand Shot",
        "description": "Elegant hand/wrist shot for rings, bracelets, bangles",
        "type": "model",
        "prompt_suffix": (
            "Close-up of an elegant hand and wrist, posed to showcase the jewelry. "
            "Shallow depth of field, hand and jewelry sharp, background softly blurred. "
            "Nail art or neutral manicure.\n\n"
            "Maintain exact proportions, structural integrity, and item count. "
            "Do NOT modify design under any circumstance."
        ),
    },
}


# ─── Theme Definitions ───

ALL_JEWELRY_TYPES = [
    "ring", "necklace", "earring", "bracelet", "bangle",
    "pendant", "brooch", "anklet", "chain", "set",
]

THEMES: list[dict] = [
    # ── Luxury Velvet Series ──
    {
        "id": "midnight-velvet",
        "name": "Midnight Black Velvet",
        "description": "Classic black velvet surface with dramatic studio lighting. The gold standard of jewelry photography.",
        "category": "luxury",
        "preview_image": "/theme-previews/midnight-velvet.jpg",
        "default_color": "deep black",
        "status": "available",
        "jewelry_types": ALL_JEWELRY_TYPES,
        "scene_prompt": "on a rich, deep black velvet surface with subtle fabric texture visible. Dramatic studio lighting from above-left creating elegant shadows. Single focused spotlight highlighting the jewelry with a soft secondary fill light. Premium luxury jewelry photography aesthetic.",
        "shots": ["hero", "dramatic", "closeup", "lifestyle"],
        "default_shots": ["hero"],
    },
    {
        "id": "royal-burgundy-velvet",
        "name": "Royal Burgundy Velvet",
        "description": "Deep wine-red velvet with warm golden lighting. Rich and regal.",
        "category": "luxury",
        "preview_image": "/theme-previews/royal-burgundy-velvet.jpg",
        "preview_color": "#722F37",
        "default_color": "deep burgundy wine",
        "status": "available",
        "jewelry_types": ALL_JEWELRY_TYPES,
        "scene_prompt": "on a deep burgundy wine velvet surface with rich texture, warm golden lighting casting soft highlights. Royal aesthetic with dramatic shadow play. Classic fine jewelry photography.",
        "shots": ["hero", "dramatic", "closeup", "lifestyle"],
        "default_shots": ["hero"],
    },
    {
        "id": "emerald-velvet",
        "name": "Emerald Green Velvet",
        "description": "Rich emerald green velvet with warm studio lighting. Opulent and striking.",
        "category": "luxury",
        "preview_image": "/theme-previews/emerald-velvet.jpg",
        "preview_color": "#046307",
        "default_color": "rich emerald green",
        "status": "available",
        "jewelry_types": ["necklace", "earring", "pendant", "set", "bracelet", "bangle", "brooch", "chain"],
        "scene_prompt": "on a rich emerald green velvet surface, warm studio lighting with soft golden highlights. Opulent luxury feel. The deep green creates a stunning contrast with the jewelry.",
        "shots": ["hero", "dramatic", "closeup"],
        "default_shots": ["hero"],
    },
    {
        "id": "navy-velvet",
        "name": "Midnight Navy Velvet",
        "description": "Deep navy blue velvet with cool-toned sophisticated lighting.",
        "category": "luxury",
        "preview_image": "/theme-previews/navy-velvet.jpg",
        "preview_color": "#1a2a4a",
        "default_color": "deep navy blue",
        "status": "available",
        "jewelry_types": ["necklace", "earring", "pendant", "set", "ring", "bracelet", "bangle", "chain"],
        "scene_prompt": "on a deep navy blue velvet surface, cool-toned studio lighting with subtle blue highlights. Sophisticated luxury feel. Modern jewelry photography.",
        "shots": ["hero", "dramatic", "closeup"],
        "default_shots": ["hero"],
    },

    # ── Stone & Marble Series ──
    {
        "id": "white-marble-classic",
        "name": "White Marble Classic",
        "description": "Polished white marble with grey veining. Clean, bright, luxurious.",
        "category": "stone",
        "preview_image": "/theme-previews/white-marble-classic.jpg",
        "default_color": "white marble grey",
        "status": "available",
        "jewelry_types": ["ring", "earring", "pendant", "bracelet", "bangle", "necklace", "set", "brooch"],
        "scene_prompt": "on a polished white Carrara marble surface with subtle grey veining. Bright, even studio lighting with soft shadows. Clean and luxurious lifestyle feel. The marble texture adds sophistication without distraction.",
        "shots": ["hero", "dramatic", "lifestyle", "closeup"],
        "default_shots": ["hero"],
    },
    {
        "id": "dark-slate-stone",
        "name": "Charcoal Slate Stone",
        "description": "Dark textured slate stone surface with moody directional lighting.",
        "category": "stone",
        "preview_image": "/theme-previews/dark-slate-stone.jpg",
        "preview_color": "#3a3a3a",
        "default_color": "charcoal slate grey",
        "status": "available",
        "jewelry_types": ["ring", "earring", "bracelet", "bangle", "pendant", "necklace", "chain"],
        "scene_prompt": "on a dark charcoal textured slate stone surface, moody directional lighting from the side casting dramatic long shadows. The rough natural stone texture contrasts with the polished jewelry. Editorial magazine quality.",
        "shots": ["hero", "dramatic", "closeup", "lifestyle"],
        "default_shots": ["hero"],
    },
    {
        "id": "sandstone-warm",
        "name": "Sunlit Sandstone",
        "description": "Warm golden sandstone surface with natural sunlight. Desert-inspired warmth.",
        "category": "stone",
        "preview_image": "/theme-previews/sandstone-warm.jpg",
        "default_color": "warm golden sandstone",
        "status": "available",
        "jewelry_types": ["ring", "bracelet", "bangle", "anklet", "pendant", "necklace"],
        "scene_prompt": "on a warm golden sandstone surface bathed in natural sunlight. Soft warm shadows, desert-inspired golden hour aesthetic. The natural stone grain adds organic texture. Warm, inviting product photography.",
        "shots": ["hero", "lifestyle", "closeup"],
        "default_shots": ["hero"],
    },
    {
        "id": "terracotta-earth",
        "name": "Terracotta Earth",
        "description": "Warm terracotta clay surface with earthy rustic appeal.",
        "category": "stone",
        "preview_image": "/theme-previews/terracotta-earth.jpg",
        "default_color": "warm terracotta clay",
        "status": "available",
        "jewelry_types": ["ring", "bracelet", "bangle", "anklet", "pendant", "earring"],
        "scene_prompt": "on a warm terracotta clay surface with earthy natural texture. Soft natural lighting with warm tones. Rustic elegance, artisanal feel. The clay's warmth complements gold and rose gold metals beautifully.",
        "shots": ["hero", "lifestyle", "closeup"],
        "default_shots": ["hero"],
    },

    # ── Botanical & Natural Series ──
    {
        "id": "zen-stone-spa",
        "name": "Zen Stone Spa Minimal",
        "description": "Smooth zen stones with a sprig of green. Spa-like serenity.",
        "category": "botanical",
        "preview_image": "/theme-previews/zen-stone-spa.jpg",
        "default_color": "warm stone grey",
        "status": "available",
        "jewelry_types": ["bracelet", "bangle", "ring", "anklet", "pendant"],
        "scene_prompt": "on smooth polished zen spa stones with a small sprig of fresh eucalyptus or green leaves nearby. Soft, diffused natural light. Minimal, serene, spa-like atmosphere. Clean composition with breathing room. The jewelry rests naturally on the smooth stone.",
        "shots": ["hero", "lifestyle", "closeup", "dramatic"],
        "default_shots": ["hero"],
    },
    {
        "id": "marigold-festive",
        "name": "Marigold Festive Table",
        "description": "Brass lantern with marigold flowers. Traditional Indian festive warmth.",
        "category": "botanical",
        "preview_image": "/theme-previews/marigold-festive.jpg",
        "default_color": "burnt sienna warm",
        "status": "available",
        "jewelry_types": ["necklace", "set", "earring", "bangle", "pendant", "chain"],
        "scene_prompt": "on a warm wooden surface decorated with fresh marigold flowers and a traditional brass lantern nearby. Rich, warm golden-hour lighting. Indian festive aesthetic — Diwali or wedding feel. The jewelry sits among scattered marigold petals. Warm, celebratory, opulent mood.",
        "shots": ["hero", "lifestyle", "dramatic", "closeup"],
        "default_shots": ["hero", "lifestyle"],
    },
    {
        "id": "rose-petal-soft",
        "name": "Rose Petal Romance",
        "description": "Scattered rose petals on soft fabric. Romantic and feminine.",
        "category": "botanical",
        "preview_image": "/theme-previews/rose-petal-soft.jpg",
        "default_color": "dusty rose pink",
        "status": "available",
        "jewelry_types": ["necklace", "earring", "pendant", "set", "ring", "bracelet"],
        "scene_prompt": "on soft cream or blush fabric with scattered fresh rose petals in soft pink and blush tones. Romantic, soft diffused lighting. Feminine and elegant. The jewelry nestles among the petals. Bridal and romantic jewelry photography.",
        "shots": ["hero", "lifestyle", "closeup"],
        "default_shots": ["hero"],
    },
    {
        "id": "tropical-leaf",
        "name": "Tropical Botanical",
        "description": "Lush monstera and palm leaves. Fresh, modern, tropical.",
        "category": "botanical",
        "preview_image": "/theme-previews/tropical-leaf.jpg",
        "default_color": "deep forest green",
        "status": "available",
        "jewelry_types": ["necklace", "earring", "bracelet", "bangle", "set", "anklet"],
        "scene_prompt": "on a clean white or light surface with large tropical monstera and palm leaves creating a lush frame. Bright natural light filtering through leaves casting green-tinted shadows. Fresh, modern, tropical vibes. The jewelry pops against the green botanicals.",
        "shots": ["hero", "lifestyle", "closeup"],
        "default_shots": ["hero"],
    },
    {
        "id": "dried-flowers-boho",
        "name": "Dried Flowers Boho",
        "description": "Dried pampas grass and wildflowers. Bohemian chic aesthetic.",
        "category": "botanical",
        "preview_image": "/theme-previews/dried-flowers-boho.jpg",
        "default_color": "warm sand beige",
        "status": "available",
        "jewelry_types": ["earring", "necklace", "bracelet", "anklet", "ring", "pendant"],
        "scene_prompt": "on a neutral linen or cotton fabric surface with dried pampas grass, dried wildflowers, and natural dried elements artfully arranged nearby. Warm, soft natural light. Bohemian chic, earthy aesthetic. Muted warm tones throughout.",
        "shots": ["hero", "lifestyle", "closeup"],
        "default_shots": ["hero"],
    },

    # ── Fabric & Textile Series ──
    {
        "id": "cream-silk-satin",
        "name": "Cream Silk Satin",
        "description": "Luxurious cream silk with flowing folds and golden reflections.",
        "category": "fabric",
        "preview_image": "/theme-previews/cream-silk-satin.jpg",
        "default_color": "cream ivory gold",
        "status": "available",
        "jewelry_types": ["necklace", "set", "earring", "pendant", "bracelet", "bangle", "brooch", "chain"],
        "scene_prompt": "on luxurious cream silk satin fabric with gentle flowing folds catching warm golden light. Elegant, soft, bridal aesthetic. The silk's sheen creates beautiful reflections complementing the jewelry. Warm studio lighting.",
        "shots": ["hero", "dramatic", "closeup", "lifestyle"],
        "default_shots": ["hero"],
    },
    {
        "id": "linen-natural",
        "name": "Natural Linen Minimal",
        "description": "Clean, textured natural linen. Understated minimalism.",
        "category": "fabric",
        "preview_image": "/theme-previews/linen-natural.jpg",
        "default_color": "natural linen beige",
        "status": "available",
        "jewelry_types": ["ring", "earring", "pendant", "bracelet", "anklet", "brooch"],
        "scene_prompt": "on a clean natural linen fabric surface with visible weave texture. Bright, even natural daylight. Minimal Scandinavian-inspired aesthetic. Clean composition, no distractions. The linen texture adds warmth and authenticity.",
        "shots": ["hero", "closeup", "lifestyle"],
        "default_shots": ["hero"],
    },
    {
        "id": "teal-velvet-festive",
        "name": "Teal Velvet Festive",
        "description": "Rich teal velvet with festive golden accents. Celebratory luxury.",
        "category": "fabric",
        "preview_image": "/theme-previews/teal-velvet-festive.jpg",
        "default_color": "deep teal jewel",
        "status": "available",
        "jewelry_types": ["necklace", "set", "earring", "pendant", "bangle", "brooch", "chain"],
        "scene_prompt": "on rich teal velvet fabric surface with warm golden accent lighting. Festive luxury aesthetic with jewel-toned richness. The deep teal creates a striking contrast with gold and silver jewelry. Opulent, celebratory mood.",
        "shots": ["hero", "dramatic", "closeup"],
        "default_shots": ["hero"],
    },

    # ── Modern Minimal Series ──
    {
        "id": "pure-white-ecom",
        "name": "Pure White E-Commerce",
        "description": "Clean white background. Perfect for marketplace listings.",
        "category": "minimal",
        "preview_image": "/theme-previews/pure-white-ecom.jpg",
        "default_color": "pure white",
        "status": "available",
        "jewelry_types": ALL_JEWELRY_TYPES,
        "scene_prompt": "on a pure white seamless background with bright, even studio lighting. No shadows or minimal soft shadow underneath. E-commerce marketplace ready — Amazon, Flipkart, Etsy style. Clean, distraction-free product photography.",
        "shots": ["hero", "closeup"],
        "default_shots": ["hero"],
    },
    {
        "id": "neutral-grey-studio",
        "name": "Neutral Grey Studio",
        "description": "Professional grey studio backdrop. Clean and versatile.",
        "category": "minimal",
        "preview_image": "/theme-previews/neutral-grey-studio.jpg",
        "default_color": "neutral medium grey",
        "status": "available",
        "jewelry_types": ALL_JEWELRY_TYPES,
        "scene_prompt": "on a smooth neutral grey seamless studio background with balanced, professional studio lighting. Soft gradient from slightly lighter at center to darker at edges. Classic jewelry catalog photography aesthetic.",
        "shots": ["hero", "closeup", "dramatic"],
        "default_shots": ["hero"],
    },
    {
        "id": "concrete-industrial",
        "name": "Industrial Concrete",
        "description": "Raw concrete surface with modern industrial edge.",
        "category": "minimal",
        "preview_image": "/theme-previews/concrete-industrial.jpg",
        "default_color": "cool cement grey",
        "status": "available",
        "jewelry_types": ["ring", "bracelet", "bangle", "chain", "earring", "pendant"],
        "scene_prompt": "on a raw concrete surface with subtle industrial texture. Cool, directional lighting with modern edge. Contemporary editorial aesthetic. The rough concrete texture creates interesting contrast with polished jewelry.",
        "shots": ["hero", "dramatic", "closeup"],
        "default_shots": ["hero"],
    },

    # ── Wood & Rustic Series ──
    {
        "id": "warm-wood-rustic",
        "name": "Warm Rustic Wood",
        "description": "Rich wooden surface with warm natural grain. Earthy and inviting.",
        "category": "rustic",
        "preview_image": "/theme-previews/warm-wood-rustic.jpg",
        "default_color": "warm walnut brown",
        "status": "available",
        "jewelry_types": ["bracelet", "bangle", "ring", "anklet", "pendant", "earring", "necklace"],
        "scene_prompt": "on a warm rustic wooden surface with rich natural wood grain visible. Warm natural lighting from a window. Earthy, inviting, artisanal feel. The organic wood texture complements handcrafted and traditional jewelry beautifully.",
        "shots": ["hero", "lifestyle", "closeup"],
        "default_shots": ["hero"],
    },
    {
        "id": "driftwood-coastal",
        "name": "Coastal Driftwood",
        "description": "Weathered driftwood with sandy beach tones. Relaxed coastal vibe.",
        "category": "rustic",
        "preview_image": "/theme-previews/driftwood-coastal.jpg",
        "default_color": "pale driftwood grey",
        "status": "available",
        "jewelry_types": ["bracelet", "anklet", "ring", "earring", "necklace", "pendant"],
        "scene_prompt": "on weathered driftwood or pale beach wood with soft sandy tones. Bright, airy coastal light with soft shadows. Relaxed beachy vibe. A few small shells or sea glass pieces scattered nearby. Perfect for bohemian or beach-inspired jewelry.",
        "shots": ["hero", "lifestyle", "closeup"],
        "default_shots": ["hero"],
    },

    # ── Traditional & Cultural Series ──
    {
        "id": "brass-diya-ethnic",
        "name": "Brass Diya Traditional",
        "description": "Traditional brass lamp with ethnic elements. Indian heritage feel.",
        "category": "traditional",
        "preview_image": "/theme-previews/brass-diya-ethnic.jpg",
        "default_color": "antique brass gold",
        "status": "available",
        "jewelry_types": ["necklace", "set", "earring", "bangle", "pendant", "chain", "brooch"],
        "scene_prompt": "on a deep burgundy or maroon silk fabric with a traditional brass diya (oil lamp) and scattered flower petals nearby. Warm golden candlelight-like lighting. Rich Indian heritage aesthetic — pooja room or mandap feel. Traditional wedding jewelry photography.",
        "shots": ["hero", "lifestyle", "dramatic", "closeup"],
        "default_shots": ["hero", "lifestyle"],
    },
    {
        "id": "mughal-miniature",
        "name": "Mughal Heritage",
        "description": "Ornate Mughal-inspired setting with rich fabrics and gold details.",
        "category": "traditional",
        "preview_image": "/theme-previews/mughal-miniature.jpg",
        "default_color": "rich jewel toned",
        "status": "available",
        "jewelry_types": ["necklace", "set", "earring", "bangle", "pendant", "chain", "brooch"],
        "scene_prompt": "on a rich jewel-toned brocade or zari fabric with intricate gold weaving, placed near a small ornate Mughal-style mirror or picture frame. Warm, regal golden lighting. Opulent Mughal heritage aesthetic. Royal Indian jewelry photography evoking nawabi grandeur.",
        "shots": ["hero", "lifestyle", "dramatic", "closeup"],
        "default_shots": ["hero"],
    },

    # ── Solid Color Backgrounds ──
    {
        "id": "solid-black",
        "name": "Solid Black",
        "description": "Pure black background with dramatic spotlight.",
        "category": "solid",
        "preview_image": None,
        "preview_color": "#0A0A0A",
        "default_color": "pure black",
        "status": "available",
        "jewelry_types": ALL_JEWELRY_TYPES,
        "scene_prompt": "on a pure solid deep black background with dramatic studio spotlight from above. Minimal shadows. The jewelry floats on blackness with perfect edge separation. Premium catalog style.",
        "shots": ["hero", "closeup"],
        "default_shots": ["hero"],
    },
    {
        "id": "solid-white",
        "name": "Solid White",
        "description": "Pure white background. E-commerce ready.",
        "category": "solid",
        "preview_color": "#FFFFFF",
        "preview_image": None,
        "default_color": "pure white",
        "status": "available",
        "jewelry_types": ALL_JEWELRY_TYPES,
        "scene_prompt": "on a pure white seamless background with bright, even, shadowless studio lighting. Clean e-commerce product photo style. No shadows or textures — just the jewelry on white.",
        "shots": ["hero", "closeup"],
        "default_shots": ["hero"],
    },
    {
        "id": "solid-grey",
        "name": "Solid Grey",
        "description": "Neutral grey background. Versatile and professional.",
        "category": "solid",
        "preview_image": None,
        "preview_color": "#808080",
        "default_color": "neutral grey",
        "status": "available",
        "jewelry_types": ALL_JEWELRY_TYPES,
        "scene_prompt": "on a solid neutral grey background with even studio lighting. Professional catalog style. Versatile and distraction-free.",
        "shots": ["hero", "closeup"],
        "default_shots": ["hero"],
    },
    {
        "id": "solid-dusty-rose",
        "name": "Dusty Rose",
        "description": "Soft dusty rose background. Feminine and warm.",
        "category": "solid",
        "preview_image": None,
        "preview_color": "#C9A4A0",
        "default_color": "dusty rose pink",
        "status": "available",
        "jewelry_types": ["necklace", "earring", "pendant", "set", "ring", "bracelet", "brooch"],
        "scene_prompt": "on a solid dusty rose pink background with soft, flattering warm lighting. Feminine, romantic aesthetic. Perfect for wedding and bridal jewelry.",
        "shots": ["hero", "closeup"],
        "default_shots": ["hero"],
    },
    {
        "id": "solid-sage-green",
        "name": "Sage Green",
        "description": "Muted sage green background. Natural and calming.",
        "category": "solid",
        "preview_image": None,
        "preview_color": "#9CAF88",
        "default_color": "muted sage green",
        "status": "available",
        "jewelry_types": ["earring", "ring", "pendant", "bracelet", "necklace", "anklet"],
        "scene_prompt": "on a solid muted sage green background with soft natural-feeling lighting. Calming, organic, modern aesthetic.",
        "shots": ["hero", "closeup"],
        "default_shots": ["hero"],
    },
    {
        "id": "solid-deep-navy",
        "name": "Deep Navy",
        "description": "Rich navy blue background. Sophisticated and bold.",
        "category": "solid",
        "preview_image": None,
        "preview_color": "#1B2838",
        "default_color": "deep navy blue",
        "status": "available",
        "jewelry_types": ALL_JEWELRY_TYPES,
        "scene_prompt": "on a solid deep navy blue background with cool-toned studio lighting. Sophisticated, modern, bold aesthetic.",
        "shots": ["hero", "closeup"],
        "default_shots": ["hero"],
    },
    {
        "id": "solid-warm-beige",
        "name": "Warm Beige",
        "description": "Soft warm beige background. Neutral and elegant.",
        "category": "solid",
        "preview_image": None,
        "preview_color": "#D4C5A9",
        "default_color": "warm beige sand",
        "status": "available",
        "jewelry_types": ALL_JEWELRY_TYPES,
        "scene_prompt": "on a solid warm beige background with soft, warm studio lighting. Neutral, understated elegance. Complements both gold and silver jewelry.",
        "shots": ["hero", "closeup"],
        "default_shots": ["hero"],
    },
]


# ─── Category metadata for UI grouping ───

THEME_CATEGORIES = [
    {"id": "luxury", "label": "Luxury Velvet", "icon": "crown"},
    {"id": "stone", "label": "Stone & Marble", "icon": "gem"},
    {"id": "botanical", "label": "Botanical & Natural", "icon": "leaf"},
    {"id": "fabric", "label": "Fabric & Textile", "icon": "fabric"},
    {"id": "minimal", "label": "Modern Minimal", "icon": "square"},
    {"id": "rustic", "label": "Wood & Rustic", "icon": "tree"},
    {"id": "traditional", "label": "Traditional & Cultural", "icon": "lamp"},
    {"id": "solid", "label": "Solid Colors", "icon": "circle"},
]


# ─── Public API functions ───

def get_all_themes(jewelry_type: Optional[str] = None) -> list[dict]:
    """Return themes with shot info expanded, optionally filtered by jewelry type."""
    result = []
    for theme in THEMES:
        if jewelry_type:
            allowed = theme.get("jewelry_types", [])
            if allowed and jewelry_type not in allowed:
                continue
        shots_detail = []
        for shot_id in theme["shots"]:
            shot = SHOT_TYPES.get(shot_id)
            if shot:
                shots_detail.append({
                    "id": shot["id"],
                    "name": shot["name"],
                    "short_name": shot["short_name"],
                    "description": shot["description"],
                    "type": shot["type"],
                    "is_default": shot_id in theme.get("default_shots", []),
                })
        result.append({
            "id": theme["id"],
            "name": theme["name"],
            "description": theme["description"],
            "category": theme["category"],
            "preview_image": theme.get("preview_image"),
            "preview_color": theme.get("preview_color"),
            "default_color": theme["default_color"],
            "status": theme["status"],
            "shots": shots_detail,
            "default_shots": theme.get("default_shots", ["hero"]),
        })
    return result


def get_theme_by_id(theme_id: str) -> Optional[dict]:
    """Return a single theme with full details."""
    for theme in THEMES:
        if theme["id"] == theme_id:
            shots_detail = []
            for shot_id in theme["shots"]:
                shot = SHOT_TYPES.get(shot_id)
                if shot:
                    shots_detail.append({
                        **shot,
                        "is_default": shot_id in theme.get("default_shots", []),
                    })
            return {
                **theme,
                "shots": shots_detail,
            }
    return None


def get_theme_categories() -> list[dict]:
    """Return theme category metadata for UI grouping."""
    return THEME_CATEGORIES


def build_theme_prompt(
    theme_id: str,
    shot_id: str = "hero",
    additional_details: Optional[str] = None,
    theme_color_override: Optional[str] = None,
) -> str:
    """Build a scene prompt from theme + shot type.

    Returns the full scene/background prompt string to be used
    in build_jewelry_prompt's background parameter system.
    """
    theme = None
    for t in THEMES:
        if t["id"] == theme_id:
            theme = t
            break

    if not theme:
        return "on a solid deep black velvet surface, dramatic studio lighting"

    shot = SHOT_TYPES.get(shot_id, SHOT_TYPES["hero"])
    scene = theme["scene_prompt"]

    if theme_color_override and theme_color_override.strip():
        scene = scene.replace(theme["default_color"], theme_color_override.strip())

    prompt = f"{scene}\n\n{shot['prompt_suffix']}"

    if additional_details and additional_details.strip():
        prompt += f"\n\nADDITIONAL DETAILS: {additional_details.strip()}"

    return prompt


def get_theme_background_prompt(theme_id: str) -> str:
    """Get just the scene prompt for a theme (for use with existing jewelry prompt builder)."""
    for t in THEMES:
        if t["id"] == theme_id:
            return t["scene_prompt"]
    return "on a solid deep black velvet surface, dramatic studio lighting"
