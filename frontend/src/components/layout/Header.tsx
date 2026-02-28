"use client";

import { useAuth, useCredits } from "@/providers/AppProvider";
import { useTheme } from "@/hooks/useTheme";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/ui/Logo";

interface HeaderProps {
  title?: string;
  onMenuToggle?: () => void;
  showMenu?: boolean;
}

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/jewelry", label: "Jewelry" },
  { href: "/projects", label: "My Creations" },
  { href: "/studio", label: "Studio" },

  { href: "/batch-listing", label: "Bulk Listings" },
  { href: "/brand-settings", label: "Brand" },
];

export default function Header({ onMenuToggle, showMenu = false }: HeaderProps) {
  const { user, isAdmin } = useAuth();
  const { credits } = useCredits();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  const isLight = theme === "light";

  return (
    <header className={`sticky top-0 z-50 transition-colors duration-300 ${isLight ? "bg-[rgba(247,247,245,0.92)] backdrop-blur-[16px] border-b border-[rgba(0,0,0,0.08)]" : "glass-nav"}`}>
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 h-16 flex items-center justify-between">
        {/* Left: Logo + hamburger */}
        <div className="flex items-center gap-3">
          {showMenu && (
            <button
              onClick={onMenuToggle}
              className={`lg:hidden w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${isLight ? "hover:bg-[rgba(0,0,0,0.06)] text-[#0a0a0a]" : "hover:bg-[rgba(255,255,255,0.06)] text-white"}`}
              aria-label="Toggle menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
          <Link href="/" className="flex items-center group">
            <Logo className="text-lg sm:text-xl" variant={isLight ? "dark" : "light"} />
          </Link>
        </div>

        {/* Center: Nav links (desktop) */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
            const isJewelry = link.href === "/jewelry";
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={isJewelry}
                className={`px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? isJewelry
                      ? "text-[#c4a67d] bg-[rgba(196,166,125,0.12)]"
                      : isLight
                        ? "text-[#0a0a0a] bg-[rgba(0,0,0,0.06)]"
                        : "text-white bg-[rgba(255,255,255,0.08)]"
                    : isLight
                      ? "text-[#4a4a4a] hover:text-[#0a0a0a] hover:bg-[rgba(0,0,0,0.04)]"
                      : "text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              prefetch={false}
              className={`px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
                pathname.startsWith("/admin")
                  ? "text-[#c4a67d] bg-[rgba(196,166,125,0.15)]"
                  : "text-[#c4a67d] bg-[rgba(196,166,125,0.08)] hover:bg-[rgba(196,166,125,0.15)]"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        {/* Right: Theme + Tokens + Profile */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleTheme}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${isLight ? "hover:bg-[rgba(0,0,0,0.06)]" : "hover:bg-[rgba(255,255,255,0.08)]"}`}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#c4a67d]">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8b7355]">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          {credits && (
            <Link
              href="/pricing"
              prefetch={false}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[rgba(196,166,125,0.1)] border border-[rgba(196,166,125,0.2)] hover:border-[rgba(196,166,125,0.35)] transition-all duration-200 group"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v12M8 10h8" />
              </svg>
              <span className="text-xs font-bold text-[#c4a67d]">
                {credits.token_balance}
              </span>
              <span className="text-[11px] text-[rgba(196,166,125,0.6)] hidden sm:inline">tokens</span>
            </Link>
          )}
          {user && (
            <Link
              href="/profile"
              prefetch={false}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${isLight ? "bg-[#0a0a0a]/10 hover:bg-[#0a0a0a]/15" : "bg-white/10 hover:bg-white/15"}`}
            >
              <span className={`text-xs font-bold ${isLight ? "text-[#0a0a0a]" : "text-white"}`}>
                {(user.contact_name || user.company_name || "U").charAt(0).toUpperCase()}
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
