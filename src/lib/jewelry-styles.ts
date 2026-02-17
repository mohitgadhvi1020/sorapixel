/* ================================================================
 *  Jewelry-specific prompt constants, types, backgrounds, and
 *  pack prompt builder.  Completely independent from the general
 *  product styles in styles.ts.
 * ================================================================ */

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
      "Place the jewelry on a luxurious deep black velvet fabric surface. The velvet should have a rich, plush texture that is UNIFORM and CONSISTENT across the entire image — same color and tone from edge to edge. Use soft, EVEN studio lighting from above — NO spotlight falloff, NO dark vignette, NO shadow borders at the edges. The entire background must be evenly lit black velvet filling the full frame.",
    swatch: "#1a1a1a",
  },
  {
    id: "white-marble",
    label: "White Marble",
    prompt:
      "Place the jewelry on a pristine white marble surface with subtle grey veining. Clean, bright, high-end aesthetic. Use soft, EVEN diffused overhead lighting across the entire frame — NO vignette, NO dark edges, NO shadow borders. The marble surface and lighting must be UNIFORM from edge to edge, filling the entire image evenly. Luxury catalog photography style.",
    swatch: "#f0ece6",
  },
  {
    id: "pure-white",
    label: "Pure White",
    prompt:
      "Place the jewelry on a pure clean white background with professional studio lighting. Soft EVEN illumination across the entire image — NO vignette, NO dark edges, NO shadow borders. The white background must be UNIFORM and CONSISTENT from edge to edge, filling the full frame. Only a gentle shadow directly under the jewelry. Clean e-commerce product listing style.",
    swatch: "#ffffff",
  },
  {
    id: "burgundy-velvet",
    label: "Burgundy Velvet",
    prompt:
      "Place the jewelry on a deep burgundy/wine red velvet surface. Rich, warm tones that complement both gold and silver jewelry. The velvet color must be UNIFORM and CONSISTENT across the entire image — same burgundy tone from edge to edge. Use soft, EVEN studio lighting — NO spotlight falloff, NO dark vignette, NO shadow borders at the edges. The entire background must be evenly lit burgundy velvet filling the full frame.",
    swatch: "#5a1a2a",
  },
  {
    id: "gold-gradient",
    label: "Gold Gradient",
    prompt:
      "Place the jewelry on a soft warm golden gradient background — a SMOOTH, EVEN gradient across the full image. The gradient must extend UNIFORMLY to all edges with NO dark borders, NO vignette, NO shadow at the edges. Use soft, even lighting that enhances metal shine. Luxurious, royal, premium feel. The gradient fills the entire frame evenly.",
    swatch: "#c9a961",
  },
];

export function getJewelryBackgroundById(
  id: string
): JewelryBackground | undefined {
  return JEWELRY_BACKGROUNDS.find((b) => b.id === id);
}

// ─── Pack Prompt Builder ─────────────────────────────────────────
/**
 * Builds 2 prompts for the Jewelry Pack:
 * hero (background replace) and angle (slight perspective shift).
 * Close-up is handled via Sharp crop — no AI needed.
 */
// Type-specific angle descriptions for visually distinct alternate shots
const ANGLE_BY_TYPE: Record<string, string> = {
  ring: "Show the ring TILTED at a 45-degree angle, leaning slightly toward the camera — so the viewer can see both the TOP FACE (stones/setting) and the SIDE PROFILE (band thickness, setting height) simultaneously. The ring should rest on the surface at this tilt with a natural contact shadow beneath it.",

  necklace: "Show the necklace in a FLAT-LAY composition — camera directly overhead looking straight down. The necklace is laid out in a natural open curve/arc shape on the surface, showing its full length and pendant. Natural drape with realistic contact shadow.",

  earring: "Show the earring at a SIDE ANGLE — camera at roughly 30 degrees from the side, so the viewer can see the DROP/DANGLE depth, the hook/post attachment, and the three-dimensional form of the earring. Realistic contact shadow beneath it.",

  bracelet: "Show the bracelet STANDING UPRIGHT in its natural circular form — camera at eye level, so the viewer sees the full circular shape from the front, revealing the clasp area and the depth of the design. Realistic contact shadow beneath it.",

  bangle: "Show the bangle STANDING UPRIGHT in its circular form — camera at eye level or slightly above, displaying the full round silhouette and the width/thickness of the bangle. Realistic contact shadow beneath it.",

  pendant: "Show the pendant at a TILTED ANGLE — camera at roughly 45 degrees from the side, so the viewer can see the pendant's depth/thickness, the bail, and how the pendant would hang. Realistic contact shadow.",

  brooch: "Show the brooch at a SLIGHT TILT — camera at roughly 30 degrees from the side, revealing the three-dimensional depth of the design, any raised elements, and the pin mechanism on the back edge. Realistic contact shadow.",

  anklet: "Show the anklet in a FLAT-LAY composition — camera directly overhead, the anklet laid out in a gentle open curve showing its full length, charms, and clasp detail. Realistic contact shadow.",

  chain: "Show the chain in a FLAT-LAY composition — camera directly overhead, the chain arranged in an elegant S-curve or gentle loop on the surface, showing link detail and full length. Realistic contact shadow.",

  set: "Show the jewelry set in a FLAT-LAY composition — camera directly overhead, each piece arranged with breathing space between them in a balanced editorial layout on the surface. Realistic contact shadows.",
};

