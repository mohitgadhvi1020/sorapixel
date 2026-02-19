from __future__ import annotations

"""fal.ai service -- ported from lib/fal.ts"""

import logging
import httpx
from app.config import get_settings

logger = logging.getLogger(__name__)

FAL_BASE_URL = "https://queue.fal.run"


def _get_headers() -> dict:
    settings = get_settings()
    return {
        "Authorization": f"Key {settings.fal_key}",
        "Content-Type": "application/json",
    }


def hd_upscale(image_b64: str, width: int = 2048, height: int = 2048) -> str:
    """HD upscale using fal.ai Flux Dev img2img.
    Takes base64 image, returns base64 result.
    """
    image_url = f"data:image/png;base64,{image_b64}"

    payload = {
        "prompt": "high quality, detailed, sharp, 4k resolution, professional photography",
        "image_url": image_url,
        "strength": 0.35,
        "image_size": {"width": width, "height": height},
        "num_inference_steps": 28,
        "guidance_scale": 3.5,
        "enable_safety_checker": False,
    }

    logger.info(f"Submitting HD upscale to fal.ai ({width}x{height})...")

    with httpx.Client(timeout=120.0) as client:
        resp = client.post(
            f"{FAL_BASE_URL}/fal-ai/flux/dev/image-to-image",
            headers=_get_headers(),
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    images = data.get("images", [])
    if not images:
        raise RuntimeError("fal.ai returned no images for HD upscale")

    image_url_result = images[0].get("url", "")
    if not image_url_result:
        raise RuntimeError("fal.ai returned empty image URL")

    with httpx.Client(timeout=60.0) as client:
        img_resp = client.get(image_url_result)
        img_resp.raise_for_status()

    import base64
    return base64.b64encode(img_resp.content).decode("utf-8")


def remove_background(image_b64: str) -> str:
    """Remove background using fal.ai BiRefNet.
    Returns base64 image with transparent background.
    """
    image_url = f"data:image/png;base64,{image_b64}"

    payload = {
        "image_url": image_url,
        "model": "General Use (Heavy)",
        "operating_resolution": "1024x1024",
        "output_format": "png",
    }

    logger.info("Submitting background removal to fal.ai...")

    with httpx.Client(timeout=60.0) as client:
        resp = client.post(
            f"{FAL_BASE_URL}/fal-ai/birefnet/v2",
            headers=_get_headers(),
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()

    image_info = data.get("image", {})
    image_url_result = image_info.get("url", "")
    if not image_url_result:
        raise RuntimeError("fal.ai returned empty image URL for bg removal")

    with httpx.Client(timeout=60.0) as client:
        img_resp = client.get(image_url_result)
        img_resp.raise_for_status()

    import base64
    return base64.b64encode(img_resp.content).decode("utf-8")
