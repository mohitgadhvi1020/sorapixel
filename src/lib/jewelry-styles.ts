/* ================================================================
 *  Jewelry-specific prompt constants, types, backgrounds, and
 *  pack prompt builder.  Completely independent from the general
 *  product styles in styles.ts.
 * ================================================================ */

// ─── Jewelry Isolation ───────────────────────────────────────────
export const JEWELRY_ISOLATION = `CRITICAL FIRST STEP — Jewelry Identification & Isolation:
Analyze this image and identify the JEWELRY PIECE being showcased. It may be worn on a body, held in a hand, placed on a display stand, inside a box, or on any surface. You MUST:
1. Identify the exact type of jewelry (ring, necklace, earring, bracelet, bangle, pendant, brooch, anklet, chain, or set)
2. Carefully note EVERY micro-detail: stone cuts, facet count, prong positions, metal color/finish (yellow gold, white gold, rose gold, platinum, silver), engravings, hallmarks, chain link pattern, clasp style, surface textures, diamond brilliance pattern
3. Mentally extract ONLY the jewelry itself — remove any hands, fingers, neck, ears, wrists, skin, display stands, ring boxes, velvet pads, and the original background
4. The extracted jewelry must retain every single visual detail exactly as photographed

`;

// ─── Jewelry Preserve ────────────────────────────────────────────
export const JEWELRY_PRESERVE = `ABSOLUTE JEWELRY FIDELITY — THE MOST CRITICAL RULE:
The jewelry in the output MUST be a PIXEL-PERFECT reproduction of the input jewelry.
- Do NOT re-imagine, re-draw, re-interpret, simplify, or stylize ANY part of the jewelry
- Do NOT alter stone colors, diamond brilliance, sparkle patterns, or light refraction — reproduce them EXACTLY
- Do NOT change the metal color: yellow gold stays yellow gold, white gold stays white gold, rose gold stays rose gold, silver stays silver
- Do NOT modify prong count, prong positions, stone settings, bezels, channel settings, or pave patterns
- Do NOT simplify filigree, engravings, hallmarks, milgrain edges, or any surface texture
- Every facet of every stone, every link of every chain, every curve of the design MUST match the input exactly
- The jewelry should look like it was PHOTOGRAPHICALLY CUT from the original photo and PLACED into the new scene
- If in doubt, keep every scratch, reflection, and imperfection from the original photograph
Show ONLY the jewelry piece — no hands, skin, body parts, display stands, or boxes.`;

// ─── Jewelry Types ───────────────────────────────────────────────
export interface JewelryTypeOption {
  id: string;
  label: string;
  icon: string;
}

export const JEWELRY_TYPES: JewelryTypeOption[] = [
  { id: "ring", label: "Ring", icon: "💍" },
  { id: "necklace", label: "Necklace", icon: "📿" },
  { id: "earring", label: "Earring", icon: "✨" },
  { id: "bracelet", label: "Bracelet", icon: "⭕" },
  { id: "bangle", label: "Bangle", icon: "🔵" },
  { id: "pendant", label: "Pendant", icon: "💎" },
  { id: "brooch", label: "Brooch", icon: "🌸" },
  { id: "anklet", label: "Anklet", icon: "🦶" },
  { id: "chain", label: "Chain", icon: "🔗" },
  { id: "set", label: "Set", icon: "👑" },
];

// ─── Background Presets ──────────────────────────────────────────
export interface JewelryBackground {
  id: string;
  label: string;
  prompt: string;
  /** hex color for UI swatch */
  swatch: string;
}

