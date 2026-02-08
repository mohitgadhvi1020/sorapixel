import { NextRequest, NextResponse } from "next/server";
import { generateStudioImage } from "@/lib/gemini";
import { compositeLogoOnImage } from "@/lib/logo-overlay-server";

export const maxDuration = 120;

interface InfoImage {
  label: string;
  base64: string;
  mimeType: string;
  text?: string;
}

interface GenerateInfoResponse {
  success: boolean;
  images?: InfoImage[];
  error?: string;
}

const PRODUCT_ISOLATION = `CRITICAL FIRST STEP — Product Identification & Isolation:
Analyze this image and identify the MAIN PRODUCT being showcased. The product might be held in a hand, worn on a body, placed on a messy surface, or surrounded by other objects. You MUST:
1. Identify what the actual product is (e.g. a bracelet, a bottle, a pan, a lunch box, etc.)
2. Mentally extract ONLY the product itself — remove any hands, fingers, wrists, arms, body parts, human skin, other unrelated objects, and the original background
3. Use ONLY the isolated product for the final image — no hands, no human body parts, nothing except the product itself

`;

function buildPropertiesPrompt(properties: string): string {
  return `${PRODUCT_ISOLATION}Now, using the isolated product, create a professional e-commerce product feature infographic image.

CONTEXT-AWARE FEATURE RENDERING — THIS IS CRITICAL:
Analyze each feature below and understand what part of the product it relates to:

- If a feature describes a VISIBLE physical part of the product (e.g. "Anti-Slip Handle", "Wide Mouth Opening", "Stainless Steel Body"):
  → Draw a circular callout/zoom crop highlighting that SPECIFIC area on the product
  → Connect it with a thin line to the relevant part
  → Label the callout with the EXACT text

- If a feature describes a GENERAL property that isn't tied to a specific visible area (e.g. "BPA Free", "Food Grade Material", "Dishwasher Safe"):
  → Display it as a clean icon badge or label chip placed around the product
  → Do NOT draw a callout line pointing to a random part of the product — that looks unrealistic

LAYOUT REQUIREMENTS:
- Show the isolated product image prominently in the center or slightly off-center — NO hands, arms, or body parts
- Physical-part features → circular callouts with lines pointing to the correct part
- General property features → clean badges/chips arranged neatly around the product
- Use a clean, soft-colored background (cream, light grey, or pastel)

FEATURE TEXT TO DISPLAY — render each one EXACTLY as written, do NOT change, rephrase, abbreviate, or omit ANY text:

${properties}

STYLE:
- Professional, clean, marketplace-ready design like Amazon or Flipkart product listings
- Be creative with the background color, text color, font styling, and layout arrangement
- Show ONLY the product — absolutely no hands, fingers, or body parts
- Keep the product EXACTLY as it is — do not change, distort, or modify the product in any way
- All text must be clearly legible and sharp`;
}

function buildDimensionsPrompt(dimensions: string): string {
  return `${PRODUCT_ISOLATION}Now, using the isolated product, create a professional e-commerce product dimensions/specifications infographic image.

AXIS RULES — FOLLOW THESE EXACTLY, DO NOT MIX UP:

"Height" = the VERTICAL measurement (top to bottom of the product)
  → Draw a VERTICAL line running UP-DOWN along the side of the product
  → The line goes from the top edge to the bottom edge
  → Place the text label to the right of this vertical line

"Width" = the HORIZONTAL measurement (left to right of the product)
  → Draw a HORIZONTAL line running LEFT-RIGHT across the product
  → The line goes from the left edge to the right edge
  → Place the text label below this horizontal line

"Length" = same as width, HORIZONTAL (left to right or front to back)
  → Draw a HORIZONTAL line

"Diameter" = HORIZONTAL line across the widest circular cross-section

"Depth" / "Thickness" = the FRONT-TO-BACK measurement, show as a short angled line

CRITICAL: Do NOT put a height label on a horizontal line. Do NOT put a width label on a vertical line. Height is ALWAYS vertical. Width is ALWAYS horizontal. Double-check your axis assignments before rendering.

NON-SPATIAL VALUES (weight, capacity, volume, material, wattage, etc.):
  → Do NOT draw dimension lines for these
  → Show them as clean badge/label/chip placed near the product (below or beside it)
  → Example: "Weight: 200gm" = badge, NOT a line with arrows

LAYOUT:
- Show the isolated product clearly — NO hands, arms, or body parts
- Each dimension line must have arrows at BOTH ends touching the actual product edges
- Lines must NOT overlap — space them clearly with enough gap between them
- Use a clean white or very light background

MEASUREMENT TEXT — render EXACTLY as written, do NOT change any number or unit:

${dimensions}

STYLE:
- Clean technical/engineering drawing style
- Professional marketplace-ready design (Amazon / Flipkart quality)
- Be creative with colors, text styling, and layout
- Show ONLY the product — no hands or body parts
- Keep the product image EXACTLY intact — do not modify it
- All text must be sharp, legible, and match the input exactly`;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<GenerateInfoResponse>> {
  try {
    const body = await req.json();
    const { imageBase64, properties, dimensions, logoBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      );
    }

    if (!properties && !dimensions) {
      return NextResponse.json(
        { success: false, error: "Provide at least properties or dimensions" },
        { status: 400 }
      );
    }

    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

    console.log("Generating info images with Gemini...");

    const promises: Promise<{
      label: string;
      resultBase64: string;
      resultMimeType: string;
      text?: string;
    }>[] = [];

    if (properties && properties.trim()) {
      promises.push(
        generateStudioImage(
          imageBase64,
          mimeType,
          buildPropertiesPrompt(properties.trim())
        ).then((r) => ({ label: "Product Features", ...r }))
      );
    }

    if (dimensions && dimensions.trim()) {
      promises.push(
        generateStudioImage(
          imageBase64,
          mimeType,
          buildDimensionsPrompt(dimensions.trim())
        ).then((r) => ({ label: "Product Dimensions", ...r }))
      );
    }

    const results = await Promise.all(
      promises.map((p) =>
        p.catch((e) => ({
          label: "Failed",
          resultBase64: "",
          resultMimeType: "image/png",
          text: `Failed: ${e.message}`,
        }))
      )
    );

    const images: InfoImage[] = results
      .filter((r) => r.resultBase64)
      .map((r) => ({
        label: r.label,
        base64: r.resultBase64,
        mimeType: r.resultMimeType,
        text: r.text,
      }));

    if (images.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Info image generation failed. Please try again.",
        },
        { status: 500 }
      );
    }

    // Apply logo overlay if provided
    if (logoBase64) {
      const rawLogo = logoBase64.replace(/^data:image\/\w+;base64,/, "");
      console.log("Applying brand logo overlay with Sharp...");
      for (let i = 0; i < images.length; i++) {
        try {
          images[i].base64 = await compositeLogoOnImage(
            images[i].base64,
            rawLogo
          );
          images[i].mimeType = "image/png";
        } catch (err) {
          console.error(`Logo overlay failed for info image ${i}:`, err);
        }
      }
    }

    console.log(`Info images complete! ${images.length} generated.`);

    return NextResponse.json({ success: true, images });
  } catch (error) {
    console.error("Info generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
