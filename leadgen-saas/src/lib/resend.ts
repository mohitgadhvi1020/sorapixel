/* ═══════════════════════════════════════════════════════════════════════
   Resend Email Service — Send personalized outreach emails
   ═══════════════════════════════════════════════════════════════════════ */

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
}

export interface SendEmailResult {
  success: boolean;
  email_id?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith("your-")) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const fromName = params.from_name || "ReachWise";
  const fromEmail = params.from_email || process.env.RESEND_FROM_EMAIL || "outreach@reachwise.ai";

  const htmlBody = buildEmailHtml(params.body, params.subject);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [params.to],
        subject: params.subject,
        html: htmlBody,
        text: params.body,
        reply_to: params.reply_to || fromEmail,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `Resend error ${res.status}: ${err}` };
    }

    const data = await res.json();
    return { success: true, email_id: data.id };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

function buildEmailHtml(body: string, subject: string): string {
  const bodyHtml = body
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6;color:#1a1a2e;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
<tr><td style="padding:40px 40px 32px;">
${bodyHtml}
</td></tr>
<tr><td style="padding:0 40px 40px;">
<p style="margin:0;font-size:12px;color:#999;">This email was sent via ReachWise. If you don't want to receive these emails, please reply with "unsubscribe".</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
