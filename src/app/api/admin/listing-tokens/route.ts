import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { getSessionClient, isSupabaseConfigured } from "@/lib/auth";

/**
 * PATCH /api/admin/listing-tokens — add tokens to a client's balance
 * Body: { clientId: string, amount: number }
 * amount > 0 adds tokens, amount < 0 removes tokens (floor at 0)
 */
export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 });
  }

  const session = await getSessionClient();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { clientId, amount } = await req.json();

  if (!clientId || typeof amount !== "number" || amount === 0) {
    return NextResponse.json(
      { error: "clientId and a non-zero amount are required" },
      { status: 400 }
    );
  }

  const sb = getSupabaseServer();

  const { data: client, error: fetchErr } = await sb
    .from("clients")
    .select("listing_tokens")
    .eq("id", clientId)
    .single();

  if (fetchErr || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const newBalance = Math.max(0, (client.listing_tokens ?? 0) + amount);

  const { error: updateErr } = await sb
    .from("clients")
    .update({ listing_tokens: newBalance })
    .eq("id", clientId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, balance: newBalance });
}
