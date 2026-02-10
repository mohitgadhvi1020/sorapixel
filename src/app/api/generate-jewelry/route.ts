import { NextRequest, NextResponse } from "next/server";
import { generateStudioImage } from "@/lib/gemini";
import {
  getJewelryBackgroundById,
  buildJewelryPackPrompts,
  buildCustomJewelryPrompt,
} from "@/lib/jewelry-styles";
import { compositeLogoOnImage } from "@/lib/logo-overlay-server";
import { getRatioById, DEFAULT_RATIO } from "@/lib/aspect-ratios";
import { cropToRatio } from "@/lib/crop-to-ratio";

export const maxDuration = 180; // 5 images → needs more time

interface PackImage {
  label: string;
  base64: string;
  mimeType: string;
  text?: string;
}

interface GenerateJewelryResponse {
  success: boolean;
  images?: PackImage[];
  error?: string;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<GenerateJewelryResponse>> {
  try {
    const body = await req.json();
    const {
      imageBase64,
      backgroundId,
      customBackground,
      logoBase64,
      aspectRatioId,
    } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      );
    }

    // Resolve aspect ratio
    const ratio = getRatioById(aspectRatioId) || DEFAULT_RATIO;

    // Resolve background prompt
    let backgroundPrompt: string;

    if (customBackground && customBackground.trim()) {
      backgroundPrompt = buildCustomJewelryPrompt(customBackground.trim())
        // buildCustomJewelryPrompt already includes isolation + preserve,
        // so we use it directly as the base for the hero prompt only.
        // For the pack we need just the background sentence.
        ;
      // Actually we need to feed buildJewelryPackPrompts the raw bg sentence.
      // Let's use the custom text as the background, and pack builder wraps it.
    } else if (backgroundId) {
      const bg = getJewelryBackgroundById(backgroundId);
      if (!bg) {
        return NextResponse.json(
          { success: false, error: "Invalid background selected" },
          { status: 400 }
        );
      }
      backgroundPrompt = bg.prompt;
    } else {
      return NextResponse.json(
        { success: false, error: "No background selected" },
        { status: 400 }
      );
    }

    // Append aspect-ratio composition hint
    const ratioHint = `\n\nCOMPOSITION: ${ratio.compositionHint}`;

    // Build 5 prompts
    let prompts;
    if (customBackground && customBackground.trim()) {
      // For custom background, build a one-off base prompt then fan out
      const customBase = `${customBackground.trim()} Professional jewelry photography with studio-quality lighting that enhances the brilliance and details of the jewelry.`;
      prompts = buildJewelryPackPrompts(customBase);
    } else {
      prompts = buildJewelryPackPrompts(backgroundPrompt);
    }

    // Append ratio hint to every prompt
    const promptEntries: { label: string; prompt: string }[] = [
      { label: "Hero Shot", prompt: prompts.hero + ratioHint },
      { label: "Alternate Angle", prompt: prompts.angle + ratioHint },
      { label: "Macro Close-up", prompt: prompts.closeup + ratioHint },
      { label: "Lifestyle", prompt: prompts.lifestyle + ratioHint },
      { label: "Collection Display", prompt: prompts.setDisplay + ratioHint },
    ];

    // Detect mime type
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

    console.log(
      `Generating Jewelry Pack (5 images) | BG: ${backgroundId || "custom"} | Ratio: ${ratio.label}`
    );

    // Fire all 5 in parallel
    const results = await Promise.all(
      promptEntries.map(({ label, prompt }) =>
        generateStudioImage(imageBase64, mimeType, prompt)
          .then((r) => ({
            label,
            base64: r.resultBase64,
            mimeType: r.resultMimeType,
            text: r.text,
            error: false,
          }))
          .catch((e) => ({
            label,
            base64: "",
            mimeType: "image/png",
            text: `${label} failed: ${e.message}`,
            error: true,
          }))
      )
    );

    const images: PackImage[] = results
      .filter((r) => r.base64)
      .map((r) => ({
        label: r.label,
        base64: r.base64,
        mimeType: r.mimeType,
        text: r.text,
      }));

    if (images.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "All 5 generations failed. Please try again.",
        },
        { status: 500 }
      );
    }

    // Crop to exact aspect ratio (+ circular mask if needed)
    console.log(
      `Cropping to ${ratio.width}x${ratio.height}${ratio.circular ? " (circular)" : ""}...`
    );
    for (let i = 0; i < images.length; i++) {
      try {
        images[i].base64 = await cropToRatio(
          images[i].base64,
          ratio.width,
          ratio.height,
          !!ratio.circular
        );
        images[i].mimeType = "image/png";
      } catch (err) {
        console.error(`Crop failed for jewelry image ${i}:`, err);
      }
    }

    // Apply logo overlay if provided (after crop so logo is in final frame)
    if (logoBase64) {
      const rawLogo = logoBase64.replace(/^data:image\/\w+;base64,/, "");
      console.log("Applying brand logo overlay...");
      for (let i = 0; i < images.length; i++) {
        try {
          images[i].base64 = await compositeLogoOnImage(
            images[i].base64,
            rawLogo
          );
          images[i].mimeType = "image/png";
        } catch (err) {
          console.error(`Logo overlay failed for jewelry image ${i}:`, err);
        }
      }
    }

    console.log(`Jewelry pack complete! ${images.length}/5 images generated.`);

    return NextResponse.json({ success: true, images });
  } catch (error) {
    console.error("Jewelry generation error:", error);
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
