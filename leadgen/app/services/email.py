from __future__ import annotations

"""Email outreach service — send personalized before/after emails via Resend."""

import logging
from datetime import datetime, timezone

import resend

from app.config import get_settings
from app.database import get_supabase

logger = logging.getLogger(__name__)


def _build_email_html(store_name: str, products: list[dict], lead_id: str, contact_name: str | None = None) -> str:
    """Build a beautiful HTML email with before/after product comparisons."""

    product_rows = ""
    for p in products:
        original = p.get("original_image_url", "")
        studio = p.get("generated_studio_url", "")
        model = p.get("generated_model_url", "")
        name = p.get("product_name", "Your Product")

        generated_img = studio or model
        if not generated_img or not original:
            continue

        product_rows += f"""
        <tr>
          <td style="padding: 12px 0;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #666; font-weight: 500;">{name}</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="48%" style="vertical-align: top;">
                  <p style="margin: 0 0 4px; font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 1px;">Before</p>
                  <img src="{original}" alt="Current photo" style="width: 100%; border-radius: 8px; border: 1px solid #e5e5e5;" />
                </td>
                <td width="4%" style="vertical-align: middle; text-align: center;">
                  <span style="font-size: 20px; color: #c4a67d;">&rarr;</span>
                </td>
                <td width="48%" style="vertical-align: top;">
                  <p style="margin: 0 0 4px; font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 1px;">After (AI)</p>
                  <img src="{generated_img}" alt="SoraPixel enhanced" style="width: 100%; border-radius: 8px; border: 1px solid #e5e5e5;" />
                </td>
              </tr>
            </table>
          </td>
        </tr>
        """

        # Show second generated image if both exist
        if studio and model:
            product_rows += f"""
            <tr>
              <td style="padding: 0 0 12px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="48%"></td>
                    <td width="4%"></td>
                    <td width="48%" style="vertical-align: top;">
                      <p style="margin: 0 0 4px; font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 1px;">Model Shot</p>
                      <img src="{model}" alt="Model wearing jewelry" style="width: 100%; border-radius: 8px; border: 1px solid #e5e5e5;" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            """

    settings = get_settings()
    cta_url = f"https://soraipixel.com/?ref=outreach&lead={lead_id}"
    unsubscribe_url = f"https://soraipixel.com/unsubscribe?lead={lead_id}"

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8f6f3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f6f3;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1a1612 0%, #2a241d 100%); padding: 32px 40px; text-align: center;">
                  <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #c4a67d; letter-spacing: 0.5px;">SoraPixel</h1>
                  <p style="margin: 6px 0 0; font-size: 13px; color: #8b7355;">AI-Powered Jewelry Photography</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 36px 40px;">
                  <h2 style="margin: 0 0 16px; font-size: 20px; color: #1a1612; font-weight: 600;">
                    What if {store_name}'s photos looked like this?
                  </h2>
                  <p style="margin: 0 0 24px; font-size: 15px; color: #555; line-height: 1.6;">
                    Hi{f' {contact_name.split()[0]}' if contact_name else ''}! We noticed your beautiful jewelry collection and couldn't resist showing you what AI-powered photography can do. Here's a quick preview using your actual products:
                  </p>

                  <!-- Product comparisons -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    {product_rows}
                  </table>

                  <p style="margin: 24px 0; font-size: 15px; color: #555; line-height: 1.6;">
                    These were generated in seconds using your existing product photos. No photoshoot needed. No photographer. Just upload and get studio-quality results instantly.
                  </p>

                  <!-- CTA -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" style="padding: 8px 0 24px;">
                        <a href="{cta_url}" style="display: inline-block; background: linear-gradient(135deg, #c4a67d 0%, #d4b88f 100%); color: #1a1612; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
                          Try SoraPixel Free &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0; font-size: 13px; color: #999; text-align: center;">
                    3 free generations included. No credit card required.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #faf9f7; padding: 24px 40px; border-top: 1px solid #f0ede8;">
                  <p style="margin: 0; font-size: 12px; color: #999; text-align: center; line-height: 1.6;">
                    SoraPixel &middot; AI Jewelry Photography<br />
                    <a href="{unsubscribe_url}" style="color: #999; text-decoration: underline;">Unsubscribe</a>
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """


# ═══════════════════════════════════════════════════════════════════════════════
# Send outreach
# ═══════════════════════════════════════════════════════════════════════════════

async def send_outreach_email(lead_id: str) -> bool:
    """Send outreach email for a single lead. Returns True if sent."""
    settings = get_settings()
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — skipping email send")
        return False

    resend.api_key = settings.resend_api_key
    sb = get_supabase()

    # Get lead info
    lead_result = sb.table("leads").select("*").eq("id", lead_id).single().execute()
    lead = lead_result.data
    if not lead or not lead.get("contact_email"):
        return False

    # Get generated products
    products_result = sb.table("lead_products").select("*").eq(
        "lead_id", lead_id
    ).eq("status", "generated").execute()
    products = products_result.data or []

    if not products:
        return False

    store_name = lead["store_name"]
    subject = f"What if {store_name}'s jewelry photos looked like this?"
    contact_name = lead.get("contact_name")
    html = _build_email_html(store_name, products, lead_id, contact_name)

    try:
        result = resend.Emails.send({
            "from": f"{settings.lead_from_name} <{settings.lead_from_email}>",
            "to": [lead["contact_email"]],
            "subject": subject,
            "html": html,
        })

        email_id = result.get("id") if isinstance(result, dict) else getattr(result, "id", None)

        sb.table("lead_emails").insert({
            "lead_id": lead_id,
            "resend_email_id": email_id,
            "subject": subject,
            "status": "sent",
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

        sb.table("leads").update({"status": "sent"}).eq("id", lead_id).execute()
        logger.info("Sent outreach email to %s (%s)", store_name, lead["contact_email"])
        return True

    except Exception as exc:
        logger.error("Failed to send email for lead %s: %s", lead_id, exc)
        sb.table("lead_emails").insert({
            "lead_id": lead_id,
            "subject": subject,
            "status": "bounced",
        }).execute()
        return False


async def run_email_outreach(batch_size: int = 50) -> dict:
    """Send outreach emails for all generated leads. Returns stats."""
    settings = get_settings()
    sb = get_supabase()

    # Check daily limit
    today_result = sb.table("lead_emails").select("id", count="exact").gte(
        "sent_at", datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00Z")
    ).execute()
    sent_today = today_result.count or 0

    remaining = max(0, settings.email_daily_limit - sent_today)
    if remaining == 0:
        logger.info("Daily email limit reached (%d). Skipping.", settings.email_daily_limit)
        return {"processed": 0, "sent": 0, "failed": 0, "daily_limit_reached": True}

    actual_batch = min(batch_size, remaining)

    result = sb.table("leads").select("id").eq("status", "generated").limit(actual_batch).execute()
    leads = result.data or []

    sent = 0
    failed = 0

    for lead in leads:
        success = await send_outreach_email(lead["id"])
        if success:
            sent += 1
        else:
            failed += 1

    stats = {"processed": len(leads), "sent": sent, "failed": failed, "sent_today_total": sent_today + sent}
    logger.info("Email outreach complete: %s", stats)
    return stats


# ═══════════════════════════════════════════════════════════════════════════════
# Webhook handler for Resend events
# ═══════════════════════════════════════════════════════════════════════════════

def handle_resend_webhook(event_type: str, data: dict) -> bool:
    """Process a Resend webhook event. Returns True if handled."""
    sb = get_supabase()
    email_id = data.get("email_id")
    if not email_id:
        return False

    result = sb.table("lead_emails").select("id, lead_id").eq(
        "resend_email_id", email_id
    ).limit(1).execute()

    if not result.data:
        return False

    record = result.data[0]
    now = datetime.now(timezone.utc).isoformat()

    status_map = {
        "email.delivered": ("delivered", {"delivered_at": now}),
        "email.opened": ("opened", {"opened_at": now}),
        "email.clicked": ("clicked", {"clicked_at": now}),
        "email.bounced": ("bounced", {"bounced_at": now}),
        "email.complained": ("complained", {}),
    }

    if event_type not in status_map:
        return False

    new_status, extra_fields = status_map[event_type]

    sb.table("lead_emails").update(
        {"status": new_status, **extra_fields}
    ).eq("id", record["id"]).execute()

    # Update lead status for meaningful events
    lead_status_map = {
        "email.delivered": "delivered",
        "email.opened": "opened",
        "email.clicked": "clicked",
        "email.bounced": "bounced",
    }
    if event_type in lead_status_map:
        sb.table("leads").update(
            {"status": lead_status_map[event_type]}
        ).eq("id", record["lead_id"]).execute()

    return True
