from __future__ import annotations

"""Session service — groups all operations on one uploaded product image."""

import base64
import logging
import uuid
from app.database import get_supabase

logger = logging.getLogger(__name__)

BUCKET = "sorapixel-images"


def _upload_image(sb, client_id: str, image_b64: str, prefix: str = "sessions") -> str | None:
    clean = image_b64.split(",")[-1] if "," in image_b64 else image_b64
    raw = base64.b64decode(clean)
    path = f"{prefix}/{client_id}/{uuid.uuid4()}.png"
    try:
        sb.storage.from_(BUCKET).upload(path, raw, {"content-type": "image/png"})
        return path
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        return None


def _signed_url(sb, path: str, expires: int = 3600) -> str:
    try:
        res = sb.storage.from_(BUCKET).create_signed_url(path, expires)
        return res.get("signedURL", "") if isinstance(res, dict) else ""
    except Exception:
        return ""


def create_session(
    client_id: str,
    jewelry_type: str,
    background: str,
    aspect_ratio_id: str | None = None,
    quality: str = "standard",
    original_image_b64: str = "",
) -> dict | None:
    sb = get_supabase()
    img_path = _upload_image(sb, client_id, original_image_b64)
    if not img_path:
        return None

    try:
        result = sb.table("sessions").insert({
            "client_id": client_id,
            "title": f"{jewelry_type.title()} Session",
            "jewelry_type": jewelry_type,
            "background": background,
            "aspect_ratio_id": aspect_ratio_id,
            "quality": quality,
            "original_image_path": img_path,
        }).execute()
        if result.data:
            session = result.data[0]
            session["original_image_url"] = _signed_url(sb, img_path)
            return session
    except Exception as e:
        logger.error(f"create_session error: {e}")
    return None


def get_session(session_id: str, client_id: str) -> dict | None:
    sb = get_supabase()
    try:
        result = sb.table("sessions").select("*").eq(
            "id", session_id
        ).eq("client_id", client_id).single().execute()
        if not result.data:
            return None

        session = result.data
        session["original_image_url"] = _signed_url(sb, session["original_image_path"])

        actions_result = sb.table("session_actions").select("*").eq(
            "session_id", session_id
        ).order("created_at").execute()

        actions = actions_result.data or []
        for action in actions:
            images = action.get("output_images") or []
            for img in images:
                if img.get("storage_path"):
                    img["url"] = _signed_url(sb, img["storage_path"])
            action["output_images"] = images

        session["actions"] = actions
        return session
    except Exception as e:
        logger.error(f"get_session error: {e}")
        return None


def list_sessions(client_id: str, limit: int = 20, offset: int = 0) -> list[dict]:
    sb = get_supabase()
    try:
        result = sb.table("sessions").select(
            "id, title, jewelry_type, background, quality, original_image_path, status, created_at, updated_at"
        ).eq("client_id", client_id).eq(
            "status", "active"
        ).order("created_at", desc=True).range(offset, offset + limit - 1).execute()

        sessions = result.data or []
        for s in sessions:
            s["original_image_url"] = _signed_url(sb, s["original_image_path"])

            count_result = sb.table("session_actions").select(
                "id", count="exact"
            ).eq("session_id", s["id"]).execute()
            s["action_count"] = count_result.count if hasattr(count_result, "count") and count_result.count else len(count_result.data or [])

        return sessions
    except Exception as e:
        logger.error(f"list_sessions error: {e}")
        return []


def add_session_action(
    session_id: str,
    action_type: str,
    quality: str = "standard",
    tokens_used: int = 0,
    input_data: dict | None = None,
    output_images_b64: list[dict] | None = None,
    output_text: dict | None = None,
) -> dict | None:
    sb = get_supabase()

    saved_images = []
    if output_images_b64:
        session_result = sb.table("sessions").select("client_id").eq("id", session_id).single().execute()
        if not session_result.data:
            return None
        client_id = session_result.data["client_id"]

        for img in output_images_b64:
            b64 = img.get("base64", "")
            if not b64:
                continue
            path = _upload_image(sb, client_id, b64, prefix="sessions")
            if path:
                saved_images.append({
                    "label": img.get("label", "image"),
                    "storage_path": path,
                })

    try:
        result = sb.table("session_actions").insert({
            "session_id": session_id,
            "action_type": action_type,
            "quality": quality,
            "tokens_used": tokens_used,
            "input_data": input_data or {},
            "output_images": saved_images,
            "output_text": output_text,
        }).execute()

        sb.table("sessions").update({"updated_at": "now()"}).eq("id", session_id).execute()

        if result.data:
            return result.data[0]
    except Exception as e:
        logger.error(f"add_session_action error: {e}")
    return None


def delete_session(session_id: str, client_id: str) -> bool:
    sb = get_supabase()
    try:
        sb.table("sessions").update(
            {"status": "deleted"}
        ).eq("id", session_id).eq("client_id", client_id).execute()
        return True
    except Exception as e:
        logger.error(f"delete_session error: {e}")
        return False
