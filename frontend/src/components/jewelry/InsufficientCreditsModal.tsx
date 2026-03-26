"use client";

import { useRouter } from "next/navigation";
import TokenIcon from "@/components/ui/TokenIcon";

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredCredits: number;
  currentBalance: number;
}

export default function InsufficientCreditsModal({
  isOpen,
  onClose,
  requiredCredits,
  currentBalance,
}: InsufficientCreditsModalProps) {
  const router = useRouter();
  const deficit = requiredCredits - currentBalance;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1b20] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white">Insufficient Credits</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5">
          <p className="text-sm text-[rgba(255,255,255,0.5)] mb-4">
            You don&apos;t have enough credits to generate this image.
          </p>

          {/* Credit breakdown */}
          <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-4 space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[rgba(255,255,255,0.6)]">Required Credits</span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <TokenIcon size={13} />
                {requiredCredits}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[rgba(255,255,255,0.6)]">Your Balance</span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <TokenIcon size={13} />
                {currentBalance}
              </span>
            </div>
            <div className="h-px bg-[rgba(255,255,255,0.06)]" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-red-400 border border-red-400/20 rounded-lg px-2.5 py-1 bg-red-400/5">
                Additional Credits Needed
              </span>
              <span className="text-sm font-bold text-red-400">{deficit}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm text-[rgba(255,255,255,0.5)] hover:text-white border border-[rgba(255,255,255,0.08)] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => router.push("/pricing")}
              className="flex-1 py-2.5 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-sm font-semibold rounded-xl shadow-[0_4px_16px_rgba(196,166,125,0.25)] hover:shadow-[0_6px_24px_rgba(196,166,125,0.4)] transition-all flex items-center justify-center gap-2"
            >
              Buy Credits
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
