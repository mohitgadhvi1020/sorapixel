from __future__ import annotations

"""Save generated images as projects in Supabase (storage + DB)."""

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
    generation_ids: list[str] | None = None,
) -> dict | None:
    """
    Upload images to Supabase Storage, then create a project record
    with storage paths stored in the metadata JSONB field.

    Also inserts rows into the ``images`` table so the admin
    ``/generation-images/{id}`` endpoint can find them.

    images: list of {"base64": str, "label": str}
    generation_ids: parallel list of generation UUIDs (one per *primary*
        image; zoom / derivative images inherit the preceding id).
    Returns the created project dict or None on failure.
    """
    sb = get_supabase()
    saved_images = []
    gen_idx = 0

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
            continue

        cur_gen_id = None
        if generation_ids:
            is_derivative = "zoom" in label.lower() or "recolor" in label.lower()
            if is_derivative:
                cur_gen_id = generation_ids[min(gen_idx - 1, len(generation_ids) - 1)] if gen_idx > 0 else generation_ids[0]
            else:
                cur_gen_id = generation_ids[min(gen_idx, len(generation_ids) - 1)]
                gen_idx += 1

        try:
            sb.table("images").insert({
                "id": str(uuid.uuid4()),
                "generation_id": cur_gen_id,
                "client_id": client_id,
                "label": label,
                "storage_path": file_name,
                "file_size_bytes": len(raw),
            }).execute()
        except Exception as e:
            logger.error(f"images table insert failed for {label}: {e}")

    if not saved_images:
        return None

    try:
        project_meta = metadata or {}
        project_meta["images"] = saved_images
        if not project_meta.get("original_image_path"):
            original = next(
                (
                    img for img in saved_images
                    if str(img.get("label", "")).strip().lower() in {"original", "original upload", "input", "input image"}
                ),
                None,
            )
            if original and original.get("storage_path"):
                project_meta["original_image_path"] = original["storage_path"]

        result = sb.table("projects").insert({
            "client_id": client_id,
            "title": title,
            "project_type": project_type,
            "metadata": project_meta,
        }).execute()

        if result.data:
            project = result.data[0]
            for img in saved_images:
                try:
                    sb.table("images").insert({
                        "id": str(uuid.uuid4()),
                        "generation_id": None,
                        "client_id": client_id,
                        "label": img.get("label", "image"),
                        "storage_path": img.get("storage_path"),
                        "file_size_bytes": img.get("size", 0),
                    }).execute()
                except Exception as image_err:
                    logger.warning(f"save_project image index insert failed: {image_err}")
            return project
    except Exception as e:
        logger.error(f"save_project DB insert error: {e}")

    return None
