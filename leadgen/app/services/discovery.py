from __future__ import annotations

"""Lead discovery — multi-source parallel pipeline.

Sources (run in parallel):
  1. Etsy API v3 — search for jewelry sellers
  2. Google Places API — systematic city-by-city search with multiple queries,
     pagination, and full field extraction (reviews, hours, photos)
  3. Shopify detection — Perplexity finds URLs, then /products.json validates
  4. Perplexity Sonar backup — AI-powered web search as last resort
"""

import asyncio
import json
import logging
import random
import re
from dataclasses import dataclass, field
from urllib.parse import urlparse

import httpx

from app.config import get_settings
from app.database import get_supabase

logger = logging.getLogger(__name__)


@dataclass
class LeadCandidate:
    store_name: str
    platform: str
    region: str
    store_url: str
    domain: str
    contact_email: str | None = None
    contact_name: str | None = None
    phone: str | None = None
    address: str | None = None
    metadata: dict = field(default_factory=dict)


def _extract_domain(url: str) -> str:
    parsed = urlparse(url if "://" in url else f"https://{url}")
    host = parsed.hostname or ""
    return host.removeprefix("www.")


REGION_CODES = {
    "us": ["US"],
    "eu": ["GB", "DE", "FR", "IT", "ES", "NL", "BE", "AT", "CH", "SE", "DK", "NO", "FI", "PT", "IE", "PL"],
    "dubai": ["AE"],
}

REGION_CITIES = {
    "us": [
        "New York", "Los Angeles", "Chicago", "Houston", "Miami",
        "San Francisco", "Dallas", "Atlanta", "Seattle", "Boston",
        "Denver", "Phoenix", "Philadelphia", "San Diego", "Austin",
        "Nashville", "Portland", "Las Vegas", "Charlotte", "Minneapolis",
        "Detroit", "Tampa", "St Louis", "Pittsburgh", "Baltimore",
        "Salt Lake City", "Kansas City", "Columbus", "Indianapolis", "Milwaukee",
        "Scottsdale", "Savannah", "Charleston", "Santa Fe", "Aspen",
        "Palm Beach", "Napa", "Sedona", "Carmel", "Greenwich",
    ],
    "eu": [
        "London", "Paris", "Berlin", "Milan", "Madrid",
        "Amsterdam", "Brussels", "Vienna", "Zurich", "Stockholm",
        "Copenhagen", "Dublin", "Lisbon", "Munich", "Barcelona",
        "Rome", "Hamburg", "Prague", "Warsaw", "Budapest",
        "Edinburgh", "Manchester", "Lyon", "Florence", "Antwerp",
        "Geneva", "Nice", "Bruges", "Salzburg", "Porto",
    ],
    "dubai": [
        "Dubai", "Abu Dhabi", "Sharjah", "Doha", "Riyadh",
        "Jeddah", "Kuwait City", "Bahrain", "Muscat", "Amman",
    ],
}

BIG_BRAND_DOMAINS = {
    "tiffany.com", "cartier.com", "bulgari.com", "pandora.net", "pandora.com",
    "kayoutlet.com", "kay.com", "zales.com", "jared.com",
    "bluenile.com", "brilliantearth.com", "jamesallen.com",
    "signetjewelers.com", "swarovski.com", "chopard.com",
    "tanishq.co.in", "caratlane.com", "bluestone.com", "malabargroup.com",
    "pngjewellers.com", "kalyangroup.com", "joyalukkas.com",
    "miabytanishq.com", "stores.tanishq.co.in", "giva.co",
    "amazon.com", "ebay.com", "walmart.com", "etsy.com",
    "instagram.com", "facebook.com", "pinterest.com",
    "overstock.com", "wayfair.com", "target.com",
    "ross-simons.com", "helzberg.com", "shaneco.com",
    "ritani.com", "whiteflash.com", "adiamor.com",
    "debeers.com", "harrywinston.com", "vancleefarpels.com",
    "graff.com", "mikimoto.com", "davidyurman.com",
    "johnhardy.com", "lagos.com", "ippolita.com",
    "mejuri.com", "gorjana.com", "kendrascott.com",
    "baublebar.com", "stelladot.com", "missoma.com",
    "monicavinader.com", "astridandmiyu.com",
    "yelp.com", "tripadvisor.com", "google.com", "apple.com",
}

