from __future__ import annotations

"""Email enrichment — find decision-maker emails, not generic support addresses.

Strategy (waterfall — stops at first success):
  1. Apollo.io — search for owner/founder/CEO/marketing person
  2. Hunter.io — domain search + email finder
  3. Website scraping — ONLY accept personal-looking emails
  4. Email pattern guessing — try common patterns with the owner's name
  5. ZeroBounce verification — verify any found email before saving

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


# ── Validation helpers ────────────────────────────────────────────────────────

def _is_generic_email(email: str) -> bool:
    local_part = email.split("@")[0].lower().replace(".", "").replace("-", "").replace("_", "")
    return any(local_part == prefix.replace("-", "") or local_part.startswith(prefix.replace("-", ""))
               for prefix in GENERIC_PREFIXES)


def _is_valid_email(email: str) -> bool:
    email_lower = email.lower().strip()
    if not EMAIL_RE.fullmatch(email_lower):
        return False
    if "@" not in email_lower:
        return False
    local, domain = email_lower.rsplit("@", 1)
    for sd in SKIP_DOMAINS:
        if domain == sd or domain.endswith(f".{sd}"):
            return False
    tld = domain.rsplit(".", 1)[-1] if "." in domain else ""
    if not tld or len(tld) < 2:
        return False
    compound_tld = ".".join(domain.rsplit(".", 2)[-2:]) if domain.count(".") >= 2 else ""
    if tld not in VALID_TLDS and compound_tld not in VALID_TLDS:
        return False
    if local in ("user", "test", "admin", "email", "name", "your", "example"):
        return False
    if len(local) > 20 and all(c in "0123456789abcdef" for c in local.replace("-", "")):
        return False
    if len(domain) < 4:
        return False
    return True


def _is_decision_maker_email(email: str) -> bool:
    return _is_valid_email(email) and not _is_generic_email(email)


def _extract_emails_from_html(html: str) -> list[str]:
    import html as html_module
    decoded = html_module.unescape(html)
    decoded = decoded.replace("\\u003e", ">").replace("\\u003c", "<")
    mailto = re.findall(r'mailto:([^"\'?\s]+)', decoded)
    all_emails = EMAIL_RE.findall(decoded)
    seen: set[str] = set()
    result: list[str] = []
    for e in mailto + all_emails:
        e_clean = re.sub(r'^[^a-zA-Z0-9]+', '', e).lower().strip().rstrip(".")
        if e_clean not in seen and _is_valid_email(e_clean):
            seen.add(e_clean)
            result.append(e_clean)
    return result


def _pick_best_email(emails: list[str]) -> str | None:
    personal = [e for e in emails if _is_decision_maker_email(e)]
    if personal:
        return personal[0]
    return None


# ── Method 1: Apollo.io — Find Decision Makers ───────────────────────────────

async def _apollo_find_decision_maker(domain: str) -> tuple[str | None, str | None]:
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


# ── Method 2: Hunter.io — Domain Search + Email Finder ────────────────────────

async def _hunter_find_email(domain: str, contact_name: str | None = None) -> tuple[str | None, str | None]:
    """Use Hunter.io to find decision-maker emails.
    First tries domain search, then email finder if we have a name.
    """
    settings = get_settings()
    api_key = settings.hunter_api_key
    if not api_key:
        logger.debug("HUNTER_API_KEY not set — skipping Hunter enrichment")
        return None, None

    async with httpx.AsyncClient() as client:
        # Step 1: Domain search — find all emails at this domain
        try:
            resp = await client.get(
                "https://api.hunter.io/v2/domain-search",
                params={
                    "domain": domain,
                    "api_key": api_key,
                    "limit": 10,
                    "type": "personal",
                },
                timeout=15.0,
            )
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                emails_found = data.get("emails", [])

                for entry in emails_found:
                    email = entry.get("value", "")
                    confidence = entry.get("confidence", 0)
                    position = (entry.get("position") or "").lower()
                    e_type = entry.get("type", "")

                    if not email or confidence < 50:
                        continue
                    if e_type == "generic" or _is_generic_email(email):
                        continue

                    is_dm = any(t in position for t in DECISION_MAKER_TITLES) if position else True
                    if is_dm and _is_valid_email(email):
                        first = entry.get("first_name", "")
                        last = entry.get("last_name", "")
                        name = f"{first} {last}".strip() or None
                        logger.info("Hunter domain-search found for %s: %s (confidence: %d%%)", domain, email, confidence)
                        return email, name

        except Exception as exc:
            logger.debug("Hunter domain-search failed for %s: %s", domain, exc)

        # Step 2: Email finder — if we have a contact name, try to find their specific email
        if contact_name and " " in contact_name:
            parts = contact_name.strip().split()
            first_name = parts[0]
            last_name = parts[-1]
            try:
                resp = await client.get(
                    "https://api.hunter.io/v2/email-finder",
                    params={
                        "domain": domain,
                        "first_name": first_name,
                        "last_name": last_name,
                        "api_key": api_key,
                    },
                    timeout=15.0,
                )
                if resp.status_code == 200:
                    data = resp.json().get("data", {})
                    email = data.get("email", "")
                    confidence = data.get("confidence", 0)
                    if email and confidence >= 50 and _is_decision_maker_email(email):
                        logger.info("Hunter email-finder found for %s: %s (confidence: %d%%)", domain, email, confidence)
                        return email, contact_name

            except Exception as exc:
                logger.debug("Hunter email-finder failed for %s: %s", domain, exc)

    return None, None


# ── Method 3: Website Scraping — Personal Emails Only ─────────────────────────

async def _scrape_website_for_personal_email(store_url: str) -> tuple[str | None, str | None]:
    """Scrape the store's website. Returns (email, owner_name_if_found)."""
    async with httpx.AsyncClient() as client:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        }

        all_found_emails: list[str] = []
        owner_name: str | None = None

        base = store_url.rstrip("/")
        urls_to_try = [store_url] + [f"{base}{path}" for path in CONTACT_PATHS]

        for url in urls_to_try:
            try:
                resp = await client.get(url, headers=headers, timeout=10.0, follow_redirects=True)
                if resp.status_code == 200:
                    emails = _extract_emails_from_html(resp.text)
                    all_found_emails.extend(emails)
                    if not owner_name:
                        owner_name = _extract_owner_name(resp.text)
            except Exception:
                continue

        try:
            resp = await client.get(f"{base}/pages/contact.json", headers=headers, timeout=10.0)
            if resp.status_code == 200:
                emails = _extract_emails_from_html(resp.text)
                all_found_emails.extend(emails)
        except Exception:
            pass

        seen: set[str] = set()
        unique: list[str] = []
        for e in all_found_emails:
            if e not in seen:
                seen.add(e)
                unique.append(e)

        email = _pick_best_email(unique)
        return email, owner_name


