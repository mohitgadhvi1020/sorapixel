"""Generate 4 beautiful product images for the homepage Features section.

Each image is tailored to its feature concept:
  1 - Hero Shots: Stunning front-facing product shot
  2 - Close-Up Detail: Macro detail shot
  3 - Lifestyle Scenes: Product in real-world context
  4 - Model Shots: Product worn/used by a person

Run from backend directory:
    cd backend && source venv/bin/activate && python scripts/generate_features_images.py
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

FEATURES_CONFIG = [
    {
        "key": "hero_shots",
        "title_keyword": "bag",
        "prompt": (
            "Create a stunning hero product shot of this bag. "
            "Center the bag prominently on a clean, gradient background (light cream to white). "
            "Perfect studio lighting with soft shadows. The bag should be the absolute star of the image. "
            "The bag must remain EXACTLY the same — same shape, color, material, straps, hardware. "
            "Only change background and lighting. High-end commercial product photography. Portrait orientation."
        ),
        "aspect_ratio": "portrait",
    },
    {
        "key": "closeup_detail",
        "title_keyword": "trimmer",
        "prompt": (
            "Create a detailed close-up macro shot of this trimmer/grooming device. "
            "Show the texture, buttons, and build quality in sharp detail. "
            "Dramatic studio lighting with a dark moody background to highlight the product's premium feel. "
            "The product must remain EXACTLY the same — same design, color, buttons. "
            "Only change the angle to a slight close-up perspective and enhance lighting. Portrait orientation."
        ),
        "aspect_ratio": "portrait",
    },
    {
        "key": "lifestyle",
        "title_keyword": "sofa",
        "prompt": (
            "Create a beautiful lifestyle scene with this sofa/furniture piece. "
            "Place it in a bright, modern Scandinavian living room with natural window light, "
            "plants, a soft rug, and minimal decor. Warm, inviting atmosphere. "
            "The sofa must remain EXACTLY the same — same shape, color, fabric, and design. "
            "Only change the surrounding environment to create an aspirational lifestyle setting. Portrait orientation."
        ),
        "aspect_ratio": "portrait",
    },
    {
        "key": "model_shots",
        "title_keyword": "dress",
        "prompt": (
            "Create a fashion editorial shot featuring this dress on a model. "
            "Show a stylish woman wearing this exact dress in a clean studio setting. "
            "Professional fashion photography with soft, flattering lighting. "
            "The dress must remain EXACTLY the same — same design, pattern, color, and style. "
            "Natural, confident pose. Portrait orientation, editorial fashion photography."
        ),
        "aspect_ratio": "portrait",
    },
]


def generate_features():
    sb = get_supabase()
    result = sb.table("feed_items").select("*").eq("is_active", True).order("display_order").execute()
    items = result.data or []
    logger.info(f"Found {len(items)} feed items")

    results = {}

    for cfg in FEATURES_CONFIG:
        keyword = cfg["title_keyword"]
        item = next((it for it in items if keyword.lower() in (it.get("title") or "").lower()), None)

        if not item:
            logger.error(f"Feature '{cfg['key']}': No feed item found with keyword '{keyword}'")
            continue

        before_url = item.get("before_image_url", "")
        if not before_url:
            logger.error(f"Feature '{cfg['key']}': '{item.get('title')}' has no before_image_url")
            continue

        logger.info(f"Feature '{cfg['key']}': Generating from '{item.get('title')}' (id={item['id']})")

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
            storage_path = f"homepage/feature_{cfg['key']}_{uuid.uuid4()}.png"
            sb.storage.from_(BUCKET).upload(storage_path, raw_bytes, {"content-type": "image/png"})
            new_url = f"{sb.supabase_url}/storage/v1/object/public/{BUCKET}/{storage_path}"

            results[cfg["key"]] = new_url
            logger.info(f"  ✓ Feature '{cfg['key']}' done — {new_url}")

            time.sleep(3)

        except Exception as e:
            logger.error(f"  ✗ Feature '{cfg['key']}' error: {e}")
            time.sleep(5)

    print("\n\n=== RESULTS ===")
    print(json.dumps(results, indent=2))
    print("\nUpdate HomePageClient.tsx features array with these URLs.")
    return results


if __name__ == "__main__":
    generate_features()
