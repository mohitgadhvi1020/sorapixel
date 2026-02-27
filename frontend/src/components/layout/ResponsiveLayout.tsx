"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import Header from "./Header";
import MobileNav from "./MobileNav";
import UpgradeBanner from "./UpgradeBanner";
import ProQualityTicker from "./ProQualityTicker";
import DailyRewardModal from "@/components/shared/DailyRewardModal";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function ResponsiveLayout({ children, title }: ResponsiveLayoutProps) {
  const { isAdmin } = useAuth();
  const { theme } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isLight = theme === "light";

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isLight ? "bg-[#f7f7f5] text-[#0a0a0a] theme-light" : "bg-[#0E0F14] text-white"}`}>
      <ProQualityTicker />

      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        isAdmin={isAdmin}
      />

      <Header
        title={title}
        onMenuToggle={() => setMobileNavOpen(true)}
        showMenu
      />

      <main className="px-5 md:px-8 lg:px-12 py-6 md:py-8 lg:py-12 pb-24">
        <div className="max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>

      <UpgradeBanner />
      <DailyRewardModal />
    </div>
  );
}
