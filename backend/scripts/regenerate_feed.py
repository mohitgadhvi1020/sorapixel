"""Regenerate feed after-images without watermarks.

Run from backend directory:
    cd backend && source venv/bin/activate && python scripts/regenerate_feed.py
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import uuid
import base64
import urllib.request
import logging
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

from app.database import get_supabase
from app.services.gemini_service import generate_image

BUCKET = "sorapixel-images"


def regenerate_all():
    sb = get_supabase()
    result = sb.table("feed_items").select("*").eq("is_active", True).order("display_order").execute()
    items = result.data or []

    logger.info(f"Found {len(items)} feed items to regenerate")

    updated = 0
    errors = 0

    for i, item in enumerate(items):
        before_url = item.get("before_image_url", "")
        title = item.get("title", "product")

        if not before_url:
            logger.warning(f"[{i}] '{title}' — no before_image_url, skipping")
            errors += 1
            continue

        logger.info(f"[{i}/{len(items)}] Regenerating '{title}'...")

        try:
            resp = urllib.request.urlopen(before_url, timeout=30)
            image_bytes = resp.read()
            image_b64 = base64.b64encode(image_bytes).decode("utf-8")

            prompt = (
                f"Professional product photography of this {title}. "
                f"Place it on a clean, elegant studio background with professional lighting. "
                f"High resolution, commercial quality, perfectly lit with natural soft shadows. "
                f"The product must be the EXACT same product from the input image — same shape, design, color, details. "
                f"Do NOT redesign, modify, or reimagine the product. "
                f"Only change the BACKGROUND and LIGHTING, never the product itself."
            )

            gen_result = generate_image(prompt, image_b64)
            clean_b64 = gen_result["base64"]

            raw_bytes = base64.b64decode(clean_b64)
            storage_path = f"feed/{uuid.uuid4()}.png"
            sb.storage.from_(BUCKET).upload(storage_path, raw_bytes, {"content-type": "image/png"})
            new_url = f"{sb.supabase_url}/storage/v1/object/public/{BUCKET}/{storage_path}"

            sb.table("feed_items").update({"after_image_url": new_url}).eq("id", item["id"]).execute()

            updated += 1
            logger.info(f"  ✓ Done — {new_url}")

            time.sleep(2)

        except Exception as e:
            errors += 1
            logger.error(f"  ✗ Error: {e}")
            time.sleep(5)

    logger.info(f"\nComplete: {updated} updated, {errors} errors out of {len(items)} items")


if __name__ == "__main__":
    regenerate_all()
