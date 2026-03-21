from __future__ import annotations

"""Video generation service using Google Veo 2 via Gemini API."""

import asyncio
import base64
import logging
import time
import uuid
from io import BytesIO

import httpx
from google.genai.types import GenerateVideosConfig, Image

from app.services.gemini_service import get_client, IMAGE_TIMEOUT_MS
from app.database import get_supabase

logger = logging.getLogger(__name__)

BUCKET = "sorapixel-images"

VIDEO_MODES = {
    "360_spin": {
        "prompt_template": (
            "A smooth, continuous 360-degree rotating turntable shot of this {jewelry_type} jewelry piece. "
            "The jewelry slowly rotates on a clean, elegant surface showing every angle and detail. "
            "Professional studio lighting with soft reflections highlighting the metal and gemstones. "
            "Seamless rotation, photorealistic, luxury product video."
        ),
    },
    "hero_reveal": {
        "prompt_template": (
            "A cinematic reveal shot of this {jewelry_type} jewelry piece. "
            "Camera slowly pushes in from a medium shot to an extreme close-up, "
            "revealing intricate details of the craftsmanship. Professional studio lighting, "
            "shallow depth of field, luxury product cinematography."
        ),
    },
    "lifestyle": {
        "prompt_template": (
            "An elegant lifestyle video showcasing this {jewelry_type} jewelry piece. "
            "Soft natural lighting, gentle camera movement, the jewelry is displayed beautifully "
            "in a luxurious setting. Cinematic color grading, premium feel, aspirational mood."
        ),
    },
    "sparkle": {
        "prompt_template": (
            "A close-up shot of this {jewelry_type} jewelry piece catching light beautifully. "
            "The camera moves subtly as light dances across the metal and stones, creating "
            "brilliant sparkles and reflections. Professional macro photography style, "
            "mesmerizing light play, luxury product video."
        ),
    },
    "custom": {
        "prompt_template": "{custom_prompt}",
    },
}

ASPECT_RATIOS = {"square": "16:9", "portrait": "9:16", "landscape": "16:9"}


def _build_video_prompt(
    mode: str,
    jewelry_type: str = "jewelry",
    custom_prompt: str | None = None,
) -> str:
    """Build the video generation prompt based on mode."""
    config = VIDEO_MODES.get(mode, VIDEO_MODES["360_spin"])
    template = config["prompt_template"]

    if mode == "custom" and custom_prompt:
        return custom_prompt

    return template.format(
        jewelry_type=jewelry_type,
        custom_prompt=custom_prompt or "",
    )


async def generate_video(
    image_b64: str,
    mode: str = "360_spin",
    jewelry_type: str = "jewelry",
    aspect_ratio: str = "landscape",
    custom_prompt: str | None = None,
    client_id: str | None = None,
) -> dict:
    """Generate a video from a jewelry image using Veo 2.

    Returns {"video_url": str, "storage_path": str, "duration": int, "model": str}
    """
    client = get_client()
    prompt = _build_video_prompt(mode, jewelry_type, custom_prompt)
    api_ratio = ASPECT_RATIOS.get(aspect_ratio, "16:9")

    import re
    clean_b64 = re.sub(r"^data:image/\w+;base64,", "", image_b64)
    image_bytes = base64.b64decode(clean_b64)

    logger.info("Starting video generation: mode=%s, ratio=%s, prompt=%s...", mode, api_ratio, prompt[:80])

    operation = await asyncio.to_thread(
        client.models.generate_videos,
        model="veo-2.0-generate-001",
        prompt=prompt,
        image=Image(image_bytes=image_bytes, mime_type="image/png"),
        config=GenerateVideosConfig(
            aspect_ratio=api_ratio,
            number_of_videos=1,
            person_generation="dont_allow",
        ),
    )

    max_polls = 40
    poll_interval = 15
    for i in range(max_polls):
        if operation.done:
            break
        logger.debug("Video gen poll %d/%d...", i + 1, max_polls)
        await asyncio.sleep(poll_interval)
        operation = await asyncio.to_thread(client.operations.get, operation)

    if not operation.done:
        raise RuntimeError("Video generation timed out after 10 minutes")

    if not operation.response or not operation.response.generated_videos:
        raise RuntimeError("Video generation failed — no video returned")

    generated_video = operation.response.generated_videos[0]
    video = generated_video.video
    video_bytes: bytes | None = None

    logger.info("Video object: uri=%s, has video_bytes=%s", video.uri, video.video_bytes is not None)

    if video.video_bytes:
        video_bytes = video.video_bytes

    # Gemini API key path: must call client.files.download to populate video_bytes
    if not video_bytes:
        try:
            logger.info("Downloading video via client.files.download...")
            await asyncio.to_thread(client.files.download, file=video)
            if video.video_bytes:
                video_bytes = video.video_bytes
                logger.info("Got %d bytes via files.download", len(video_bytes))
        except Exception as dl_err:
            logger.warning("client.files.download failed: %s", dl_err)

    # Fallback: save to temp file via video.save() and read back
    if not video_bytes:
        try:
            import tempfile, os
            tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
            tmp_path = tmp.name
            tmp.close()
            logger.info("Saving video to temp file via video.save()...")
            await asyncio.to_thread(video.save, tmp_path)
            with open(tmp_path, "rb") as f:
                video_bytes = f.read()
            os.unlink(tmp_path)
            if video_bytes:
                logger.info("Got %d bytes via video.save()", len(video_bytes))
        except Exception as save_err:
            logger.warning("video.save() fallback failed: %s", save_err)

    # Last resort: HTTP GET on the URI directly
    if not video_bytes and video.uri:
        try:
            logger.info("Downloading video from URI: %s", video.uri[:120])
            async with httpx.AsyncClient() as http_client:
                resp = await http_client.get(video.uri, timeout=120.0)
                if resp.status_code == 200:
                    video_bytes = resp.content
                    logger.info("Got %d bytes via URI download", len(video_bytes))
                else:
                    logger.warning("URI download returned status %d", resp.status_code)
        except Exception as uri_err:
            logger.warning("URI download failed: %s", uri_err)

    if not video_bytes:
        logger.error("Could not retrieve video bytes. uri=%s, mime=%s", video.uri, video.mime_type)
        raise RuntimeError("Could not retrieve generated video bytes")

    storage_path = f"videos/{client_id or 'anon'}/{uuid.uuid4()}.mp4"
    sb = get_supabase()
    try:
        sb.storage.from_(BUCKET).upload(
            storage_path, video_bytes, {"content-type": "video/mp4"}
        )
    except Exception as e:
        logger.error("Video storage upload failed: %s", e)
        raise RuntimeError(f"Failed to save video: {e}")

    signed = sb.storage.from_(BUCKET).create_signed_url(storage_path, 3600)
    video_url = signed.get("signedURL", "") if isinstance(signed, dict) else ""

    logger.info("Video generated successfully: %s (%d bytes)", storage_path, len(video_bytes))

    return {
        "video_url": video_url,
        "storage_path": storage_path,
        "duration": 8,
        "size_bytes": len(video_bytes),
        "model": "veo-2.0-generate-001",
        "mode": mode,
    }


