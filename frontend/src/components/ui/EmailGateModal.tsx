"use client";

import { useState } from "react";

interface EmailGateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
}

export default function EmailGateModal({ open, onClose, onSubmit }: EmailGateModalProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(trimmed);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-3xl bg-[#111114] border border-white/[0.08] shadow-2xl shadow-black/50 p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/40 hover:text-white transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[150px] bg-[#c4a67d]/[0.08] rounded-full blur-[80px] pointer-events-none" />

        <div className="relative text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(196,166,125,0.1)] flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <h2 className="font-display font-bold text-white text-[1.25rem] tracking-tight">
            Download Your HD Image
          </h2>
          <p className="text-white/40 text-[13px] mt-2 leading-relaxed max-w-xs mx-auto">
            Enter your email to download the full-resolution, unwatermarked image. Plus get 3 free tokens to try more.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-[14px] placeholder-white/25 focus:outline-none focus:border-[#c4a67d]/50 focus:ring-1 focus:ring-[#c4a67d]/20 transition-all"
          />
          {error && (
            <p className="text-red-400 text-[12px]">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl text-[14px] font-bold text-white bg-gradient-to-r from-[#8b7355] to-[#c4a67d] hover:shadow-[0_4px_20px_rgba(196,166,125,0.3)] transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              "Download HD Image"
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-white/20">
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
            No spam, ever
          </span>
          <span>Unsubscribe anytime</span>
        </div>
      </div>
    </div>
  );
}
