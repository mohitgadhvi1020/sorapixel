"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Compass, Users, FileText, Settings,
  Zap, Bell, ChevronDown, CreditCard, User, Globe
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Onboard", href: "/dashboard/onboard", icon: Globe },
  { label: "Discover", href: "/dashboard/discover", icon: Compass },
  { label: "Prospects", href: "/dashboard/prospects", icon: Users },
  { label: "Drafts", href: "/dashboard/drafts", icon: FileText },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-surface-secondary overflow-hidden">
      <aside className="w-64 bg-white border-r border-border flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">Reach<span className="text-primary">Wise</span></span>
          </Link>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <div className="bg-gradient-card rounded-xl p-4 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-text-secondary">Credits Remaining</span>
            </div>
            <p className="text-2xl font-bold text-primary mb-1">847</p>
            <div className="w-full bg-border/50 rounded-full h-1.5">
              <div className="bg-gradient-primary h-1.5 rounded-full" style={{ width: "65%" }} />
            </div>
            <p className="text-[11px] text-text-tertiary mt-2">847 of 1,000 credits remaining</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-8 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold capitalize">
              {pathname === "/dashboard"
                ? "Dashboard"
                : pathname.split("/").pop()?.replace(/-/g, " ") || "Dashboard"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-xl hover:bg-surface-secondary transition-colors">
              <Bell className="w-5 h-5 text-text-secondary" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error" />
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-border">
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium leading-tight">Mohit G.</p>
                <p className="text-xs text-text-tertiary leading-tight">Pro Plan</p>
              </div>
              <ChevronDown className="w-4 h-4 text-text-tertiary" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
