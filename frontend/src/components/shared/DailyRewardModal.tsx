"use client";

import { useState } from "react";
import { useCredits } from "@/hooks/useCredits";

export default function DailyRewardModal() {
  const { credits, claimDailyReward } = useCredits();
  const [visible, setVisible] = useState(true);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  if (!visible || !credits?.daily_reward_available || claimed) return null;

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const result = await claimDailyReward();
      if (result.success) {
        setClaimed(true);
        setTimeout(() => setVisible(false), 2000);
      }
    } catch { /* silent */ }
    finally { setClaiming(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setVisible(false)}>
      <div className="glass-card p-6 mx-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-5xl mb-4">🎁</div>
        <h2 className="text-2xl font-bold text-white mb-2">Daily Image Boost</h2>
        <p className="text-[rgba(255,255,255,0.5)] mb-6">
          Claim <strong className="text-white">2 Free</strong> images everyday
        </p>
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full bg-gradient-to-r from-[#FF6A00] to-[#FF8A3D] text-white py-3 rounded-xl font-bold text-lg shadow-[0_4px_20px_rgba(255,106,0,0.3)] hover:shadow-[0_6px_30px_rgba(255,106,0,0.45)] transition-all duration-250 disabled:opacity-40"
        >
          {claiming ? "Claiming..." : "Claim 2 Images"}
        </button>
      </div>
    </div>
  );
}