def _extract_owner_name(html: str) -> str | None:
    """Try to extract the store owner/founder name from HTML content."""
    patterns = [
        r'(?:founded?\s+by|owner|creator|designer|made\s+by|crafted\s+by)\s*[:\-]?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)',
        r'<(?:h[1-6]|p|span)[^>]*>\s*(?:Meet\s+)?([A-Z][a-z]+\s+[A-Z][a-z]+)\s*,?\s*(?:Founder|Owner|Designer|Creator|CEO)',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            if 3 < len(name) < 40:
                return name
    return None


# ── Method 4: Email Pattern Guessing ──────────────────────────────────────────

EMAIL_PATTERNS = [
    "{first}@{domain}",
    "{first}.{last}@{domain}",
    "{first}{last}@{domain}",
    "{f}{last}@{domain}",
    "{first}.{l}@{domain}",
    "{first}_{last}@{domain}",
    "{last}@{domain}",
    "{f}.{last}@{domain}",
]


def _generate_email_guesses(first_name: str, last_name: str, domain: str) -> list[str]:
    """Generate common email pattern guesses for a person at a domain."""
    first = first_name.lower().strip()
    last = last_name.lower().strip()
    if not first or not last:
        return []

    f = first[0]
    l = last[0]

    guesses = []
    for pattern in EMAIL_PATTERNS:
        email = pattern.format(first=first, last=last, f=f, l=l, domain=domain)
        if _is_valid_email(email):
            guesses.append(email)
    return guesses


async def _guess_email_with_verification(
    domain: str,
    contact_name: str | None,
) -> str | None:
    """Generate email pattern guesses and verify them."""
    if not contact_name or " " not in contact_name:
        return None

    parts = contact_name.strip().split()
    first_name = parts[0]
    last_name = parts[-1]

    guesses = _generate_email_guesses(first_name, last_name, domain)
    if not guesses:
        return None

    for email in guesses:
        is_valid = await verify_email_zerobounce(email)
        if is_valid:
            logger.info("Pattern guess verified for %s: %s", domain, email)
            return email

    logger.debug("No pattern guesses verified for %s (%d tried)", domain, len(guesses))
    return None


# ── Email Verification — ZeroBounce ──────────────────────────────────────────

async def verify_email_zerobounce(email: str) -> bool:
    """Verify an email address using ZeroBounce API.
    Returns True if the email is valid/deliverable.
    """
    settings = get_settings()
    api_key = settings.zerobounce_api_key
    if not api_key:
        # No verification available — assume valid if it passes our regex
        return True

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                "https://api.zerobounce.net/v2/validate",
                params={
                    "api_key": api_key,
                    "email": email,
                },
                timeout=15.0,
            )
            if resp.status_code != 200:
                logger.debug("ZeroBounce returned %s for %s", resp.status_code, email)
                return True  # fail open

            data = resp.json()
            status = data.get("status", "").lower()
            sub_status = data.get("sub_status", "").lower()

            if status == "valid":
                logger.debug("ZeroBounce: %s is valid", email)
                return True
            elif status == "catch-all":
                logger.debug("ZeroBounce: %s is catch-all (accepting)", email)
                return True
            elif status in ("invalid", "spamtrap", "abuse", "do_not_mail"):
                logger.info("ZeroBounce: %s is %s/%s — rejecting", email, status, sub_status)
                return False
            else:
                logger.debug("ZeroBounce: %s status=%s — accepting", email, status)
                return True

        except Exception as exc:
            logger.debug("ZeroBounce verification failed for %s: %s", email, exc)
            return True  # fail open


