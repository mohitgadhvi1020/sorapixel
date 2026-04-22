"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trackEvent, trackSignup } from "@/lib/gtag";

export default function AuthRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("sp_auth_redirect");
    localStorage.removeItem("sp_auth_redirect");
    // Fire sign_up only once per browser; GA dedupes via user_id later anyway
    if (!localStorage.getItem("sp_signup_tracked")) {
      trackSignup("oauth");
      localStorage.setItem("sp_signup_tracked", "1");
    }
    trackEvent("auth_redirect", { destination: saved || "/jewelry" });
    router.replace(saved || "/jewelry");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0E0F14] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[rgba(196,166,125,0.2)] border-t-[#c4a67d] rounded-full animate-spin" />
        <p className="text-sm text-[rgba(255,255,255,0.5)]">Signing you in...</p>
      </div>
    </div>
  );
}
