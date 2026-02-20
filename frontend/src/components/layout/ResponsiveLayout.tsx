"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "./Sidebar";
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
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar isAdmin={isAdmin} />
      </div>

      {/* Mobile navigation */}
      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        isAdmin={isAdmin}
      />

      {/* Main area */}
      <div className="lg:ml-64">
        <Header
          title={title}
          onMenuToggle={() => setMobileNavOpen(true)}
          showMenu
        />
        <main className="px-5 md:px-8 lg:px-12 py-6 md:py-8 lg:py-12">
          <div className="max-w-[1280px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