async def verify_email_batch(emails: list[str]) -> dict[str, bool]:
    """Verify multiple emails. Returns {email: is_valid}."""
    results = {}
    for email in emails:
        results[email] = await verify_email_zerobounce(email)
    return results


# ═══════════════════════════════════════════════════════════════════════════════
# Main enrichment pipeline
# ═══════════════════════════════════════════════════════════════════════════════

async def enrich_lead(lead_id: str, store_url: str, domain: str, existing_name: str | None = None) -> tuple[str | None, str | None]:
    """Run the waterfall enrichment for a single lead.
    Returns (email, contact_name) or (None, None).
    """
    contact_name = existing_name

    # Method 1: Apollo — find the actual founder/owner/marketing person
    email, name = await _apollo_find_decision_maker(domain)
    if email:
        verified = await verify_email_zerobounce(email)
        if verified:
            logger.info("Enriched %s via Apollo decision-maker: %s (%s)", domain, email, name)
            return email, name or contact_name
        logger.info("Apollo email for %s failed verification: %s", domain, email)
    if name:
        contact_name = name

    # Method 2: Hunter.io — domain search + email finder
    email, name = await _hunter_find_email(domain, contact_name)
    if email:
        verified = await verify_email_zerobounce(email)
        if verified:
            logger.info("Enriched %s via Hunter.io: %s (%s)", domain, email, name)
            return email, name or contact_name
        logger.info("Hunter email for %s failed verification: %s", domain, email)
    if name and not contact_name:
        contact_name = name

    # Method 3: Website scraping — but only personal emails
    email, scraped_name = await _scrape_website_for_personal_email(store_url)
    if scraped_name and not contact_name:
        contact_name = scraped_name
    if email:
        verified = await verify_email_zerobounce(email)
        if verified:
            logger.info("Enriched %s via website (personal email): %s", domain, email)
            return email, contact_name
        logger.info("Scraped email for %s failed verification: %s", domain, email)

    # Method 4: Email pattern guessing (requires a name)
    if contact_name:
        email = await _guess_email_with_verification(domain, contact_name)
        if email:
            logger.info("Enriched %s via pattern guess: %s", domain, email)
            return email, contact_name

    logger.info("No decision-maker email found for %s (generic emails skipped)", domain)
    return None, contact_name


async def run_enrichment(batch_size: int = 50) -> dict:
    """Enrich all leads with status 'discovered' (no email yet)."""
    sb = get_supabase()
    result = sb.table("leads").select("id, store_url, domain, contact_name").eq(
        "status", "discovered"
    ).limit(batch_size).execute()

    leads = result.data or []
    enriched = 0
    no_email = 0

    for lead in leads:
        email, name = await enrich_lead(
            lead["id"], lead["store_url"], lead["domain"],
            existing_name=lead.get("contact_name"),
        )
        if email:
            update: dict = {"contact_email": email, "status": "enriched"}
            if name:
                update["contact_name"] = name
            sb.table("leads").update(update).eq("id", lead["id"]).execute()
            enriched += 1
        else:
            update_data: dict = {"status": "no_email"}
            if name:
                update_data["contact_name"] = name
            sb.table("leads").update(update_data).eq("id", lead["id"]).execute()
            no_email += 1

    stats = {"processed": len(leads), "enriched": enriched, "no_email": no_email}
    logger.info("Enrichment complete: %s", stats)
    return stats
