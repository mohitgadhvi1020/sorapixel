-- Seed Stylika brand profile (extracted from hardcoded STYLIKA_PROMPT)
INSERT INTO public.brand_profiles (slug, name, config)
VALUES (
  'stylika',
  'Stylika',
  '{
    "brandName": "Stylika",
    "website": "www.stylika.com",
    "tagline": "Indian fashion jewelry brand with a 30-year manufacturing legacy, selling on Shopify",
    "productType": "Fashion jewellery — plated, coated, alloy-based pieces. NOT precious metals.",

    "targetAudience": "Urban Indian women, 22-45, who mix ethnic and western wardrobes. They buy jewelry for self-reward, micro-occasions (kitty parties, office events, pre-wedding shoots), and gifting. Instagram-native, style-conscious, prefer variety over investment pieces.",

    "voice": {
      "tone": "Confident, modern, accessible. Like a stylish friend who knows her jewellery — not a salesperson, not a poet.",
      "doRules": [
        "Write in clear, direct sentences",
        "Focus on how the piece looks, feels, and what to wear it with",
        "Use active voice",
        "Give specific, realistic styling suggestions based on what you SEE in the image",
        "Keep it warm but not gushy"
      ],
      "dontRules": [
        "Use flowery/aspirational language (exquisite radiance, timeless elegance, celestial beauty)",
        "Over-promise (waterproof, never fades, lasts forever)",
        "Use precious metal terms without qualifiers",
        "Sound generic or template-y",
        "Add filler (This beautiful piece is perfect for those who...)",
        "Use words like luxurious, opulent, dazzling, mesmerizing, versatile",
        "Repeat the same ethnic + western pairing template across products",
        "Use vague styling advice that could apply to any piece"
      ]
    },

    "materialRules": {
      "note": "Fashion jewellery is plated/coated — NEVER imply solid precious metals.",
      "neverSay": {
        "Gold earrings": "Gold-tone earrings",
        "Silver ring": "Silver-tone ring",
        "Gold necklace": "Gold-tone necklace or Gold finish necklace",
        "Gold-plated": "Gold-tone or Gold finish",
        "Rose gold bracelet": "Rose-gold-tone bracelet",
        "Platinum finish": "Rhodium finish",
        "Diamond studs": "CZ Diamond studs",
        "Emerald drops": "Green stone drops"
      },
      "bannedWords": ["plated", "plating"],
      "replacements": {"plated": "tone or finish", "plating": "tone or finish"},
      "acceptableExamples": [
        "Material: Brass with gold-tone finish",
        "Material: Alloy with rhodium finish",
        "Material: Brass with rose-gold-tone finish",
        "Stones: Cubic Zirconia (CZ)",
        "Stones: Faux pearls",
        "Stones: Glass crystals"
      ]
    },

    "taxonomy": {
      "categories": {
        "Necklaces": ["Choker", "Pendant", "Statement", "Lariat", "Pendant Set", "Charm", "Pearl"],
        "Earrings": ["Hoops", "Drops/Danglers", "Studs", "Huggies", "Statement", "Clip-on", "Pearl", "Ear Cuffs"],
        "Rings": ["Statement", "Minimal", "Pearl", "Diamond (CZ)", "Stackable"],
        "Wristwear": ["Kadas", "Bracelets", "Chain", "Cuffs", "Tennis", "Charm", "Statement", "Beaded"]
      },
      "collections": ["Minimal", "Bold", "Glam", "Romance"],
      "occasions": ["Everyday Wear", "Festive Wear", "Office Wear", "Party Wear", "Wedding Wear"]
    },

    "outputFormat": {
      "titleFormat": "[Descriptive Name] [Key Detail] | {brandName}",
      "titleCharRange": [50, 65],
      "titleExclude": ["material words", "stone words", "CZ", "Gold-Tone", "Silver", "Pearl", "Crystal", "Brass", "Plated", "Diamond"],
      "descriptionWordRange": [100, 160],
      "descriptionStructure": "Paragraph 1: What the piece IS + defining visual feature. Paragraph 2: How to WEAR it — specific styling suggestions. Bullet list: Material, Stones, Closure only.",
      "metaDescCharRange": [140, 155],
      "altTextMaxChars": 125,
      "attributeFields": {
        "jewelryMaterial": "Always Metal for fashion jewelry",
        "gemstoneType": "Cubic Zirconia / Pearl / Glass Crystal / empty if none",
        "collection": "Minimal / Bold / Glam / Romance",
        "occasion": "Pick 1-2 from: Everyday Wear / Festive Wear / Office Wear / Party Wear / Wedding Wear",
        "material": "Detailed e.g. Brass with Gold-Tone Finish",
        "stone": "Detailed e.g. CZ or Faux Pearls or None",
        "closure": "e.g. Lobster Clasp, Push Back, Adjustable, Slip-on, or empty"
      }
    }
  }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