export const JEWELRY_BACKGROUNDS: JewelryBackground[] = [
  {
    id: "black-velvet",
    label: "Black Velvet",
    prompt:
      "Place the jewelry on a luxurious deep black velvet fabric surface with soft, even folds. The velvet should have a rich, plush texture that catches subtle light. Dark, moody ambiance with focused spotlight on the jewelry.",
    swatch: "#1a1a1a",
  },
  {
    id: "navy-velvet",
    label: "Navy Velvet",
    prompt:
      "Place the jewelry on a rich navy blue velvet fabric surface with elegant soft folds. Deep royal blue tones that make gold and silver jewelry pop. Sophisticated, premium ambiance with gentle directional lighting.",
    swatch: "#1b2a4a",
  },
  {
    id: "burgundy-velvet",
    label: "Burgundy Velvet",
    prompt:
      "Place the jewelry on a deep burgundy/wine red velvet surface with luxurious soft folds. Rich, warm tones that complement both gold and silver jewelry. Classic jewelry store display feel with warm spotlight.",
    swatch: "#5a1a2a",
  },
  {
    id: "white-marble",
    label: "White Marble",
    prompt:
      "Place the jewelry on a pristine white marble surface with subtle grey veining. Clean, bright, high-end aesthetic. Soft diffused overhead lighting with gentle reflections on the marble. Luxury catalog photography style.",
    swatch: "#f0ece6",
  },
  {
    id: "cream-marble",
    label: "Cream Marble",
    prompt:
      "Place the jewelry on an elegant cream/beige marble surface with warm golden veining. Soft warm lighting creating a welcoming premium feel. High-end jewelry boutique aesthetic.",
    swatch: "#e8ddd0",
  },
  {
    id: "pure-white",
    label: "Pure White",
    prompt:
      "Place the jewelry on a pure clean white background with professional studio lighting. Soft even illumination with gentle shadow underneath. Clean e-commerce product listing style — minimal and premium.",
    swatch: "#ffffff",
  },
  {
    id: "pure-black",
    label: "Pure Black",
    prompt:
      "Place the jewelry against a solid pure black background. Dramatic spotlight from above creating brilliant reflections on metal and stones. High contrast luxury jewelry advertising style.",
    swatch: "#000000",
  },
  {
    id: "gold-gradient",
    label: "Gold Gradient",
    prompt:
      "Place the jewelry on a soft warm golden gradient background — transitioning from deep warm gold at the edges to lighter champagne gold in the center. Luxurious, royal, premium feel. Soft focused lighting that enhances metal shine.",
    swatch: "#c9a961",
  },
  {
    id: "rose-gradient",
    label: "Rose Gradient",
    prompt:
      "Place the jewelry on a soft rose pink to blush gradient background. Romantic, elegant, feminine feel. Delicate soft lighting that flatters both the jewelry and the pastel backdrop.",
    swatch: "#d4a0a0",
  },
  {
    id: "styled-props",
    label: "Styled with Props",
    prompt:
      "Place the jewelry on an elegant styled surface with complementary props: soft silk or satin fabric, fresh flower petals (roses or peonies), a small decorative mirror, and perhaps a touch of greenery. The props should frame the jewelry without competing for attention. Warm editorial photography with shallow depth of field.",
    swatch: "#c8b8a8",
  },
];

export function getJewelryBackgroundById(
  id: string
): JewelryBackground | undefined {
  return JEWELRY_BACKGROUNDS.find((b) => b.id === id);
}

// ─── Pack Prompt Builder ─────────────────────────────────────────
/**
 * Builds 5 prompts for the Jewelry Pack:
 * hero, angle, closeup, lifestyle, setDisplay
 */
export function buildJewelryPackPrompts(backgroundPrompt: string): {
  hero: string;
  angle: string;
  closeup: string;
  lifestyle: string;
  setDisplay: string;
} {
  const base = `${JEWELRY_ISOLATION}${backgroundPrompt} ${JEWELRY_PRESERVE}`;

  return {
    hero: `${base} Front-facing hero beauty shot. The jewelry should be the clear star of the image — perfectly centered, brilliantly lit, with the background setting it off beautifully. Professional jewelry catalog photography.`,

    angle: `${base} For this image, keep the EXACT same jewelry piece (do NOT redraw it) but adjust the scene perspective slightly to suggest a different viewpoint — as if the camera shifted to a gentle 3/4 elevated angle. The jewelry itself must remain pixel-identical to the input; only the background, shadows, and lighting angle should shift subtly. Professional jewelry photography.`,

    closeup: `${base} Create a tightly cropped MACRO close-up of the most detailed area of this EXACT jewelry piece — focusing on the stones, settings, metalwork, or design details. Show the brilliance, facets, and craftsmanship at extreme magnification. The jewelry must remain pixel-identical to the input — do NOT redraw or reinterpret any element. Extreme shallow depth of field with creamy bokeh background.`,

    lifestyle: `${JEWELRY_ISOLATION}Place the jewelry on an elegantly styled surface — think soft silk or satin fabric draped artfully, with fresh flower petals, a touch of greenery, or a small decorative mirror nearby. Warm, editorial photography feel with shallow depth of field. The props should frame and complement the jewelry without competing for attention. Golden-hour warmth. ${JEWELRY_PRESERVE} Professional lifestyle jewelry photography.`,

    setDisplay: `${JEWELRY_ISOLATION}Arrange the jewelry as if it is the centerpiece of an exclusive collection display. Place it on a premium surface (dark velvet or marble) with subtle accent lighting that highlights the piece from multiple angles. The composition should feel like a luxury jewelry brand lookbook — editorial, aspirational, and immaculate. ${JEWELRY_PRESERVE} Premium collection display photography.`,
  };
}

