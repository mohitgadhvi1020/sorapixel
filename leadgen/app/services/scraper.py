from __future__ import annotations

"""Product photo scraper — extract product images from jewelry stores.

Supports:
  - Shopify /products.json (bulletproof, structured JSON)
  - Etsy Listing API
  - Generic websites (JSON-LD Product schema + HTML img parsing)
"""

import base64
import io
import json
import logging
import random
import re
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from app.config import get_settings
from app.database import get_supabase

logger = logging.getLogger(__name__)

JEWELRY_TYPE_KEYWORDS = {
    "ring": ["ring", "rings", "band", "bands", "engagement", "wedding ring"],
    "necklace": ["necklace", "necklaces", "chain", "chains", "choker"],
    "bracelet": ["bracelet", "bracelets", "bangle", "bangles", "cuff"],
    "earring": ["earring", "earrings", "studs", "hoops", "drops"],
    "pendant": ["pendant", "pendants", "locket", "charm"],
    "watch": ["watch", "watches", "timepiece"],
}


def _detect_jewelry_type(title: str, tags: list[str] | None = None) -> str:
    text = f"{title} {' '.join(tags or [])}".lower()
    for jtype, keywords in JEWELRY_TYPE_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return jtype
    return "other"


async def _download_image(client: httpx.AsyncClient, url: str) -> bytes | None:
    """Download an image and return raw bytes."""
    try:
        resp = await client.get(url, timeout=20.0, follow_redirects=True)
        if resp.status_code == 200 and resp.headers.get("content-type", "").startswith("image"):
            return resp.content
        # Some CDNs don't set content-type properly
        if resp.status_code == 200 and len(resp.content) > 5000:
            return resp.content
    except Exception as exc:
        logger.debug("Failed to download image %s: %s", url, exc)
    return None


def _upload_to_storage(lead_id: str, index: int, image_bytes: bytes) -> str:
    """Upload image to Supabase Storage and return public URL."""
    sb = get_supabase()
    path = f"lead-originals/{lead_id}/{index}.jpg"
    try:
        sb.storage.from_("lead-images").upload(
            path, image_bytes, {"content-type": "image/jpeg"}
        )
    except Exception:
        # Bucket might not exist; try to create it
        try:
            sb.storage.create_bucket("lead-images", {"public": True})
            sb.storage.from_("lead-images").upload(
                path, image_bytes, {"content-type": "image/jpeg"}
            )
        except Exception as exc:
            logger.error("Failed to upload image for lead %s: %s", lead_id, exc)
            return ""

    settings = get_settings()
    return f"{settings.supabase_url}/storage/v1/object/public/lead-images/{path}"


# ── Shopify Scraper ───────────────────────────────────────────────────────────

async def _scrape_shopify(client: httpx.AsyncClient, store_url: str, count: int) -> list[dict]:
    """Scrape products from a Shopify store using /products.json."""
    domain = store_url.rstrip("/").split("//")[-1].split("/")[0]
    url = f"https://{domain}/products.json?limit=50"

    try:
        resp = await client.get(url, timeout=15.0, follow_redirects=True)
        if resp.status_code != 200:
            return []
        data = resp.json()
        products = data.get("products", [])
    except Exception:
        return []

    if not products:
        return []

    selected = random.sample(products, min(count, len(products)))
    results = []
    for p in selected:
        images = p.get("images", [])
        image_url = images[0].get("src") if images else None
        if not image_url:
            continue
        results.append({
            "product_name": p.get("title", "Unknown"),
            "product_url": f"https://{domain}/products/{p.get('handle', '')}",
            "image_url": image_url,
            "jewelry_type": _detect_jewelry_type(p.get("title", ""), p.get("tags", [])),
        })
    return results


# ── Etsy Scraper ──────────────────────────────────────────────────────────────

async def _scrape_etsy(client: httpx.AsyncClient, store_url: str, count: int) -> list[dict]:
    """Scrape products from an Etsy shop using the API or HTML."""
    settings = get_settings()
    api_key = settings.etsy_api_key

    # Extract shop name from URL
    match = re.search(r'etsy\.com/shop/(\w+)', store_url)
    if not match:
        return []
    shop_name = match.group(1)

    if api_key:
        # Use Etsy API
        headers = {"x-api-key": api_key}
        try:
            # Get shop ID first
            resp = await client.get(
                f"https://openapi.etsy.com/v3/application/shops?shop_name={shop_name}",
                headers=headers, timeout=15.0,
            )
            if resp.status_code != 200:
                return []
            shops = resp.json().get("results", [])
            if not shops:
                return []
            shop_id = shops[0]["shop_id"]

            # Get active listings
            resp = await client.get(
                f"https://openapi.etsy.com/v3/application/shops/{shop_id}/listings/active?limit=25&includes=Images",
                headers=headers, timeout=15.0,
            )
            if resp.status_code != 200:
                return []
            listings = resp.json().get("results", [])
        except Exception:
            return []

        if not listings:
            return []

        selected = random.sample(listings, min(count, len(listings)))
        results = []
        for listing in selected:
            images = listing.get("images", []) or listing.get("Images", [])
            image_url = images[0].get("url_fullxfull") if images else None
            if not image_url:
                continue
            results.append({
                "product_name": listing.get("title", "Unknown"),
                "product_url": listing.get("url", ""),
                "image_url": image_url,
                "jewelry_type": _detect_jewelry_type(listing.get("title", ""), listing.get("tags", [])),
            })
        return results

    # Fallback: scrape HTML
    return await _scrape_generic(client, store_url, count)