JEWELRY_KEYWORDS = [
    "jewelry", "jewellery", "jeweler", "jeweller",
    "gold", "diamond", "ring", "necklace", "bracelet",
    "earring", "pendant", "gemstone", "silver", "fine jewelry",
    "engagement ring", "wedding band", "custom jewelry",
]

SHOPIFY_SEED_URLS: dict[str, list[str]] = {
    "us": [],
    "eu": [],
    "dubai": [],
}


def _already_exists(domain: str) -> bool:
    sb = get_supabase()
    result = sb.table("leads").select("id").eq("domain", domain).limit(1).execute()
    return bool(result.data)


def _is_blocked_domain(domain: str) -> bool:
    return domain in BIG_BRAND_DOMAINS or any(domain.endswith(f".{bd}") for bd in BIG_BRAND_DOMAINS)


def _save_leads(candidates: list[LeadCandidate]) -> int:
    sb = get_supabase()
    saved = 0
    for c in candidates:
        if _is_blocked_domain(c.domain):
            logger.debug("Skipping big brand: %s (%s)", c.store_name, c.domain)
            continue
        if _already_exists(c.domain):
            logger.debug("Skipping duplicate: %s", c.domain)
            continue
        try:
            sb.table("leads").insert({
                "store_name": c.store_name,
                "platform": c.platform,
                "region": c.region,
                "store_url": c.store_url,
                "domain": c.domain,
                "contact_email": c.contact_email,
                "contact_name": c.contact_name,
                "phone": c.phone,
                "address": c.address,
                "status": "enriched" if c.contact_email else "discovered",
                "metadata": c.metadata,
            }).execute()
            saved += 1
        except Exception as exc:
            logger.warning("Failed to insert lead %s: %s", c.domain, exc)
    return saved


async def _http_get(client: httpx.AsyncClient, url: str, **kwargs) -> httpx.Response | None:
    try:
        resp = await client.get(url, timeout=15.0, follow_redirects=True, **kwargs)
        return resp if resp.status_code == 200 else None
    except Exception as exc:
        logger.debug("HTTP GET %s failed: %s", url, exc)
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# SOURCE 1: Etsy API v3
# ═══════════════════════════════════════════════════════════════════════════════

ETSY_SEARCH_TERMS = [
    "handmade jewelry", "gold jewelry", "diamond jewelry",
    "custom jewelry", "fine jewelry", "silver jewelry",
    "engagement rings", "gemstone jewelry", "artisan jewelry",
    "vintage jewelry", "minimalist jewelry", "statement jewelry",
    "pearl jewelry", "wedding jewelry", "birthstone jewelry",
]


async def discover_etsy(region: str = "us", max_results: int = 50) -> int:
    settings = get_settings()
    api_key = settings.etsy_api_key
    if not api_key:
        logger.warning("ETSY_API_KEY not set — skipping Etsy")
        return 0

    country_codes = REGION_CODES.get(region, ["US"])
    candidates: list[LeadCandidate] = []
    seen_shops: set[str] = set()

    search_terms = random.sample(ETSY_SEARCH_TERMS, min(5, len(ETSY_SEARCH_TERMS)))

    async with httpx.AsyncClient() as client:
        headers = {"x-api-key": api_key}

        for term in search_terms:
            if len(candidates) >= max_results:
                break

            offset = random.randint(0, 100)
            url = (
                f"https://openapi.etsy.com/v3/application/shops"
                f"?keywords={term}&limit=25&offset={offset}"
            )
            resp = await _http_get(client, url, headers=headers)
            if not resp:
                continue

            try:
                data = resp.json()
                shops = data.get("results", [])
            except Exception:
                continue

            for shop in shops:
                shop_name = shop.get("shop_name", "")
                if not shop_name or shop_name in seen_shops:
                    continue
                seen_shops.add(shop_name)

                shop_country = shop.get("country_iso")
                if shop_country and shop_country not in country_codes:
                    continue

                listing_count = shop.get("listing_active_count", 0)
                if listing_count > 500 or listing_count < 5:
                    continue

                shop_url = f"https://www.etsy.com/shop/{shop_name}"
                domain = f"{shop_name.lower()}.etsy.com"

                candidates.append(LeadCandidate(
                    store_name=shop.get("title", shop_name) or shop_name,
                    platform="etsy",
                    region=region,
                    store_url=shop_url,
                    domain=domain,
                    metadata={
                        "etsy_shop_id": shop.get("shop_id"),
                        "listing_active_count": listing_count,
                        "review_count": shop.get("review_count"),
                        "review_average": shop.get("review_average"),
                        "search_term": term,
                    },
                ))

            await asyncio.sleep(0.5)

    saved = _save_leads(candidates[:max_results])
    logger.info("Etsy: found %d candidates, saved %d", len(candidates), saved)
    return saved


