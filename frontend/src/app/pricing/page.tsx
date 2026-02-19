"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useRouter } from "next/navigation";
import type { Plan } from "@/lib/types";

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
        theme: { color: "#ec4899" },
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center">
        <button onClick={() => router.back()} className="text-gray-600 mr-4">←</button>
        <h1 className="text-xl font-bold">Plans & Pricing</h1>
      </div>

      {/* Current balance */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 mx-4 mt-4 rounded-2xl">
        <p className="text-sm opacity-80">Current Balance</p>
        <p className="text-3xl font-bold">{credits?.token_balance || 0} Tokens</p>
        {credits?.is_free_tier && (
          <p className="text-sm opacity-80 mt-1">
            Free: {(credits?.free_limit || 9) - (credits?.studio_free_used || 0)} / {credits?.free_limit || 9} remaining
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* Trial / Subscription */}
          {subscriptions.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-3">Subscriptions</h2>
              {subscriptions.map((plan) => (
                <div key={plan.id} className="bg-white rounded-xl p-4 mb-3 border-2 border-pink-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg">{plan.name}</h3>
                      <p className="text-gray-500 text-sm">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-pink-500">&#8377;{plan.price_inr}</p>
                      <p className="text-xs text-gray-400">{plan.tokens} tokens</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePurchase(plan.id)}
                    disabled={purchasing === plan.id}
                    className="w-full mt-3 bg-pink-500 text-white py-3 rounded-xl font-bold"
                  >
                    {purchasing === plan.id ? "Processing..." : "Get Started"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Token Packs */}
          <div>
            <h2 className="text-lg font-bold mb-3">Token Packs</h2>
            <div className="grid grid-cols-2 gap-3">
              {tokenPacks.map((plan) => (
                <div key={plan.id} className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-2xl font-bold">{plan.tokens}</p>
                  <p className="text-sm text-gray-500 mb-2">tokens</p>
                  <p className="text-lg font-bold text-pink-500">&#8377;{plan.price_inr}</p>
                  <button
                    onClick={() => handlePurchase(plan.id)}
                    disabled={purchasing === plan.id}
                    className="w-full mt-2 bg-gray-100 hover:bg-pink-50 text-pink-500 py-2 rounded-lg text-sm font-medium"
                  >
                    {purchasing === plan.id ? "..." : "Buy"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
