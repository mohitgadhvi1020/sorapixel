"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { safeFetch } from "@/lib/safe-fetch";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await safeFetch<{
          authenticated: boolean;
          legacy?: boolean;
        }>("/api/auth/me");

        if (data.legacy) {
          const token = sessionStorage.getItem("sorapixel_auth");
          if (token === "authenticated") {
            router.replace("/jewelry");
            return;
          }
        } else if (data.authenticated) {
          router.replace("/jewelry");
          return;
        }
      } catch {
        // Not authenticated
      }
      setChecking(false);
    })();
  }, [router]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;

      setLoading(true);
      setError("");

      try {
        const data = await safeFetch<{
          success: boolean;
          legacy?: boolean;
          error?: string;
        }>("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });

        if (data.success) {
          if (data.legacy) {
            sessionStorage.setItem("sorapixel_auth", "authenticated");
          }
          // Use the redirect param from the URL, or default to /jewelry
          const params = new URLSearchParams(window.location.search);
          const redirectTo = params.get("redirect") || "/jewelry";
          // Hard navigation ensures the cookie is sent on the next request
          window.location.href = redirectTo;
        } else {
          setError(data.error || "Invalid credentials");
          setPassword("");
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [email, password, loading]
  );

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/10 border-t-[#c4a67d] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ---- Left: Editorial image ---- */}
      <div className="relative lg:w-[55%] min-h-[35vh] lg:min-h-screen overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1200&q=80"
          alt="Jewelry photography"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent lg:bg-gradient-to-r lg:from-black/50 lg:via-black/20 lg:to-transparent" />

        {/* Overlay content */}
        <div className="relative z-10 h-full flex flex-col justify-between p-6 md:p-10 lg:p-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <span className="text-white text-xs font-bold">SP</span>
            </div>
            <span className="font-display font-bold text-[15px] text-white/90">
              SoraPixel
            </span>
          </Link>

          {/* Bottom text */}
          <div className="hidden lg:block">
            <h2 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[2.5rem] xl:text-[3.5rem] leading-[0.92] mb-4">
              Studio Quality
              <br />
              <span className="text-[#c4a67d]">In Seconds</span>
            </h2>
            <p className="text-white/50 text-[15px] max-w-sm leading-relaxed">
              Transform raw product photos into professional studio shots with AI-powered photography.
            </p>
          </div>
        </div>
      </div>

      {/* ---- Right: Login form ---- */}
      <div className="flex-1 bg-[#f7f7f5] flex items-center justify-center px-5 py-12 lg:py-0">
        <div className="w-full max-w-sm animate-scale-in">
          {/* Mobile logo (hidden on desktop since it's on the image) */}
          <div className="lg:hidden text-center mb-8">
            <h2 className="font-display font-bold text-[#0a0a0a] text-xl uppercase tracking-tight">
              SoraPixel
            </h2>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <span className="text-[11px] font-semibold text-[#8b7355] tracking-[0.12em] uppercase block mb-3">
              Welcome Back
            </span>
            <h1 className="font-display font-bold text-[#0a0a0a] text-[1.5rem] sm:text-[1.75rem] uppercase tracking-[-0.02em] leading-tight">
              Sign In To
              <br />
              <span className="text-[#8b7355]">Your Studio</span>
            </h1>
            <p className="text-sm text-[#8c8c8c] mt-3">
              Access AI product photography tools
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#4a4a4a] uppercase tracking-[0.1em] mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="you@company.com"
                autoFocus
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg border border-[#e8e5df] bg-white text-[#0a0a0a] text-sm placeholder:text-[#c0bdb7] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/20 focus:border-[#8b7355] disabled:opacity-50 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#4a4a4a] uppercase tracking-[0.1em] mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter your password"
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg border border-[#e8e5df] bg-white text-[#0a0a0a] text-sm placeholder:text-[#c0bdb7] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/20 focus:border-[#8b7355] disabled:opacity-50 transition-all duration-200"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 animate-slide-up-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={!email.trim() || !password.trim() || loading}
              className={`w-full py-3.5 rounded-lg font-semibold text-[14px] transition-all duration-200 ${
                email.trim() && password.trim() && !loading
                  ? "bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] active:scale-[0.99]"
                  : "bg-[#e8e5df] text-[#b0b0b0] cursor-not-allowed"
              }`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[#e8e5df]">
            <p className="text-[12px] text-[#8c8c8c] text-center">
              AI Product Photography for Jewelry & Kitchenware
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
