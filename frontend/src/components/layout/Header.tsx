"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth, useCredits } from "@/providers/AppProvider";
import { useTheme } from "@/hooks/useTheme";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";

interface HeaderProps {
  title?: string;
  onMenuToggle?: () => void;
  showMenu?: boolean;
  variant?: "default" | "homepage";
}

const NAV_LINKS_AUTH = [
  { href: "/studio", label: "Product Studio" },
  { href: "/video", label: "Video" },
  { href: "/ugc", label: "UGC" },
  { href: "/blog-images", label: "Blog Images" },
  { href: "/projects", label: "My Creations" },
];

const NAV_LINKS_GUEST = [
  { href: "/studio", label: "Product Studio" },
  { href: "/video", label: "Video" },
  { href: "/ugc", label: "UGC" },
  { href: "/blog-images", label: "Blog Images" },
  { href: "/pricing", label: "Pricing" },
];

export default function Header({ onMenuToggle, showMenu = false, variant = "default" }: HeaderProps) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { credits } = useCredits();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isHomepage = variant === "homepage";
  const isLight = isHomepage ? true : theme === "light";
  const navLinks = isAuthenticated ? NAV_LINKS_AUTH : NAV_LINKS_GUEST;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const headerBg = isHomepage
    ? "fixed top-0 left-0 right-0 z-50 glass border-b border-[#e8e5df]"
    : `sticky top-0 z-50 transition-colors duration-300 ${isLight ? "bg-[rgba(247,247,245,0.92)] backdrop-blur-[16px] border-b border-[rgba(0,0,0,0.08)]" : "glass-nav"}`;

  return (
    <header className={headerBg}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 h-14 md:h-16 flex items-center justify-between">
        {/* Left: Hamburger + Logo */}
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
            <Logo className="text-lg sm:text-xl" variant={isHomepage ? "dark" : isLight ? "dark" : "light"} />
          </Link>
        </div>

        {/* Center: Nav links (desktop) */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {navLinks.map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                className={`px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? isLight
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

        {/* Right side */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Theme toggle (not on homepage) */}
              {!isHomepage && (
                <button
                  onClick={toggleTheme}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${isLight ? "hover:bg-[rgba(0,0,0,0.06)]" : "hover:bg-[rgba(255,255,255,0.08)]"}`}
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {theme === "dark" ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#c4a67d]">
                      <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8b7355]">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  )}
                </button>
              )}

              {/* Tokens badge */}
              {credits && (
                <Link
                  href="/pricing"
                  prefetch={false}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(196,166,125,0.1)] border border-[rgba(196,166,125,0.2)] hover:border-[rgba(196,166,125,0.35)] transition-all duration-200"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10h8" />
                  </svg>
                  <span className="text-[12px] font-bold text-[#c4a67d]">{credits.token_balance}</span>
                  <span className="text-[10px] text-[rgba(196,166,125,0.6)] hidden sm:inline">tokens</span>
                </Link>
              )}

              {/* Avatar dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isLight
                      ? "bg-[#0a0a0a]/10 hover:bg-[#0a0a0a]/15"
                      : "bg-white/10 hover:bg-white/15"
                  }`}
                >
                  <span className={`text-xs font-bold ${isLight ? "text-[#0a0a0a]" : "text-white"}`}>
                    {(user?.contact_name || user?.company_name || "U").charAt(0).toUpperCase()}
                  </span>
                </button>

                {dropdownOpen && (
                  <div className={`absolute right-0 top-full mt-2 w-52 rounded-xl border shadow-xl overflow-hidden ${
                    isLight
                      ? "bg-white border-[rgba(0,0,0,0.08)]"
                      : "bg-[#1a1a1a] border-[rgba(255,255,255,0.1)]"
                  }`}>
                    <div className={`px-4 py-3 border-b ${isLight ? "border-[rgba(0,0,0,0.06)]" : "border-[rgba(255,255,255,0.06)]"}`}>
                      <p className={`text-sm font-semibold truncate ${isLight ? "text-[#0a0a0a]" : "text-white"}`}>
                        {user?.contact_name || user?.company_name || "User"}
                      </p>
                      <p className={`text-[11px] truncate ${isLight ? "text-[#0a0a0a]/40" : "text-white/40"}`}>
                        {user?.email || user?.phone || ""}
                      </p>
                    </div>
                    <div className="py-1">
                      {[
                        { href: "/pricing", label: "Pricing & Plans" },
                        { href: "/brand-settings", label: "Brand Settings" },
                        { href: "/batch-listing", label: "Bulk Listings" },
                        { href: "/profile", label: "Account Settings" },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={false}
                          onClick={() => setDropdownOpen(false)}
                          className={`block px-4 py-2.5 text-[13px] transition-colors ${
                            isLight
                              ? "text-[#4a4a4a] hover:bg-[rgba(0,0,0,0.04)] hover:text-[#0a0a0a]"
                              : "text-white/60 hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                          }`}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                    <div className={`border-t ${isLight ? "border-[rgba(0,0,0,0.06)]" : "border-[rgba(255,255,255,0.06)]"}`}>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          logout();
                          router.push("/");
                        }}
                        className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${
                          isLight
                            ? "text-red-500/70 hover:bg-red-50 hover:text-red-600"
                            : "text-red-400/60 hover:bg-red-500/10 hover:text-red-400"
                        }`}
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              href="/login"
              prefetch={false}
              className="ml-1 px-5 py-2 bg-[#0a0a0a] text-white text-[12px] sm:text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all active:scale-[0.97]"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
