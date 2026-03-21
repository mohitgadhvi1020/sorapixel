from __future__ import annotations

"""Video generation via fal.ai — Seedance 2.0 & Kling O1 with first+last frame support."""

import asyncio
import base64
import logging
import uuid
from io import BytesIO

import fal_client
import httpx

from app.config import get_settings
from app.database import get_supabase

logger = logging.getLogger(__name__)

BUCKET = "sorapixel-images"

FAL_MODELS = {
    "seedance": "fal-ai/bytedance/seedance/v1/pro/image-to-video",
    "kling": "fal-ai/kling-video/v3/pro/image-to-video",
}


def _get_fal_key() -> str:
    key = get_settings().fal_key
    if not key:
        raise RuntimeError("FAL_KEY is not configured")
    return key


def _upload_b64_to_fal(image_b64: str) -> str:
    """Upload a base64 image to fal storage and return the URL."""
    import re
    clean = re.sub(r"^data:image/\w+;base64,", "", image_b64)
    image_bytes = base64.b64decode(clean)
    url = fal_client.upload(image_bytes, content_type="image/png")
    return url


async def generate_flow_video_seedance(
    first_frame_b64: str,
    last_frame_b64: str,
    prompt: str,
    duration: int = 8,
    aspect_ratio: str = "16:9",
    client_id: str | None = None,
) -> dict:
    """Generate a first→last frame video using Seedance 2.0 via fal.ai."""
    fal_key = _get_fal_key()
    import os
    os.environ["FAL_KEY"] = fal_key

    logger.info("Seedance flow video: uploading frames to fal storage...")
    first_url = await asyncio.to_thread(_upload_b64_to_fal, first_frame_b64)
    last_url = await asyncio.to_thread(_upload_b64_to_fal, last_frame_b64)
    logger.info("Frames uploaded. Starting Seedance generation...")

    result = await asyncio.to_thread(
        fal_client.subscribe,
        FAL_MODELS["seedance"],
        arguments={
            "prompt": prompt,
            "image_url": first_url,
            "end_image_url": last_url,
            "duration": str(min(max(duration, 2), 12)),
            "aspect_ratio": aspect_ratio,
        },
    )

    video_url = result.get("video", {}).get("url", "")
    if not video_url:
        raise RuntimeError("Seedance returned no video URL")

    logger.info("Seedance video generated, downloading...")
    video_bytes = await _download_video(video_url)

    storage_path = await _upload_to_supabase(video_bytes, client_id)
    signed_url = _get_signed_url(storage_path)

    return {
        "video_url": signed_url,
        "storage_path": storage_path,
        "duration": duration,
        "size_bytes": len(video_bytes),
        "model": "seedance-2.0",
        "engine": "seedance",
    }


async def generate_flow_video_kling(
    first_frame_b64: str,
    last_frame_b64: str,
    prompt: str,
    duration: int = 5,
    aspect_ratio: str = "16:9",
    client_id: str | None = None,
) -> dict:
    """Generate a first→last frame video using Kling O1 via fal.ai."""
    fal_key = _get_fal_key()
    import os
    os.environ["FAL_KEY"] = fal_key

    logger.info("Kling flow video: uploading frames to fal storage...")
    first_url = await asyncio.to_thread(_upload_b64_to_fal, first_frame_b64)
    last_url = await asyncio.to_thread(_upload_b64_to_fal, last_frame_b64)
    logger.info("Frames uploaded. Starting Kling generation...")

    kling_prompt = f"@Image1 transitions smoothly to @Image2. {prompt}"

    result = await asyncio.to_thread(
        fal_client.subscribe,
        FAL_MODELS["kling"],
        arguments={
            "prompt": kling_prompt,
            "start_image_url": first_url,
            "end_image_url": last_url,
            "duration": str(min(max(duration, 3), 15)),
        },
    )

    video_url = result.get("video", {}).get("url", "")
    if not video_url:
        raise RuntimeError("Kling returned no video URL")

    logger.info("Kling video generated, downloading...")
    video_bytes = await _download_video(video_url)

    storage_path = await _upload_to_supabase(video_bytes, client_id)
    signed_url = _get_signed_url(storage_path)

    return {
        "video_url": signed_url,
        "storage_path": storage_path,
        "duration": duration,
        "size_bytes": len(video_bytes),
        "model": "kling-o1",
        "engine": "kling",
    }


async def generate_flow_video(
    engine: str,
    first_frame_b64: str,
    last_frame_b64: str,
    prompt: str,
    duration: int = 8,
    aspect_ratio: str = "16:9",
    client_id: str | None = None,
) -> dict:
    """Dispatch to the appropriate engine."""
    if engine == "seedance":
        return await generate_flow_video_seedance(
            first_frame_b64, last_frame_b64, prompt, duration, aspect_ratio, client_id
        )
    elif engine == "kling":
        return await generate_flow_video_kling(
            first_frame_b64, last_frame_b64, prompt, duration, aspect_ratio, client_id
        )
    else:
        raise ValueError(f"Unknown video engine: {engine}")


async def _download_video(url: str) -> bytes:
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=120.0, follow_redirects=True)
        if resp.status_code != 200:
            raise RuntimeError(f"Failed to download video: HTTP {resp.status_code}")
        return resp.content


async def _upload_to_supabase(video_bytes: bytes, client_id: str | None) -> str:
    storage_path = f"videos/{client_id or 'anon'}/{uuid.uuid4()}.mp4"
    sb = get_supabase()
    sb.storage.from_(BUCKET).upload(
        storage_path, video_bytes, {"content-type": "video/mp4"}
    )
    return storage_path


def _get_signed_url(storage_path: str) -> str:
    sb = get_supabase()
    signed = sb.storage.from_(BUCKET).create_signed_url(storage_path, 3600)
    return signed.get("signedURL", "") if isinstance(signed, dict) else ""
