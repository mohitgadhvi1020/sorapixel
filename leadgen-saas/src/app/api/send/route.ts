import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/resend";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await req.json();
    const { to, subject, body: emailBody, draft_id, prospect_id, from_name, reply_to } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json({ error: "to, subject, and body are required" }, { status: 400 });
    }

    const result = await sendEmail({ to, subject, body: emailBody, from_name, reply_to });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Save to sent_emails if user is authenticated
    if (user) {
      await supabase.from("sent_emails").insert({
        user_id: user.id,
        draft_id: draft_id || null,
        prospect_id: prospect_id || null,
        to_email: to,
        subject,
        body: emailBody,
        resend_id: result.email_id || "",
        status: "sent",
      });

      // Update draft status if provided
      if (draft_id) {
        await supabase.from("drafts").update({ status: "sent" }).eq("id", draft_id);
      }

      // Update prospect status if provided
      if (prospect_id) {
        await supabase.from("prospects").update({ status: "contacted" }).eq("id", prospect_id);
      }
    }

    return NextResponse.json({ success: true, email_id: result.email_id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Send failed" },
      { status: 500 }
    );
  }
}
