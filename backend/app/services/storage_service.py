from __future__ import annotations

"""Storage service -- handles Supabase Storage operations.
Ported from lib/track-usage.ts (storage parts)
"""

import base64
import uuid
import logging
from app.database import get_supabase

logger = logging.getLogger(__name__)

BUCKET = "sorapixel-images"


def upload_image(client_id: str, image_b64: str, label: str, generation_id: str | None = None) -> dict | None:
    """Upload base64 image to Supabase Storage and record in images table.
    Returns {"id": str, "storage_path": str, "url": str} or None on failure.
    """
    try:
        sb = get_supabase()
        image_data = base64.b64decode(image_b64)
        file_name = f"{uuid.uuid4()}.png"
        storage_path = f"{client_id}/{file_name}"

        sb.storage.from_(BUCKET).upload(
            storage_path,
            image_data,
            {"content-type": "image/png"},
        )

        image_id = str(uuid.uuid4())
        sb.table("images").insert({
            "id": image_id,
            "generation_id": generation_id,
            "client_id": client_id,
            "label": label,
            "storage_path": storage_path,
            "file_size_bytes": len(image_data),
        }).execute()

        return {"id": image_id, "storage_path": storage_path}
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return None


def get_download_url(client_id: str, image_id: str) -> str | None:
    """Get a signed download URL for an image."""
    sb = get_supabase()
    result = sb.table("images").select("storage_path, client_id").eq("id", image_id).single().execute()
    if not result.data or result.data["client_id"] != client_id:
        return None

    path = result.data["storage_path"]
    signed = sb.storage.from_(BUCKET).create_signed_url(path, 3600)
    return signed.get("signedURL") or signed.get("signedUrl")


def download_image_bytes(storage_path: str) -> bytes | None:
    """Download image bytes from storage."""
    try:
        sb = get_supabase()
        data = sb.storage.from_(BUCKET).download(storage_path)
        return data
    except Exception as e:
        logger.error(f"Download failed: {e}")
        return None