# ── Generic Website Scraper ───────────────────────────────────────────────────

async def _scrape_generic(client: httpx.AsyncClient, store_url: str, count: int) -> list[dict]:
    """Scrape product images from a generic e-commerce website."""
    try:
        resp = await client.get(store_url, timeout=15.0, follow_redirects=True, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        })
        if resp.status_code != 200:
            return []
        html = resp.text
    except Exception:
        return []

    soup = BeautifulSoup(html, "html.parser")
    results: list[dict] = []

    # Method 1: JSON-LD Product schema (most reliable for e-commerce)
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            ld = json.loads(script.string or "")
            items = ld if isinstance(ld, list) else [ld]
            for item in items:
                if item.get("@type") == "Product":
                    image = item.get("image")
                    if isinstance(image, list):
                        image = image[0] if image else None
                    if isinstance(image, dict):
                        image = image.get("url")
                    if image:
                        results.append({
                            "product_name": item.get("name", "Unknown"),
                            "product_url": item.get("url", store_url),
                            "image_url": image if image.startswith("http") else urljoin(store_url, image),
                            "jewelry_type": _detect_jewelry_type(item.get("name", "")),
                        })
                elif item.get("@type") == "ItemList":
                    for elem in item.get("itemListElement", [])[:count]:
                        sub = elem.get("item", elem)
                        image = sub.get("image")
                        if isinstance(image, list):
                            image = image[0] if image else None
                        if image:
                            results.append({
                                "product_name": sub.get("name", "Unknown"),
                                "product_url": sub.get("url", store_url),
                                "image_url": image if image.startswith("http") else urljoin(store_url, image),
                                "jewelry_type": _detect_jewelry_type(sub.get("name", "")),
                            })
        except Exception:
            continue

    if len(results) >= count:
        return random.sample(results, count)

    # Method 2: Find product-like image containers
    product_selectors = [
        "img.product-image", "img[data-product]",
        ".product-card img", ".product-item img",
        ".product img", ".collection-product img",
        "article img", ".grid-item img",
    ]
    for selector in product_selectors:
        for img in soup.select(selector):
            src = img.get("src") or img.get("data-src") or img.get("data-lazy-src")
            if not src:
                continue
            full_url = src if src.startswith("http") else urljoin(store_url, src)
            if any(ext in full_url.lower() for ext in [".svg", "logo", "icon", "banner", "placeholder"]):
                continue
            alt = img.get("alt", "")
            results.append({
                "product_name": alt or "Product",
                "product_url": store_url,
                "image_url": full_url,
                "jewelry_type": _detect_jewelry_type(alt),
            })
        if len(results) >= count:
            break

    # Deduplicate by image URL
    seen: set[str] = set()
    unique: list[dict] = []
    for r in results:
        if r["image_url"] not in seen:
            seen.add(r["image_url"])
            unique.append(r)

    return random.sample(unique, min(count, len(unique))) if unique else []


# ═══════════════════════════════════════════════════════════════════════════════
# Main scraper entry point
# ═══════════════════════════════════════════════════════════════════════════════

async def scrape_lead_products(lead_id: str, store_url: str, platform: str, count: int = 3) -> int:
    """Scrape product photos for a single lead. Returns number of products saved."""
    sb = get_supabase()

    async with httpx.AsyncClient() as client:
        if platform == "shopify":
            products = await _scrape_shopify(client, store_url, count)
        elif platform == "etsy":
            products = await _scrape_etsy(client, store_url, count)
        else:
            # Try Shopify first (many stores are Shopify)
            products = await _scrape_shopify(client, store_url, count)
            if not products:
                products = await _scrape_generic(client, store_url, count)

        if not products:
            sb.table("leads").update({"status": "scrape_failed"}).eq("id", lead_id).execute()
            return 0

        saved = 0
        for i, prod in enumerate(products):
            image_bytes = await _download_image(client, prod["image_url"])
            if not image_bytes:
                continue

            storage_url = _upload_to_storage(lead_id, i, image_bytes)
            if not storage_url:
                continue

            sb.table("lead_products").insert({
                "lead_id": lead_id,
                "product_name": prod["product_name"][:200],
                "product_url": prod["product_url"],
                "original_image_url": storage_url,
                "jewelry_type": prod["jewelry_type"],
                "status": "pending",
            }).execute()
            saved += 1

        if saved > 0:
            sb.table("leads").update({"status": "scraped"}).eq("id", lead_id).execute()
        else:
            sb.table("leads").update({"status": "scrape_failed"}).eq("id", lead_id).execute()

        return saved


async def run_scraping(batch_size: int = 50) -> dict:
    """Scrape products for all enriched leads. Returns stats."""
    sb = get_supabase()
    settings = get_settings()
    count = settings.products_per_lead

    result = sb.table("leads").select("id, store_url, platform").eq(
        "status", "enriched"
    ).limit(batch_size).execute()

    leads = result.data or []
    scraped = 0
    failed = 0

    for lead in leads:
        n = await scrape_lead_products(lead["id"], lead["store_url"], lead["platform"], count)
        if n > 0:
            scraped += 1
        else:
            failed += 1

    stats = {"processed": len(leads), "scraped": scraped, "failed": failed}
    logger.info("Scraping complete: %s", stats)
    return stats
