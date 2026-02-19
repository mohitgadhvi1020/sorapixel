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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setVisible(false)}>
      <div className="bg-white rounded-3xl p-6 mx-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
        <div className="text-5xl mb-4">🎁</div>
        <h2 className="text-2xl font-bold mb-2">Daily Image Boost</h2>
        <p className="text-gray-500 mb-6">
          Claim <strong>2 Free</strong> images everyday
        </p>
        <button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-xl font-bold text-lg disabled:bg-gray-300"
        >
          {claiming ? "Claiming..." : "Claim 2 Images"}
        </button>
      </div>
    </div>
  );
}
