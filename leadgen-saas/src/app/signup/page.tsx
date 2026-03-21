"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Mail, Lock, ArrowRight, User, Building, Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-hero bg-gradient-mesh flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">LeadFlow<span className="text-primary">AI</span></span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Create your account</h1>
          <p className="text-text-secondary">Start generating leads in minutes</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-lg border border-border/50 animate-slide-up">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-surface-secondary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Company Name</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc."
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-surface-secondary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-surface-secondary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters"
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-border bg-surface-secondary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" required minLength={8} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 mt-2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <p className="mt-6 text-xs text-text-tertiary text-center">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>

          <div className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:text-primary-dark">Log in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
