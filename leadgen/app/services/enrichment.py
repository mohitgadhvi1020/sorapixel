from __future__ import annotations

"""Email enrichment — find decision-maker emails, not generic support addresses.

Strategy (waterfall):
  1. Apollo.io — search for owner/founder/CEO/marketing person at the company
  2. Website scraping — but ONLY accept personal-looking emails, skip generic ones
  3. Apollo org enrichment — fallback to any email Apollo has for the org

Generic emails like care@, support@, info@, hello@, contact@ are SKIPPED
because they never reach a decision-maker.
"""

import logging
import re

import httpx

from app.config import get_settings
from app.database import get_supabase

logger = logging.getLogger(__name__)

EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')

# Emails we should never use — they go to support queues, not decision-makers
GENERIC_PREFIXES = [
    "care", "support", "help", "info", "hello", "hi", "contact",
    "admin", "sales", "team", "office", "enquiry", "enquiries",
    "inquiry", "feedback", "service", "customercare", "customerservice",
    "noreply", "no-reply", "mailer-daemon", "postmaster",
    "billing", "orders", "returns", "shipping", "newsletter",
    "notifications", "alerts", "donotreply",
    "cs", "custserv", "helpdesk", "desk", "assist",
    "press", "media", "pr", "legal", "compliance",
    "jobs", "careers", "hr", "recruitment", "hiring",
    "webmaster", "hostmaster", "abuse", "security",
    "shop", "store", "buy", "wholesale",
    "gallery", "studio", "boutique", "design",
    "general", "main", "default", "user", "test",
    "ecom", "ecommerce", "marketing", "social",
    "repairs", "repair", "warranty", "custom",
    "jewelry", "jewellery", "gems", "gold", "silver",
    "backinstock", "back-in-stock", "restock", "notify",
    "valid", "invalid", "placeholder",
]

SKIP_DOMAINS = [
    "example.com", "domain.com", "test.com", "email.com",
    "emailaddress.com", "placeholder.com",
    "sentry.io", "wixpress.com", "shopify.com",
    "squarespace.com", "wordpress.com", "cloudflare.com",
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
    "googlemail.com", "aol.com", "icloud.com", "protonmail.com",
    "sentry-next.wixpress.com", "cdn.shopify.com",
    "facebook.com", "instagram.com", "twitter.com",
    "notifyboost.net", "klaviyo.com", "mailchimp.com",
    "sendgrid.net", "amazonses.com",
]

VALID_TLDS = {
    "com", "net", "org", "io", "co", "us", "uk", "de", "fr", "it",
    "es", "nl", "be", "at", "ch", "se", "dk", "no", "fi", "pt",
    "ie", "pl", "cz", "hu", "ro", "bg", "hr", "sk", "si", "lt",
    "lv", "ee", "ae", "in", "au", "nz", "ca", "mx", "br", "ar",
    "jp", "kr", "sg", "hk", "tw", "th", "ph", "my", "id", "vn",
    "za", "ng", "ke", "eg", "ma", "biz", "info", "me", "cc",
    "store", "shop", "jewelry", "design", "art", "studio",
    "gallery", "boutique", "fashion", "luxury", "gold",
    "co.uk", "co.in", "com.au", "co.nz", "co.za",
}

CONTACT_PATHS = [
    "/about", "/about-us", "/pages/about", "/pages/about-us",
    "/our-team", "/team", "/pages/our-story",
    "/contact", "/contact-us", "/pages/contact", "/pages/contact-us",
]

# Titles that indicate a decision-maker (ordered by priority)
DECISION_MAKER_TITLES = [
    "founder", "co-founder", "cofounder",
    "owner", "co-owner",
    "ceo", "chief executive",
    "cmo", "chief marketing",
    "head of marketing", "marketing director", "vp marketing",
    "head of ecommerce", "head of e-commerce", "ecommerce manager",
    "creative director", "brand director", "brand manager",
    "director", "managing director",
    "marketing manager", "digital marketing",
]


def _is_generic_email(email: str) -> bool:
    """Check if an email is a generic/department address that won't reach a person."""
    local_part = email.split("@")[0].lower().replace(".", "").replace("-", "").replace("_", "")
    return any(local_part == prefix.replace("-", "") or local_part.startswith(prefix.replace("-", ""))
               for prefix in GENERIC_PREFIXES)


