import { StylePreset } from "@/types";

/**
 * Universal preamble added to every generation prompt.
 * Tells the model to first identify and isolate the product
 * from any context (hands, body, table, other objects).
 */
const PRODUCT_ISOLATION = `CRITICAL FIRST STEP — Product Identification & Isolation:
Analyze this image and identify the MAIN PRODUCT being showcased. The product might be held in a hand, worn on a body, placed on a messy surface, or surrounded by other objects. You MUST:
1. Identify what the actual product is (e.g. a bracelet, a bottle, a pan, a lunch box, etc.)
2. Mentally extract ONLY the product itself — remove any hands, fingers, wrists, arms, body parts, human skin, other unrelated objects, and the original background
3. Use ONLY the isolated product for the final image — no hands, no human body parts, nothing except the product itself

`;

const PRESERVE = `ABSOLUTE PRODUCT FIDELITY — THIS IS THE MOST CRITICAL RULE:
The product in the output MUST be IDENTICAL to the product in the input image.
- Do NOT re-imagine, re-draw, or reinterpret the product in any way
- Do NOT change the shape, proportions, colors, logos, labels, buttons, text, or any visible detail
- Do NOT simplify, stylize, or "improve" the product appearance
- The product must look like it was PHOTOGRAPHICALLY CUT from the original photo and PLACED into the new scene
- Preserve every scratch, reflection, sticker, seam, and imperfection exactly as they appear
- If the product has a specific unusual shape, reproduce that EXACT shape — do not make it look more generic
Show ONLY the product, absolutely no hands or body parts.`;

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "kitchen-counter",
    name: "Kitchen Counter",
    description: "Product on a granite countertop with soft natural light",
    prompt: `${PRODUCT_ISOLATION}Now place the isolated product on a clean granite kitchen countertop. Add soft natural light streaming from a window. The background should be a modern kitchen, slightly blurred with shallow depth of field. Professional product photography style. ${PRESERVE}`,
    thumbnail: "🏠",
  },
  {
    id: "lifestyle-scene",
    name: "Lifestyle Scene",
    description: "Product in a styled kitchen with herbs and ingredients",
    prompt: `${PRODUCT_ISOLATION}Now place the isolated product in a beautifully styled kitchen scene. Add fresh herbs, ingredients, and kitchen accessories artfully arranged around the product. Warm ambient lighting, cozy cooking atmosphere. Professional lifestyle product photography. ${PRESERVE}`,
    thumbnail: "🌿",
  },
  {
    id: "clean-ecommerce",
    name: "Clean E-commerce",
    description: "Pure white background with studio lighting",
    prompt: `${PRODUCT_ISOLATION}Now place the isolated product on a pure clean white background. Add soft professional studio lighting with gentle shadows underneath the product. This should look like a premium e-commerce product listing photo — clean, minimal, and perfectly lit. ${PRESERVE}`,
    thumbnail: "⬜",
  },
  {
    id: "dramatic-lighting",
    name: "Dramatic Lighting",
    description: "Dark background with dramatic rim lighting",
    prompt: `${PRODUCT_ISOLATION}Now place the isolated product against a dark moody black background. Add dramatic rim lighting that creates a glowing edge around the product. Cinematic, luxury feel with high contrast. Premium commercial photography style. ${PRESERVE}`,
    thumbnail: "🌑",
  },
  {
    id: "marble-surface",
    name: "Marble Surface",
    description: "Elegant marble surface with luxury feel",
    prompt: `${PRODUCT_ISOLATION}Now place the isolated product on an elegant white marble surface with subtle grey veining. Soft diffused lighting from above. Luxury, premium, sophisticated feel. The surface should be slightly reflective. High-end catalog photography style. ${PRESERVE}`,
    thumbnail: "🪨",
  },
  {
    id: "rustic-wood",
    name: "Rustic Wood",
    description: "Warm wooden table with farmhouse aesthetic",
    prompt: `${PRODUCT_ISOLATION}Now place the isolated product on a warm rustic wooden table. Farmhouse aesthetic with soft warm golden hour lighting. Natural and organic feel with slight bokeh in the background. Editorial lifestyle photography style. ${PRESERVE}`,
    thumbnail: "🪵",
  },
  {
    id: "morning-light",
    name: "Morning Light",
    description: "Bright window light with breakfast scene",
    prompt: `${PRODUCT_ISOLATION}Now place the isolated product on a clean surface near a bright window with morning sunlight streaming in. Fresh and airy atmosphere with soft shadows. Breakfast scene vibes — light, bright, and inviting. Professional editorial photography. ${PRESERVE}`,
    thumbnail: "☀️",
  },
];

export function getStyleById(id: string): StylePreset | undefined {
  return STYLE_PRESETS.find((s) => s.id === id);
}

/**
 * Wraps a refined custom scene description with the standard
 * product isolation and preservation template.
 */
export function buildCustomPrompt(sceneDescription: string): string {
  return `${PRODUCT_ISOLATION}Now ${sceneDescription} Professional product photography with studio-quality lighting and sharp focus on the product. ${PRESERVE}`;
}

/**
 * Builds 3 prompts for the Marketplace Pack:
 * - hero: front-facing styled shot (same as base style)
 * - angle: 3/4 perspective showing more of the product shape
 * - closeup: macro/zoomed-in detail shot
 */
export function buildPackPrompts(stylePrompt: string): {
  hero: string;
  angle: string;
  closeup: string;
} {
  return {
    hero: stylePrompt,
    angle: `${stylePrompt} For this second image, keep the EXACT same product (do NOT redraw it) but adjust the scene/background perspective slightly to suggest a different viewpoint — as if the camera moved to a 3/4 elevated side angle. The product itself must remain pixel-identical to the input; only the background and lighting angle should shift. ${PRESERVE}`,
    closeup: `${stylePrompt} For this third image, create a tightly cropped view focusing on the center/most interesting area of the EXACT same product. Show existing surface texture, material finish, and craftsmanship details at closer magnification. The product must remain pixel-identical to the input — do NOT redraw or reinterpret any part of it. Shallow depth of field with softly blurred background. ${PRESERVE}`,
  };
}
