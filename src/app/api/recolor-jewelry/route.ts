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

    const prompt = `You are a professional jewelry retoucher. You are given an image of a jewelry piece (or jewelry worn on a person).

YOUR TASK: Change the METAL COLOR of the jewelry to: "${colorDesc}"

CRITICAL RULES — READ CAREFULLY:
1. ONLY change the METAL parts of the jewelry (the base metal, chain links, prongs, clasps, band, wire, frame)
2. Change the metal to EXACTLY the color described: "${colorDesc}"
   - If it's a hex code (e.g. #FFD700), match that exact color as the metal finish
   - If it's a text description (e.g. "rose gold", "antique bronze", "matte black"), match that finish realistically
3. Do NOT change ANYTHING else:
   - Do NOT change any STONES (diamonds, emeralds, rubies, sapphires, pearls, etc.) — they must remain their original color
   - Do NOT change the DESIGN, SHAPE, SIZE, or STRUCTURE of the jewelry in any way
   - Do NOT change the BACKGROUND or any PERSON in the image
   - Do NOT change ENGRAVINGS, HALLMARKS, or SURFACE TEXTURES — only the color/finish of the metal
4. The recolored metal should look REALISTIC:
   - Maintain natural metallic reflections and highlights appropriate for the new color
   - Keep the same light/shadow patterns — just shift the metal hue
   - The metal should still look like real metal, not painted or flat
5. Every other pixel in the image must remain COMPLETELY UNCHANGED
6. The output must be HYPER-REALISTIC — indistinguishable from a real photograph of jewelry in the target metal color

OUTPUT: The same image with ONLY the metal color changed. Everything else identical.`;

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