export function buildJewelryPackPrompts(backgroundPrompt: string, jewelryType?: string): {
  hero: string;
  angle: string;
} {
  const removeExtras = "Remove any hands, fingers, skin, body parts, display stands, boxes, or props — show ONLY the jewelry piece itself.";

  const pixelPerfect = "CRITICAL PIXEL-PERFECT RULE: Every single stone, facet, prong, bezel, engraving, metal texture, chain link, clasp, and design element must remain EXACTLY identical to the original photograph — same count of stones, same arrangement, same metal color and finish, same proportions. Do NOT add, remove, or alter ANY detail of the jewelry.";

  const angleDesc = ANGLE_BY_TYPE[jewelryType || "ring"] || ANGLE_BY_TYPE.ring;

  return {
    hero: `Edit this jewelry photograph. ${removeExtras} Replace ONLY the background. ${backgroundPrompt} Add soft, professional studio lighting that enhances the jewelry's natural brilliance, sparkle, and metal luster. The background must be uniform edge-to-edge — no dark corners, no vignette. Do NOT change the camera angle, perspective, orientation, or viewing direction — keep the EXACT same angle as the original photo. Do NOT rotate, tilt, or reposition the jewelry in any way. ${pixelPerfect} Only remove non-jewelry elements and change the background and lighting.`,

    angle: `RECOMPOSE this jewelry into a NEW CAMERA ANGLE. THIS IS THE MOST IMPORTANT INSTRUCTION: ${angleDesc} WHILE CHANGING THE ANGLE, you MUST preserve every minute detail of the jewelry — every stone count, every facet, every prong, every engraving, every texture, every metal finish EXACTLY as the original. If you cannot show a detail from this new angle, do NOT invent or guess — only show what would naturally be visible. ${removeExtras} Background: ${backgroundPrompt} Do NOT add ANY props — ONLY the jewelry piece on the background. LIGHTING: Dramatic editorial side-lighting from the left with a warm highlight on the metal. Background must fill the frame edge-to-edge — no dark corners, no vignette. ${pixelPerfect}`,
  };
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

// ─── Video Theme Presets ────────────────────────────────────────
export interface VideoTheme {
  id: string;
  label: string;
  icon: string;
  /** Prompt template — {product} is replaced with context */
  prompt: string;
}

export const VIDEO_THEMES: VideoTheme[] = [
  {
    id: "rotation-sparkle",
    label: "360° Rotation Sparkle",
    icon: "💫",
    prompt:
      "Slow 360° orbit around this jewelry piece, diamonds and stones subtly twinkling with light reflections, soft studio lighting from multiple angles, luxury jewelry advertisement style, smooth cinematic camera movement, 8s seamless loop, hyper-realistic, 4K quality.",
  },
  {
    id: "sway-pan",
    label: "Sway & Pan",
    icon: "🎬",
    prompt:
      "Camera gently pans left to right across this jewelry piece while any chain or dangling elements sway naturally with subtle breeze, gem facets catching and refracting light beautifully, premium e-commerce showcase style, cinematic depth of field, smooth motion, 4K quality.",
  },
  {
    id: "hover-zoom",
    label: "Hover Zoom Reveal",
    icon: "🔍",
    prompt:
      "Subtle upward float and slow zoom into this jewelry piece, metal gleaming with micro-sparkles, clean elegant background, high-end product reveal style, slow motion, shallow depth of field transitioning from full piece to intricate close-up details, luxury brand advertisement, 4K quality.",
  },
  {
    id: "dramatic-light",
    label: "Dramatic Light Play",
    icon: "✨",
    prompt:
      "Dramatic studio lighting sweeping across this jewelry piece from left to right, creating moving highlights and shadows that reveal the brilliance of every stone and the luster of the metal, dark moody background, luxury editorial style, slow cinematic movement, 4K quality.",
  },
  {
    id: "lifestyle-motion",
    label: "Lifestyle Motion",
    icon: "🌸",
    prompt:
      "This jewelry piece in an elegant lifestyle setting — soft silk fabric gently rippling underneath, flower petals drifting slowly in background, warm golden-hour light with subtle lens flare, aspirational luxury brand commercial style, smooth slow-motion, dreamy shallow depth of field, 4K quality.",
  },
];

export function getVideoThemeById(id: string): VideoTheme | undefined {
  return VIDEO_THEMES.find((t) => t.id === id);
}
