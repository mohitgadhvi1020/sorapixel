import { NextResponse } from "next/server";
import { getClientId } from "@/lib/track-usage";
import { getStudioCredits, FREE_STUDIO_LIMIT, TOKENS_PER_IMAGE } from "@/lib/studio-credits";

/**
 * GET /api/studio-credits — get current user's studio credit status
 */
export async function GET() {
  const clientId = await getClientId();
  if (!clientId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const credits = await getStudioCredits(clientId);
  if (!credits) {
    return NextResponse.json(
      { error: "Could not fetch credits" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ...credits,
    freeLimit: FREE_STUDIO_LIMIT,
    tokensPerImage: TOKENS_PER_IMAGE,
  });
}
