"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/ui/Logo";
import { useTheme } from "@/hooks/useTheme";
import { useAuth, useCredits } from "@/providers/AppProvider";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

const MAIN_NAV = [
  {
    label: "Product Studio",
    href: "/studio",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
  },
  {
    label: "Video",
    href: "/video",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>,
  },
  {
    label: "UGC & Models",
    href: "/ugc",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  },
  {
    label: "Blog Images",
    href: "/blog-images",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" /></svg>,
  },
];

const AUTH_NAV = [
  {
    label: "My Creations",
    href: "/projects",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
  },
  {
    label: "Bulk Listings",
    href: "/batch-listing",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
  },
  {
    label: "Brand Settings",
    href: "/brand-settings",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>,
  },
];

const GUEST_NAV = [
  {
    label: "Pricing",
    href: "/pricing",
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  },
];

export default function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const { credits } = useCredits();
  const lt = theme === "light";

  if (!open) return null;

  function NavItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
    const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        href={href}
        prefetch={false}
        onClick={onClose}
        className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 min-h-[44px] ${
          isActive
            ? lt ? "bg-[rgba(0,0,0,0.06)] text-[#0a0a0a] font-medium" : "bg-[rgba(255,255,255,0.08)] text-white font-medium"
            : lt ? "text-[rgba(0,0,0,0.5)] hover:text-[#0a0a0a] hover:bg-[rgba(0,0,0,0.04)]" : "text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]"
        }`}
      >
        <span className={isActive ? (lt ? "text-[#0a0a0a]" : "text-white") : ""}>{icon}</span>
        <span className="text-sm">{label}</span>
      </Link>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div className={`absolute inset-0 backdrop-blur-sm animate-fade-in ${lt ? "bg-black/30" : "bg-black/60"}`} onClick={onClose} />
      <div className={`absolute left-0 top-0 bottom-0 w-72 animate-slide-in-left flex flex-col shadow-2xl ${lt ? "bg-white border-r border-[rgba(0,0,0,0.08)]" : "bg-[#13141A] border-r border-[rgba(255,255,255,0.06)]"}`}>
        {/* Logo */}
        <div className={`h-14 flex items-center justify-between px-5 ${lt ? "border-b border-[rgba(0,0,0,0.08)]" : "border-b border-[rgba(255,255,255,0.06)]"}`}>
          <Logo className="text-xl" variant={lt ? "dark" : "light"} />
          <button
            onClick={onClose}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${lt ? "hover:bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.5)]" : "hover:bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)]"}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tokens (logged in) */}
        {isAuthenticated && credits && (
          <Link
            href="/pricing"
            prefetch={false}
            onClick={onClose}
            className="mx-3 mt-3 flex items-center justify-between px-4 py-3 rounded-xl bg-[rgba(196,166,125,0.08)] border border-[rgba(196,166,125,0.15)]"
          >
            <span className="text-[12px] font-semibold text-[#c4a67d]">{credits.token_balance} tokens</span>
            <span className="text-[11px] text-[#c4a67d]/50">Add more →</span>
          </Link>
        )}

        {/* Nav */}
        <nav className="flex-1 py-3 px-3 overflow-y-auto">
          <p className={`px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${lt ? "text-[rgba(0,0,0,0.25)]" : "text-[rgba(255,255,255,0.2)]"}`}>Tools</p>
          {MAIN_NAV.map((item) => <NavItem key={item.href} {...item} />)}

          {isAuthenticated && (
            <>
              <p className={`px-3 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${lt ? "text-[rgba(0,0,0,0.25)]" : "text-[rgba(255,255,255,0.2)]"}`}>Manage</p>
              {AUTH_NAV.map((item) => <NavItem key={item.href} {...item} />)}
              <NavItem
                href="/pricing"
                label="Pricing & Plans"
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
              />
              <NavItem
                href="/profile"
                label="Account Settings"
                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>}
              />
            </>
          )}

          {!isAuthenticated && (
            <>
              <p className={`px-3 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${lt ? "text-[rgba(0,0,0,0.25)]" : "text-[rgba(255,255,255,0.2)]"}`}>More</p>
              {GUEST_NAV.map((item) => <NavItem key={item.href} {...item} />)}
            </>
          )}

          {isAdmin && (
            <NavItem
              href="/admin"
              label="Admin"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
            />
          )}
        </nav>

        {/* Footer */}
        <div className={`p-4 ${lt ? "border-t border-[rgba(0,0,0,0.08)]" : "border-t border-[rgba(255,255,255,0.06)]"}`}>
          {isAuthenticated ? (
            <button
              onClick={() => {
                onClose();
                logout();
                router.push("/");
              }}
              className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${
                lt ? "text-red-500/70 bg-red-50 hover:bg-red-100" : "text-red-400/60 bg-red-500/10 hover:bg-red-500/15"
              }`}
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              prefetch={false}
              onClick={onClose}
              className="block w-full py-3 text-center rounded-xl text-sm font-semibold text-white bg-[#0a0a0a] hover:bg-[#1a1a1a] transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
