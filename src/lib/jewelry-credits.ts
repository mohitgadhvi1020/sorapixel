import { getSupabaseServer } from "./supabase";
import { isSupabaseConfigured } from "./auth";

export const JEWELRY_PRICING = {
  packGeneration: 40,
  recolorAll: 20,
  recolorSingle: 7,
  listing: 5,
  hdUpscale: 10,
} as const;

export interface JewelryCredits {
  tokenBalance: number;
  canGeneratePack: boolean;
  canRecolorAll: boolean;
  canRecolorSingle: boolean;
  canGenerateListing: boolean;
  canHdUpscale: boolean;
}

export async function getJewelryCredits(clientId: string): Promise<JewelryCredits | null> {
  if (!isSupabaseConfigured()) return null;

  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("clients")
    .select("token_balance")
    .eq("id", clientId)
    .single();

  if (error || !data) {
    console.error("Failed to fetch jewelry credits:", error?.message);
    return null;
  }

  const balance = data.token_balance ?? 0;

  return {
    tokenBalance: balance,
    canGeneratePack: balance >= JEWELRY_PRICING.packGeneration,
    canRecolorAll: balance >= JEWELRY_PRICING.recolorAll,
    canRecolorSingle: balance >= JEWELRY_PRICING.recolorSingle,
    canGenerateListing: balance >= JEWELRY_PRICING.listing,
    canHdUpscale: balance >= JEWELRY_PRICING.hdUpscale,
  };
}

export async function deductJewelryTokens(
  clientId: string,
  cost: number
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const sb = getSupabaseServer();
  const { data, error: fetchErr } = await sb
    .from("clients")
    .select("token_balance")
    .eq("id", clientId)
    .single();

  if (fetchErr || !data) return false;

  const current = data.token_balance ?? 0;
  if (current < cost) return false;

  const { error } = await sb
    .from("clients")
    .update({ token_balance: current - cost })
    .eq("id", clientId);

  if (error) {
    console.error("Failed to deduct jewelry tokens:", error.message);
    return false;
  }

  return true;
}
