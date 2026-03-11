"use client";

import { useState } from "react";
import { useCredits } from "@/providers/AppProvider";
import { useTheme } from "@/hooks/useTheme";
import { DAILY_REWARD_TOKENS, JEWELRY_PRICING } from "@/lib/token-pricing";

const freeImages = Math.floor(DAILY_REWARD_TOKENS / JEWELRY_PRICING.standard.imageGen);

export default function DailyRewardModal() {
  const { credits, claimDailyReward } = useCredits();
  const { theme } = useTheme();
  const [visible, setVisible] = useState(true);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const isLight = theme === "light";

  if (!visible || !credits?.daily_reward_available || claimed) return null;
  if ((credits?.token_balance ?? 0) > 0) return null;

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const result = await claimDailyReward();
      if (result.success) {
        setClaimed(true);
        setTimeout(() => setVisible(false), 2500);
      }
    } catch { /* silent */ }
    finally { setClaiming(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setVisible(false)}
    >
      <div
        className={`relative mx-6 max-w-sm w-full rounded-2xl p-7 text-center shadow-2xl animate-in zoom-in-95 duration-300 ${
          isLight
            ? "bg-white border border-[#e8e5df]"
            : "bg-[#1a1b22] border border-[rgba(255,255,255,0.08)]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => setVisible(false)}
          className={`absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
            isLight
              ? "text-[#999] hover:text-[#333] hover:bg-black/5"
              : "text-white/30 hover:text-white/60 hover:bg-white/5"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Gift icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#c4a67d] to-[#8b7355] flex items-center justify-center shadow-lg shadow-[#c4a67d]/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 12 20 22 4 22 4 12" />
              <rect x="2" y="7" width="20" height="5" />
              <line x1="12" y1="22" x2="12" y2="7" />
              <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
              <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
            </svg>
          </div>
        </div>

        <h2 className={`text-2xl font-extrabold font-display mb-1 ${
          isLight ? "text-[#0a0a0a]" : "text-white"
        }`}>
          Daily Free Tokens!
        </h2>

        <p className={`text-[14px] mb-6 ${isLight ? "text-[#6b6b6b]" : "text-white/50"}`}>
          Claim <strong className={isLight ? "text-[#0a0a0a]" : "text-white"}>{DAILY_REWARD_TOKENS} free tokens</strong> — enough for {freeImages} standard {freeImages === 1 ? "image" : "images"} today
        </p>

        <button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white py-3.5 rounded-xl font-bold text-[15px] shadow-[0_4px_20px_rgba(196,166,125,0.3)] hover:shadow-[0_6px_30px_rgba(196,166,125,0.45)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:hover:translate-y-0"
        >
          {claiming ? "Claiming..." : `Claim ${DAILY_REWARD_TOKENS} Free Tokens`}
        </button>

        <p className={`text-[11px] mt-3 ${isLight ? "text-[#aaa]" : "text-white/25"}`}>
          Resets every 24 hours · No credit card needed
        </p>
      </div>
    </div>
  );
}
