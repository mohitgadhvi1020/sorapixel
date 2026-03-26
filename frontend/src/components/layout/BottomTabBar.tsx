"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/hooks/useTheme";
import { useCredits } from "@/providers/AppProvider";

const TABS = [
  {
    href: "/jewelry",
    label: "Studio",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    href: "/projects",
    label: "Creations",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    href: "/pricing",
    label: "Credits",
    showBalance: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <line x1="12" y1="6" x2="12" y2="8" />
        <line x1="12" y1="16" x2="12" y2="18" />
      </svg>
    ),
  },
  {
    href: "/video",
    label: "Create Reel",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <line x1="17" y1="2" x2="17" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="2" y1="7" x2="7" y2="7" />
        <line x1="2" y1="17" x2="7" y2="17" />
        <line x1="17" y1="7" x2="22" y2="7" />
        <line x1="17" y1="17" x2="22" y2="17" />
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
          const isActive = tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href);

          const showBalance = "showBalance" in tab && tab.showBalance && credits;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={tab.href === "/jewelry"}
              className={`relative flex flex-col items-center justify-center flex-1 gap-[3px] transition-colors duration-200 active:scale-[0.97] ${
                isActive
                  ? isLight
                    ? "text-[#8b7355]"
                    : "text-[#c4a67d]"
                  : isLight
                    ? "text-[#999] hover:text-[#666]"
                    : "text-[rgba(255,255,255,0.35)] hover:text-[rgba(255,255,255,0.6)]"
              }`}
            >
              <div className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-colors duration-200 ${
                isActive
                  ? isLight
                    ? "bg-[rgba(139,115,85,0.1)]"
                    : "bg-[rgba(196,166,125,0.15)]"
                  : ""
              }`}>
                {tab.icon}
                {showBalance && (
                  <span className="absolute -top-0.5 -right-1 min-w-[16px] h-[14px] flex items-center justify-center rounded-full bg-[#c4a67d] text-white text-[8px] font-bold px-1 leading-none">
                    {credits.token_balance > 99 ? "99+" : credits.token_balance}
                  </span>
                )}
              </div>
              <span className={`text-[10px] leading-none ${isActive ? "font-bold" : "font-medium"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
