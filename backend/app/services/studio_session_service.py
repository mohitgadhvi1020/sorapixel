from __future__ import annotations

"""Studio session service — tracks in-progress studio work so users can resume.

Studio projects (table `projects`) are write-once-on-success, so they hold
finished artifacts only. Studio sessions (table `studio_sessions`) carry the
pre-generation input state so "Continue journey" from My Creations can hydrate
where the user left off.
"""

import base64
import logging
import uuid
from app.database import get_supabase

logger = logging.getLogger(__name__)

BUCKET = "sorapixel-images"


def _upload_image(sb, client_id: str, image_b64: str, prefix: str = "studio_sessions") -> str | None:
    clean = image_b64.split(",")[-1] if "," in image_b64 else image_b64
    raw = base64.b64decode(clean)
    path = f"{prefix}/{client_id}/{uuid.uuid4()}.png"
    try:
        sb.storage.from_(BUCKET).upload(path, raw, {"content-type": "image/png"})
        return path
    except Exception as e:
        logger.error(f"Studio session upload failed: {e}")
        return None


def _signed_url(sb, path: str | None, expires: int = 3600) -> str:
    if not path:
        return ""
    try:
        res = sb.storage.from_(BUCKET).create_signed_url(path, expires)
        return res.get("signedURL", "") if isinstance(res, dict) else ""
    except Exception:
        return ""


def create_studio_session(
    client_id: str,
    image_base64: str | None = None,
    background_id: str | None = None,
    quality: str = "pro",
    aspect_ratio_id: str | None = None,
    special_instructions: str | None = None,
    current_step: str | None = "configure",
    pending_inputs: dict | None = None,
) -> dict | None:
    sb = get_supabase()
    img_path = _upload_image(sb, client_id, image_base64) if image_base64 else None

    row: dict = {
        "client_id": client_id,
        "original_image_path": img_path,
        "background_id": background_id,
        "quality": quality,
        "aspect_ratio_id": aspect_ratio_id,
        "special_instructions": special_instructions,
        "current_step": current_step,
        "pending_inputs": pending_inputs or {},
    }
    try:
        result = sb.table("studio_sessions").insert(row).execute()
        if result.data:
            data = result.data[0]
            data["original_image_url"] = _signed_url(sb, data.get("original_image_path"))
            return data
    except Exception as e:
        logger.error(f"create_studio_session error: {e}")
    return None


def update_studio_session(
    session_id: str,
    client_id: str,
    image_base64: str | None = None,
    background_id: str | None = None,
    quality: str | None = None,
    aspect_ratio_id: str | None = None,
    special_instructions: str | None = None,
    current_step: str | None = None,
    pending_inputs: dict | None = None,
    result_project_id: str | None = None,
) -> bool:
    sb = get_supabase()
    patch: dict = {"updated_at": "now()"}
    if image_base64:
        path = _upload_image(sb, client_id, image_base64)
        if path:
            patch["original_image_path"] = path
    if background_id is not None:
        patch["background_id"] = background_id
    if quality is not None:
        patch["quality"] = quality
    if aspect_ratio_id is not None:
        patch["aspect_ratio_id"] = aspect_ratio_id
    if special_instructions is not None:
        patch["special_instructions"] = special_instructions
    if current_step is not None:
        patch["current_step"] = current_step
    if pending_inputs is not None:
        patch["pending_inputs"] = pending_inputs
    if result_project_id is not None:
        patch["result_project_id"] = result_project_id
    try:
        sb.table("studio_sessions").update(patch).eq(
            "id", session_id
        ).eq("client_id", client_id).execute()
        return True
    except Exception as e:
        logger.error(f"update_studio_session error: {e}")
        return False


def get_studio_session(session_id: str, client_id: str) -> dict | None:
    sb = get_supabase()
    try:
        result = sb.table("studio_sessions").select("*").eq(
            "id", session_id
        ).eq("client_id", client_id).single().execute()
        if not result.data:
            return None
        session = result.data
        session["original_image_url"] = _signed_url(sb, session.get("original_image_path"))

        # If generation completed, enrich with result images from the linked project.
        project_id = session.get("result_project_id")
        if project_id:
            try:
                proj = sb.table("projects").select("metadata").eq("id", project_id).single().execute()
                meta = (proj.data or {}).get("metadata") or {}
                images = meta.get("images") or []
                for img in images:
                    if img.get("storage_path") and not img.get("url"):
                        img["url"] = _signed_url(sb, img["storage_path"])
                session["result_images"] = images
            except Exception:
                session["result_images"] = []
        else:
            session["result_images"] = []
        return session
    except Exception as e:
        logger.error(f"get_studio_session error: {e}")
        return None


def list_studio_sessions(client_id: str, limit: int = 20, offset: int = 0) -> list[dict]:
    sb = get_supabase()
    try:
        result = sb.table("studio_sessions").select(
            "id, title, background_id, quality, original_image_path, current_step, result_project_id, status, created_at, updated_at"
        ).eq("client_id", client_id).eq(
            "status", "active"
        ).order("updated_at", desc=True).range(offset, offset + limit - 1).execute()

        sessions = result.data or []

        # Batch signed URL generation (1 HTTP call instead of N).
        from app.services.signed_urls import sign_many
        url_map = sign_many(sb, (s.get("original_image_path") for s in sessions))
        for s in sessions:
            s["original_image_url"] = url_map.get(s.get("original_image_path") or "", "")
        return sessions
    except Exception as e:
        logger.error(f"list_studio_sessions error: {e}")
        return []


def delete_studio_session(session_id: str, client_id: str) -> bool:
    sb = get_supabase()
    try:
        sb.table("studio_sessions").update(
            {"status": "deleted"}
        ).eq("id", session_id).eq("client_id", client_id).execute()
        return True
    except Exception as e:
        logger.error(f"delete_studio_session error: {e}")
        return False
