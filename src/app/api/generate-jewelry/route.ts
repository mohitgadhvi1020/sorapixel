import { NextRequest, NextResponse } from "next/server";
import { generateStudioImage } from "@/lib/gemini";
import {
  getJewelryBackgroundById,
  buildJewelryPackPrompts,
} from "@/lib/jewelry-styles";
import { cropToRatio } from "@/lib/crop-to-ratio";
import { addWatermark } from "@/lib/watermark";
import sharp from "sharp";

export const maxDuration = 180;

interface PackImage {
  label: string;
  base64: string;
  watermarkedBase64: string;
  mimeType: string;
  text?: string;
}

interface GenerateJewelryResponse {
  success: boolean;
  images?: PackImage[];
  error?: string;
}

/**
 * Flatten any transparency to white background using Sharp.
 * Returns base64 PNG (no data URI prefix).
 */
async function flattenToWhite(imageBase64: string): Promise<string> {
  const raw = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const buf = Buffer.from(raw, "base64");

  const meta = await sharp(buf).metadata();
  if (!meta.hasAlpha) return raw;

  const flatBuf = await sharp(buf)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ compressionLevel: 6 })
    .toBuffer();

  return flatBuf.toString("base64");
}

/**
 * Step 0: Use Gemini to remove background and isolate jewelry on plain white.
 * Short, focused prompt — minimal change = minimal hallucination.
 */
async function removeBackground(
  imageBase64: string,
  mimeType: string
): Promise<{ base64: string; mimeType: string }> {
  const BG_REMOVAL_PROMPT = `Remove the background from this jewelry photo. Place the jewelry on a plain white background. Do NOT modify the jewelry in any way — keep every stone, metal detail, engraving, and design element exactly as-is. Only the background changes to white.`;

  const result = await generateStudioImage(
    imageBase64,
    mimeType,
    BG_REMOVAL_PROMPT,
    "1:1"
  );

  return {
    base64: result.resultBase64,
    mimeType: result.resultMimeType,
  };
}

/**
 * Creates a center-crop close-up from an existing image using Sharp.
 * Crops to the center 60% of the image, then resizes to target dimensions.
 * 100% original pixels — zero AI hallucination.
 */
