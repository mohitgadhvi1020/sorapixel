import { fal } from "@fal-ai/client";

// Configure fal.ai with API key from environment
fal.config({
  credentials: process.env.FAL_KEY!,
});

interface BiRefNetOutput {
  image: { url: string; width: number; height: number };
  mask_image?: { url: string; width: number; height: number };
}

interface FluxFillOutput {
  images: Array<{ url: string; width: number; height: number }>;
  seed: number;
  prompt: string;
}

/**
 * Remove background from an image using BiRefNet
 * Returns the cutout image and the foreground mask
 */
export async function removeBackground(imageUrl: string): Promise<{
  cutoutUrl: string;
  maskUrl: string;
}> {
  const result = await fal.subscribe("fal-ai/birefnet", {
    input: {
      image_url: imageUrl,
      model: "General Use (Heavy)",
      operating_resolution: "1024x1024",
      output_mask: true,
      refine_foreground: true,
      output_format: "png",
    },
  });

  const data = result.data as BiRefNetOutput;

  return {
    cutoutUrl: data.image.url,
    maskUrl: data.mask_image!.url,
  };
}

/**
 * Generate a studio-quality scene using Flux 1.1 Pro Fill (inpainting)
 * Takes the original image and an inverted mask (white = background to fill)
 */
export async function generateScene(
  imageUrl: string,
  maskUrl: string,
  prompt: string
): Promise<{ resultUrl: string }> {
  const result = await fal.subscribe("fal-ai/flux-pro/v1/fill", {
    input: {
      prompt,
      image_url: imageUrl,
      mask_url: maskUrl,
      output_format: "png",
      safety_tolerance: "5",
      num_images: 1,
    },
  });

  const data = result.data as FluxFillOutput;

  return {
    resultUrl: data.images[0].url,
  };
}

/**
 * Upload a file buffer to fal.ai storage and return a public URL
 */
export async function uploadToFalStorage(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const blob = new Blob([new Uint8Array(buffer)], { type: contentType });
  const file = new File([blob], filename, { type: contentType });
  const url = await fal.storage.upload(file);
  return url;
}

// ─── HD Regeneration (Flux Dev img2img — native high-res detail) ──

export const UPSCALE_COST_USD = 0.025;

interface FluxImg2ImgOutput {
  images: Array<{ url: string; width: number; height: number; content_type?: string }>;
  seed: number;
  prompt: string;
}

/**
 * Generate an HD version of a jewelry image using Flux Dev image-to-image.
 *
 * Instead of upscaling (which just stretches pixels), this:
 *  1. Resizes the source to 2048×2048 via Sharp (bicubic — fast, lossless structure)
 *  2. Passes the resized image to Flux Dev img2img with low strength (0.3)
 *  3. Flux regenerates genuine textures/detail at 2048 native resolution
 *
 * strength 0.3 = preserves jewelry design, composition, colors exactly
 *                but regenerates micro-textures (granulation, facets, metal shine)
 */
export async function upscaleImage(
  imageBase64: string,
  options?: {
    targetSize?: number;
    prompt?: string;
    strength?: number;
  },
): Promise<{ base64: string; width: number; height: number }> {
  const sharp = (await import("sharp")).default;

  const raw = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const inputBuffer = Buffer.from(raw, "base64");

  const targetSize = options?.targetSize ?? 2048;

  // Step 1: Resize to target resolution via Sharp (bicubic, preserves structure)
  const resizedBuffer = await sharp(inputBuffer)
    .resize(targetSize, targetSize, { fit: "cover", kernel: "lanczos3" })
    .png({ compressionLevel: 6 })
    .toBuffer();

  // Step 2: Upload resized image to fal storage
  const imageUrl = await uploadToFalStorage(
    resizedBuffer,
    `hd-input-${Date.now()}.png`,
    "image/png"
  );

  const prompt = options?.prompt ??
    "professional studio product photograph of luxury jewelry, ultra sharp focus, " +
    "intricate gold metalwork texture, detailed gemstone facets, fine granulation, " +
    "macro photography, 8K resolution, crisp detail, studio lighting";

  const strength = options?.strength ?? 0.55;

  // Step 3: Flux Dev img2img — regenerates real detail at native resolution
  console.log(`Flux HD: ${targetSize}×${targetSize}, strength=${strength}`);

  let result;
  try {
    result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
      input: {
        image_url: imageUrl,
        prompt,
        strength,
        num_inference_steps: 30,
        guidance_scale: 3.5,
        num_images: 1,
        output_format: "png",
        enable_safety_checker: false,
      },
    });
  } catch (err: unknown) {
    const apiErr = err as { body?: unknown; status?: number; message?: string };
    console.error("Flux img2img error:", JSON.stringify(apiErr.body ?? apiErr.message));
    throw new Error(
      `Flux HD failed (${apiErr.status ?? "unknown"}): ${
        apiErr.message ?? "Unknown error"
      }`
    );
  }

  const data = result.data as FluxImg2ImgOutput;
  const outputImage = data.images[0];
  if (!outputImage?.url) {
    throw new Error("Flux HD returned no image");
  }

  const response = await fetch(outputImage.url);
  if (!response.ok) {
    throw new Error(`Failed to download HD image: ${response.status}`);
  }
  const arrayBuf = await response.arrayBuffer();
  const resultBase64 = Buffer.from(arrayBuf).toString("base64");

  return {
    base64: resultBase64,
    width: outputImage.width ?? targetSize,
    height: outputImage.height ?? targetSize,
  };
}
