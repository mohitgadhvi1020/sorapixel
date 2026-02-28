"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useAuth } from "@/providers/AppProvider";

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

const MODAL_SHOWN_KEY = "pricing_modal_shown";
const SHOW_DELAY_MS = 3500;

export default function PricingModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem(MODAL_SHOWN_KEY);
    if (alreadyShown) return;

    const timer = setTimeout(() => {
      setOpen(true);
      sessionStorage.setItem(MODAL_SHOWN_KEY, "true");
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 250);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  if (!open) return null;

  const subscriptions = plans.filter((p) => p.type === "subscription");
  const tokenPacks = plans.filter((p) => p.type === "token_pack");

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#111114] border border-white/[0.08] shadow-2xl shadow-black/50 transition-all duration-300 ${
          closing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/40 hover:text-white transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Gold glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#c4a67d]/[0.08] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[rgba(196,166,125,0.1)] border border-[rgba(196,166,125,0.2)] rounded-full text-[10px] font-bold text-[#c4a67d] tracking-[0.12em] uppercase mb-4">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              Special Offer
            </span>
            <h2 className="font-display font-extrabold text-white text-[1.5rem] sm:text-[2rem] tracking-tight leading-[1.1]">
              Upgrade Your <span className="bg-gradient-to-r from-[#c4a67d] via-[#e8d5b5] to-[#8b7355] bg-clip-text text-transparent">Photography</span>
            </h2>
            <p className="text-white/35 text-[13px] sm:text-[14px] mt-2 max-w-md mx-auto leading-relaxed">
              Professional jewelry photos at a fraction of studio costs. Choose the plan that fits your business.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-[rgba(196,166,125,0.2)] border-t-[#c4a67d] rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Subscription plans */}
              {subscriptions.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {subscriptions.map((plan) => (
                    <div
                      key={plan.id}
                      className={`relative rounded-2xl p-5 transition-all ${
                        plan.recommended
                          ? "bg-gradient-to-b from-[rgba(196,166,125,0.12)] to-[rgba(196,166,125,0.04)] border-2 border-[#c4a67d]/40 shadow-[0_0_40px_rgba(196,166,125,0.08)]"
                          : "bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12]"
                      }`}
                    >
                      {plan.recommended && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-[9px] font-bold uppercase tracking-[0.1em] rounded-full">
                          Best Value
                        </span>
                      )}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-[14px] font-bold text-white">{plan.name}</h3>
                          <p className="text-[11px] text-white/35 mt-0.5">{plan.description}</p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <span className="text-[1.75rem] font-extrabold text-white leading-none">
                          <span className="text-[1rem]">₹</span>{plan.price_inr}
                        </span>
                        <span className="text-[12px] text-white/30 ml-1">/mo</span>
                      </div>
                      <p className="text-[11px] text-[#c4a67d]/70 mb-4">{plan.tokens} tokens included</p>
                      <Link
                        href="/pricing"
                        prefetch={false}
                        onClick={handleClose}
                        className={`block w-full text-center py-2.5 rounded-xl text-[12px] font-bold transition-all active:scale-[0.97] ${
                          plan.recommended
                            ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white hover:shadow-[0_4px_20px_rgba(196,166,125,0.3)]"
                            : "bg-white/[0.06] text-white/70 border border-white/[0.08] hover:bg-white/[0.1] hover:text-white"
                        }`}
                      >
                        Get {plan.name}
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              {/* Token packs */}
              {tokenPacks.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.1em] mb-2.5">Or buy tokens one-time</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {tokenPacks.map((pack) => (
                      <Link
                        key={pack.id}
                        href="/pricing"
                        prefetch={false}
                        onClick={handleClose}
                        className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center hover:border-white/[0.15] transition-all group"
                      >
                        <p className="text-[1.1rem] font-extrabold text-white leading-none">{pack.tokens}</p>
                        <p className="text-[9px] text-white/30 uppercase tracking-wider mt-0.5">tokens</p>
                        <p className="text-[13px] font-bold text-white/60 mt-2 group-hover:text-white transition-colors">
                          <span className="text-[10px]">₹</span>{pack.price_inr}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state fallback */}
              {subscriptions.length === 0 && tokenPacks.length === 0 && (
                <div className="text-center py-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.06] text-center">
                      <div className="text-[11px] font-bold text-white/40 uppercase tracking-wide mb-2">Free</div>
                      <div className="font-display font-extrabold text-[1.75rem] text-white leading-none">₹0</div>
                      <div className="text-[11px] text-white/30 mt-1">8 daily tokens</div>
                    </div>
                    <div className="bg-gradient-to-b from-[rgba(196,166,125,0.1)] to-transparent rounded-xl p-5 border-2 border-[#c4a67d]/40 text-center relative">
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-[8px] font-bold uppercase tracking-wider rounded-full">Popular</span>
                      <div className="text-[11px] font-bold text-[#c4a67d] uppercase tracking-wide mb-2">Growth</div>
                      <div className="font-display font-extrabold text-[1.75rem] text-white leading-none">₹549</div>
                      <div className="text-[11px] text-[#c4a67d]/50 mt-1">400 tokens/mo</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-xl p-5 border border-white/[0.06] text-center">
                      <div className="text-[11px] font-bold text-white/40 uppercase tracking-wide mb-2">Business</div>
                      <div className="font-display font-extrabold text-[1.75rem] text-white leading-none">₹1499</div>
                      <div className="text-[11px] text-white/30 mt-1">1200 tokens/mo</div>
                    </div>
                  </div>
                  <Link
                    href="/pricing"
                    prefetch={false}
                    onClick={handleClose}
                    className="inline-flex px-6 py-2.5 rounded-xl text-[13px] font-bold text-white bg-gradient-to-r from-[#8b7355] to-[#c4a67d] hover:shadow-[0_4px_20px_rgba(196,166,125,0.3)] transition-all active:scale-[0.97]"
                  >
                    View All Plans
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-[11px] text-white/20">
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                Secure via Razorpay
              </span>
              <span>Cancel anytime</span>
            </div>
            <button
              onClick={handleClose}
              className="text-[12px] text-white/30 hover:text-white/60 transition-colors"
            >
              {user ? "Maybe later" : "Continue with free tier"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
