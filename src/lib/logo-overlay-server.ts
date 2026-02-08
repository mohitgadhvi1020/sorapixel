import sharp from "sharp";

/**
 * Server-side logo compositing using Sharp.
 * Overlays a brand logo onto an image in the top-right corner
 * with a subtle frosted white background for visibility.
 *
 * @param imageBase64 - Base64 encoded image (raw, no data URI prefix)
 * @param logoBase64 - Base64 encoded logo (raw, no data URI prefix)
 * @returns Base64 encoded composited image (raw, no prefix)
 */
export async function compositeLogoOnImage(
  imageBase64: string,
  logoBase64: string
): Promise<string> {
  const imageBuffer = Buffer.from(imageBase64, "base64");
  const logoBuffer = Buffer.from(logoBase64, "base64");

  // Get image dimensions
  const imageMeta = await sharp(imageBuffer).metadata();
  const imgW = imageMeta.width || 1024;
  const imgH = imageMeta.height || 1024;

  // Scale logo to ~18% of image width, maintain aspect ratio
  const targetLogoW = Math.round(imgW * 0.18);
  const resizedLogo = await sharp(logoBuffer)
    .resize({ width: targetLogoW, withoutEnlargement: false })
    .png()
    .toBuffer();

  const logoMeta = await sharp(resizedLogo).metadata();
  const logoW = logoMeta.width || targetLogoW;
  const logoH = logoMeta.height || targetLogoW;

  // Create a frosted white rounded-rect background for the logo
  const bgPad = Math.round(Math.min(logoW, logoH) * 0.15);
  const bgW = logoW + bgPad * 2;
  const bgH = logoH + bgPad * 2;
  const radius = Math.round(Math.min(bgW, bgH) * 0.12);

  const bgSvg = Buffer.from(
    `<svg width="${bgW}" height="${bgH}">
      <rect x="0" y="0" width="${bgW}" height="${bgH}" rx="${radius}" ry="${radius}" fill="white" opacity="0.7"/>
    </svg>`
  );
  const bgBuffer = await sharp(bgSvg).png().toBuffer();

  // Composite the logo onto the background pill
  const logoWithBg = await sharp(bgBuffer)
    .composite([
      {
        input: resizedLogo,
        top: bgPad,
        left: bgPad,
      },
    ])
    .png()
    .toBuffer();

  // Position: top-right with padding
  const padding = Math.round(imgW * 0.03);
  const posLeft = imgW - bgW - padding;
  const posTop = padding;

  // Composite onto the main image
  const result = await sharp(imageBuffer)
    .composite([
      {
        input: logoWithBg,
        top: Math.max(0, posTop),
        left: Math.max(0, posLeft),
      },
    ])
    .png()
    .toBuffer();

  return result.toString("base64");
}
