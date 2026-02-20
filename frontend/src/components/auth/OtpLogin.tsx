"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
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

export default function OtpLogin() {
  const { signInWithPhone, verifyPhoneOtp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"choose" | "phone" | "otp">("choose");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  const otpRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

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
      setStep("otp");
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
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-accent-lighter items-center justify-center relative">
        <div className="max-w-md text-center px-12">
          <div className="w-16 h-16 rounded-2xl accent-gradient flex items-center justify-center mx-auto mb-8 shadow-[var(--shadow-accent)]">
            <span className="text-white text-2xl font-bold tracking-tight">SP</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight leading-tight">
            AI Product Photography
          </h2>
          <p className="mt-4 text-text-secondary text-base leading-relaxed">
            Transform raw product photos into studio-quality images.
            Trusted by serious brands.
          </p>
          <div className="mt-12 flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">10K+</p>
              <p className="text-xs text-text-secondary mt-1">Photos Created</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">500+</p>
              <p className="text-xs text-text-secondary mt-1">Brands</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">4.9</p>
              <p className="text-xs text-text-secondary mt-1">Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center">
              <span className="text-white text-sm font-bold tracking-tight">SP</span>
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">SoraPixel</span>
          </div>

          {step === "choose" && (
            <>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                Welcome back
              </h1>
              <p className="mt-2 text-text-secondary text-sm leading-relaxed">
                Sign in to continue to SoraPixel.
              </p>

              {error && (
                <div className="mt-4 bg-error-light border border-error/10 text-error px-4 py-2.5 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="mt-8 space-y-3">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 border border-border rounded-2xl px-6 py-3.5 text-[15px] font-semibold text-foreground hover:bg-surface-hover hover:border-border-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-text-secondary">or</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setStep("phone");
                    setError("");
                    setTimeout(() => phoneRef.current?.focus(), 100);
                  }}
                  className="w-full flex items-center justify-center gap-3 border border-border rounded-2xl px-6 py-3.5 text-[15px] font-semibold text-foreground hover:bg-surface-hover hover:border-border-hover transition-all duration-200 cursor-pointer"
                >
                  <PhoneIcon className="w-5 h-5" />
                  Continue with Phone
                </button>
              </div>
            </>
          )}

          {step === "phone" && (
            <>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                Enter your number
              </h1>
              <p className="mt-2 text-text-secondary text-sm leading-relaxed">
                We&apos;ll send a verification code to your phone.
                <button
                  onClick={() => { setStep("choose"); setError(""); }}
                  className="text-accent ml-1.5 font-medium hover:text-accent-dark transition-colors"
                >
                  Back
                </button>
              </p>

              {error && (
                <div className="mt-4 bg-error-light border border-error/10 text-error px-4 py-2.5 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="mt-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Mobile Number</label>
                  <div className="flex items-center border border-border rounded-xl px-4 py-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10 transition-all duration-200 hover:border-border-hover bg-white">
                    <span className="text-text-secondary mr-2 font-medium text-sm">+91</span>
                    <input
                      ref={phoneRef}
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="Enter your number"
                      className="flex-1 outline-none text-base bg-transparent text-foreground placeholder:text-text-secondary/50"
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

          {step === "otp" && (
            <>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                Verify your number
              </h1>
              <p className="mt-2 text-text-secondary text-sm leading-relaxed">
                Enter the 6-digit code sent to <span className="font-semibold text-foreground">+91 {phone}</span>
                <button
                  onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                  className="text-accent ml-1.5 font-medium hover:text-accent-dark transition-colors"
                >
                  Change
                </button>
              </p>

              {error && (
                <div className="mt-4 bg-error-light border border-error/10 text-error px-4 py-2.5 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="mt-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-foreground">Verification Code</label>
                  <input
                    ref={otpRef}
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full border border-border rounded-xl px-4 py-3.5 text-center text-xl tracking-[0.3em] font-semibold outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200 hover:border-border-hover bg-white"
                    maxLength={6}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">
                    {countdown > 0 ? (
                      <>Resend in <span className="font-semibold text-foreground">{countdown}s</span></>
                    ) : "Didn't get the code?"}
                  </span>
                  <button
                    onClick={handleSendOtp}
                    disabled={countdown > 0 || loading}
                    className="text-accent font-medium hover:text-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

          <p className="mt-8 text-xs text-text-secondary text-center leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
