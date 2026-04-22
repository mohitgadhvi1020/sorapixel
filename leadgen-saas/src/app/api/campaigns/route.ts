import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get counts for each campaign
    const enriched = await Promise.all(
      (campaigns || []).map(async (c) => {
        const { count: prospectsCount } = await supabase
          .from("campaign_prospects")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", c.id);

        const { count: sentCount } = await supabase
          .from("campaign_prospects")
          .select("*", { count: "exact", head: true })
          .eq("campaign_id", c.id)
          .eq("email_status", "sent");

        return {
          ...c,
          prospects_count: prospectsCount || 0,
          emails_sent: sentCount || 0,
        };
      })
    );

    return NextResponse.json({ campaigns: enriched });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, description, prospect_ids } = body;

    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .insert({ user_id: user.id, name, description: description || "" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Add prospects to campaign
    if (prospect_ids?.length) {
      const links = prospect_ids.map((pid: string) => ({
        campaign_id: campaign.id,
        prospect_id: pid,
      }));
      await supabase.from("campaign_prospects").insert(links);
    }

    return NextResponse.json({ campaign });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { data, error } = await supabase
      .from("campaigns")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ campaign: data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