def _is_valid_email(email: str) -> bool:
    """Strict email validation — rejects fake TLDs, skip domains, placeholders."""
    email_lower = email.lower().strip()
    if not EMAIL_RE.fullmatch(email_lower):
        return False

    if "@" not in email_lower:
        return False

    local, domain = email_lower.rsplit("@", 1)

    # Reject skip domains (including subdomains)
    for sd in SKIP_DOMAINS:
        if domain == sd or domain.endswith(f".{sd}"):
            return False

    # Reject non-real TLDs (like .css, .js, .png)
    tld = domain.rsplit(".", 1)[-1] if "." in domain else ""
    if not tld or len(tld) < 2:
        return False
    # Check compound TLDs like co.uk
    compound_tld = ".".join(domain.rsplit(".", 2)[-2:]) if domain.count(".") >= 2 else ""
    if tld not in VALID_TLDS and compound_tld not in VALID_TLDS:
        return False

    # Reject placeholder/fake emails
    if local in ("user", "test", "admin", "email", "name", "your", "example"):
        return False

    # Reject emails with hex-looking local parts (tracking pixels)
    if len(local) > 20 and all(c in "0123456789abcdef" for c in local.replace("-", "")):
        return False

    # Reject very short domains
    if len(domain) < 4:
        return False

    return True


def _is_decision_maker_email(email: str) -> bool:
    """Check if email looks like it belongs to a real person (not a department)."""
    return _is_valid_email(email) and not _is_generic_email(email)


def _extract_emails_from_html(html: str) -> list[str]:
    """Extract all valid emails from HTML content."""
    import html as html_module
    # Decode HTML entities first (e.g. &gt; &#x3e; \u003e)
    decoded = html_module.unescape(html)
    # Also handle JSON-style unicode escapes
    decoded = decoded.replace("\\u003e", ">").replace("\\u003c", "<")

    mailto = re.findall(r'mailto:([^"\'?\s]+)', decoded)
    all_emails = EMAIL_RE.findall(decoded)
    seen: set[str] = set()
    result: list[str] = []
    for e in mailto + all_emails:
        # Strip any leading/trailing non-email chars
        e_clean = re.sub(r'^[^a-zA-Z0-9]+', '', e).lower().strip().rstrip(".")
        if e_clean not in seen and _is_valid_email(e_clean):
            seen.add(e_clean)
            result.append(e_clean)
    return result


def _pick_best_email(emails: list[str]) -> str | None:
    """From a list of emails, pick the best one (personal > generic > none)."""
    personal = [e for e in emails if _is_decision_maker_email(e)]
    if personal:
        return personal[0]
    # If only generic emails found, return None — we'll try Apollo instead
    return None


# ── Method 1: Apollo.io — Find Decision Makers (BEST) ────────────────────────

async def _apollo_find_decision_maker(domain: str) -> tuple[str | None, str | None]:
    """Use Apollo.io to find a decision-maker at the company.
    Returns (email, contact_name) or (None, None).
    """
    settings = get_settings()
    api_key = settings.apollo_api_key
    if not api_key:
        logger.debug("APOLLO_API_KEY not set — skipping Apollo enrichment")
        return None, None

    async with httpx.AsyncClient() as client:
        headers = {
            "Content-Type": "application/json",
            "X-Api-Key": api_key,
        }

        # Search for people at this company with decision-maker titles
        try:
            resp = await client.post(
                "https://api.apollo.io/v1/mixed_people/search",
                json={
                    "organization_domains": [domain],
                    "person_titles": DECISION_MAKER_TITLES,
                    "page": 1,
                    "per_page": 10,
                },
                headers=headers,
                timeout=15.0,
            )
            if resp.status_code != 200:
                logger.debug("Apollo people search returned %s for %s", resp.status_code, domain)
                return None, None

            people = resp.json().get("people", [])

            # Sort by title priority — founders/owners first
            def _title_priority(person: dict) -> int:
                title = (person.get("title") or "").lower()
                for i, dt in enumerate(DECISION_MAKER_TITLES):
                    if dt in title:
                        return i
                return 999

            people.sort(key=_title_priority)

            for person in people:
                email = person.get("email")
                if email and _is_decision_maker_email(email):
                    name = f"{person.get('first_name', '')} {person.get('last_name', '')}".strip()
                    title = person.get("title", "")
                    logger.info(
                        "Apollo found decision-maker for %s: %s (%s) — %s",
                        domain, name, title, email,
                    )
                    return email, name or None

        except Exception as exc:
            logger.debug("Apollo people search failed for %s: %s", domain, exc)

    return None, None


