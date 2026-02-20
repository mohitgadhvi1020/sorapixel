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
  const [purchasing, setPurchasing] = useState<string | null>(null);

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

  const handlePurchase = async (planId: string) => {
    setPurchasing(planId);
    try {
      const order = await api.post<{
        success: boolean;
        order_id: string;
        amount: number;
        key_id: string;
      }>("/payments/create-order", { plan_id: planId, plan_type: "token_pack" });

      if (!order.success) throw new Error("Failed to create order");

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: "INR",
        name: "SoraPixel",
        description: `Purchase: ${planId}`,
        order_id: order.order_id,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          await api.post("/payments/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          alert("Payment successful! Tokens added.");
          router.refresh();
        },
        prefill: { contact: user?.phone || "" },
        theme: { color: "#1E1E1E" },
      };

      const rzp = new (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay(options);
      rzp.open();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPurchasing(null);
    }
  };

  const tokenPacks = plans.filter((p) => p.type === "token_pack");
  const subscriptions = plans.filter((p) => p.type !== "token_pack");

  return (
    <ResponsiveLayout title="Pricing">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight">
            Plans & Pricing
          </h2>
          <p className="text-text-secondary text-sm md:text-base mt-2 max-w-lg mx-auto">
            Choose the plan that works best for your business.
          </p>
        </div>

        {/* Current balance */}
        <Card padding="md" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wider font-medium">Current Balance</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">
              {credits?.token_balance || 0} <span className="text-base font-normal text-text-secondary">tokens</span>
            </p>
            {credits?.is_free_tier && (
              <p className="text-xs text-text-secondary mt-1">
                Free tier: {(credits?.free_limit || 9) - (credits?.studio_free_used || 0)} / {credits?.free_limit || 9} remaining
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-accent-lighter flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10h8" />
            </svg>
          </div>
        </Card>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* Subscriptions */}
            {subscriptions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Subscriptions</h3>
                {subscriptions.map((plan) => (
                  <Card key={plan.id} padding="md" className="border-accent/20 bg-accent-lighter/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-semibold text-foreground">{plan.name}</h4>
                          <span className="text-[10px] font-semibold text-white bg-accent px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Recommended
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary mt-1">{plan.description}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-bold text-foreground">
                          <span className="text-lg">&#8377;</span>{plan.price_inr}
                        </p>
                        <p className="text-xs text-text-secondary">{plan.tokens} tokens</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handlePurchase(plan.id)}
                      loading={purchasing === plan.id}
                      fullWidth
                      className="mt-4"
                    >
                      Get Started
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {/* Token Packs */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Token Packs</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {tokenPacks.map((plan) => (
                  <Card key={plan.id} padding="md" hover className="text-center">
                    <p className="text-2xl font-bold text-foreground">{plan.tokens}</p>
                    <p className="text-xs text-text-secondary mt-0.5">tokens</p>
                    <p className="text-lg font-bold text-foreground mt-2">
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
