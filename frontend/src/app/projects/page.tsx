"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useRouter } from "next/navigation";
import type { Plan } from "@/lib/types";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function PricingPage() {
  const { user } = useAuth();
  const { credits } = useCredits();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const purchasing: string | null = null;

  useEffect(() => {
    async function loadPlans() {
      try {
        const data = await api.get<{ plans: Plan[] }>("/payments/plans");
        setPlans(data.plans);
      } catch {
        setPlans([]);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  const handlePurchase = async (_planId: string) => {
    router.push("/pricing");
  };

  const tokenPacks = plans.filter((p) => p.type === "token_pack");
  const subscriptions = plans.filter((p) => p.type !== "token_pack");

  return (
    <ResponsiveLayout title="Pricing">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
            Plans & Pricing
          </h2>
          <p className="text-[rgba(255,255,255,0.5)] text-sm md:text-base mt-3 max-w-lg mx-auto">
            Choose the plan that works best for your business.
          </p>
        </div>

        {/* Current balance */}
        <Card padding="md" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[rgba(255,255,255,0.4)] uppercase tracking-wider font-medium">Current Balance</p>
            <p className="text-2xl font-bold text-white mt-0.5">
              {credits?.token_balance || 0} <span className="text-base font-normal text-[rgba(255,255,255,0.5)]">tokens</span>
            </p>
            {credits?.is_free_tier && (
              <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">
                Free tier: {(credits?.free_limit || 9) - (credits?.studio_free_used || 0)} / {credits?.free_limit || 9} remaining
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-[rgba(196,166,125,0.1)] flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10h8" />
            </svg>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[rgba(196,166,125,0.2)] border-t-[#c4a67d] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* Subscriptions */}
            {subscriptions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Subscriptions</h3>
                {subscriptions.map((plan) => (
                  <Card key={plan.id} padding="md" variant="accent" className="relative overflow-hidden">
                    {/* Glowing border */}
                    <div className="absolute inset-0 rounded-[20px] border border-[#c4a67d] shadow-[0_0_20px_rgba(196,166,125,0.15)] pointer-events-none" />
                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-semibold text-white">{plan.name}</h4>
                          <span className="text-[10px] font-semibold text-white bg-gradient-to-r from-[#c4a67d] to-[#d4b88f] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Recommended
                          </span>
                        </div>
                        <p className="text-sm text-[rgba(255,255,255,0.5)] mt-1">{plan.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-bold text-white">
                          <span className="text-lg">&#8377;</span>{plan.price_inr}
                        </p>
                        <p className="text-xs text-[rgba(255,255,255,0.5)]">{plan.tokens} tokens</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handlePurchase(plan.id)}
                      loading={purchasing === plan.id}
                      fullWidth
                      className="mt-4 relative"
                    >
                      Get Started
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {/* Token Packs */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Token Packs</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {tokenPacks.map((plan) => (
                  <Card key={plan.id} padding="md" hover className="text-center">
                    <p className="text-2xl font-bold text-white">{plan.tokens}</p>
                    <p className="text-xs text-[rgba(255,255,255,0.4)] mt-0.5">tokens</p>
                    <p className="text-lg font-bold text-white mt-2">
                      <span className="text-sm">&#8377;</span>{plan.price_inr}
                    </p>
                    <Button
                      onClick={() => handlePurchase(plan.id)}
                      loading={purchasing === plan.id}
                      variant="secondary"
                      fullWidth
                      size="sm"
                      className="mt-3"
                    >
                      Buy
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
}
