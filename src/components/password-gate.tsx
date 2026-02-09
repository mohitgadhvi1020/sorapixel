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
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#e8e5df] border-t-[#8b7355] rounded-full animate-spin" />
      </div>
    );
  }

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm animate-scale-in">
        {/* Logo + branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logo.png" alt="SoraPixel" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1b1b1f] tracking-tight">
            Welcome to SoraPixel
          </h1>
          <p className="text-sm text-[#8c8c8c] mt-1.5">
            Enter the access password to continue
          </p>
        </div>

        {/* Password form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder="Enter password"
              autoFocus
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl border border-[#e8e5df] bg-white text-[#1b1b1f] text-sm placeholder:text-[#c0bdb7] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/30 focus:border-[#8b7355] disabled:opacity-50 transition-all duration-300"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 animate-slide-up-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={!password.trim() || loading}
            className={`
              w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300
              ${
                password.trim() && !loading
                  ? "bg-gradient-to-r from-[#8b7355] to-[#6b5740] text-white shadow-lg shadow-[#8b7355]/15 active:scale-[0.99]"
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

        <p className="text-center text-xs text-[#b0b0b0] mt-6">
          AI Product Photography for Kitchenware
        </p>
      </div>
    </div>
  );
}
