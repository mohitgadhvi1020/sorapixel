from __future__ import annotations

"""FLUX Fill Pro inpainting via fal.ai — mask-based background replacement.

Uses FLUX Fill Pro (fal-ai/flux-pro/v1.1/fill) to replace ONLY the masked
(background) region of an image. The product itself is physically untouched
because the model can only modify white pixels in the mask.

Return shape mirrors gemini_service.generate_image:
    {"base64": str, "mime_type": str, "model": str}
"""

import asyncio
import base64
import logging
import re
import time
from io import BytesIO

import fal_client

from app.config import get_settings

logger = logging.getLogger(__name__)

FAL_MODEL_FILL = "fal-ai/flux-pro/v1.1/fill"

# Map our aspect ratio IDs to pixel dimensions for FLUX
RATIO_TO_SIZE = {
    "square": {"width": 1024, "height": 1024},
    "portrait": {"width": 896, "height": 1152},
    "landscape": {"width": 1152, "height": 896},
    "9:16": {"width": 768, "height": 1344},
    "16:9": {"width": 1344, "height": 768},
    "4:5": {"width": 896, "height": 1120},
    "1:1": {"width": 1024, "height": 1024},
}

DEFAULT_SIZE = {"width": 1024, "height": 1024}


def _get_fal_key() -> str:
    key = get_settings().fal_key
    if not key:
        raise RuntimeError("FAL_KEY is not configured")
    return key


def _upload_b64_to_fal(image_b64: str) -> str:
    """Upload a base64 image to fal storage and return the URL."""
    clean = re.sub(r"^data:image/\w+;base64,", "", image_b64)
    image_bytes = base64.b64decode(clean)
    url = fal_client.upload(image_bytes, content_type="image/png")
    return url


