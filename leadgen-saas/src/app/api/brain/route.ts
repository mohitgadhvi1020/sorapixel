import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("company_brains")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ brain: data || null });
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
    const { brain, website_url, raw_website_content, raw_file_content } = body;

    // Upsert — one brain per user
    const { data: existing } = await supabase
      .from("company_brains")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    const record = {
      user_id: user.id,
      website_url: website_url || "",
      company_name: brain.company_name || "",
      services: brain.services || [],
      industries_served: brain.industries_served || [],
      target_customers: brain.target_customers || "",
      usp: brain.usp || "",
      proof_points: brain.proof_points || [],
      tone: brain.tone || "",
      raw_website_content: (raw_website_content || "").slice(0, 50000),
      raw_file_content: (raw_file_content || "").slice(0, 50000),
      updated_at: new Date().toISOString(),
    };

    let data;
    let error;

    if (existing?.id) {
      ({ data, error } = await supabase
        .from("company_brains")
        .update(record)
        .eq("id", existing.id)
        .select()
        .single());
    } else {
      ({ data, error } = await supabase
        .from("company_brains")
        .insert(record)
        .select()
        .single());
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ brain: data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
