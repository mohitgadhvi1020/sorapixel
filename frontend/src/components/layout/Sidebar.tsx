"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isAdmin?: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const CREATE_ITEMS: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Studio",
    href: "/studio",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    label: "Catalogue",
    href: "/catalogue",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

const MANAGE_ITEMS: NavItem[] = [
  {
    label: "Projects",
    href: "/projects",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "Pricing",
    href: "/pricing",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    label: "Profile",
    href: "/profile",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const ADMIN_ITEM: NavItem = {
  label: "Admin",
  href: "/admin",
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

function NavSection({ title, items, pathname, collapsed }: { title: string; items: NavItem[]; pathname: string; collapsed: boolean }) {
  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.08em]">
          {title}
        </p>
      )}
      {collapsed && <div className="pt-3" />}
      {items.map((item) => {
        const isActive = item.href === "/"
          ? pathname === "/"
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 ${collapsed ? "justify-center px-0 py-3 mx-1" : "px-3 py-2.5 mx-2"
              } ${isActive
                ? "bg-accent/8 text-accent font-medium"
                : "text-text-secondary hover:text-foreground hover:bg-surface-hover"
              }`}
            title={collapsed ? item.label : undefined}
          >
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-r-full" />
            )}
            <span className={`flex-shrink-0 ${isActive ? "text-accent" : ""}`}>
              {item.icon}
            </span>
            {!collapsed && (
              <span className="text-[13px]">{item.label}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export default function Sidebar({ isAdmin = false }: SidebarProps) {
  const pathname = usePathname();
  const collapsed = false;

  const manageItems = isAdmin ? [...MANAGE_ITEMS, ADMIN_ITEM] : MANAGE_ITEMS;

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-white border-r border-border z-40 flex flex-col transition-all duration-300 ${collapsed ? "w-[var(--sidebar-collapsed)]" : "w-64"
        }`}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center border-b border-border ${collapsed ? "justify-center px-0" : "px-5"}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl accent-gradient flex items-center justify-center shadow-[var(--shadow-accent)]">
            <span className="text-white text-xs font-bold tracking-tight">SP</span>
          </div>
          {!collapsed && (
            <span className="text-[15px] font-bold tracking-tight text-foreground">
              SoraPixel
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        <NavSection title="Create" items={CREATE_ITEMS} pathname={pathname} collapsed={collapsed} />
        <NavSection title="Manage" items={manageItems} pathname={pathname} collapsed={collapsed} />
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-border">
          <div className="accent-gradient-light rounded-xl p-3.5">
            <p className="text-[11px] font-medium text-accent">Need help?</p>
            <a href="mailto:support@sorapixel.com" className="text-[11px] font-semibold text-accent hover:underline">
              Contact Support →
            </a>
          </div>
        </div>
      )}
    </aside>
  );
}
