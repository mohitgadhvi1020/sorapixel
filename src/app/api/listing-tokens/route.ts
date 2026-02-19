import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/auth";
import { getClientId } from "@/lib/track-usage";

const TOKENS_PER_IMAGE = 5;
const TOKENS_PER_REGEN = 3;

/**
 * GET /api/listing-tokens — get the current user's listing token balance
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ balance: Infinity, costPerImage: TOKENS_PER_IMAGE, costPerRegen: TOKENS_PER_REGEN });
  }

  const clientId = await getClientId();
  if (!clientId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("clients")
    .select("listing_tokens")
    .eq("id", clientId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    balance: data?.listing_tokens ?? 0,
    costPerImage: TOKENS_PER_IMAGE,
    costPerRegen: TOKENS_PER_REGEN,
  });
}