# ═══════════════════════════════════════════════════════════════════════════════
# SOURCE 2: Google Places API — Systematic Multi-Query Discovery
# ═══════════════════════════════════════════════════════════════════════════════

PLACES_SEARCH_QUERIES = [
    "independent jewelry store",
    "custom jewelry shop",
    "handmade jewelry boutique",
    "fine jewelry store",
    "artisan jeweler",
    "jewelry designer studio",
    "engagement ring shop",
    "gold jewelry store",
    "diamond jewelry store",
    "vintage jewelry shop",
    "jewelry repair and custom design",
    "local jeweler",
]

PLACES_FULL_FIELD_MASK = (
    "places.displayName,places.websiteUri,places.formattedAddress,"
    "places.nationalPhoneNumber,places.rating,places.userRatingCount,"
    "places.id,places.googleMapsUri,places.regularOpeningHours,"
    "places.businessStatus,places.types,places.reviews"
)


async def _places_search_page(
    client: httpx.AsyncClient,
    api_key: str,
    query: str,
    city: str,
    page_token: str | None = None,
) -> tuple[list[dict], str | None]:
    """Execute a single Google Places text search request, return (places, next_page_token)."""
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": PLACES_FULL_FIELD_MASK + ",nextPageToken",
    }
    body: dict = {
        "textQuery": f"{query} in {city}",
        "maxResultCount": 20,
    }
    if page_token:
        body["pageToken"] = page_token

    try:
        resp = await client.post(
            "https://places.googleapis.com/v1/places:searchText",
            json=body, headers=headers, timeout=15.0,
        )
        if resp.status_code != 200:
            logger.warning("Google Places %s/%s returned %s", city, query, resp.status_code)
            return [], None
        data = resp.json()
        return data.get("places", []), data.get("nextPageToken")
    except Exception as exc:
        logger.error("Google Places failed for %s/%s: %s", city, query, exc)
        return [], None


def _extract_review_snippets(place: dict) -> list[dict]:
    """Extract useful review data for lead scoring."""
    reviews = place.get("reviews", [])
    snippets = []
    for r in reviews[:5]:
        snippets.append({
            "rating": r.get("rating"),
            "text": (r.get("text", {}).get("text", "") or "")[:200],
            "time": r.get("publishTime"),
        })
    return snippets


def _extract_opening_hours(place: dict) -> dict | None:
    hours = place.get("regularOpeningHours")
    if not hours:
        return None
    return {
        "open_now": hours.get("openNow"),
        "weekday_descriptions": hours.get("weekdayDescriptions", []),
    }


