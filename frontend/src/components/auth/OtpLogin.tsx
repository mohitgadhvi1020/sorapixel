"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function OtpLogin() {
  const { sendOtp, verifyOtp } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  const otpRef = useRef<HTMLInputElement>(null);

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
      await sendOtp(clean);
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
      await verifyOtp(phone.replace(/\D/g, ""), otp);
      router.push("/");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col">
      {/* Hero section */}
      <div className="relative h-72 bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center overflow-hidden">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-2">SoraPixel</h1>
          <p className="text-pink-100">AI Product Photography</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-8 -mt-8 bg-white rounded-t-3xl">
        <h2 className="text-2xl font-bold mb-2">
          {step === "phone" ? "Boost Sales with SoraPixel" : "Enter OTP"}
        </h2>

        {step === "phone" && (
          <p className="text-gray-500 mb-6 text-sm">
            Enter 6 digit OTP sent on <strong>{phone || "your number"}</strong>
            {phone && (
              <button
                onClick={() => { setStep("phone"); setOtp(""); }}
                className="text-pink-500 ml-2 underline"
              >
                Edit
              </button>
            )}
          </p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {step === "phone" ? (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
            <div className="flex items-center border border-gray-300 rounded-xl px-4 py-3 mb-6">
              <span className="text-gray-500 mr-2 font-medium">+91</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="Enter Mobile Number"
                className="flex-1 outline-none text-lg"
                maxLength={10}
                autoFocus
              />
            </div>
            <button
              onClick={handleSendOtp}
              disabled={loading || phone.replace(/\D/g, "").length !== 10}
              className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-xl transition-colors text-lg"
            >
              {loading ? "Sending..." : "Next"}
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-500 mb-4 text-sm">
              Enter 6 digit OTP sent on <strong>{phone}</strong>
              <button
                onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
                className="text-pink-500 ml-2"
              >
                ✏️
              </button>
            </p>
            <input
              ref={otpRef}
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6 digits here"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-2xl tracking-widest mb-4 outline-none focus:border-pink-400"
              maxLength={6}
            />
            <div className="flex items-center justify-between mb-6 text-sm">
              <span className="text-gray-400">
                Code expires in ... <span className="text-pink-500">{countdown}s</span>
              </span>
              <button
                onClick={handleSendOtp}
                disabled={countdown > 0 || loading}
                className="px-4 py-1 border border-gray-300 rounded-full text-sm disabled:opacity-50"
              >
                Resend
              </button>
            </div>
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-xl transition-colors text-lg"
            >
              {loading ? "Verifying..." : "Submit"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
