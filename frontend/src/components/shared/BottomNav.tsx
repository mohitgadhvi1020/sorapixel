"use client";

import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: "🏠" },
  { path: "/create", label: "Create", icon: "📷", isCenter: true },
  { path: "/projects", label: "Projects", icon: "📁" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const hideOn = ["/login"];
  if (hideOn.includes(pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.path === "/" ? pathname === "/" : pathname.startsWith(item.path);

          if (item.isCenter) {
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="relative -mt-6"
              >
                <div className="w-14 h-14 bg-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-pink-200 border-4 border-white">
                  <span className="text-xl">{item.icon}</span>
                </div>
                <span className="block text-xs text-center mt-1 text-pink-500 font-medium">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 ${
                isActive ? "text-pink-500" : "text-gray-400"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