async def discover_google_places(region: str, max_results: int = 50) -> int:
    settings = get_settings()
    api_key = settings.google_places_api_key
    if not api_key:
        logger.warning("GOOGLE_PLACES_API_KEY not set — skipping Google Places")
        return 0

    cities = REGION_CITIES.get(region, REGION_CITIES["us"])
    selected_cities = random.sample(cities, min(8, len(cities)))
    queries = random.sample(PLACES_SEARCH_QUERIES, min(3, len(PLACES_SEARCH_QUERIES)))

    candidates: list[LeadCandidate] = []
    seen_domains: set[str] = set()

    async with httpx.AsyncClient() as client:
        for city in selected_cities:
            if len(candidates) >= max_results:
                break

            for query in queries:
                if len(candidates) >= max_results:
                    break

                places, next_token = await _places_search_page(client, api_key, query, city)

                all_places = list(places)
                pages_fetched = 1
                while next_token and pages_fetched < 3 and len(candidates) < max_results:
                    await asyncio.sleep(0.3)
                    more_places, next_token = await _places_search_page(
                        client, api_key, query, city, next_token,
                    )
                    all_places.extend(more_places)
                    pages_fetched += 1

                for place in all_places:
                    website = place.get("websiteUri")
                    if not website:
                        continue
                    domain = _extract_domain(website)
                    if not domain or _is_blocked_domain(domain) or domain in seen_domains:
                        continue
                    seen_domains.add(domain)

                    rating_count = place.get("userRatingCount", 0)
                    if rating_count > 5000:
                        continue

                    biz_status = place.get("businessStatus")
                    if biz_status and biz_status != "OPERATIONAL":
                        continue

                    name = place.get("displayName", {}).get("text", domain)
                    review_snippets = _extract_review_snippets(place)
                    opening_hours = _extract_opening_hours(place)

                    candidates.append(LeadCandidate(
                        store_name=name,
                        platform="google_places",
                        region=region,
                        store_url=website,
                        domain=domain,
                        phone=place.get("nationalPhoneNumber"),
                        address=place.get("formattedAddress"),
                        metadata={
                            "google_place_id": place.get("id"),
                            "google_maps_url": place.get("googleMapsUri"),
                            "rating": place.get("rating"),
                            "rating_count": rating_count,
                            "business_types": place.get("types", []),
                            "opening_hours": opening_hours,
                            "review_snippets": review_snippets,
                            "city": city,
                            "search_query": query,
                        },
                    ))

                await asyncio.sleep(0.3)

    saved = _save_leads(candidates)
    logger.info("Google Places: found %d candidates, saved %d", len(candidates), saved)
    return saved


# ═══════════════════════════════════════════════════════════════════════════════
# SOURCE 3: Shopify Store Discovery
# ═══════════════════════════════════════════════════════════════════════════════

async def _check_shopify_store(client: httpx.AsyncClient, url: str) -> dict | None:
    """Validate a URL is a real Shopify jewelry store by checking /products.json."""
    domain = _extract_domain(url)
    if _is_blocked_domain(domain):
        return None
    products_url = f"https://{domain}/products.json?limit=10"
    resp = await _http_get(client, products_url)
    if not resp:
        return None
    try:
        data = resp.json()
        products = data.get("products", [])
        if not products or len(products) > 200:
            return None
        has_jewelry = any(
            any(kw in f"{p.get('title', '')} {p.get('product_type', '')} {' '.join(p.get('tags', []))}".lower()
                for kw in JEWELRY_KEYWORDS)
            for p in products
        )
        if not has_jewelry:
            return None
        store_name = products[0].get("vendor", domain) if products else domain
        return {"store_name": store_name, "domain": domain, "products": products}
    except Exception:
        return None


SHOPIFY_DISCOVERY_PROMPT = """Find {count} small independent jewelry stores that use Shopify for their online store in {city}.

I need their website URLs (their own domain like example.com, NOT myshopify.com URLs).

REQUIREMENTS:
- Must be small/independent businesses, NOT big chains
- Must sell jewelry online via their own Shopify website
- EXCLUDE any store with more than ~200 products
- EXCLUDE: Tiffany, Cartier, Pandora, Kay, Zales, Jared, Blue Nile, Brilliant Earth, Swarovski, and any large chain

Return ONLY a JSON array of objects with: {{"store_name": "...", "website": "..."}}
No markdown, no explanation, just the JSON array."""


