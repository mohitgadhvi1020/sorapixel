"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Header from "./Header";
import MobileNav from "./MobileNav";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function ResponsiveLayout({ children, title }: ResponsiveLayoutProps) {
  const { isAdmin } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0E0F14]">
      {/* Mobile navigation drawer */}
      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        isAdmin={isAdmin}
      />

      {/* Dark glass top header */}
      <Header
        title={title}
        onMenuToggle={() => setMobileNavOpen(true)}
        showMenu
      />

      {/* Main content */}
      <main className="px-5 md:px-8 lg:px-12 py-6 md:py-8 lg:py-12">
        <div className="max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
