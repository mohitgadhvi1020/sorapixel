import { NextRequest, NextResponse } from "next/server";
import { getClientId } from "@/lib/track-usage";
import { getJewelryCredits, deductJewelryTokens, JEWELRY_PRICING } from "@/lib/jewelry-credits";

/**
 * POST /api/deduct-tokens — pre-deduct tokens for batch operations
 * Used by the client before making multiple API calls (e.g., recolor all 3 images).
 */
export async function POST(req: NextRequest) {
  const clientId = await getClientId();
  if (!clientId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { operation } = await req.json();

  let cost = 0;
  if (operation === "recolorAll") {
    cost = JEWELRY_PRICING.recolorAll;
  } else {
    return NextResponse.json({ error: "Unknown operation" }, { status: 400 });
  }

  const credits = await getJewelryCredits(clientId);
  if (!credits || credits.tokenBalance < cost) {
    return NextResponse.json(
      { error: `Insufficient tokens. This costs ${cost} tokens but you have ${credits?.tokenBalance ?? 0}.`, code: "CREDITS_EXHAUSTED" },
      { status: 403 }
    );
  }

  const deducted = await deductJewelryTokens(clientId, cost);
  if (!deducted) {
    return NextResponse.json({ error: "Failed to deduct tokens" }, { status: 500 });
  }

  return NextResponse.json({ success: true, remaining: credits.tokenBalance - cost, tokensUsed: cost });
}