async def _find_shopify_urls_via_perplexity(region: str, max_urls: int = 30) -> list[str]:
    settings = get_settings()
    api_key = settings.perplexity_api_key
    if not api_key:
        return []

    cities = REGION_CITIES.get(region, REGION_CITIES["us"])
    selected_cities = random.sample(cities, min(3, len(cities)))
    urls: list[str] = []

    async with httpx.AsyncClient() as client:
        for city in selected_cities:
            if len(urls) >= max_urls:
                break
            prompt = SHOPIFY_DISCOVERY_PROMPT.format(count=max_urls // len(selected_cities), city=city)
            try:
                resp = await client.post(
                    "https://api.perplexity.ai/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "sonar",
                        "messages": [
                            {"role": "system", "content": "Return ONLY valid JSON arrays. No markdown."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.1,
                    },
                    timeout=30.0,
                )
                if resp.status_code != 200:
                    continue
                content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "")
                json_match = re.search(r'\[[\s\S]*\]', content)
                if not json_match:
                    continue
                stores = json.loads(json_match.group(0))
                for s in stores:
                    w = s.get("website", "")
                    if w and w.startswith("http"):
                        urls.append(w)
            except Exception as exc:
                logger.warning("Perplexity Shopify search failed for %s: %s", city, exc)
            await asyncio.sleep(1.0)

    return urls[:max_urls]


async def _detect_shopify_from_website(client: httpx.AsyncClient, url: str) -> bool:
    """Check if a website runs on Shopify by looking for telltale signs."""
    try:
        resp = await client.get(url, timeout=10.0, follow_redirects=True, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        })
        if resp.status_code != 200:
            return False
        html = resp.text.lower()
        shopify_signals = [
            "cdn.shopify.com",
            "shopify.com/s/files",
            "myshopify.com",
            "Shopify.theme",
            "shopify-section",
        ]
        return any(sig.lower() in html for sig in shopify_signals)
    except Exception:
        return False


async def discover_shopify(region: str = "us", max_results: int = 50) -> int:
    seed_urls = list(SHOPIFY_SEED_URLS.get(region, []))
    perplexity_urls = await _find_shopify_urls_via_perplexity(region, max_urls=max_results * 2)
    all_urls = list(set(seed_urls + perplexity_urls))
    random.shuffle(all_urls)

    if not all_urls:
        logger.info("Shopify: no URLs to check for region %s", region)
        return 0

    candidates: list[LeadCandidate] = []
    seen_domains: set[str] = set()

    async with httpx.AsyncClient() as client:
        sem = asyncio.Semaphore(5)

        async def _check(url: str):
            if len(candidates) >= max_results:
                return
            async with sem:
                info = await _check_shopify_store(client, url)
                if not info:
                    return
                domain = info["domain"]
                if domain in seen_domains:
                    return
                seen_domains.add(domain)
                candidates.append(LeadCandidate(
                    store_name=info["store_name"],
                    platform="shopify",
                    region=region,
                    store_url=f"https://{domain}",
                    domain=domain,
                    metadata={
                        "product_count": len(info["products"]),
                        "is_shopify": True,
                    },
                ))
                await asyncio.sleep(0.3)

        tasks = [_check(u) for u in all_urls[:max_results * 3]]
        await asyncio.gather(*tasks)

    saved = _save_leads(candidates)
    logger.info("Shopify: checked %d URLs, found %d candidates, saved %d", len(all_urls), len(candidates), saved)
    return saved


# ═══════════════════════════════════════════════════════════════════════════════
# BACKUP: Perplexity Sonar AI Search
# ═══════════════════════════════════════════════════════════════════════════════

PERPLEXITY_BACKUP_PROMPT = """Find {count} small-to-medium INDEPENDENT jewelry stores in {city} that sell online.

REQUIREMENTS:
- Must be independent/small businesses, NOT big chains or franchises
- Must have their own website with online shopping
- EXCLUDE: Tiffany, Cartier, Pandora, Kay Jewelers, Zales, Jared, Blue Nile, Brilliant Earth, Tanishq, CaratLane, BlueStone, Swarovski, and any other large chain/franchise

For EACH store, provide:
1. Store name
2. Website URL (their own domain, not marketplace listings)
3. Owner/founder name (if findable)
4. Contact email (owner or business email, NOT generic support@/info@/hello@ addresses)
5. What type of jewelry they specialize in

Return ONLY a valid JSON array:
[{{"store_name": "...", "website": "...", "owner_name": "...", "email": "...", "specialty": "..."}}]

Use null for unknown fields. Do NOT make up information."""


