import { getSupabaseServer } from "./supabase";
import { isSupabaseConfigured } from "./auth";

const FREE_STUDIO_LIMIT = 9;
const TOKENS_PER_IMAGE = 1;

export interface StudioCredits {
  freeUsed: number;
  freeRemaining: number;
  tokenBalance: number;
  canGenerate: boolean;
  usingFree: boolean;
}

/**
 * Get a user's studio credit status.
 * Returns null if Supabase isn't configured.
 */
export async function getStudioCredits(clientId: string): Promise<StudioCredits | null> {
  if (!isSupabaseConfigured()) return null;

  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("clients")
    .select("studio_free_used, token_balance")
    .eq("id", clientId)
    .single();

  if (error || !data) {
    console.error("Failed to fetch studio credits:", error?.message);
    return null;
  }

  const freeUsed = data.studio_free_used ?? 0;
  const tokenBalance = data.token_balance ?? 0;
  const freeRemaining = Math.max(0, FREE_STUDIO_LIMIT - freeUsed);
  const usingFree = freeRemaining > 0;
  const canGenerate = usingFree || tokenBalance >= TOKENS_PER_IMAGE;

  return { freeUsed, freeRemaining, tokenBalance, canGenerate, usingFree };
}

/**
 * Deduct credits for a studio generation.
 * `imageCount` is the number of images generated (typically 3 for a pack).
 * Uses free quota first, then tokens.
 * Returns false if insufficient credits.
 */
export async function deductStudioCredits(
  clientId: string,
  imageCount: number
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const credits = await getStudioCredits(clientId);
  if (!credits) return true;

  const sb = getSupabaseServer();

  let remaining = imageCount;

  // Use free quota first
  const freeAvailable = credits.freeRemaining;
  const freeToUse = Math.min(remaining, freeAvailable);
  remaining -= freeToUse;

  // Check if we have enough tokens for the rest
  if (remaining > 0 && credits.tokenBalance < remaining * TOKENS_PER_IMAGE) {
    return false;
  }

  const updates: Record<string, unknown> = {};

  if (freeToUse > 0) {
    updates.studio_free_used = credits.freeUsed + freeToUse;
  }

  if (remaining > 0) {
    updates.token_balance = credits.tokenBalance - remaining * TOKENS_PER_IMAGE;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await sb
      .from("clients")
      .update(updates)
      .eq("id", clientId);

    if (error) {
      console.error("Failed to deduct studio credits:", error.message);
      return false;
    }
  }

  return true;
}

/**
 * Admin: add tokens to a client's balance.
 */
export async function addTokens(
  clientId: string,
  amount: number
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const sb = getSupabaseServer();

  // Get current balance
  const { data, error: fetchError } = await sb
    .from("clients")
    .select("token_balance")
    .eq("id", clientId)
    .single();

  if (fetchError || !data) {
    console.error("Failed to fetch balance:", fetchError?.message);
    return false;
  }

  const newBalance = (data.token_balance ?? 0) + amount;

  const { error } = await sb
    .from("clients")
    .update({ token_balance: newBalance })
    .eq("id", clientId);

  if (error) {
    console.error("Failed to add tokens:", error.message);
    return false;
  }

  return true;
}

export { FREE_STUDIO_LIMIT, TOKENS_PER_IMAGE };