async function createCloseupCrop(
  imageBase64: string,
  targetSize: number
): Promise<string> {
  const raw = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const inputBuffer = Buffer.from(raw, "base64");

  const metadata = await sharp(inputBuffer).metadata();
  const w = metadata.width || targetSize;
  const h = metadata.height || targetSize;

  const cropRatio = 0.6;
  const cropW = Math.round(w * cropRatio);
  const cropH = Math.round(h * cropRatio);
  const left = Math.round((w - cropW) / 2);
  const top = Math.round((h - cropH) / 2);

  const croppedBuffer = await sharp(inputBuffer)
    .extract({ left, top, width: cropW, height: cropH })
    .resize(targetSize, targetSize, { fit: "cover", kernel: "lanczos3" })
    .sharpen({ sigma: 0.8 })
    .png({ compressionLevel: 6 })
    .toBuffer();

  return croppedBuffer.toString("base64");
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<GenerateJewelryResponse>> {
  try {
    const body = await req.json();
    const {
      imageBase64,
      backgroundId,
      onlyHero,
      onlyRest,
      heroBase64,
      regenerateSingle,
    } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      );
    }

    // Parse the input image
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const inputMimeType = mimeMatch ? mimeMatch[1] : "image/png";

    console.log(`Jewelry generation | onlyHero=${!!onlyHero} onlyRest=${!!onlyRest} regenerateSingle=${regenerateSingle || "none"}`);

    const targetSize = 1080;

    // Resolve background
    if (!backgroundId) {
      return NextResponse.json(
        { success: false, error: "No background selected" },
        { status: 400 }
      );
    }
    const bg = getJewelryBackgroundById(backgroundId);
    if (!bg) {
      return NextResponse.json(
        { success: false, error: "Invalid background selected" },
        { status: 400 }
      );
    }

    // ── Step 0: Flatten transparency + AI background removal ──
    // This gives all subsequent steps a clean jewelry-on-white input
    console.log("Step 0: Flattening transparency & removing background...");

    const flatBase64 = await flattenToWhite(imageBase64);
    const flatDataUri = `data:image/png;base64,${flatBase64}`;

    let cleanImage: { base64: string; mimeType: string };
    try {
      cleanImage = await removeBackground(flatDataUri, "image/png");
      console.log("Background removal complete — clean white-bg image ready.");
    } catch (err) {
      console.warn("Background removal failed, using flattened original:", err);
      cleanImage = { base64: flatBase64, mimeType: "image/png" };
    }

    // Use the cleaned image for all generation steps
    const cleanDataUri = `data:${cleanImage.mimeType};base64,${cleanImage.base64}`;
    const cleanMime = cleanImage.mimeType;

    // Build prompts
    const prompts = buildJewelryPackPrompts(bg.prompt);
    const compositionHint = "\n\nOutput a perfect 1:1 square image. Jewelry centered with balanced space on all sides.";

    const images: PackImage[] = [];

    if (regenerateSingle) {
      // ── Regenerate a single image ──
      if (regenerateSingle === "hero") {
        console.log("Regenerating Hero Shot...");
        const heroResult = await generateStudioImage(
          cleanDataUri,
          cleanMime,
          prompts.hero + compositionHint,
          "1:1"
        );
        let heroB64 = heroResult.resultBase64;
        try {
          heroB64 = await cropToRatio(heroB64, targetSize, targetSize, false, true);
        } catch (err) {
          console.error("Hero resize failed:", err);
        }
        images.push({
          label: "Hero Shot",
          base64: heroB64,
          watermarkedBase64: "",
          mimeType: "image/png",
          text: heroResult.text,
        });
      } else if (regenerateSingle === "closeup") {
        console.log("Regenerating Close-up Detail...");
        const heroSource = heroBase64 || cleanDataUri;
        const closeupB64 = await createCloseupCrop(heroSource, targetSize);
        images.push({
          label: "Close-up Detail",
          base64: closeupB64,
          watermarkedBase64: "",
          mimeType: "image/png",
        });
      } else if (regenerateSingle === "angle") {
        console.log("Regenerating Alternate Angle...");
        const angleResult = await generateStudioImage(
          cleanDataUri,
          cleanMime,
          prompts.angle + compositionHint,
          "1:1"
        );
        let angleB64 = angleResult.resultBase64;
        try {
          angleB64 = await cropToRatio(angleB64, targetSize, targetSize, false, true);
        } catch (err) {
          console.error("Angle resize failed:", err);
        }
        images.push({
          label: "Alternate Angle",
          base64: angleB64,
          watermarkedBase64: "",
          mimeType: "image/png",
          text: angleResult.text,
        });
      }
      console.log(`Single regeneration complete: ${regenerateSingle}`);

    } else if (onlyHero) {
      // ── Step 1: Hero Shot ──
      console.log("Generating Hero Shot from cleaned image...");
      const heroResult = await generateStudioImage(
        cleanDataUri,
        cleanMime,
        prompts.hero + compositionHint,
        "1:1"
      );

      let heroB64 = heroResult.resultBase64;
      try {
        heroB64 = await cropToRatio(heroB64, targetSize, targetSize, false, true);
      } catch (err) {
        console.error("Hero resize failed:", err);
      }

      images.push({
        label: "Hero Shot",
        base64: heroB64,
        watermarkedBase64: "",
        mimeType: "image/png",
        text: heroResult.text,
      });

      console.log("Hero Shot complete.");

    } else if (onlyRest) {
      // ── Step 2: Close-up (Sharp crop) + Alternate Angle (AI) ──
      const heroSource = heroBase64 || cleanDataUri;

      const [closeupB64, angleResult] = await Promise.all([
        createCloseupCrop(heroSource, targetSize).catch((err) => {
          console.error("Close-up crop failed:", err);
          return null;
        }),
        generateStudioImage(
          cleanDataUri,
          cleanMime,
          prompts.angle + compositionHint,
          "1:1"
        ).catch((err) => {
          console.error("Alternate angle failed:", err);
          return null;
        }),
      ]);

      if (closeupB64) {
        images.push({
          label: "Close-up Detail",
          base64: closeupB64,
          watermarkedBase64: "",
          mimeType: "image/png",
        });
      }

      if (angleResult) {
        let angleB64 = angleResult.resultBase64;
        try {
          angleB64 = await cropToRatio(angleB64, targetSize, targetSize, false, true);
        } catch (err) {
          console.error("Angle resize failed:", err);
        }
        images.push({
          label: "Alternate Angle",
          base64: angleB64,
          watermarkedBase64: "",
          mimeType: "image/png",
          text: angleResult.text,
        });
      }

      console.log(`Rest complete: ${images.length} images generated.`);

    } else {
      // Full pack fallback
      console.log("Generating full pack (3 images)...");

      const heroResult = await generateStudioImage(
        cleanDataUri,
        cleanMime,
        prompts.hero + compositionHint,
        "1:1"
      );

      let heroB64 = heroResult.resultBase64;
      try {
        heroB64 = await cropToRatio(heroB64, targetSize, targetSize, false, true);
      } catch (err) {
        console.error("Hero resize failed:", err);
      }

      images.push({
        label: "Hero Shot",
        base64: heroB64,
        watermarkedBase64: "",
        mimeType: "image/png",
        text: heroResult.text,
      });

      const [closeupB64, angleResult] = await Promise.all([
        createCloseupCrop(`data:image/png;base64,${heroB64}`, targetSize).catch(() => null),
        generateStudioImage(
          cleanDataUri,
          cleanMime,
          prompts.angle + compositionHint,
          "1:1"
        ).catch(() => null),
      ]);

      if (closeupB64) {
        images.push({ label: "Close-up Detail", base64: closeupB64, watermarkedBase64: "", mimeType: "image/png" });
      }
      if (angleResult) {
        let angleB64 = angleResult.resultBase64;
        try {
          angleB64 = await cropToRatio(angleB64, targetSize, targetSize, false, true);
        } catch (err) {
          console.error("Angle resize failed:", err);
        }
        images.push({ label: "Alternate Angle", base64: angleB64, watermarkedBase64: "", mimeType: "image/png", text: angleResult.text });
      }

      console.log(`Full pack complete: ${images.length}/3 images.`);
    }

    if (images.length === 0) {
      return NextResponse.json(
        { success: false, error: "Generation failed. Please try again." },
        { status: 500 }
      );
    }

    // Add watermarks to all images for preview
    console.log("Adding watermarks for preview...");
    for (let i = 0; i < images.length; i++) {
      try {
        images[i].watermarkedBase64 = await addWatermark(images[i].base64);
      } catch (err) {
        console.error(`Watermark failed for image ${i}:`, err);
        images[i].watermarkedBase64 = images[i].base64;
      }
    }

    return NextResponse.json({ success: true, images });
  } catch (error) {
    console.error("Jewelry generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