async def discover_perplexity_backup(region: str, max_results: int = 20) -> int:
    settings = get_settings()
    api_key = settings.perplexity_api_key
    if not api_key:
        logger.warning("PERPLEXITY_API_KEY not set — skipping backup discovery")
        return 0

    cities = REGION_CITIES.get(region, REGION_CITIES["us"])
    selected_cities = random.sample(cities, min(3, len(cities)))
    results_per_city = max(max_results // len(selected_cities), 5)

    candidates: list[LeadCandidate] = []

    async with httpx.AsyncClient() as client:
        for city in selected_cities:
            if len(candidates) >= max_results:
                break

            prompt = PERPLEXITY_BACKUP_PROMPT.format(count=results_per_city, city=city)

            try:
                resp = await client.post(
                    "https://api.perplexity.ai/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "sonar",
                        "messages": [
                            {"role": "system", "content": "You are a business research assistant. Return ONLY valid JSON arrays, no markdown."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.1,
                    },
                    timeout=30.0,
                )

                if resp.status_code != 200:
                    logger.warning("Perplexity backup returned %s: %s", resp.status_code, resp.text[:200])
                    continue

                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

                json_match = re.search(r'\[[\s\S]*\]', content)
                if not json_match:
                    continue

                stores = json.loads(json_match.group(0))

                for store in stores:
                    website = store.get("website", "")
                    if not website or not website.startswith("http"):
                        continue

                    domain = _extract_domain(website)
                    if not domain or _is_blocked_domain(domain):
                        continue

                    email = store.get("email")
                    if email and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
                        email = None

                    candidates.append(LeadCandidate(
                        store_name=store.get("store_name", domain),
                        platform="ai_search",
                        region=region,
                        store_url=website,
                        domain=domain,
                        contact_email=email,
                        contact_name=store.get("owner_name"),
                        metadata={
                            "source": "perplexity_backup",
                            "city": city,
                            "specialty": store.get("specialty"),
                        },
                    ))

                logger.info("Perplexity backup found %d stores in %s", len(stores), city)

            except json.JSONDecodeError as exc:
                logger.warning("Failed to parse Perplexity JSON for %s: %s", city, exc)
            except Exception as exc:
                logger.error("Perplexity backup failed for %s: %s", city, exc)

            await asyncio.sleep(1.0)

    saved = _save_leads(candidates[:max_results])
    logger.info("Perplexity backup: saved %d leads", saved)
    return saved


# ═══════════════════════════════════════════════════════════════════════════════
# Unified discovery entry point
# ═══════════════════════════════════════════════════════════════════════════════

MIN_PRIMARY_LEADS = 10


async def run_discovery(
    platform: str | None = None,
    region: str = "us",
    max_results: int = 50,
) -> dict[str, int]:
    results: dict[str, int] = {}

    if platform:
        if platform == "etsy":
            results["etsy"] = await discover_etsy(region, max_results)
        elif platform == "google_places":
            results["google_places"] = await discover_google_places(region, max_results)
        elif platform == "shopify":
            results["shopify"] = await discover_shopify(region, max_results)
        elif platform == "ai_search":
            results["ai_search"] = await discover_perplexity_backup(region, max_results)
        else:
            logger.warning("Unknown platform: %s", platform)
    else:
        etsy_task = asyncio.create_task(discover_etsy(region, max_results))
        places_task = asyncio.create_task(discover_google_places(region, max_results))
        shopify_task = asyncio.create_task(discover_shopify(region, max_results))

        etsy_count, places_count, shopify_count = await asyncio.gather(
            etsy_task, places_task, shopify_task,
            return_exceptions=True,
        )

        results["etsy"] = etsy_count if isinstance(etsy_count, int) else 0
        results["google_places"] = places_count if isinstance(places_count, int) else 0
        results["shopify"] = shopify_count if isinstance(shopify_count, int) else 0

        if isinstance(etsy_count, Exception):
            logger.error("Etsy discovery failed: %s", etsy_count)
        if isinstance(places_count, Exception):
            logger.error("Google Places discovery failed: %s", places_count)
        if isinstance(shopify_count, Exception):
            logger.error("Shopify discovery failed: %s", shopify_count)

        primary_total = sum(results.values())
        if primary_total < MIN_PRIMARY_LEADS:
            logger.info(
                "Primary sources found only %d leads (< %d) — running Perplexity backup",
                primary_total, MIN_PRIMARY_LEADS,
            )
            backup_target = max_results - primary_total
            results["ai_search"] = await discover_perplexity_backup(region, backup_target)

    total = sum(results.values())
    logger.info("Discovery complete: %d new leads — %s", total, results)
    return results
