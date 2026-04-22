import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [brainRes, prospectsRes, draftsRes, sentRes] = await Promise.all([
      supabase.from("company_brains").select("company_name").eq("user_id", user.id).limit(1).single(),
      supabase.from("prospects").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("drafts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("sent_emails").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    return NextResponse.json({
      has_brain: !!brainRes.data,
      brain_name: brainRes.data?.company_name || null,
      prospects_count: prospectsRes.count || 0,
      drafts_count: draftsRes.count || 0,
      emails_sent: sentRes.count || 0,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