async def generate_video_first_last_frame(
    first_frame_b64: str,
    last_frame_b64: str,
    prompt: str = "Smooth cinematic transition between these two frames of a jewelry piece.",
    aspect_ratio: str = "landscape",
    client_id: str | None = None,
    allow_person: bool = True,
) -> dict:
    """Generate a video interpolating between first and last frame using Veo 2.

    Veo 2 supports single image input, so we compose a side-by-side or use
    the first frame with a prompt describing the transition to the last frame.
    """
    client = get_client()
    api_ratio = ASPECT_RATIOS.get(aspect_ratio, "16:9")

    import re
    clean_first = re.sub(r"^data:image/\w+;base64,", "", first_frame_b64)
    first_bytes = base64.b64decode(clean_first)

    full_prompt = (
        f"{prompt} "
        "Smooth, cinematic camera movement transitioning between the two states. "
        "Professional lighting, luxury product video."
    )

    logger.info("Starting first-last frame video: prompt=%s...", full_prompt[:80])

    person_gen = "allow_adult" if allow_person else "dont_allow"

    operation = await asyncio.to_thread(
        client.models.generate_videos,
        model="veo-2.0-generate-001",
        prompt=full_prompt,
        image=Image(image_bytes=first_bytes, mime_type="image/png"),
        config=GenerateVideosConfig(
            aspect_ratio=api_ratio,
            number_of_videos=1,
            person_generation=person_gen,
        ),
    )

    max_polls = 40
    for i in range(max_polls):
        if operation.done:
            break
        await asyncio.sleep(15)
        operation = await asyncio.to_thread(client.operations.get, operation)

    if not operation.done:
        raise RuntimeError("Video generation timed out")

    if not operation.response or not operation.response.generated_videos:
        raise RuntimeError("Video generation failed — no video returned")

    generated_video = operation.response.generated_videos[0]
    video = generated_video.video
    video_bytes: bytes | None = None

    if video.video_bytes:
        video_bytes = video.video_bytes

    if not video_bytes:
        try:
            await asyncio.to_thread(client.files.download, file=video)
            if video.video_bytes:
                video_bytes = video.video_bytes
        except Exception as dl_err:
            logger.warning("client.files.download failed (first-last): %s", dl_err)

    if not video_bytes:
        try:
            import tempfile, os
            tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
            tmp_path = tmp.name
            tmp.close()
            await asyncio.to_thread(video.save, tmp_path)
            with open(tmp_path, "rb") as f:
                video_bytes = f.read()
            os.unlink(tmp_path)
        except Exception as save_err:
            logger.warning("video.save() fallback failed (first-last): %s", save_err)

    if not video_bytes and video.uri:
        try:
            async with httpx.AsyncClient() as http_client:
                resp = await http_client.get(video.uri, timeout=120.0)
                if resp.status_code == 200:
                    video_bytes = resp.content
        except Exception as uri_err:
            logger.warning("URI download failed (first-last): %s", uri_err)

    if not video_bytes:
        raise RuntimeError("Could not retrieve generated video bytes")

    storage_path = f"videos/{client_id or 'anon'}/{uuid.uuid4()}.mp4"
    sb = get_supabase()
    sb.storage.from_(BUCKET).upload(
        storage_path, video_bytes, {"content-type": "video/mp4"}
    )

    signed = sb.storage.from_(BUCKET).create_signed_url(storage_path, 3600)
    video_url = signed.get("signedURL", "") if isinstance(signed, dict) else ""

    return {
        "video_url": video_url,
        "storage_path": storage_path,
        "duration": 8,
        "size_bytes": len(video_bytes),
        "model": "veo-2.0-generate-001",
        "mode": "first_last_frame",
    }
