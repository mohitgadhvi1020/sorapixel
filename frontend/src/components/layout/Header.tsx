"use client";

import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import Link from "next/link";

interface HeaderProps {
  title?: string;
  onMenuToggle?: () => void;
  showMenu?: boolean;
}

export default function Header({ title, onMenuToggle, showMenu = false }: HeaderProps) {
  const { user } = useAuth();
  const { credits } = useCredits();

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-8 lg:px-12 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {showMenu && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-hover transition-colors"
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        {title && (
          <h1 className="text-lg font-bold text-foreground tracking-tight">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        {credits && (
          <Link
            href="/pricing"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent-lighter border border-accent/15 hover:border-accent/30 transition-all duration-200 group"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12M8 10h8" />
            </svg>
            <span className="text-xs font-bold text-accent">
              {credits.token_balance}
            </span>
            <span className="text-[11px] text-accent/70 hidden sm:inline">tokens</span>
          </Link>
        )}
        {user && (
          <Link
            href="/profile"
            className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center hover:shadow-[var(--shadow-accent)] transition-all duration-200"
          >
            <span className="text-xs font-bold text-white">
              {(user.contact_name || user.company_name || "U").charAt(0).toUpperCase()}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
