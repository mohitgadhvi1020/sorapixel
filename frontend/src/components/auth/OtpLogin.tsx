"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/providers/AppProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Button from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 6L2 7" />
    </svg>
  );
}

function OtpLoginInner() {
  const { signInWithGoogle, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/jewelry";

  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"main" | "email" | "email-sent" | "forgot" | "forgot-sent">("main");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, redirectTo, router]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      await signInWithGoogle(redirectTo);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  const handleSendEmailLink = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { getSupabaseBrowser } = await import("@/lib/supabase/client");
      const supabase = getSupabaseBrowser();
      localStorage.setItem("sp_auth_redirect", redirectTo);
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (otpError) throw new Error(otpError.message);
      setStep("email-sent");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send email link");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { getSupabaseBrowser } = await import("@/lib/supabase/client");
      const supabase = getSupabaseBrowser();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (resetError) throw new Error(resetError.message);
      setStep("forgot-sent");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0F14] flex">
      {/* Left panel — full bleed model image with overlay content */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen relative overflow-hidden bg-[#0E0F14]">
        {/* Full-bleed background image */}
        <img
          src="/images/woman-necklace-v2.png"
          alt=""
          className="absolute inset-0 min-h-full min-w-full object-cover opacity-50"
          style={{ objectPosition: "50% 20%" }}
        />
        {/* Bottom gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E0F14] via-[#0E0F14]/50 to-transparent" />
        {/* Subtle warm glow */}
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-[rgba(196,166,125,0.06)] rounded-full blur-[120px]" />

        {/* Content centered */}
        <div className="relative m-auto w-full px-12">
          <Logo className="text-2xl mb-6" variant="light" />
          <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">
            AI Product Photography
          </h2>
          <p className="mt-3 text-[rgba(255,255,255,0.55)] text-[15px] leading-relaxed max-w-sm">
            Transform raw product photos into studio-quality images. Trusted by serious brands.
          </p>
          <div className="mt-8 flex items-center gap-6">
            <div>
              <p className="text-2xl font-bold text-white">10K+</p>
              <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">Photos Created</p>
            </div>
            <div className="w-px h-10 bg-[rgba(255,255,255,0.1)]" />
            <div>
              <p className="text-2xl font-bold text-white">50+</p>
              <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">Brands</p>
            </div>
            <div className="w-px h-10 bg-[rgba(255,255,255,0.1)]" />
            <div>
              <p className="text-2xl font-bold text-white">4.9</p>
              <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — dark form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <Logo className="text-xl" variant="light" />
          </div>

          {step === "main" && (
            <>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Welcome back
              </h1>
              <p className="mt-2 text-[rgba(255,255,255,0.5)] text-sm leading-relaxed">
                Sign in to continue to SoraiPixel.
              </p>

              {error && (
                <div className="mt-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#EF4444] px-4 py-2.5 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="mt-8 space-y-3">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 border border-[rgba(255,255,255,0.1)] rounded-2xl px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.2)] transition-all duration-250 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {googleLoading ? (
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <GoogleIcon className="w-5 h-5" />
                  )}
                  Continue with Google
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[rgba(255,255,255,0.08)]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#0E0F14] px-3 text-[rgba(255,255,255,0.4)]">or</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setStep("email");
                    setError("");
                    setTimeout(() => emailRef.current?.focus(), 100);
                  }}
                  className="w-full flex items-center justify-center gap-3 border border-[rgba(255,255,255,0.1)] rounded-2xl px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.2)] transition-all duration-250 cursor-pointer"
                >
                  <EmailIcon className="w-5 h-5" />
                  Continue with Email
                </button>
              </div>
            </>
          )}

          {step === "email" && (
            <>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Enter your email
              </h1>
              <p className="mt-2 text-[rgba(255,255,255,0.5)] text-sm leading-relaxed">
                We&apos;ll send a magic sign-in link to your inbox.
                <button
                  onClick={() => { setStep("main"); setError(""); }}
                  className="text-[#d4b88f] ml-1.5 font-medium hover:text-[#c4a67d] transition-colors"
                >
                  Back
                </button>
              </p>

              {error && (
                <div className="mt-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#EF4444] px-4 py-2.5 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="mt-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[rgba(255,255,255,0.5)] uppercase tracking-[0.05em]">Email Address</label>
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-[rgba(255,255,255,0.08)] rounded-[14px] px-4 py-3.5 text-base outline-none focus:border-[#c4a67d] focus:shadow-[0_0_0_3px_rgba(196,166,125,0.15)] transition-all duration-250 hover:border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.04)] text-white placeholder:text-[rgba(255,255,255,0.25)]"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleSendEmailLink()}
                  />
                </div>
                <Button
                  onClick={handleSendEmailLink}
                  disabled={!email.trim()}
                  loading={loading}
                  fullWidth
                  size="lg"
                >
                  Send Magic Link
                </Button>
                <button
                  onClick={() => { setStep("forgot"); setError(""); }}
                  className="w-full text-center text-sm text-[rgba(255,255,255,0.4)] hover:text-[#d4b88f] transition-colors py-1"
                >
                  Forgot Password?
                </button>
              </div>
            </>
          )}

          {step === "forgot" && (
            <>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Reset your password
              </h1>
              <p className="mt-2 text-[rgba(255,255,255,0.5)] text-sm leading-relaxed">
                Enter your email and we&apos;ll send a password reset link.
                <button
                  onClick={() => { setStep("email"); setError(""); }}
                  className="text-[#d4b88f] ml-1.5 font-medium hover:text-[#c4a67d] transition-colors"
                >
                  Back
                </button>
              </p>

              {error && (
                <div className="mt-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#EF4444] px-4 py-2.5 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="mt-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[rgba(255,255,255,0.5)] uppercase tracking-[0.05em]">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-[rgba(255,255,255,0.08)] rounded-[14px] px-4 py-3.5 text-base outline-none focus:border-[#c4a67d] focus:shadow-[0_0_0_3px_rgba(196,166,125,0.15)] transition-all duration-250 hover:border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.04)] text-white placeholder:text-[rgba(255,255,255,0.25)]"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleResetPassword()}
                  />
                </div>
                <Button
                  onClick={handleResetPassword}
                  disabled={!email.trim()}
                  loading={loading}
                  fullWidth
                  size="lg"
                >
                  Send Reset Link
                </Button>
              </div>
            </>
          )}

          {step === "forgot-sent" && (
            <>
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[rgba(196,166,125,0.1)] flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight text-center">
                Check your email
              </h1>
              <p className="mt-3 text-[rgba(255,255,255,0.5)] text-sm leading-relaxed text-center">
                We sent a password reset link to <span className="font-semibold text-white">{email}</span>. Click the link to set a new password.
              </p>
              <div className="mt-8 space-y-3">
                <Button
                  onClick={() => { setStep("forgot"); setError(""); }}
                  variant="secondary"
                  fullWidth
                >
                  Try a different email
                </Button>
                <button
                  onClick={() => { setStep("main"); setError(""); setEmail(""); }}
                  className="w-full text-center text-sm text-[rgba(255,255,255,0.4)] hover:text-white transition-colors py-2"
                >
                  Back to all sign-in options
                </button>
              </div>
            </>
          )}

          {step === "email-sent" && (
            <>
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[rgba(196,166,125,0.1)] flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 6L2 7" />
                  </svg>
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight text-center">
                Check your email
              </h1>
              <p className="mt-3 text-[rgba(255,255,255,0.5)] text-sm leading-relaxed text-center">
                We sent a sign-in link to <span className="font-semibold text-white">{email}</span>. Click the link in the email to sign in.
              </p>
              <div className="mt-8 space-y-3">
                <Button
                  onClick={() => { setStep("email"); setError(""); }}
                  variant="secondary"
                  fullWidth
                >
                  Try a different email
                </Button>
                <button
                  onClick={() => { setStep("main"); setError(""); setEmail(""); }}
                  className="w-full text-center text-sm text-[rgba(255,255,255,0.4)] hover:text-white transition-colors py-2"
                >
                  Back to all sign-in options
                </button>
              </div>
            </>
          )}


          <p className="mt-8 text-xs text-[rgba(255,255,255,0.3)] text-center leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OtpLogin() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0E0F14] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[rgba(196,166,125,0.2)] border-t-[#c4a67d] rounded-full animate-spin" />
      </div>
    }>
      <OtpLoginInner />
    </Suspense>
  );
}
