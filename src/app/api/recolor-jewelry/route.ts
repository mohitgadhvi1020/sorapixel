import { NextRequest, NextResponse } from "next/server";
import { generateStudioImage } from "@/lib/gemini";
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

    const prompt = `You are a professional jewelry retoucher. Change ONLY the metal color to: "${colorDesc}"

WHAT IS METAL (change these): band, chain links, prongs, settings, clasps, wire, frame, bezel, hook, post, back, bail — the solid metallic structural parts.

WHAT IS NOT METAL (DO NOT touch these — leave EVERY pixel unchanged):
- DIAMONDS — keep them white/clear/brilliant, do NOT tint them
- GEMSTONES — rubies (red), emeralds (green), sapphires (blue), pearls (white/cream), amethyst (purple), topaz, garnet, opal, turquoise, CZ — keep their EXACT original color
- ENAMEL or painted accents — keep their exact color
- MEENAKARI / KUNDAN / POLKI work — keep the original colors of any colored inlay or uncut stones
- Background, skin, clothing, fabric — zero changes

COLOR TARGET: "${colorDesc}"
- Hex code → match that exact metallic hue
- Text (e.g. "rose gold") → realistic metallic finish in that color

REALISM RULES:
- Metal must look like REAL metal — maintain natural reflections, highlights, and light/shadow patterns
- Only shift the metal hue — do NOT flatten, paint, or remove metallic luster
- Prongs and settings around stones change color, but the stones they hold must NOT change at all
- Every non-metal pixel must remain COMPLETELY IDENTICAL to the input

OUTPUT: Same image, only metal color changed. Nothing else.`;

    // Detect mime type
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

    console.log(`Recoloring jewelry metal to: "${colorDesc}"`);

    const result = await generateStudioImage(imageBase64, mimeType, prompt, "1:1");

    if (!result.resultBase64) {
      throw new Error("Recolor failed — no image returned");
    }

    // Crop to aspect ratio if provided
    let finalBase64 = result.resultBase64;
    let finalMimeType = result.resultMimeType;

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
            tokenUsage: result.tokenUsage,
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
