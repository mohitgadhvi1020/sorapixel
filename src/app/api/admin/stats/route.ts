import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { getSessionClient, isSupabaseConfigured } from "@/lib/auth";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 });
  }

  const session = await getSessionClient();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const sb = getSupabaseServer();

  // Per-client usage stats — fall back to manual queries (no RPC needed)
  let stats;
  {
    // Get all clients
    const { data: clients } = await sb
      .from("clients")
      .select("id, email, company_name, contact_name, is_active, listing_tokens, created_at")
      .order("created_at", { ascending: false });

    // Get generation counts per client
    const { data: genCounts } = await sb
      .from("generations")
      .select("client_id, id, input_tokens, output_tokens, total_tokens, generation_type");

    // Get download counts per client
    const { data: dlCounts } = await sb
      .from("downloads")
      .select("client_id, id");

    // Get image counts per client
    const { data: imgCounts } = await sb
      .from("images")
      .select("client_id, id");

    // Aggregate
    stats = (clients || []).map((c) => {
      const gens = (genCounts || []).filter((g) => g.client_id === c.id);
      const dls = (dlCounts || []).filter((d) => d.client_id === c.id);
      const imgs = (imgCounts || []).filter((i) => i.client_id === c.id);
      const totalTokens = gens.reduce((sum, g) => sum + (g.total_tokens || 0), 0);
      const totalInputTokens = gens.reduce((sum, g) => sum + (g.input_tokens || 0), 0);
      const totalOutputTokens = gens.reduce((sum, g) => sum + (g.output_tokens || 0), 0);

      // Image generation calls (hero, angle, closeup, recolor, bg_removal)
      const imageGenCount = gens.filter((g) =>
        ["hero", "angle", "closeup", "recolor", "bg_removal"].includes(g.generation_type)
      ).length;

      return {
        id: c.id,
        email: c.email,
        companyName: c.company_name,
        contactName: c.contact_name,
        isActive: c.is_active,
        listingTokens: c.listing_tokens ?? 0,
        createdAt: c.created_at,
        totalGenerations: gens.length,
        totalTokens,
        totalInputTokens,
        totalOutputTokens,
        totalImages: imgs.length,
        totalDownloads: dls.length,
        imageGenCount,
      };
    });
  }

  // Recent activity (last 50 generations)
  const { data: recentActivity } = await sb
    .from("generations")
    .select("id, client_id, generation_type, total_tokens, model_used, status, created_at, clients(email, company_name)")
    .order("created_at", { ascending: false })
    .limit(50);

  // Global totals
  const totalGenerations = stats?.reduce((s: number, c: { totalGenerations: number }) => s + c.totalGenerations, 0) || 0;
  const totalTokens = stats?.reduce((s: number, c: { totalTokens: number }) => s + c.totalTokens, 0) || 0;
  const totalInputTokens = stats?.reduce((s: number, c: { totalInputTokens: number }) => s + c.totalInputTokens, 0) || 0;
  const totalOutputTokens = stats?.reduce((s: number, c: { totalOutputTokens: number }) => s + c.totalOutputTokens, 0) || 0;
  const totalDownloads = stats?.reduce((s: number, c: { totalDownloads: number }) => s + c.totalDownloads, 0) || 0;
  const totalImages = stats?.reduce((s: number, c: { totalImages: number }) => s + c.totalImages, 0) || 0;
  const totalImageGens = stats?.reduce((s: number, c: { imageGenCount: number }) => s + c.imageGenCount, 0) || 0;

  // ── Cost calculation (Gemini 2.5 Flash pricing, converted to INR) ──
  // Text tokens: $0.15 / 1M input, $0.60 / 1M output (under 200k context)
  // Image generation: $0.0258 per image generated
  // USD to INR approximate rate
  const USD_TO_INR = 86.5;
  const inputTokenCostUSD = (totalInputTokens / 1_000_000) * 0.15;
  const outputTokenCostUSD = (totalOutputTokens / 1_000_000) * 0.60;
  const imageGenCostUSD = totalImageGens * 0.0258;
  const totalCostUSD = inputTokenCostUSD + outputTokenCostUSD + imageGenCostUSD;

  const inputTokenCost = inputTokenCostUSD * USD_TO_INR;
  const outputTokenCost = outputTokenCostUSD * USD_TO_INR;
  const imageGenCost = imageGenCostUSD * USD_TO_INR;
  const totalCost = totalCostUSD * USD_TO_INR;

  return NextResponse.json({
    clientStats: stats,
    recentActivity: recentActivity || [],
    totals: {
      totalGenerations,
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      totalDownloads,
      totalImages,
      totalClients: stats?.length || 0,
      totalImageGens,
      costBreakdown: {
        inputTokenCost: +inputTokenCost.toFixed(4),
        outputTokenCost: +outputTokenCost.toFixed(4),
        imageGenCost: +imageGenCost.toFixed(4),
        totalCost: +totalCost.toFixed(4),
      },
    },
  });
}
