import { NextRequest, NextResponse } from "next/server";
import { getSessionClient, isSupabaseConfigured } from "@/lib/auth";
import { addTokens } from "@/lib/studio-credits";

/**
 * POST /api/admin/tokens — add tokens to a client's balance
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 });
  }

  const session = await getSessionClient();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { clientId, amount } = await req.json();

  if (!clientId || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json(
      { error: "clientId and a positive amount are required" },
      { status: 400 }
    );
  }

  const success = await addTokens(clientId, amount);

  if (!success) {
    return NextResponse.json(
      { error: "Failed to add tokens" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
