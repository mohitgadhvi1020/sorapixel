from __future__ import annotations

"""Save generated images/videos as projects in Supabase (storage + DB)."""

import base64
import logging
import uuid
from app.database import get_supabase

logger = logging.getLogger(__name__)


def save_project(
    client_id: str,
    project_type: str,
    title: str,
    images: list[dict],
    metadata: dict | None = None,
) -> dict | None:
    """
    Upload images to Supabase Storage, then create a project record
    with storage paths stored in the metadata JSONB field.

    images: list of {"base64": str, "label": str}
    Returns the created project dict or None on failure.
    """
    sb = get_supabase()
    saved_images = []

    for img in images:
        b64 = img.get("base64", "")
        if not b64:
            continue

        label = img.get("label", "image")
        file_name = f"projects/{client_id}/{uuid.uuid4()}.png"
        raw = base64.b64decode(b64)

        try:
            sb.storage.from_("sorapixel-images").upload(
                file_name, raw, {"content-type": "image/png"}
            )
            saved_images.append({"label": label, "storage_path": file_name, "size": len(raw)})
        except Exception as e:
            logger.error(f"Storage upload failed for {label}: {e}")

    if not saved_images:
        return None

    try:
        project_meta = metadata or {}
        project_meta["images"] = saved_images

        result = sb.table("projects").insert({
            "client_id": client_id,
            "title": title,
            "project_type": project_type,
            "metadata": project_meta,
        }).execute()

        if result.data:
            return result.data[0]
    except Exception as e:
        logger.error(f"save_project DB insert error: {e}")

    return None


def save_video_project(
    client_id: str,
    title: str,
    video_storage_path: str,
    source_image_b64: str | None = None,
    metadata: dict | None = None,
) -> dict | None:
    """Save a generated video as a project.

    Optionally uploads the source image as a thumbnail.
    """
    sb = get_supabase()
    project_meta = metadata or {}
    project_meta["video_storage_path"] = video_storage_path

    if source_image_b64:
        try:
            raw = base64.b64decode(source_image_b64)
            thumb_path = f"projects/{client_id}/{uuid.uuid4()}_thumb.png"
            sb.storage.from_("sorapixel-images").upload(
                thumb_path, raw, {"content-type": "image/png"}
            )
            project_meta["images"] = [{"label": "Source Frame", "storage_path": thumb_path, "size": len(raw)}]
        except Exception as e:
            logger.warning(f"Video thumbnail upload failed: {e}")

    try:
        result = sb.table("projects").insert({
            "client_id": client_id,
            "title": title,
            "project_type": "video",
            "metadata": project_meta,
        }).execute()

        if result.data:
            return result.data[0]
    except Exception as e:
        logger.error(f"save_video_project DB insert error: {e}")

    return None
