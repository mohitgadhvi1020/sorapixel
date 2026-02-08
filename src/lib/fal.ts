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
