"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useCredits } from "@/providers/AppProvider";
import { useTheme } from "@/hooks/useTheme";
import { useGeoCountry } from "@/hooks/useGeoCountry";

function getNudgeMessages(isIndia: boolean) {
  const price = isIndia ? "₹149" : "$4.99";
  const perImage = isIndia ? "₹15" : "$0.50";
  return [
    { text: "Upgrade for unlimited jewelry photos", sub: `Plans start at just ${price} — only ${perImage}/image` },
    { text: "Running low on tokens?", sub: "Get more and never miss a perfect shot" },
    { text: "Pro quality = 3x more sales", sub: "Upgrade to unlock sharper AI renders" },
    { text: "Your competitors use pro photos", sub: "Level up your listings today" },
    { text: "Bulk shooting? Save with a plan", sub: "Unlimited generations, one flat price" },
  ];
}

const LOW_TOKEN_THRESHOLD = 20;
const DISMISS_KEY = "upgrade_banner_dismissed";

export default function UpgradeBanner() {
  const { user } = useAuth();
  const { credits, loading } = useCredits();
  const { theme } = useTheme();
  const { isIndia } = useGeoCountry();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(true);
  const [messageIdx, setMessageIdx] = useState(0);

  const isLight = theme === "light";
  const isPricingPage = pathname === "/pricing";
  const NUDGE_MESSAGES = getNudgeMessages(isIndia);

  useEffect(() => {
    const stored = sessionStorage.getItem(DISMISS_KEY);
    setDismissed(stored === "true");
  }, []);

  useEffect(() => {
    setMessageIdx(Math.floor(Math.random() * NUDGE_MESSAGES.length));
  }, [pathname, NUDGE_MESSAGES.length]);

  if (loading || !user || isPricingPage || dismissed) return null;

  const balance = credits?.token_balance ?? 0;
  const isLow = balance <= LOW_TOKEN_THRESHOLD;
  const isCritical = balance <= 5;

  const message = isLow
    ? {
        text: isCritical ? "You're almost out of tokens!" : "Token balance getting low",
        sub: `${balance} tokens left — top up to keep creating`,
      }
    : NUDGE_MESSAGES[messageIdx];

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, "true");
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-4 pb-4 md:pb-5">
      <div
        className={`pointer-events-auto max-w-2xl mx-auto rounded-2xl px-4 py-3 md:px-5 md:py-3.5 flex items-center gap-3 md:gap-4 shadow-2xl animate-slide-up transition-colors duration-300 ${
          isCritical
            ? "bg-gradient-to-r from-red-950/95 to-red-900/95 border border-red-500/30 backdrop-blur-xl"
            : isLow
              ? isLight
                ? "bg-gradient-to-r from-amber-50/95 to-orange-50/95 border border-amber-300/50 backdrop-blur-xl"
                : "bg-gradient-to-r from-amber-950/95 to-orange-950/95 border border-amber-500/30 backdrop-blur-xl"
              : isLight
                ? "bg-white/95 border border-[#e8e5df] backdrop-blur-xl"
                : "bg-[#1a1b22]/95 border border-[rgba(255,255,255,0.08)] backdrop-blur-xl"
        }`}
      >
        {/* Icon */}
        <div
          className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center flex-shrink-0 ${
            isCritical
              ? "bg-red-500/20"
              : isLow
                ? "bg-amber-500/15"
                : "bg-[rgba(196,166,125,0.12)]"
          }`}
        >
          {isCritical ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ) : isLow ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="2" strokeLinecap="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-[13px] font-semibold leading-tight truncate ${
              isCritical
                ? "text-red-200"
                : isLow
                  ? isLight ? "text-amber-900" : "text-amber-200"
                  : isLight ? "text-[#0a0a0a]" : "text-white"
            }`}
          >
            {message.text}
          </p>
          <p
            className={`text-[11px] leading-tight mt-0.5 truncate ${
              isCritical
                ? "text-red-300/60"
                : isLow
                  ? isLight ? "text-amber-700/60" : "text-amber-300/50"
                  : isLight ? "text-[#8c8c8c]" : "text-[rgba(255,255,255,0.4)]"
            }`}
          >
            {message.sub}
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/pricing"
          prefetch={false}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-[0.97] ${
            isCritical
              ? "bg-red-500 text-white hover:bg-red-400 shadow-lg shadow-red-500/25"
              : isLow
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/25"
                : "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white hover:shadow-lg hover:shadow-[rgba(196,166,125,0.3)]"
          }`}
        >
          {isLow ? "Top Up" : "Upgrade"}
        </Link>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
            isCritical
              ? "text-red-400/50 hover:text-red-300 hover:bg-red-500/10"
              : isLow
                ? isLight
                  ? "text-amber-600/40 hover:text-amber-700 hover:bg-amber-500/10"
                  : "text-amber-400/40 hover:text-amber-300 hover:bg-amber-500/10"
                : isLight
                  ? "text-[#0a0a0a]/30 hover:text-[#0a0a0a]/60 hover:bg-black/5"
                  : "text-white/30 hover:text-white/60 hover:bg-white/5"
          }`}
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