def _generate_mask_from_image(image_b64: str) -> str:
    """Generate a background mask from a product image.

    Creates a black-and-white mask where:
    - BLACK (0,0,0) = product (keep untouched)
    - WHITE (255,255,255) = background (replace)

    Uses simple background detection: removes the background using color
    thresholding and edge detection, then inverts to create the mask.
    For best results with jewelry on solid backgrounds.
    """
    from PIL import Image, ImageFilter
    import numpy as np

    clean = re.sub(r"^data:image/\w+;base64,", "", image_b64)
    img = Image.open(BytesIO(base64.b64decode(clean))).convert("RGBA")

    # Try rembg first (best quality), fall back to simple thresholding
    try:
        from rembg import remove
        # rembg returns RGBA with transparent background
        no_bg = remove(img)
        alpha = np.array(no_bg.split()[-1])  # alpha channel

        # Create mask: where alpha is low = background = white, high = product = black
        mask = np.where(alpha > 30, 0, 255).astype(np.uint8)

        # Dilate the product area slightly to create a safety margin
        mask_img = Image.fromarray(mask, mode="L")
        # Erode the white (background) area = dilate black (product) area
        mask_img = mask_img.filter(ImageFilter.MinFilter(size=7))

        buf = BytesIO()
        mask_img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode()

    except ImportError:
        logger.warning("rembg not installed, using simple threshold masking")

    # Fallback: simple approach for solid-color backgrounds
    rgb = img.convert("RGB")
    arr = np.array(rgb)

    # Sample corners to detect background color
    h, w = arr.shape[:2]
    corner_size = max(10, min(h, w) // 20)
    corners = np.concatenate([
        arr[:corner_size, :corner_size].reshape(-1, 3),
        arr[:corner_size, -corner_size:].reshape(-1, 3),
        arr[-corner_size:, :corner_size].reshape(-1, 3),
        arr[-corner_size:, -corner_size:].reshape(-1, 3),
    ])
    bg_color = np.median(corners, axis=0)

    # Pixels close to background color → white (background), otherwise → black (product)
    diff = np.sqrt(np.sum((arr.astype(float) - bg_color) ** 2, axis=2))
    threshold = 45  # color distance threshold
    mask = np.where(diff < threshold, 255, 0).astype(np.uint8)

    mask_img = Image.fromarray(mask, mode="L")
    # Clean up: blur slightly then re-threshold to smooth edges
    mask_img = mask_img.filter(ImageFilter.GaussianBlur(radius=3))
    mask_arr = np.array(mask_img)
    mask_arr = np.where(mask_arr > 128, 255, 0).astype(np.uint8)
    mask_img = Image.fromarray(mask_arr, mode="L")
    # Erode the white area (expand the product safety zone)
    mask_img = mask_img.filter(ImageFilter.MinFilter(size=9))

    buf = BytesIO()
    mask_img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def generate_inpaint(
    prompt: str,
    image_b64: str,
    mask_b64: str | None = None,
    aspect_ratio_id: str | None = None,
    *,
    seed: int | None = None,
    num_inference_steps: int = 28,
    guidance_scale: float = 30.0,
) -> dict:
    """Inpaint using FLUX Fill Pro — replaces ONLY the masked area.

    If mask_b64 is not provided, auto-generates a background mask from the image.

    Returns: {"base64": str, "mime_type": str, "model": str}
    """
    import os
    fal_key = _get_fal_key()
    os.environ["FAL_KEY"] = fal_key

    t0 = time.time()

    # Auto-generate mask if not provided
    if not mask_b64:
        logger.info("FLUX Fill: auto-generating background mask...")
        mask_b64 = _generate_mask_from_image(image_b64)

    # Upload image and mask to fal storage
    logger.info("FLUX Fill: uploading image + mask to fal storage...")
    image_url = _upload_b64_to_fal(image_b64)
    mask_url = _upload_b64_to_fal(mask_b64)

    # Determine output size
    size = RATIO_TO_SIZE.get(aspect_ratio_id or "", DEFAULT_SIZE)

    # Build arguments
    arguments: dict = {
        "prompt": prompt,
        "image_url": image_url,
        "mask_url": mask_url,
        "image_size": size,
        "num_inference_steps": num_inference_steps,
        "guidance_scale": guidance_scale,
        "safety_tolerance": "5",
    }
    if seed is not None:
        arguments["seed"] = seed

    logger.info(
        "FLUX Fill: starting inpaint (size=%s, steps=%d, guidance=%.1f)",
        size, num_inference_steps, guidance_scale,
    )

    result = fal_client.subscribe(
        FAL_MODEL_FILL,
        arguments=arguments,
    )

    elapsed = time.time() - t0
    logger.info("FLUX Fill: completed in %.1fs", elapsed)

    # Extract the output image
    images = result.get("images", [])
    if not images:
        raise RuntimeError("FLUX Fill returned no images")

    output_url = images[0].get("url", "")
    if not output_url:
        raise RuntimeError("FLUX Fill returned empty image URL")

    # Download the output image and convert to base64
    import httpx
    resp = httpx.get(output_url, timeout=30.0)
    resp.raise_for_status()
    output_b64 = base64.b64encode(resp.content).decode()

    return {
        "base64": output_b64,
        "mime_type": "image/png",
        "model": "flux-fill-pro-v1.1",
        "elapsed_seconds": round(elapsed, 2),
    }


async def generate_inpaint_async(
    prompt: str,
    image_b64: str,
    mask_b64: str | None = None,
    aspect_ratio_id: str | None = None,
    *,
    seed: int | None = None,
    num_inference_steps: int = 28,
    guidance_scale: float = 30.0,
) -> dict:
    """Async wrapper for generate_inpaint — runs the blocking fal call in a thread."""
    return await asyncio.to_thread(
        generate_inpaint,
        prompt,
        image_b64,
        mask_b64,
        aspect_ratio_id,
        seed=seed,
        num_inference_steps=num_inference_steps,
        guidance_scale=guidance_scale,
    )
