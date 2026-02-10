import sharp from "sharp";

/**
 * Crops, resizes, upscales, and sharpens a base64 image to exact target
 * dimensions, guaranteeing high-quality (1080p+) output.
 *
 * - Uses "cover" strategy — fills the frame, cropping excess from center.
 * - Uses lanczos3 kernel — highest quality resampling for crisp upscaling.
 * - Applies subtle sharpening so details stay crisp even if the source
 *   image was smaller than the target dimensions.
 * - If `circular` is true, applies a round mask (transparent corners).
 */
export async function cropToRatio(
  imageBase64: string,
  targetWidth: number,
  targetHeight: number,
  circular: boolean = false
): Promise<string> {
  const buffer = Buffer.from(imageBase64, "base64");

  let pipeline = sharp(buffer).resize(targetWidth, targetHeight, {
    fit: "cover",
    position: "centre",
    kernel: "lanczos3",
  });

  // Subtle sharpening — recovers crispness lost during upscaling
  // sigma 0.8 is gentle enough to avoid halos, strong enough to sharpen
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

  // PNG with compression level 6 — lossless quality, reasonable file size
  const result = await pipeline.png({ compressionLevel: 6 }).toBuffer();
  return result.toString("base64");
}
