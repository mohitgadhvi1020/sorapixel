import { NextResponse } from "next/server";
import { getClientId } from "@/lib/track-usage";
import { getJewelryCredits, JEWELRY_PRICING } from "@/lib/jewelry-credits";

export async function GET() {
  const clientId = await getClientId();
  if (!clientId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const credits = await getJewelryCredits(clientId);
  if (!credits) {
    return NextResponse.json({ error: "Could not fetch credits" }, { status: 500 });
  }

  return NextResponse.json({ ...credits, pricing: JEWELRY_PRICING });
}
