"""Generate 3 beautiful product images for the homepage Steps section.

Each image is tailored to its step concept:
  01 - Upload: A casual phone-snap style product photo (raw, authentic)
  02 - Pick Your Style: A stylized product in a lifestyle setting
  03 - Download & Sell: A polished, marketplace-ready product shot

Run from backend directory:
    cd backend && source venv/bin/activate && python scripts/generate_steps_images.py
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import uuid
import base64
import urllib.request
import logging
import time
import json

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

from app.database import get_supabase
from app.services.gemini_service import generate_image

BUCKET = "sorapixel-images"

STEPS_CONFIG = [
    {
        "step": "01",
        "title_keyword": "perfume",
        "prompt": (
            "Transform this product photo into a stunning studio product shot. "
            "Place the perfume bottle on a clean white marble surface with soft golden hour lighting. "
            "Add subtle reflections and a minimal, elegant background with soft bokeh. "
            "The product must remain EXACTLY the same — same bottle shape, color, label, and design. "
            "Only enhance the background, lighting, and overall presentation. "
            "Portrait orientation, high-end commercial photography style."
        ),
        "aspect_ratio": "portrait",
    },
    {
        "step": "02",
        "title_keyword": "sunglasses",
        "prompt": (
            "Transform this product photo into a beautiful lifestyle product shot. "
            "Place the sunglasses on a light sandy beach surface with ocean in the soft-focus background. "
            "Warm summer lighting, golden tones, lifestyle fashion photography style. "
            "The sunglasses must remain EXACTLY the same — same frame shape, lens color, and design. "
            "Only change the setting and lighting to create an aspirational lifestyle scene. "
            "Portrait orientation, editorial fashion photography."
        ),
        "aspect_ratio": "portrait",
    },
    {
        "step": "03",
        "title_keyword": "bag",
        "prompt": (
            "Transform this product photo into a premium e-commerce product shot. "
            "Place the bag on a clean, pure white background with perfect studio lighting. "
            "Sharp details, no shadows, bright and evenly lit — exactly like a top Amazon or Shopify listing. "
            "The bag must remain EXACTLY the same — same shape, color, material, straps, and hardware. "
            "Only change the background to pure white and optimize the lighting for e-commerce. "
            "Portrait orientation, professional product photography for online marketplace."
        ),
        "aspect_ratio": "portrait",
    },
]


def generate_steps():
    sb = get_supabase()
    result = sb.table("feed_items").select("*").eq("is_active", True).order("display_order").execute()
    items = result.data or []
    logger.info(f"Found {len(items)} feed items")

    results = {}

    for cfg in STEPS_CONFIG:
        keyword = cfg["title_keyword"]
        item = next((it for it in items if keyword.lower() in (it.get("title") or "").lower()), None)

        if not item:
            logger.error(f"Step {cfg['step']}: No feed item found with keyword '{keyword}'")
            continue

        before_url = item.get("before_image_url", "")
        if not before_url:
            logger.error(f"Step {cfg['step']}: '{item.get('title')}' has no before_image_url")
            continue

        logger.info(f"Step {cfg['step']}: Generating from '{item.get('title')}' (id={item['id']})")

        try:
            resp = urllib.request.urlopen(before_url, timeout=30)
            image_bytes = resp.read()
            image_b64 = base64.b64encode(image_bytes).decode("utf-8")

            gen_result = generate_image(
                cfg["prompt"],
                image_b64,
                aspect_ratio_id=cfg["aspect_ratio"],
            )
            clean_b64 = gen_result["base64"]

            raw_bytes = base64.b64decode(clean_b64)
            storage_path = f"homepage/step_{cfg['step']}_{uuid.uuid4()}.png"
            sb.storage.from_(BUCKET).upload(storage_path, raw_bytes, {"content-type": "image/png"})
            new_url = f"{sb.supabase_url}/storage/v1/object/public/{BUCKET}/{storage_path}"

            results[cfg["step"]] = new_url
            logger.info(f"  ✓ Step {cfg['step']} done — {new_url}")

            time.sleep(3)

        except Exception as e:
            logger.error(f"  ✗ Step {cfg['step']} error: {e}")
            time.sleep(5)

    print("\n\n=== RESULTS ===")
    print(json.dumps(results, indent=2))
    print("\nUpdate HomePageClient.tsx steps array with these URLs.")
    return results


if __name__ == "__main__":
    generate_steps()
