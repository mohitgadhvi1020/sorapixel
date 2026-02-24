import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { LISTING_PRICING } from "@/lib/token-pricing";

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("clients")
    .select("token_balance")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    balance: data?.token_balance ?? 0,
    costPerImage: LISTING_PRICING.costPerImage,
    costPerRegen: LISTING_PRICING.costPerRegen,
  });
}
