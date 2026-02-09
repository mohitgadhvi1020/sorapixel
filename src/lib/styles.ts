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

const PRESERVE = "Keep the product EXACTLY as it is — do not change, distort, or modify the product in any way. Show ONLY the product, absolutely no hands or body parts.";

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
    angle: `${stylePrompt} Show the product from a different angle — a 3/4 perspective view, slightly rotated to reveal more of its shape, depth, and form. The viewer should see the product as if looking at it from a slightly elevated side angle. Professional product photography with consistent lighting matching the scene. ${PRESERVE}`,
    closeup: `${stylePrompt} Create a close-up detail shot of this product. Zoom in to show the texture, material quality, surface finish, and craftsmanship of the product. Macro photography style with shallow depth of field. The background should be softly blurred while the product details are tack-sharp. ${PRESERVE}`,
  };
}
