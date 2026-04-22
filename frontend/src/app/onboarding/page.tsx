"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/providers/AppProvider";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/gtag";

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (!loading && user?.category_id) {
      router.push("/jewelry");
    }
  }, [loading, user, router]);

  async function handleStart() {
    setSaving(true);
    trackEvent("onboarding_started");
    try {
      await api.put("/users/me", { category_id: "jewelry" });
      trackEvent("onboarding_completed", { category: "jewelry" });
      router.push("/jewelry");
    } catch (err) {
      trackEvent("exception", { description: err instanceof Error ? err.message : "onboarding save failed", where: "onboarding.handleStart" });
      router.push("/jewelry");
    }
  }

  return (
    <div className="min-h-screen bg-[#0E0F14] flex flex-col items-center justify-center px-5">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#c4a67d] to-[#d4b88f] flex items-center justify-center shadow-[0_0_40px_rgba(196,166,125,0.3)]">
            <span className="text-white text-xl font-bold tracking-tight">SP</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Welcome to SoraiPixel
          </h1>
        </div>

        {/* Value prop */}
        <div className="space-y-3">
          <p className="text-[rgba(255,255,255,0.6)] text-sm leading-relaxed">
            AI-powered product photography for jewelry brands.
            Upload your photo, get stunning catalogue-ready images in seconds.
          </p>
        </div>

        {/* Free tokens */}
        <div className="inline-flex items-center gap-3 px-5 py-3.5 rounded-xl bg-[rgba(196,166,125,0.06)] border border-[rgba(196,166,125,0.15)]">
          <div className="flex -space-x-1">
            <div className="w-8 h-8 rounded-lg bg-[rgba(196,166,125,0.15)] flex items-center justify-center text-[10px] font-bold text-[#c4a67d]">1x</div>
            <div className="w-8 h-8 rounded-lg bg-[rgba(196,166,125,0.1)] flex items-center justify-center text-[10px] font-bold text-[#c4a67d] ml-1">1x</div>
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-white">1 free hero preview + 1 full pack</p>
            <p className="text-[10px] text-[rgba(255,255,255,0.4)]">free — no card required</p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white font-semibold rounded-2xl shadow-[0_4px_20px_rgba(196,166,125,0.3)] hover:shadow-[0_6px_30px_rgba(196,166,125,0.45)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
        >
          {saving ? "Setting up..." : "Start Creating — It\u2019s Free"}
        </button>

        <p className="text-[10px] text-[rgba(255,255,255,0.25)]">
          No credit card required. Upgrade anytime.
        </p>
      </div>
    </div>
  );
}
