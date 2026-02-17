import { NextRequest, NextResponse } from "next/server";
import { generateStudioImage, generateStudioImageMultiRef } from "@/lib/gemini";
import { getRatioById, DEFAULT_RATIO } from "@/lib/aspect-ratios";
import { cropToRatio } from "@/lib/crop-to-ratio";
import { addWatermark } from "@/lib/watermark";
import { getClientId, trackGeneration, trackImage, uploadImage } from "@/lib/track-usage";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, targetColor, aspectRatioId } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      );
    }

    if (!targetColor || !targetColor.trim()) {
      return NextResponse.json(
        { success: false, error: "No target color provided" },
        { status: 400 }
      );
    }

    const colorDesc = targetColor.trim();

    // ── STEP 1: Recolor metal (may bleed into stones) ──
    const step1Prompt = `Change ONLY the metal color of this jewelry to: "${colorDesc}". Metal parts include: band, chain links, prongs, settings, clasps, wire, frame, bezel, hook, post, bail. Change these to a realistic ${colorDesc} metallic finish with natural reflections. Try to keep stones and non-metal elements unchanged, but focus on getting the metal color right.`;

    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

    console.log(`Recoloring jewelry metal to: "${colorDesc}" (Step 1: recolor)...`);

    const step1Result = await generateStudioImage(imageBase64, mimeType, step1Prompt, "1:1");

    if (!step1Result.resultBase64) {
      throw new Error("Recolor Step 1 failed — no image returned");
    }

    // ── STEP 2: Restore stones/diamonds from original ──
    const step2Prompt = `You are given TWO images of the same jewelry piece:
- Image 1 (FIRST): The ORIGINAL jewelry with correct stone/diamond/gem colors but the OLD metal color
- Image 2 (SECOND): The RECOLORED jewelry with the correct NEW metal color (${colorDesc}) but some stones/diamonds may have been accidentally tinted

YOUR TASK: Create a FINAL image that combines:
1. The NEW METAL COLOR from Image 2 — keep the ${colorDesc} metal exactly as shown in Image 2
2. The ORIGINAL STONE/DIAMOND/GEM COLORS from Image 1 — restore every non-metal element to match Image 1 exactly

WHAT TO TAKE FROM IMAGE 2 (recolored): metal band, chain, prongs, settings, clasps, wire, frame, bezel — all the ${colorDesc} metallic parts
WHAT TO TAKE FROM IMAGE 1 (original): diamonds (white/clear), gemstones (their original colors), pearls, enamel, Kundan/Polki/Meenakari work, any colored inlay, background

The output must look like the jewelry was ALWAYS made in ${colorDesc} metal — with realistic reflections and metallic luster on the metal parts — while every single stone, diamond, pearl, gem, and enamel element has its EXACT original color from Image 1. No tinting, no color bleed.`;

    console.log(`Recoloring jewelry (Step 2: restore stones from original)...`);

    const originalRaw = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const step1Raw = step1Result.resultBase64;

    const step2Result = await generateStudioImageMultiRef(
      [
        { base64: originalRaw, mimeType },
        { base64: step1Raw, mimeType: step1Result.resultMimeType },
      ],
      step2Prompt,
      "1:1"
    );

    if (!step2Result.resultBase64) {
      throw new Error("Recolor Step 2 failed — no image returned");
    }

    // Combine token usage from both steps
    const totalTokenUsage = {
      inputTokens: (step1Result.tokenUsage?.inputTokens || 0) + (step2Result.tokenUsage?.inputTokens || 0),
      outputTokens: (step1Result.tokenUsage?.outputTokens || 0) + (step2Result.tokenUsage?.outputTokens || 0),
      totalTokens: (step1Result.tokenUsage?.totalTokens || 0) + (step2Result.tokenUsage?.totalTokens || 0),
    };

    // Crop to aspect ratio if provided
    let finalBase64 = step2Result.resultBase64;
    let finalMimeType = step2Result.resultMimeType;

    if (aspectRatioId) {
      const ratio = getRatioById(aspectRatioId) || DEFAULT_RATIO;
      try {
        finalBase64 = await cropToRatio(
          finalBase64,
          ratio.width,
          ratio.height,
          !!ratio.circular,
          true // forceContain — never crop jewelry
        );
        finalMimeType = "image/png";
      } catch (err) {
        console.error("Crop failed for recolor:", err);
      }
    }

    // Add watermark for preview
    let watermarkedBase64 = finalBase64;
    try {
      watermarkedBase64 = await addWatermark(finalBase64);
    } catch (err) {
      console.error("Watermark failed for recolor:", err);
    }

    console.log("Jewelry recolor complete!");

    // Track usage (non-blocking)
    const clientId = await getClientId();
    if (clientId) {
      (async () => {
        try {
          const genId = await trackGeneration({
            clientId,
            generationType: "recolor",
            tokenUsage: totalTokenUsage,
            model: "gemini-2.5-flash-image",
          });
          const uploaded = await uploadImage(clientId, finalBase64, "Recolored");
          if (uploaded) {
            await trackImage({
              generationId: genId,
              clientId,
              label: `Recolored (${colorDesc})`,
              storagePath: uploaded.path,
              fileSizeBytes: uploaded.size,
            });
          }
        } catch (err) {
          console.error("Tracking error (non-fatal):", err);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      image: {
        base64: finalBase64,
        watermarkedBase64,
        mimeType: finalMimeType,
      },
    });
  } catch (error) {
    console.error("Recolor error:", error);
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
