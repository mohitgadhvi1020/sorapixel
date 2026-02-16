import sharp from "sharp";

/**
 * Adds a diagonal "SORAPIXEL" watermark across an image using Sharp.
 * The watermark is semi-transparent, repeated diagonally, and hard to remove.
 * Returns base64 PNG (no data URI prefix).
 */
export async function addWatermark(imageBase64: string): Promise<string> {
  const raw = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const buf = Buffer.from(raw, "base64");

  const meta = await sharp(buf).metadata();
  const w = meta.width || 1080;
  const h = meta.height || 1080;

  // Build SVG watermark overlay — diagonal repeated text
  const fontSize = Math.round(w * 0.06);
  const lineSpacing = Math.round(fontSize * 3.5);
  const text = "SORAPIXEL";

  let svgTexts = "";
  for (let y = -h; y < h * 2; y += lineSpacing) {
    for (let x = -w; x < w * 2; x += Math.round(fontSize * 6)) {
      svgTexts += `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="sans-serif" font-weight="700" fill="white" fill-opacity="0.18" letter-spacing="4">${text}</text>`;
    }
  }

  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(-30, ${w / 2}, ${h / 2})">
      ${svgTexts}
    </g>
  </svg>`;

  const watermarkedBuf = await sharp(buf)
    .composite([
      {
        input: Buffer.from(svg),
        top: 0,
        left: 0,
        blend: "over",
      },
    ])
    .png({ compressionLevel: 6 })
    .toBuffer();

  return watermarkedBuf.toString("base64");
}
