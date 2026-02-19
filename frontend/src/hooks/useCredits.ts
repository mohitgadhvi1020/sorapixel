"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";

interface CreditBalance {
  token_balance: number;
  studio_free_used: number;
  free_limit: number;
  tokens_per_image: number;
  is_free_tier: boolean;
  daily_reward_available: boolean;
}

export function useCredits() {
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    try {
      const data = await api.get<CreditBalance>("/credits/balance");
      setCredits(data);
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
