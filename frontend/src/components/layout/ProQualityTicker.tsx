"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/hooks/useTheme";

const QUALITY_MESSAGES = [
  "Pro quality renders 3x sharper details on gemstones & diamonds",
  "Upgrade to Pro — see every facet, texture & reflection in stunning clarity",
  "Standard is good. Pro is breathtaking. Your jewelry deserves Pro.",
  "Pro AI captures micro-details invisible in Standard mode",
  "Sell faster with Pro-quality photos — 2.7x higher click-through rate",
  "Pro renders show true metal shine, stone brilliance & shadow depth",
  "Your competitors use professional photos. Match them with Pro quality.",
  "Pro mode = studio-grade lighting, sharper stones, richer colors",
];

export default function ProQualityTicker() {
  const { theme } = useTheme();
  const pathname = usePathname();
  const [msgIndex, setMsgIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const isLight = theme === "light";
  const hiddenPaths = ["/pricing", "/login", "/register", "/"];
  const shouldHide = hiddenPaths.includes(pathname);

  useEffect(() => {
    setMsgIndex(Math.floor(Math.random() * QUALITY_MESSAGES.length));
  }, [pathname]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % QUALITY_MESSAGES.length);
        setIsVisible(true);
      }, 400);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  if (shouldHide) return null;

  return (
    <div
      className={`sticky top-0 z-[60] w-full overflow-hidden transition-colors duration-300 ${
        isLight
          ? "bg-gradient-to-r from-[#1a1610] via-[#2a2318] to-[#1a1610]"
          : "bg-gradient-to-r from-[#0c0a07] via-[#1a1610] to-[#0c0a07]"
      }`}
    >
      <Link
        href="/pricing"
        prefetch={false}
        className="flex items-center justify-center gap-2 px-4 py-1.5 group"
      >
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c4a67d] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#c4a67d]" />
          </span>
          <span className="text-[10px] sm:text-[11px] font-bold text-[#c4a67d] uppercase tracking-[0.1em]">
            Pro
          </span>
        </span>

        <span className="h-3 w-px bg-white/20 shrink-0" />

        <span
          className={`text-[10px] sm:text-[11px] text-white/80 group-hover:text-white transition-all duration-300 truncate ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          }`}
        >
          {QUALITY_MESSAGES[msgIndex]}
        </span>

        <svg
          className="w-3 h-3 text-[#c4a67d]/80 group-hover:text-[#c4a67d] group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