// ─── Custom Background ───────────────────────────────────────────
export function buildCustomJewelryPrompt(customDescription: string): string {
  return `${JEWELRY_ISOLATION}${customDescription} Professional jewelry photography with studio-quality lighting that enhances the brilliance and details of the jewelry. ${JEWELRY_PRESERVE}`;
}

// ─── Shared Try-On Preamble ──────────────────────────────────────
const TRYON_PREAMBLE = `You are given two images: (1) a jewelry piece and (2) a person's photo.

STEP 1 — ANALYZE THE PERSON'S PHOTO FIRST:
Before placing any jewelry, carefully study the person's photo:
- Identify the person's POSE (front-facing, angled, profile, seated, standing)
- Identify VISIBLE BODY PARTS (face, neck, ears, left ear, right ear, left hand, right hand, left wrist, right wrist, chest, fingers, ankles)
- Identify HAIR position (covering ears? tied up? loose? which side?)
- Identify CLOTHING (neckline type, sleeves length, collar style)
- Identify LIGHTING direction, color temperature, and shadow patterns

STEP 2 — PLACE THE JEWELRY (type-specific instructions below)

STEP 3 — EDITORIAL LUXURY PHOTOGRAPHY STYLE:
The final image must look like a high-end jewelry brand advertisement (think Tanishq, TBZ, Cartier level). Follow these editorial photography rules:

SELECTIVE FOCUS & DEPTH OF FIELD:
- The JEWELRY must be the SHARPEST element in the entire image — every stone facet, every prong, every chain link must be tack-sharp and crisp
- The model's SKIN and BODY should be slightly softer — use a subtle shallow depth of field so the jewelry is in the focal plane and the surrounding skin/body has a gentle, dreamy softness
- The background and any clothing should be even softer/more blurred — creating depth layers: jewelry (sharp) → skin (soft) → background (blurred)

HERO LIGHTING ON JEWELRY:
- Give the jewelry a focused, slightly brighter micro-spotlight feel — as if a dedicated light source is aimed specifically at the jewelry
- Each stone should SPARKLE and FIRE — show individual light reflections, brilliance, and scintillation on diamonds/gems
- Metal surfaces (gold, silver, rose gold, platinum) should have warm, glowing reflections that show their luster
- The model's skin should have beautiful, warm, soft lighting — but slightly less bright than the jewelry. The model is the canvas; the jewelry is the star

COLOR GRADING (adapt to metal type):
- For GOLD jewelry → warm golden color grading across the entire image, skin has a warm honey glow, rich and luxurious
- For ROSE GOLD jewelry → soft warm pink/peach undertones, romantic and feminine
- For SILVER/PLATINUM/DIAMOND jewelry → slightly cooler, more dramatic tones, deeper shadows, high contrast between the brilliant stones and the muted background
- For COLORED STONES (emerald, ruby, sapphire) → the stone colors should POP vibrantly against the softer warm skin tones

COMPOSITION:
- Crop and compose TIGHTLY around the jewelry placement area — the jewelry should dominate the frame
- The image should feel intimate and close-up, as if photographed with a macro lens
- Leave just enough of the model's body to provide beautiful context, but the jewelry must be the clear hero and focal point

ABSOLUTE RULES:
- The jewelry MUST be PIXEL-PERFECT identical to the input — same stones, metal color, design, every detail
- The person's face, identity, skin tone, hair color, hair style, expression, and clothing must remain COMPLETELY UNCHANGED — do not alter ANY aspect of the person
- Scale the jewelry realistically relative to the person's body proportions
- The output must be INDISTINGUISHABLE from a real professional jewelry advertisement photograph
- The image must be HYPER-REALISTIC — no painterly, illustrated, or CGI look whatsoever
`;

