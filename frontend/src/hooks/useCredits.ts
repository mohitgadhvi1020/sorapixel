"use client";

import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { api } from "@/lib/api-client";
import { cacheGet, cacheSet } from "@/lib/cache";

// Use useLayoutEffect on client (runs before paint), useEffect on server
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface CreditBalance {
  token_balance: number;
  studio_free_used: number;
  free_limit: number;
  tokens_per_image: number;
  is_free_tier: boolean;
  daily_reward_available: boolean;
}

const CACHE_KEY = "credits_balance";

export function useCredits() {
  // Start null to match server render (no hydration mismatch)
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);

  // Read from cache before paint — user never sees the null state
  useIsomorphicLayoutEffect(() => {
    const cached = cacheGet<CreditBalance>(CACHE_KEY);
    if (cached) {
      setCredits(cached);
      setLoading(false);
    }
  }, []);

  const fetchCredits = useCallback(async () => {
    try {
      const data = await api.get<CreditBalance>("/credits/balance");
      setCredits(data);
      cacheSet(CACHE_KEY, data);
    } catch {
      setCredits(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const claimDailyReward = async () => {
    const result = await api.post<{
      success: boolean;
      tokens_added: number;
      new_balance: number;
      message: string;
    }>("/credits/claim-daily");
    if (result.success) {
      await fetchCredits();
    }
    return result;
  };

  return {
    credits,
    loading,
    refreshCredits: fetchCredits,
    claimDailyReward,
  };
}
