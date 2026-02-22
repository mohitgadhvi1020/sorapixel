"use client";

import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
  title?: string;
  onMenuToggle?: () => void;
  showMenu?: boolean;
}

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/jewelry", label: "Jewelry" },
  { href: "/studio", label: "Studio" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/batch-listing", label: "Bulk Listings" },
  { href: "/projects", label: "Projects" },
  { href: "/brand-settings", label: "Brand" },
];

export default function Header({ onMenuToggle, showMenu = false }: HeaderProps) {
  const { user, isAdmin } = useAuth();
  const { credits } = useCredits();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 h-16 flex items-center justify-between">
        {/* Left: Logo + hamburger */}
        <div className="flex items-center gap-3">
          {showMenu && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              aria-label="Toggle menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-white text-xs font-bold">SP</span>
            </div>
            <span className="font-display font-bold text-[15px] tracking-tight text-white hidden sm:block">
              SoraPixel
            </span>
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
                className={`px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? isJewelry
                      ? "text-[#c4a67d] bg-[rgba(196,166,125,0.12)]"
                      : "text-white bg-[rgba(255,255,255,0.08)]"
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

        {/* Right: Credits + Profile */}
        <div className="flex items-center gap-2.5">
          {credits && (
            <Link
              href="/pricing"
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
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15 transition-all duration-200"
            >
              <span className="text-xs font-bold text-white">
                {(user.contact_name || user.company_name || "U").charAt(0).toUpperCase()}
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