// ─── Try-On Prompts ──────────────────────────────────────────────
export const JEWELRY_TRYON_PROMPTS: Record<string, string> = {
  ring: `${TRYON_PREAMBLE}
PLACEMENT — RING:
- Place the EXACT ring on the person's ring finger (4th finger) of the RIGHT hand by default
- If the right hand is not visible, use the LEFT hand
- If NO hands are visible in the photo, subtly adjust the person's pose to show one hand in an elegant natural position (resting on chest, touching collarbone, or placed gracefully in lap) with the ring clearly visible on the ring finger
- The ring must wrap naturally around the finger with correct perspective — show the top/face of the ring toward the camera
- Add a subtle shadow where the ring meets the finger
- Scale the ring to match the finger's thickness realistically
FRAMING: Crop tightly to the hand/finger area — show from mid-forearm to fingertips. The ring should be the largest, sharpest element. The hand and fingers should be soft and elegant, slightly out of the sharpest focal plane.`,

  necklace: `${TRYON_PREAMBLE}
PLACEMENT — NECKLACE:
- Place the EXACT necklace around the person's neck naturally
- Analyze the person's NECKLINE: if wearing a V-neck, the necklace should sit on bare skin; if wearing a crew neck or high collar, the necklace should drape over the clothing
- The chain should follow the natural curve of the neck and collarbones
- If the necklace has a pendant, it should hang centered at the correct length — NOT floating, but resting naturally against skin or fabric
- Match the chain drape to gravity — heavier sections should hang lower
- Add realistic shadows on the skin/clothing beneath the chain
- If the person's neck is partially obscured (by hair or clothing), the necklace should go BEHIND the hair/clothing where it would naturally be hidden
FRAMING: Crop tightly to the neck/collarbone/upper chest area — show from chin to mid-chest. The necklace should fill a significant portion of the frame. Skin should have a beautiful warm softness while every chain link and stone on the necklace is razor-sharp.`,

  earring: `${TRYON_PREAMBLE}
PLACEMENT — EARRING (THIS IS A PAIR — BOTH EARS):
- The image shows ONE earring, but it represents a PAIR — place an IDENTICAL copy on EACH ear
- Analyze which ears are visible:
  * If BOTH ears are visible → place one earring on each ear, mirrored appropriately (left earring is a mirror of right)
  * If only ONE ear is visible → place the earring on that visible ear prominently; if hair slightly covers the other ear, show the second earring peeking from behind the hair
  * If HAIR covers one or both ears → gently tuck the hair behind the ear(s) JUST ENOUGH to reveal the earlobe and show the earring — keep the overall hairstyle unchanged
- The earring should attach at the earlobe piercing point and hang naturally with gravity
- For drop/dangle earrings: show natural swing and correct length relative to jawline
- For studs: sit flush against the earlobe
- For hoops: curve around the earlobe naturally
- Add subtle shadows on the neck/jaw from the earrings
- CRITICAL: Both earrings must be IDENTICAL in design — mirror image of each other, same size, same detail
FRAMING: Crop tightly to the ear/jawline area — show from temple to shoulder on the most visible side. The earring should be the largest, sharpest, most brilliant element in the frame. The ear, jaw, and neck should be beautifully soft with warm skin tones.`,

  bracelet: `${TRYON_PREAMBLE}
PLACEMENT — BRACELET:
- Place the EXACT bracelet on the person's RIGHT wrist by default
- If the right wrist is not visible, use the LEFT wrist
- If NO wrists are visible (e.g., long sleeves or hands out of frame), subtly adjust to show one wrist — roll up the sleeve slightly or position the hand so the wrist is visible with the bracelet
- The bracelet should sit naturally on the wrist — not too tight, not too loose
- The clasp (if visible in the original) should be positioned on the underside of the wrist
- Add realistic shadows on the skin beneath the bracelet
- If the person is wearing sleeves, the bracelet should sit just below the cuff
FRAMING: Crop tightly to the wrist/forearm area — show from mid-forearm to the hand. The bracelet should dominate the frame with every stone and link tack-sharp. The wrist skin and any fabric should be soft and dreamy.`,

  bangle: `${TRYON_PREAMBLE}
PLACEMENT — BANGLE:
- Place the EXACT bangle on the person's RIGHT wrist by default
- If the right wrist is not visible, use the LEFT wrist
- If NO wrists are visible, subtly adjust to show one wrist with the bangle
- Bangles are rigid and circular — they should sit on the wrist with correct circular perspective based on the arm's angle
- The bangle should be slightly loose (bangles slide on the wrist, they don't clasp)
- If the original image shows multiple bangles or a set, place them all stacked together on the same wrist
- Add realistic reflections on the metal surface matching the scene's lighting
FRAMING: Crop tightly to the wrist area. The bangle should be sharp and brilliant while the surrounding skin and fabric are soft.`,

  pendant: `${TRYON_PREAMBLE}
PLACEMENT — PENDANT:
- Place the EXACT pendant hanging from the person's neck on its chain
- The chain should follow the natural curve of the neck and collarbones
- The pendant should hang centered on the chest, resting naturally against skin or clothing depending on neckline
- The pendant should hang at the correct length — typically at or just below the collarbone for short chains, mid-chest for longer chains
- Match the chain length and style from the original image
- The pendant should lay flat against the body, not floating or angled unnaturally
- Add subtle shadow beneath the pendant where it rests on skin/clothing
FRAMING: Crop tightly to the neck/chest area — the pendant and chain should be the hero. Skin and fabric should have a warm, soft glow while the pendant is tack-sharp with brilliant stone fire.`,

  brooch: `${TRYON_PREAMBLE}
PLACEMENT — BROOCH:
- Analyze the person's clothing to find the best placement:
  * If wearing a blazer/jacket → place on the LEFT lapel (traditional placement)
  * If wearing a dress/blouse → place on the upper LEFT chest area
  * If wearing a scarf/shawl → place where the fabric gathers
  * If wearing a collared shirt → place just below the collar on the LEFT side
- The brooch should appear PINNED to the fabric — it should follow the fabric's surface angle and drape
- Add a subtle shadow beneath the brooch and a slight fabric indent where the pin would be
- Scale the brooch appropriately — not too large for the clothing, not too small to be invisible
FRAMING: Crop to the upper chest/shoulder area showing the brooch in context with the clothing. The brooch should be razor-sharp while the fabric texture is soft.`,

  anklet: `${TRYON_PREAMBLE}
PLACEMENT — ANKLET:
- Place the EXACT anklet on the person's RIGHT ankle by default
- If the right ankle is not visible, use the LEFT ankle
- If NO ankles are visible (wearing long pants/skirt, or upper-body-only photo), this try-on may not work well — show the person from a slightly wider angle that reveals at least one ankle, or place the anklet just above where the shoe/sandal begins
- The anklet should drape naturally around the ankle bone, sitting just above the foot
- For chain anklets, show natural gravity drape with the decorative element centered on the front of the ankle
- Add subtle shadows on the skin beneath the chain
FRAMING: Crop tightly to the ankle/foot area. The anklet should be sharp and detailed while skin is soft and warm.`,

  chain: `${TRYON_PREAMBLE}
PLACEMENT — CHAIN/NECKLACE:
- Place the EXACT chain around the person's neck naturally
- Analyze the chain's length from the original image:
  * Choker length (14-16 inches) → sits snug around the neck
  * Princess length (17-19 inches) → hangs just below the collarbone
  * Matinee length (20-24 inches) → reaches the mid-chest
  * Opera/rope length (28+ inches) → hangs below the chest
- The chain should follow the natural curve of the neck, draping over collarbones
- Match the chain drape to gravity — the lowest point should be centered
- If wearing a V-neck or open neckline, the chain sits on bare skin; if high neckline, it drapes over the clothing
- Add realistic shadows and subtle reflections on the chain links matching the scene's lighting
FRAMING: Crop tightly to the neck/collarbone area. Every individual chain link should be sharp and gleaming while the skin has a warm editorial softness.`,

  set: `${TRYON_PREAMBLE}
PLACEMENT — JEWELRY SET (MULTIPLE PIECES):
- Analyze the first image to identify ALL pieces in the set (e.g., necklace + earrings, or necklace + earrings + bracelet + ring)
- Place EACH piece on the person following these rules:
  * NECKLACE → around the neck, following collarbone curve, pendant centered
  * EARRINGS → on BOTH ears (mirror image), tucking hair if needed to reveal earlobes
  * BRACELET/BANGLE → on the right wrist, subtly showing the hand/wrist if not visible
  * RING → on the ring finger, subtly showing the hand if not visible
  * MAANG TIKKA (forehead piece) → centered on the forehead along the hair parting
- All pieces must maintain their EXACT design from the input image
- Ensure all pieces are scaled consistently relative to each other and the person's body
- The overall effect should look like a coordinated jewelry set worn naturally — like a bridal or formal jewelry ensemble
- Add shadows and reflections for each piece individually, matching the scene's lighting
FRAMING: For a set, use a slightly wider crop that shows neck, ears, and hands/wrists — enough to showcase all pieces. Each piece must be tack-sharp while the model's skin and clothing have editorial softness. The overall composition should feel like a luxury bridal/formal jewelry campaign.`,
};