# ── Method 2: Website Scraping — Personal Emails Only ─────────────────────────

async def _scrape_website_for_personal_email(store_url: str) -> str | None:
    """Scrape the store's website but ONLY return personal-looking emails.
    Generic emails (care@, support@, info@) are ignored.
    """
    async with httpx.AsyncClient() as client:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        }

        all_found_emails: list[str] = []

        # Prioritize about/team pages (more likely to have personal emails)
        base = store_url.rstrip("/")
        urls_to_try = [store_url] + [f"{base}{path}" for path in CONTACT_PATHS]

        for url in urls_to_try:
            try:
                resp = await client.get(url, headers=headers, timeout=10.0, follow_redirects=True)
                if resp.status_code == 200:
                    emails = _extract_emails_from_html(resp.text)
                    all_found_emails.extend(emails)
            except Exception:
                continue

        # For Shopify stores: try /pages/contact.json
        try:
            resp = await client.get(f"{base}/pages/contact.json", headers=headers, timeout=10.0)
            if resp.status_code == 200:
                emails = _extract_emails_from_html(resp.text)
                all_found_emails.extend(emails)
        except Exception:
            pass

        # Deduplicate
        seen: set[str] = set()
        unique: list[str] = []
        for e in all_found_emails:
            if e not in seen:
                seen.add(e)
                unique.append(e)

        # Only return personal emails
        return _pick_best_email(unique)


# ── Method 3: Apollo Org Enrichment — Last Resort ─────────────────────────────

async def _apollo_org_fallback(domain: str) -> str | None:
    """Try Apollo organization enrichment for any associated email."""
    settings = get_settings()
    api_key = settings.apollo_api_key
    if not api_key:
        return None

    async with httpx.AsyncClient() as client:
        headers = {"Content-Type": "application/json", "X-Api-Key": api_key}
        try:
            resp = await client.get(
                "https://api.apollo.io/v1/organizations/enrich",
                params={"domain": domain},
                headers=headers,
                timeout=15.0,
            )
            if resp.status_code != 200:
                return None

            org = resp.json().get("organization", {})
            # Check for primary phone/email on the org
            # Apollo sometimes has a "primary_email" or we can try the org's people
            return None  # Org enrichment rarely gives direct emails
        except Exception:
            return None


# ═══════════════════════════════════════════════════════════════════════════════
# Main enrichment pipeline
# ═══════════════════════════════════════════════════════════════════════════════

async def enrich_lead(lead_id: str, store_url: str, domain: str) -> tuple[str | None, str | None]:
    """Run the waterfall enrichment for a single lead.
    Returns (email, contact_name) or (None, None).
    """

    # Method 1: Apollo — find the actual founder/owner/marketing person
    email, name = await _apollo_find_decision_maker(domain)
    if email:
        logger.info("Enriched %s via Apollo decision-maker: %s (%s)", domain, email, name)
        return email, name

    # Method 2: Website scraping — but only personal emails
    email = await _scrape_website_for_personal_email(store_url)
    if email:
        logger.info("Enriched %s via website (personal email): %s", domain, email)
        return email, None

    logger.info("No decision-maker email found for %s (generic emails skipped)", domain)
    return None, None


async def run_enrichment(batch_size: int = 50) -> dict:
    """Enrich all leads with status 'discovered' (no email yet).
    Returns stats dict.
    """
    sb = get_supabase()
    result = sb.table("leads").select("id, store_url, domain").eq(
        "status", "discovered"
    ).limit(batch_size).execute()

    leads = result.data or []
    enriched = 0
    no_email = 0

    for lead in leads:
        email, name = await enrich_lead(lead["id"], lead["store_url"], lead["domain"])
        if email:
            update: dict = {"contact_email": email, "status": "enriched"}
            if name:
                update["contact_name"] = name
            sb.table("leads").update(update).eq("id", lead["id"]).execute()
            enriched += 1
        else:
            sb.table("leads").update({"status": "no_email"}).eq("id", lead["id"]).execute()
            no_email += 1

    stats = {"processed": len(leads), "enriched": enriched, "no_email": no_email}
    logger.info("Enrichment complete: %s", stats)
    return stats
