"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

const JEWELRY_ITEMS = [
  {
    label: "Home",
    href: "/",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Jewelry Studio",
    href: "/jewelry",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    ),
    primary: true,
  },
  {
    label: "Catalogue",
    href: "/catalogue",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: "Bulk Listings",
    href: "/batch-listing",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

const OTHER_ITEMS = [
  {
    label: "Studio (General)",
    href: "/studio",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    label: "Try-On",
    href: "/tryon",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
];

const MANAGE_ITEMS = [
  {
    label: "Projects",
    href: "/projects",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "Brand Settings",
    href: "/brand-settings",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    label: "Pricing",
    href: "/pricing",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    label: "Profile",
    href: "/profile",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function MobileNav({ open, onClose, isAdmin = false }: MobileNavProps) {
  const pathname = usePathname();

  const manageItems = isAdmin
    ? [
      ...MANAGE_ITEMS,
      {
        label: "Admin",
        href: "/admin",
        icon: (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        ),
      },
    ]
    : MANAGE_ITEMS;

  if (!open) return null;

  function NavItem({ item, highlight }: { item: typeof JEWELRY_ITEMS[0] & { primary?: boolean }; highlight?: boolean }) {
    const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    const isPrimary = highlight || item.primary;
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 min-h-[44px] ${
          isActive
            ? isPrimary
              ? "bg-[rgba(196,166,125,0.12)] text-[#c4a67d] font-medium"
              : "bg-[rgba(255,255,255,0.08)] text-white font-medium"
            : "text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]"
        }`}
      >
        {isActive && (
          <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${isPrimary ? "bg-[#c4a67d]" : "bg-white/50"}`} />
        )}
        <span className={isActive && isPrimary ? "text-[#c4a67d]" : ""}>{item.icon}</span>
        <span className="text-sm">{item.label}</span>
        {isPrimary && !isActive && (
          <span className="ml-auto text-[9px] font-bold tracking-[0.1em] uppercase text-[#c4a67d]/40 bg-[rgba(196,166,125,0.08)] px-1.5 py-0.5 rounded">
            new
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-[#13141A] animate-slide-in-left flex flex-col shadow-2xl border-r border-[rgba(255,255,255,0.06)]">
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-white text-xs font-bold tracking-tight">SP</span>
            </div>
            <span className="font-display text-[15px] font-bold tracking-tight text-white">
              SoraPixel
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[rgba(255,255,255,0.06)] transition-colors text-[rgba(255,255,255,0.5)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-3 overflow-y-auto">
          <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold text-[#c4a67d]/50 uppercase tracking-[0.08em]">Jewelry</p>
          {JEWELRY_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}

          <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold text-[rgba(255,255,255,0.2)] uppercase tracking-[0.08em]">Other Categories</p>
          {OTHER_ITEMS.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}

          <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold text-[rgba(255,255,255,0.2)] uppercase tracking-[0.08em]">Manage</p>
          {manageItems.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[rgba(255,255,255,0.06)]">
          <div className="bg-[rgba(196,166,125,0.06)] border border-[rgba(196,166,125,0.1)] rounded-xl p-3.5">
            <p className="text-[11px] font-medium text-[#c4a67d]">Need help?</p>
            <a href="mailto:support@sorapixel.com" className="text-[11px] font-semibold text-[#c4a67d] hover:underline">
              Contact Support →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
