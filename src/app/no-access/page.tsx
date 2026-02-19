"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function NoAccessContent() {
  const params = useSearchParams();
  const section = params.get("section") || "this section";

  return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#f5f0e8] flex items-center justify-center">
          <svg className="w-8 h-8 text-[#8b7355]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#1b1b1f] tracking-tight mb-2">
          Access Restricted
        </h1>
        <p className="text-[#8c8c8c] text-sm mb-6">
          Your account doesn&apos;t have access to <span className="font-semibold capitalize text-[#1b1b1f]">{section}</span>. Contact your admin to get access.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-[#0a0a0a] text-white rounded-xl font-semibold text-sm hover:bg-[#1a1a1a] transition-all duration-200"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}

export default function NoAccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#e8e5df] border-t-[#8b7355] rounded-full animate-spin" />
      </div>
    }>
      <NoAccessContent />
    </Suspense>
  );
}
