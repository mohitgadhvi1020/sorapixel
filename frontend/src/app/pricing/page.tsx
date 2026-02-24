"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { TOKEN_COSTS_TABLE } from "@/lib/token-pricing";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: { email?: string; contact?: string; name?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: { error: { description: string } }) => void) => void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface Plan {
  id: string;
  name: string;
  type: string;
  price_inr: number;
  price_usd: number;
  tokens: number;
  description: string;
  recommended?: boolean;
}

type Currency = "INR" | "USD";

const TOKEN_COSTS = TOKEN_COSTS_TABLE;

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

export default function PricingPage() {
  const { user } = useAuth();
  const { credits, refreshCredits } = useCredits();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>("INR");

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

  const handlePurchase = useCallback(
    async (plan: Plan) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }

      setPayingPlanId(plan.id);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const orderData = await api.post<{
          success: boolean;
          order_id: string;
          amount: number;
          currency: string;
          error?: string;
        }>("/payments/create-order", { plan_id: plan.id, currency });

        if (!orderData.success) {
          setErrorMessage(orderData.error || "Failed to create order");
          setPayingPlanId(null);
          return;
        }

        const options: RazorpayOptions = {
          key: RAZORPAY_KEY,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "SoraiPixel",
          description: `${plan.name} — ${plan.tokens} tokens`,
          order_id: orderData.order_id,
          handler: async (response: RazorpayResponse) => {
            try {
              const verifyResult = await api.post<{
                success: boolean;
                tokens_added: number;
                error?: string;
              }>("/payments/verify", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              if (verifyResult.success) {
                setSuccessMessage(
                  `Payment successful! ${verifyResult.tokens_added} tokens added to your account.`
                );
                refreshCredits();
              } else {
                setErrorMessage(verifyResult.error || "Payment verification failed");
              }
            } catch {
              setErrorMessage("Payment verification failed. Contact support if amount was deducted.");
            } finally {
              setPayingPlanId(null);
            }
          },
          prefill: {
            email: user.email || "",
            contact: user.phone || "",
            name: user.contact_name || user.company_name || "",
          },
          theme: { color: "#c4a67d" },
          modal: {
            ondismiss: () => {
              setPayingPlanId(null);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (response: { error: { description: string } }) => {
          setErrorMessage(response.error.description || "Payment failed");
          setPayingPlanId(null);
        });
        rzp.open();
      } catch {
        setErrorMessage("Something went wrong. Please try again.");
        setPayingPlanId(null);
      }
    },
    [user, refreshCredits, currency]
  );

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

          {/* Currency toggle */}
          <div className="flex items-center justify-center gap-1 mt-5 bg-[rgba(255,255,255,0.04)] rounded-full p-1 w-fit mx-auto border border-[rgba(255,255,255,0.06)]">
            <button
              onClick={() => setCurrency("INR")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                currency === "INR"
                  ? "bg-[rgba(196,166,125,0.15)] text-[#c4a67d] shadow-sm"
                  : "text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.6)]"
              }`}
            >
              &#8377; INR
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                currency === "USD"
                  ? "bg-[rgba(196,166,125,0.15)] text-[#c4a67d] shadow-sm"
                  : "text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.6)]"
              }`}
            >
              $ USD
            </button>
          </div>
          {currency === "USD" && (
            <p className="text-[10px] text-[rgba(255,255,255,0.3)] mt-2">
              International payments via PayPal
            </p>
          )}
        </div>

        {/* Success / Error messages */}
        {successMessage && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className="text-sm text-emerald-400 font-medium">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-emerald-400/60 hover:text-emerald-400"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        {errorMessage && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p className="text-sm text-red-400 font-medium">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="ml-auto text-red-400/60 hover:text-red-400"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

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
              Every new account gets free tokens to try the full jewelry photography experience.
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
                        <span className="text-3xl font-bold text-white">
                          {currency === "INR"
                            ? <><span className="text-xl">&#8377;</span>{plan.price_inr}</>
                            : <><span className="text-xl">$</span>{(plan.price_usd / 100).toFixed(2)}</>
                          }
                        </span>
                        <span className="text-sm text-[rgba(255,255,255,0.4)]">/month</span>
                        <p className="text-xs text-[#c4a67d] mt-0.5">{plan.tokens} tokens included</p>
                      </div>
                      <button
                        onClick={() => handlePurchase(plan)}
                        disabled={payingPlanId !== null}
                        className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          plan.recommended
                            ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white shadow-[0_4px_16px_rgba(196,166,125,0.3)] hover:shadow-[0_6px_24px_rgba(196,166,125,0.45)]"
                            : "bg-[rgba(255,255,255,0.06)] text-white border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)]"
                        }`}
                      >
                        {payingPlanId === plan.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing…
                          </span>
                        ) : (
                          currency === "INR"
                            ? `Buy Now — ₹${plan.price_inr}`
                            : `Buy Now — $${(plan.price_usd / 100).toFixed(2)}`
                        )}
                      </button>
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
                        {currency === "INR"
                          ? <><span className="text-sm">&#8377;</span>{plan.price_inr}</>
                          : <><span className="text-sm">$</span>{(plan.price_usd / 100).toFixed(2)}</>
                        }
                      </p>
                      <button
                        onClick={() => handlePurchase(plan)}
                        disabled={payingPlanId !== null}
                        className="block w-full mt-3 py-2 rounded-xl text-xs font-semibold text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {payingPlanId === plan.id ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing…
                          </span>
                        ) : (
                          "Buy Now"
                        )}
                      </button>
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
            {/* Header row */}
            <div className="flex items-center px-5 py-2.5 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
              <span className="flex-1 text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-wider">Feature</span>
              <span className="w-24 text-center text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-wider">Standard</span>
              <span className="w-24 text-center text-[10px] font-bold text-[#c4a67d] uppercase tracking-wider flex items-center justify-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Pro
              </span>
            </div>
            {TOKEN_COSTS.map((item, i) => (
              <div
                key={i}
                className={`flex items-center px-5 py-3 ${
                  i !== TOKEN_COSTS.length - 1 ? "border-b border-[rgba(255,255,255,0.04)]" : ""
                }`}
              >
                <span className="flex-1 text-sm text-[rgba(255,255,255,0.7)]">{item.feature}</span>
                <span className={`w-24 text-center text-xs font-semibold ${
                  item.standard.includes("FREE") ? "text-emerald-400" : "text-[rgba(255,255,255,0.4)]"
                }`}>
                  {item.standard}
                </span>
                <span className={`w-24 text-center text-xs font-semibold ${
                  item.pro.includes("FREE") ? "text-emerald-400" : "text-[#c4a67d]"
                }`}>
                  {item.pro}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[rgba(255,255,255,0.25)] text-center">
            Pro quality uses Nano Banana Pro for sharper textures and precise lighting — ideal for jewelry sales.
          </p>
        </div>

        {/* Secure payments badge */}
        <div className="text-center py-6">
          <div className="flex items-center justify-center gap-2 text-[rgba(255,255,255,0.3)] text-xs">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span>Secured by Razorpay — {currency === "INR" ? "UPI, Cards, Net Banking" : "PayPal"} accepted</span>
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  );
}
