import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";

export const metadata: Metadata = {
  title: "Referral Program — Earn Free Images | SoraiPixel",
  description: "Share SoraiPixel with fellow jewelers and earn free AI-generated jewelry images. Get 5 free tokens for every friend who signs up.",
  alternates: { canonical: "/referral" },
  openGraph: {
    title: "Referral Program — Earn Free Images | SoraiPixel",
    description: "Share SoraiPixel with fellow jewelers and earn free tokens for every referral.",
    url: `${SITE_URL}/referral`,
    siteName: "SoraiPixel",
    type: "website",
  },
};

export default function ReferralPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Referral Program", item: `${SITE_URL}/referral` },
            ],
          }),
        }}
      />

      <header className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#0a0a0a] flex items-center justify-center">
              <span className="text-white text-xs font-bold">SP</span>
            </div>
            <span className="font-display font-bold text-[15px] tracking-tight text-[#0a0a0a]">SoraiPixel</span>
          </Link>
          <Link href="/" className="text-[13px] font-medium text-[#4a4a4a] hover:text-[#0a0a0a] transition-colors">Back to Home</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#0a0a0a] overflow-hidden">
        <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-16 md:py-24 text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#c4a67d]/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[rgba(196,166,125,0.1)] border border-[rgba(196,166,125,0.2)] rounded-full text-[10px] font-bold text-[#c4a67d] tracking-[0.12em] uppercase mb-5">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              Referral Program
            </span>
            <h1 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[2rem] sm:text-[2.75rem] md:text-[3.5rem] leading-[0.95] mb-5">
              Share SoraiPixel,<br /><span className="text-[#c4a67d]">Earn Free Images</span>
            </h1>
            <p className="text-white/40 text-[15px] md:text-[17px] max-w-md mx-auto leading-relaxed">
              Know a jeweler who needs better product photos? Refer them to SoraiPixel and you both get rewarded.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <main className="max-w-[900px] mx-auto px-4 sm:px-8 py-12 md:py-20">
        <div className="text-center mb-12">
          <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">How It Works</span>
          <h2 className="font-display font-bold text-[#0a0a0a] text-[1.5rem] sm:text-[2rem] tracking-tight">Three Simple Steps</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
          {[
            { step: "1", title: "Share Your Link", desc: "Get your unique referral link from your dashboard and share it with fellow jewelers, friends, or social media followers." },
            { step: "2", title: "They Sign Up", desc: "When someone signs up through your link, they automatically get 3 bonus tokens to start creating professional photos." },
            { step: "3", title: "You Get Rewarded", desc: "For every friend who signs up, you receive 5 free tokens. No limit — the more you share, the more you earn." },
          ].map((item) => (
            <div key={item.step} className="text-center bg-white rounded-2xl p-6 border border-[#e8e5df]">
              <div className="w-10 h-10 rounded-full bg-[#f5f0e8] flex items-center justify-center mx-auto mb-4">
                <span className="text-[14px] font-bold text-[#8b7355]">{item.step}</span>
              </div>
              <h3 className="font-display font-bold text-[#0a0a0a] text-[15px] mb-2">{item.title}</h3>
              <p className="text-[#8c8c8c] text-[13px] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Rewards Table */}
        <div className="bg-white rounded-2xl border border-[#e8e5df] p-6 sm:p-8 mb-16">
          <h3 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-6 text-center">What You Get</h3>
          <div className="space-y-4">
            {[
              { action: "Friend signs up", youGet: "5 free tokens", theyGet: "3 bonus tokens" },
              { action: "Friend buys Starter Pack", youGet: "10 free tokens", theyGet: "5 bonus tokens" },
              { action: "Friend buys Growth/Business", youGet: "20 free tokens", theyGet: "10 bonus tokens" },
            ].map((row) => (
              <div key={row.action} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0 bg-[#fafaf8] rounded-xl p-4 border border-[#f0ede8]">
                <div className="sm:flex-1">
                  <p className="text-[14px] font-semibold text-[#0a0a0a]">{row.action}</p>
                </div>
                <div className="sm:flex-1 flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-[#f5f0e8] text-[#8b7355] text-[11px] font-bold rounded-full">You get</span>
                  <span className="text-[14px] font-semibold text-[#0a0a0a]">{row.youGet}</span>
                </div>
                <div className="sm:flex-1 flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-[#e8f5e9] text-[#2e7d32] text-[11px] font-bold rounded-full">They get</span>
                  <span className="text-[14px] font-semibold text-[#0a0a0a]">{row.theyGet}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-[#0a0a0a] rounded-3xl p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#c4a67d]/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <h3 className="font-display font-bold text-white text-[1.25rem] sm:text-[1.5rem] tracking-tight mb-3">
              Ready to Start Referring?
            </h3>
            <p className="text-white/40 text-[14px] max-w-sm mx-auto mb-6 leading-relaxed">
              Log in to your SoraiPixel account to get your unique referral link. Not a member yet? Sign up free.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/profile"
                className="px-7 py-3.5 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-[14px] font-bold rounded-full hover:shadow-[0_6px_24px_rgba(196,166,125,0.35)] transition-all active:scale-[0.97]"
              >
                Get My Referral Link
              </Link>
              <Link
                href="/jewelry"
                className="px-7 py-3.5 border border-white/15 text-white/60 text-[14px] font-medium rounded-full hover:border-white/30 hover:text-white transition-all"
              >
                Try SoraiPixel Free
              </Link>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h3 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-6 text-center">Referral FAQ</h3>
          <div className="space-y-3">
            {[
              { q: "Is there a limit on referrals?", a: "No! You can refer as many people as you want. Each referral earns you tokens." },
              { q: "Do referral tokens expire?", a: "No. Tokens earned through referrals are added to your account and never expire." },
              { q: "How does my friend get their bonus?", a: "When they sign up using your referral link, the bonus tokens are automatically added to their account." },
              { q: "Can I refer someone who already has an account?", a: "Referral bonuses only apply to new signups. If they already have an account, the referral won't be tracked." },
            ].map((faq) => (
              <div key={faq.q} className="bg-white rounded-xl border border-[#e8e5df] p-5">
                <p className="font-semibold text-[#0a0a0a] text-[14px] mb-1.5">{faq.q}</p>
                <p className="text-[#8c8c8c] text-[13px] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="bg-[#0a0a0a] border-t border-white/5">
        <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[11px] text-white/20">&copy; {new Date().getFullYear()} SoraiPixel. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
