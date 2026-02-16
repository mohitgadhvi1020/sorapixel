import sharp from "sharp";
import { generateStudioImage } from "@/lib/gemini";

/* ------------------------------------------------------------------ */
/*  Smart aspect-ratio fitting.                                       */
/*                                                                     */
/*  For jewelry (1:1 square):                                          */
/*   - Always use "contain" so the product is NEVER cropped            */
/*   - Fill any remaining space with white (clean, neutral)            */
/*                                                                     */
/*  For non-square (studio flow):                                      */
/*   ≤ 30% ratio mismatch  →  Sharp "cover" crop (fast, no API call)  */
/*   > 30% ratio mismatch  →  Gemini outpainting to extend the        */
/*                             background, then a mild Sharp resize    */
/* ------------------------------------------------------------------ */

/**
 * Fit an image to the exact target dimensions, preserving the product.
 *
 * - If `forceContain` is true, always uses "contain" with white fill
 *   (ideal for jewelry where we never want any cropping).
 * - Mild mismatch  → centre-crop via Sharp (fast, free).
 * - Large mismatch → Gemini extends/outpaints the background so the
 *   product stays intact and the image fills the target frame naturally.
 * - Final pass always uses Sharp for exact pixel dimensions + sharpening.
 * - If `circular` is true, applies a round mask (transparent corners).
 */
export async function cropToRatio(
  imageBase64: string,
  targetWidth: number,
  targetHeight: number,
  circular: boolean = false,
  forceContain: boolean = false
): Promise<string> {
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(cleanBase64, "base64");

  // ── Determine source vs target aspect ratio ──
  const meta = await sharp(buffer).metadata();
  const srcW = meta.width || targetWidth;
  const srcH = meta.height || targetHeight;
  const srcRatio = srcW / srcH;
  const tgtRatio = targetWidth / targetHeight;
  const ratioDiff =
    Math.abs(srcRatio - tgtRatio) / Math.max(srcRatio, tgtRatio);

  console.log(
    `cropToRatio: source=${srcW}x${srcH} (${srcRatio.toFixed(2)}) → target=${targetWidth}x${targetHeight} (${tgtRatio.toFixed(2)}) diff=${(ratioDiff * 100).toFixed(1)}% forceContain=${forceContain}`
  );

  let resizeBase64 = cleanBase64;
  let useContain = forceContain;

  // Large mismatch → ask Gemini to extend the background (only if not forceContain)
  if (!forceContain && ratioDiff > 0.3) {
    try {
      console.log(
        `Ratio mismatch ${(ratioDiff * 100).toFixed(0)}% — outpainting via Gemini…`
      );
      resizeBase64 = await outpaintToRatio(
        cleanBase64,
        srcW,
        srcH,
        targetWidth,
        targetHeight
      );
      useContain = true; // after outpainting, use contain to avoid any crop
    } catch (err) {
      console.error("Gemini outpaint failed, falling back to crop:", err);
    }
  }

  // ── Final Sharp resize — exact pixel dimensions ──
  const resizeBuffer = Buffer.from(resizeBase64, "base64");
  let pipeline: sharp.Sharp;

  if (useContain) {
    // Use contain with WHITE background — clean, neutral, no edge-color artifacts
    pipeline = sharp(resizeBuffer).resize(targetWidth, targetHeight, {
      fit: "contain",
      position: "centre",
      kernel: "lanczos3",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    });
  } else {
    pipeline = sharp(resizeBuffer).resize(targetWidth, targetHeight, {
      fit: "cover",
      position: "centre",
      kernel: "lanczos3",
    });
  }

  // Subtle sharpening
  pipeline = pipeline.sharpen({ sigma: 0.8 });

  if (circular) {
    const r = Math.min(targetWidth, targetHeight) / 2;
    const cx = targetWidth / 2;
    const cy = targetHeight / 2;
    const circleMask = Buffer.from(
      `<svg width="${targetWidth}" height="${targetHeight}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="white"/>
      </svg>`
    );
    pipeline = pipeline.composite([
      { input: circleMask, blend: "dest-in" },
    ]);
  }

  const result = await pipeline.png({ compressionLevel: 6 }).toBuffer();
  return result.toString("base64");
}

/* ------------------------------------------------------------------ */
/*  Gemini outpainting — extends background to match target ratio      */
/* ------------------------------------------------------------------ */

async function outpaintToRatio(
  base64: string,
  srcW: number,
  srcH: number,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  const srcRatio = srcW / srcH;
  const tgtRatio = targetWidth / targetHeight;

  let orientation: string;
  let ratioLabel: string;

  if (tgtRatio < srcRatio) {
    orientation = "TALLER/VERTICAL";
    ratioLabel = `${targetWidth}:${targetHeight}`;
  } else {
    orientation = "WIDER/HORIZONTAL";
    ratioLabel = `${targetWidth}:${targetHeight}`;
  }

  const scaleFactor = tgtRatio < srcRatio
    ? (srcRatio / tgtRatio).toFixed(1)
    : (tgtRatio / srcRatio).toFixed(1);

  const prompt = `You are given a product photograph. Your task is to EXTEND the image canvas to create a ${orientation} image.

OUTPUT IMAGE DIMENSIONS: The output MUST be a ${orientation} rectangle with approximately ${ratioLabel} aspect ratio.
${tgtRatio < srcRatio
    ? `The output image must be approximately ${scaleFactor}x TALLER than the input. The height should be much greater than the width. Think phone-screen / story / portrait proportions.`
    : `The output image must be approximately ${scaleFactor}x WIDER than the input. The width should be much greater than the height. Think cinema / widescreen / landscape proportions.`}

CRITICAL RULES:
1. The PRODUCT in the image must remain COMPLETELY UNCHANGED — same position, same size, same every detail. Do NOT move, resize, crop, distort, or alter the product in any way.
2. ONLY extend/add MORE BACKGROUND around the product to fill the new ${orientation} frame.
3. The extended background must seamlessly match the existing background — same colors, textures, lighting, gradients, and style.
4. The product should end up roughly centered in the new frame.
5. ${tgtRatio < srcRatio
    ? `Add SIGNIFICANTLY more background ABOVE and BELOW the product. The final image must be dramatically taller than the input — the product should appear smaller relative to the total frame because there is so much more background above and below.`
    : `Add SIGNIFICANTLY more background to the LEFT and RIGHT of the product. The final image must be dramatically wider than the input — the product should appear smaller relative to the total frame because there is so much more background on both sides.`}
6. The result must look like the photo was originally shot for this aspect ratio — no visible seams, no color shifts, no artifacts.
7. The output must be a SINGLE high-quality photograph at the new ${orientation} aspect ratio.

OUTPUT: The same product photo with extended background filling a ${orientation} (${ratioLabel}) frame.`;

  const mimeType = "image/png";

  const result = await generateStudioImage(
    base64,
    mimeType,
    prompt
  );

  if (!result.resultBase64) {
    throw new Error("Outpaint returned no image");
  }

  return result.resultBase64;
}
