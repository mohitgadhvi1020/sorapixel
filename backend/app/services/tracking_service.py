from __future__ import annotations

"""Usage tracking service -- ported from lib/track-usage.ts"""

import uuid
import logging
from app.database import get_supabase

logger = logging.getLogger(__name__)


def track_generation(
    client_id: str,
    generation_type: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    model_used: str = "gemini-2.5-flash",
    status: str = "success",
    metadata: dict | None = None,
) -> str | None:
    """Record a generation event. Returns generation_id or None."""
    try:
        sb = get_supabase()
        gen_id = str(uuid.uuid4())
        sb.table("generations").insert({
            "id": gen_id,
            "client_id": client_id,
            "generation_type": generation_type,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "model_used": model_used,
            "status": status,
            "metadata": metadata or {},
        }).execute()
        return gen_id
    except Exception as e:
        logger.error(f"Track generation failed: {e}")
        return None


def track_download(client_id: str, image_id: str) -> None:
    """Record a download event."""
    try:
        sb = get_supabase()
        sb.table("downloads").insert({
            "image_id": image_id,
            "client_id": client_id,
        }).execute()
    except Exception as e:
        logger.error(f"Track download failed: {e}")
