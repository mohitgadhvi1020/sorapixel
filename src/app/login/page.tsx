"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { safeFetch } from "@/lib/safe-fetch";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if already logged in
  useEffect(() => {
    (async () => {
      try {
        const data = await safeFetch<{
          authenticated: boolean;
          legacy?: boolean;
        }>("/api/auth/me");

        if (data.legacy) {
          // Supabase not configured — check old sessionStorage gate
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
            // Supabase not configured — fall back to old session storage
            sessionStorage.setItem("sorapixel_auth", "authenticated");
          }
          router.replace("/jewelry");
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
    [email, password, loading, router]
  );

  if (checking) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#e8e5df] border-t-[#8b7355] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-scale-in">
        {/* Logo + branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img
              src="/logo.png"
              alt="SoraPixel"
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1b1b1f] tracking-tight">
            Welcome to SoraPixel
          </h1>
          <p className="text-sm text-[#8c8c8c] mt-1.5">
            Sign in to access the studio
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8c8c8c] uppercase tracking-wider mb-1.5">
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
              className="w-full px-4 py-3 rounded-xl border border-[#e8e5df] bg-white text-[#1b1b1f] text-sm placeholder:text-[#c0bdb7] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/30 focus:border-[#8b7355] disabled:opacity-50 transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8c8c8c] uppercase tracking-wider mb-1.5">
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
              className="w-full px-4 py-3 rounded-xl border border-[#e8e5df] bg-white text-[#1b1b1f] text-sm placeholder:text-[#c0bdb7] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/30 focus:border-[#8b7355] disabled:opacity-50 transition-all duration-300"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 animate-slide-up-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={!email.trim() || !password.trim() || loading}
            className={`
              w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300
              ${
                email.trim() && password.trim() && !loading
                  ? "bg-gradient-to-r from-[#8b7355] to-[#6b5740] text-white shadow-lg shadow-[#8b7355]/15 active:scale-[0.99]"
                  : "bg-[#e8e5df] text-[#b0b0b0] cursor-not-allowed"
              }
            `}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-[#b0b0b0] mt-6">
          AI Product Photography for Jewelry
        </p>
      </div>
    </div>
  );
}
