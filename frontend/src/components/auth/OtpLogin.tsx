"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Button from "@/components/ui/Button";

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

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
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
  const { signInWithPhone, verifyPhoneOtp, signInWithGoogle, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/jewelry";

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"choose" | "phone" | "phone-otp" | "email" | "email-sent">("choose");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  const otpRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/653765e7-dc9d-43dc-b978-b907e5640153',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OtpLogin.tsx:mount',message:'Login page mounted',data:{isAuthenticated,redirectTo,step},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    if (isAuthenticated) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/653765e7-dc9d-43dc-b978-b907e5640153',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OtpLogin.tsx:autoRedirect',message:'Already authenticated, redirecting',data:{redirectTo},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      router.replace(redirectTo);
    }
  }, [isAuthenticated, redirectTo, router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signInWithPhone(clean);
      setStep("phone-otp");
      setCountdown(30);
      setTimeout(() => otpRef.current?.focus(), 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await verifyPhoneOtp(phone.replace(/\D/g, ""), otp);
      router.replace(redirectTo);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/653765e7-dc9d-43dc-b978-b907e5640153',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OtpLogin.tsx:handleGoogleSignIn',message:'Google button clicked',data:{redirectTo},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    setGoogleLoading(true);
    setError("");
    try {
      await signInWithGoogle(redirectTo);
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/653765e7-dc9d-43dc-b978-b907e5640153',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OtpLogin.tsx:handleGoogleSignIn:success',message:'signInWithGoogle returned successfully',data:{},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
    } catch (e: unknown) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/653765e7-dc9d-43dc-b978-b907e5640153',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'OtpLogin.tsx:handleGoogleSignIn:error',message:'signInWithGoogle threw error',data:{error: e instanceof Error ? e.message : String(e)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
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

  return (
    <div className="min-h-screen bg-[#0E0F14] flex">
      {/* Left panel — dark branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0E0F14] via-[#1A1520] to-[#0E0F14] items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-[rgba(196,166,125,0.08)] rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-[rgba(124,92,255,0.06)] rounded-full blur-[80px]" />

        <div className="relative max-w-md text-center px-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#c4a67d] to-[#d4b88f] flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(196,166,125,0.3)]">
            <span className="text-white text-2xl font-bold tracking-tight">SP</span>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">
            AI Product Photography
          </h2>
          <p className="mt-4 text-[rgba(255,255,255,0.5)] text-base leading-relaxed">
            Transform raw product photos into studio-quality images.
            Trusted by serious brands.
          </p>
          <div className="mt-12 flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">10K+</p>
              <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">Photos Created</p>
            </div>
            <div className="w-px h-10 bg-[rgba(255,255,255,0.08)]" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">500+</p>
              <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">Brands</p>
            </div>
            <div className="w-px h-10 bg-[rgba(255,255,255,0.08)]" />
            <div className="text-center">
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
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c4a67d] to-[#d4b88f] flex items-center justify-center shadow-[0_0_16px_rgba(196,166,125,0.3)]">
              <span className="text-white text-sm font-bold tracking-tight">SP</span>
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">SoraPixel</span>
          </div>

          {step === "choose" && (
            <>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Welcome back
              </h1>
              <p className="mt-2 text-[rgba(255,255,255,0.5)] text-sm leading-relaxed">
                Sign in to continue to SoraPixel.
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

                <button
                  onClick={() => {
                    setStep("phone");
                    setError("");
                    setTimeout(() => phoneRef.current?.focus(), 100);
                  }}
                  className="w-full flex items-center justify-center gap-3 border border-[rgba(255,255,255,0.1)] rounded-2xl px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.2)] transition-all duration-250 cursor-pointer"
                >
                  <PhoneIcon className="w-5 h-5" />
                  Continue with Phone
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
                  onClick={() => { setStep("choose"); setError(""); }}
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
                  onClick={() => { setStep("choose"); setError(""); setEmail(""); }}
                  className="w-full text-center text-sm text-[rgba(255,255,255,0.4)] hover:text-white transition-colors py-2"
                >
                  Back to all sign-in options
                </button>
              </div>
            </>
          )}

          {step === "phone" && (
            <>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Enter your number
              </h1>
              <p className="mt-2 text-[rgba(255,255,255,0.5)] text-sm leading-relaxed">
                We&apos;ll send a verification code to your phone.
                <button
                  onClick={() => { setStep("choose"); setError(""); }}
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
                  <label className="block text-xs font-medium text-[rgba(255,255,255,0.5)] uppercase tracking-[0.05em]">Mobile Number</label>
                  <div className="flex items-center border border-[rgba(255,255,255,0.08)] rounded-[14px] px-4 py-3 focus-within:border-[#c4a67d] focus-within:shadow-[0_0_0_3px_rgba(196,166,125,0.15)] transition-all duration-250 hover:border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.04)]">
                    <span className="text-[rgba(255,255,255,0.5)] mr-2 font-medium text-sm">+91</span>
                    <input
                      ref={phoneRef}
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="Enter your number"
                      className="flex-1 outline-none text-base bg-transparent text-white placeholder:text-[rgba(255,255,255,0.25)]"
                      maxLength={10}
                      autoFocus
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSendOtp}
                  disabled={phone.replace(/\D/g, "").length !== 10}
                  loading={loading}
                  fullWidth
                  size="lg"
                >
                  Send OTP
                </Button>
              </div>
            </>
          )}

          {step === "phone-otp" && (
            <>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Verify your number
              </h1>
              <p className="mt-2 text-[rgba(255,255,255,0.5)] text-sm leading-relaxed">
                Enter the 6-digit code sent to <span className="font-semibold text-white">+91 {phone}</span>
                <button
                  onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                  className="text-[#d4b88f] ml-1.5 font-medium hover:text-[#c4a67d] transition-colors"
                >
                  Change
                </button>
              </p>

              {error && (
                <div className="mt-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#EF4444] px-4 py-2.5 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="mt-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[rgba(255,255,255,0.5)] uppercase tracking-[0.05em]">Verification Code</label>
                  <input
                    ref={otpRef}
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full border border-[rgba(255,255,255,0.08)] rounded-[14px] px-4 py-3.5 text-center text-xl tracking-[0.3em] font-semibold outline-none focus:border-[#c4a67d] focus:shadow-[0_0_0_3px_rgba(196,166,125,0.15)] transition-all duration-250 hover:border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.04)] text-white placeholder:text-[rgba(255,255,255,0.2)]"
                    maxLength={6}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[rgba(255,255,255,0.5)]">
                    {countdown > 0 ? (
                      <>Resend in <span className="font-semibold text-white">{countdown}s</span></>
                    ) : "Didn't get the code?"}
                  </span>
                  <button
                    onClick={handleSendOtp}
                    disabled={countdown > 0 || loading}
                    className="text-[#d4b88f] font-medium hover:text-[#c4a67d] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Resend
                  </button>
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={otp.length !== 6}
                  loading={loading}
                  fullWidth
                  size="lg"
                >
                  Verify
                </Button>
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
