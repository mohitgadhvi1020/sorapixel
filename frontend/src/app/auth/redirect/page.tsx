"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("sp_auth_redirect");
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/653765e7-dc9d-43dc-b978-b907e5640153',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth/redirect/page.tsx',message:'Redirect page mounted',data:{savedRedirect:saved},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    localStorage.removeItem("sp_auth_redirect");
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
