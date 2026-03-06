"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const EXIT_POPUP_KEY = "exit_intent_shown";

export default function ExitIntentPopup() {
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setShow(false);
      setClosing(false);
    }, 250);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(EXIT_POPUP_KEY)) return;

    let triggered = false;

    function onMouseLeave(e: MouseEvent) {
      if (triggered) return;
      if (e.clientY <= 0) {
        triggered = true;
        sessionStorage.setItem(EXIT_POPUP_KEY, "true");
        setShow(true);
      }
    }

    // Desktop: cursor leaves viewport at the top
    document.addEventListener("mouseleave", onMouseLeave);

    // Mobile: show after 45s of inactivity
    const mobileTimer = setTimeout(() => {
      if (triggered) return;
      if (window.innerWidth < 768) {
        triggered = true;
        sessionStorage.setItem(EXIT_POPUP_KEY, "true");
        setShow(true);
      }
    }, 45000);

    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
      clearTimeout(mobileTimer);
    };
  }, []);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, handleClose]);

  if (!show) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${closing ? "opacity-0" : "opacity-100"}`}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

      <div className={`relative w-full max-w-md rounded-3xl bg-[#111114] border border-white/[0.08] shadow-2xl shadow-black/50 p-6 sm:p-8 transition-all duration-300 ${closing ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}>
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/40 hover:text-white transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[150px] bg-[#c4a67d]/[0.08] rounded-full blur-[80px] pointer-events-none" />

        <div className="relative text-center">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(196,166,125,0.1)] flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 6.5L17.5 17.5M6.5 17.5L17.5 6.5" strokeOpacity="0.3" />
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M8 12h8M12 8v8" />
            </svg>
          </div>
          <h2 className="font-display font-bold text-white text-[1.25rem] sm:text-[1.5rem] tracking-tight mb-2">
            Wait — Try It on <span className="text-[#c4a67d]">YOUR</span> Jewelry
          </h2>
          <p className="text-white/40 text-[13px] sm:text-[14px] leading-relaxed max-w-sm mx-auto mb-6">
            Upload one jewelry photo and see the AI transformation in 30 seconds. Free — no credit card, no signup required.
          </p>

          <Link
            href="/jewelry"
            onClick={handleClose}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-[14px] font-bold rounded-full hover:shadow-[0_6px_24px_rgba(196,166,125,0.35)] transition-all active:scale-[0.97]"
          >
            Upload Your First Photo
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
          </Link>

          <div className="flex items-center justify-center gap-4 mt-5 text-[11px] text-white/20">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-[#c4a67d]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Free daily tokens
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-[#c4a67d]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              30 seconds
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-[#c4a67d]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              No credit card
            </span>
          </div>

          <button
            onClick={handleClose}
            className="mt-4 text-[12px] text-white/20 hover:text-white/40 transition-colors"
          >
            No thanks, I&apos;ll pass
          </button>
        </div>
      </div>
    </div>
  );
}
