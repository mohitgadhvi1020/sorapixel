"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/hooks/useTheme";
import { useCredits } from "@/providers/AppProvider";

// 4-slot bottom nav: Create (hub) · Creations · Batch · Profile. Create sits
// center-left as the primary call-to-action, rendered with a prominent plus.
const TABS = [
  {
    href: "/create",
    label: "Create",
    primary: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
  {
    href: "/projects",
    label: "Creations",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
  },
  {
    href: "/batch-listing",
    label: "Batch",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Account",
    showBalance: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
] as const;

export default function BottomTabBar() {
  const pathname = usePathname();
  const { theme } = useTheme();
  const { credits } = useCredits();
  const isLight = theme === "light";

  const isOnExcludedPage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/blog");

  if (isOnExcludedPage) return null;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden transition-colors duration-300 ${
        isLight
          ? "bg-white border-t border-[rgba(0,0,0,0.06)] shadow-[0_-1px_12px_rgba(0,0,0,0.04)]"
          : "bg-[#13141A] border-t border-[rgba(255,255,255,0.06)] shadow-[0_-1px_12px_rgba(0,0,0,0.3)]"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch justify-around h-[60px] max-w-md mx-auto">
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const isPrimary = "primary" in tab && tab.primary;
          const showBalance = "showBalance" in tab && tab.showBalance && credits;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={tab.href === "/create"}
              className={`relative flex flex-col items-center justify-center flex-1 gap-[3px] transition-all duration-200 active:scale-[0.94] ${
                isPrimary
                  ? "text-white"
                  : isActive
                    ? isLight
                      ? "text-[#8b7355]"
                      : "text-[#c4a67d]"
                    : isLight
                      ? "text-[#999] hover:text-[#666]"
                      : "text-[rgba(255,255,255,0.35)] hover:text-[rgba(255,255,255,0.6)]"
              }`}
            >
              <div className={`relative flex items-center justify-center transition-all duration-200 ${
                isPrimary
                  ? `w-11 h-11 -mt-4 rounded-full bg-gradient-to-br from-[#8b7355] to-[#c4a67d] shadow-[0_6px_20px_rgba(196,166,125,0.45)] ${isActive ? "scale-105" : ""}`
                  : `w-10 h-7 rounded-full ${isActive ? (isLight ? "bg-[rgba(139,115,85,0.1)]" : "bg-[rgba(196,166,125,0.15)]") : ""}`
              }`}>
                {tab.icon}
                {showBalance && (
                  <span className="absolute -top-0.5 -right-1 min-w-[16px] h-[14px] flex items-center justify-center rounded-full bg-[#c4a67d] text-white text-[8px] font-bold px-1 leading-none">
                    {credits.token_balance > 99 ? "99+" : credits.token_balance}
                  </span>
                )}
              </div>
              <span className={`text-[10px] leading-none ${isPrimary ? "font-bold mt-1" : isActive ? "font-bold" : "font-medium"} ${isPrimary ? (isLight ? "text-[#8b7355]" : "text-[#c4a67d]") : ""}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
