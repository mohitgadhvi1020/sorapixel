"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";

interface Plan {
  id: string;
  name: string;
  type: string;
  price_inr: number;
  tokens: number;
  description: string;
  recommended?: boolean;
}

const TOKEN_COSTS = [
  { feature: "Studio Shot", cost: "1 token" },
  { feature: "Jewelry Hero Preview", cost: "FREE (1x)" },
  { feature: "Jewelry 3-Angle Pack", cost: "40 tokens" },
  { feature: "Regenerate Single Shot", cost: "5 tokens" },
  { feature: "Recolor Metal", cost: "7 tokens" },
  { feature: "HD Upscale", cost: "10 tokens" },
  { feature: "Product Listing (AI)", cost: "5 tokens" },
  { feature: "UGC Model Photo", cost: "1 token/pose" },
];

const ADMIN_WHATSAPP = "https://wa.me/919999999999?text=Hi%2C%20I%20want%20to%20purchase%20a%20SoraPixel%20plan";

export default function PricingPage() {
  const { user } = useAuth();
  const { credits } = useCredits();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

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

  const subscriptions = plans.filter((p) => p.type === "subscription");
  const tokenPacks = plans.filter((p) => p.type === "token_pack");

  return (
    <ResponsiveLayout title="Pricing">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center">
          <span className="text-[10px] font-bold text-[#c4a67d] tracking-[0.15em] uppercase bg-[rgba(196,166,125,0.1)] px-3 py-1 rounded-full">
            Pricing
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight mt-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-[rgba(255,255,255,0.5)] text-sm md:text-base mt-3 max-w-lg mx-auto">
            Start free. Upgrade when you need more.
          </p>
        </div>

        {/* Current balance */}
        {user && (
          <div className="flex items-center justify-between p-5 rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]">
            <div>
              <p className="text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider font-semibold">Your Balance</p>
              <p className="text-2xl font-bold text-white mt-0.5">
                {credits?.token_balance || 0} <span className="text-sm font-normal text-[rgba(255,255,255,0.4)]">tokens</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[rgba(196,166,125,0.1)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10h8" />
              </svg>
            </div>
          </div>
        )}

        {/* Free tier callout */}
        <div className="relative overflow-hidden rounded-2xl border border-[rgba(196,166,125,0.2)] bg-gradient-to-br from-[rgba(196,166,125,0.08)] to-[rgba(196,166,125,0.02)] p-6">
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-white">Free to Start</h3>
              <span className="text-[10px] font-bold text-[#c4a67d] bg-[rgba(196,166,125,0.15)] px-2 py-0.5 rounded-full uppercase tracking-wider">No card needed</span>
            </div>
            <p className="text-sm text-[rgba(255,255,255,0.5)] mb-4">
              Every new account gets free credits to try the full jewelry photography experience.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[rgba(0,0,0,0.2)] rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-white">1</p>
                <p className="text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider mt-0.5">Hero Preview</p>
              </div>
              <div className="bg-[rgba(0,0,0,0.2)] rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-white">1</p>
                <p className="text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider mt-0.5">3-Angle Pack</p>
              </div>
              <div className="bg-[rgba(0,0,0,0.2)] rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-white">5</p>
                <p className="text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider mt-0.5">Daily Tokens</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[rgba(196,166,125,0.2)] border-t-[#c4a67d] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Subscription plans */}
            {subscriptions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider">Monthly Plans</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subscriptions.map((plan) => (
                    <div
                      key={plan.id}
                      className={`relative rounded-2xl p-5 transition-all duration-200 ${
                        plan.recommended
                          ? "bg-[rgba(196,166,125,0.08)] border-2 border-[#c4a67d] shadow-[0_0_30px_rgba(196,166,125,0.12)]"
                          : "bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-semibold text-white">{plan.name}</h4>
                            {plan.recommended && (
                              <span className="text-[9px] font-bold text-white bg-gradient-to-r from-[#8b7355] to-[#c4a67d] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Best Value
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[rgba(255,255,255,0.45)] mt-1">{plan.description}</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-white">&#8377;{plan.price_inr}</span>
                        <span className="text-sm text-[rgba(255,255,255,0.4)]">/month</span>
                        <p className="text-xs text-[#c4a67d] mt-0.5">{plan.tokens} tokens included</p>
                      </div>
                      <a
                        href={ADMIN_WHATSAPP}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          plan.recommended
                            ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white shadow-[0_4px_16px_rgba(196,166,125,0.3)] hover:shadow-[0_6px_24px_rgba(196,166,125,0.45)]"
                            : "bg-[rgba(255,255,255,0.06)] text-white border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)]"
                        }`}
                      >
                        Contact Admin to Purchase
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Token Packs */}
            {tokenPacks.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider">Token Packs (One-Time)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {tokenPacks.map((plan) => (
                    <div
                      key={plan.id}
                      className="rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-4 text-center hover:border-[rgba(255,255,255,0.12)] transition-all"
                    >
                      <p className="text-2xl font-bold text-white">{plan.tokens}</p>
                      <p className="text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-wider">tokens</p>
                      <p className="text-lg font-bold text-white mt-2">
                        <span className="text-sm">&#8377;</span>{plan.price_inr}
                      </p>
                      <a
                        href={ADMIN_WHATSAPP}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full mt-3 py-2 rounded-xl text-xs font-semibold text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] hover:text-white transition-all"
                      >
                        Contact Admin
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Token cost breakdown */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider">What Costs What</h3>
          <div className="rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            {TOKEN_COSTS.map((item, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-5 py-3 ${
                  i !== TOKEN_COSTS.length - 1 ? "border-b border-[rgba(255,255,255,0.04)]" : ""
                }`}
              >
                <span className="text-sm text-[rgba(255,255,255,0.7)]">{item.feature}</span>
                <span className={`text-xs font-semibold ${
                  item.cost.includes("FREE") ? "text-emerald-400" : "text-[rgba(255,255,255,0.4)]"
                }`}>
                  {item.cost}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="text-center py-6">
          <p className="text-sm text-[rgba(255,255,255,0.4)] mb-3">
            Need a custom plan or have questions?
          </p>
          <a
            href={ADMIN_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[rgba(255,255,255,0.06)] text-white text-sm font-semibold border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Chat with us on WhatsApp
          </a>
        </div>
      </div>
    </ResponsiveLayout>
  );
}
