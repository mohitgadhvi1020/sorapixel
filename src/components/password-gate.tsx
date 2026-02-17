"use client";

import { useState, useCallback, useEffect } from "react";
import { safeFetch } from "@/lib/safe-fetch";

const SESSION_KEY = "sorapixel_auth";

interface PasswordGateProps {
  children: React.ReactNode;
}

export default function PasswordGate({ children }: PasswordGateProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check sessionStorage on mount
  useEffect(() => {
    const token = sessionStorage.getItem(SESSION_KEY);
    if (token === "authenticated") {
      setAuthenticated(true);
    }
    setChecking(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password.trim() || loading) return;

      setLoading(true);
      setError("");

      try {
        const data = await safeFetch<{ success: boolean }>("/api/verify-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });

        if (data.success) {
          sessionStorage.setItem(SESSION_KEY, "authenticated");
          setAuthenticated(true);
        } else {
          setError("Incorrect password. Please try again.");
          setPassword("");
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [password, loading]
  );

  // While checking sessionStorage, show nothing (prevents flash)
  if (checking) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-2 border-[#e8e5df] rounded-full" />
          <div className="absolute inset-0 border-2 border-transparent border-t-[#8b7355] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center px-5 sm:px-6">
      <div className="w-full max-w-sm animate-scale-in">
        {/* Logo + branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5">
            <div className="w-10 h-10 rounded-full bg-[#0a0a0a] flex items-center justify-center">
              <span className="text-white text-sm font-bold">SP</span>
            </div>
          </div>
          <h1 className="font-display font-bold text-[#0a0a0a] text-lg sm:text-xl uppercase tracking-tight">
            SoraPixel
          </h1>
          <p className="text-[13px] sm:text-sm text-[#8c8c8c] mt-2">
            Enter the access password to continue
          </p>
        </div>

        {/* Password form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Enter access password"
              autoFocus
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg border border-[#e8e5df] bg-white text-[#0a0a0a] text-sm placeholder:text-[#c0bdb7] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/20 focus:border-[#8b7355] disabled:opacity-50 transition-all duration-200"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 animate-slide-up-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={!password.trim() || loading}
            className={`
              w-full py-3.5 rounded-lg font-semibold text-[14px] transition-all duration-200
              ${
                password.trim() && !loading
                  ? "bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] active:scale-[0.99]"
                  : "bg-[#e8e5df] text-[#b0b0b0] cursor-not-allowed"
              }
            `}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying...
              </span>
            ) : (
              "Continue"
            )}
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-[#e8e5df]">
          <p className="text-center text-[11px] text-[#b0b0b0] tracking-wide">
            AI Product Photography
          </p>
        </div>
      </div>
    </div>
  );
}
