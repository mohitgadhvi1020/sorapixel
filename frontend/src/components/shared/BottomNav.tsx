"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    path: "/",
    label: "Home",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    path: "/studio",
    label: "Studio",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    isCenter: true,
  },
  {
    path: "/projects",
    label: "Projects",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  const hideOn = ["/login"];
  if (hideOn.includes(pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-border safe-bottom z-50 lg:hidden">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);

          if (item.isCenter) {
            return (
              <Link key={item.path} href={item.path} className="relative -mt-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-4 border-white shadow-[var(--shadow-md)] transition-all duration-200 ${isActive ? "accent-gradient shadow-[var(--shadow-accent)]" : "bg-accent"
                  }`}>
                  <span className="text-white">{item.icon}</span>
                </div>
                <span className={`block text-[10px] text-center mt-1 font-semibold ${isActive ? "text-accent" : "text-text-secondary"
                  }`}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors duration-200 ${isActive ? "text-accent" : "text-text-tertiary"
                }`}
            >
              <span>{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
