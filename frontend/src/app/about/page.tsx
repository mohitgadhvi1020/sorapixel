import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";

export const metadata: Metadata = {
  title: "About SoraiPixel",
  description: "SoraiPixel is an AI jewelry photography platform built to help jewelers get studio-quality product images instantly. Learn about our mission and team.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About SoraiPixel — AI Jewelry Photography",
    description: "Learn about SoraiPixel, the AI-powered platform transforming jewelry product photography.",
    url: `${SITE_URL}/about`,
    siteName: "SoraiPixel",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f5]">
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

      <main className="max-w-[900px] mx-auto px-4 sm:px-8 py-12 md:py-20">
        <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-4 block">About Us</span>
        <h1 className="font-display font-bold text-[#0a0a0a] text-[2rem] md:text-[2.5rem] tracking-tight mb-6">
          Making Professional Jewelry Photography<br />Accessible to Every Jeweler
        </h1>

        <div className="space-y-8 text-[#4a4a4a] text-[15px] leading-relaxed">
          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">The Problem We Saw</h2>
            <p>Professional jewelry photography costs thousands of rupees per product. Small jewelers and independent sellers are forced to choose between expensive studio photoshoots and low-quality phone photos that don&apos;t do their craftsmanship justice.</p>
            <p className="mt-3">A stunning handcrafted ring photographed on a kitchen table looks nothing like the same ring in a professional catalog. Yet that phone photo is often all a customer sees before deciding to buy — or scroll past.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">Our Solution</h2>
            <p>SoraiPixel uses AI specifically trained for jewelry to transform any product photo — even a phone snap or CAD render — into studio-quality imagery in under 30 seconds. Hero shots, lifestyle scenes, model photos, close-ups — all from a single upload.</p>
            <p className="mt-3">The key difference from generic AI tools: we never alter your jewelry design. Every stone, prong, and engraving stays exactly as you crafted it. Only the background, lighting, and presentation change.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">Who We Serve</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="bg-white rounded-xl p-5 border border-[#e8e5df]">
                <h3 className="font-display font-bold text-[#0a0a0a] text-[15px] mb-2">Independent Jewelers</h3>
                <p className="text-[13px] text-[#8c8c8c]">From Jaipur workshops to New York studios — artisans who need professional images without professional budgets.</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-[#e8e5df]">
                <h3 className="font-display font-bold text-[#0a0a0a] text-[15px] mb-2">Online Sellers</h3>
                <p className="text-[13px] text-[#8c8c8c]">Etsy, Amazon, Shopify, and Instagram sellers who know better photos mean more sales.</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-[#e8e5df]">
                <h3 className="font-display font-bold text-[#0a0a0a] text-[15px] mb-2">Manufacturers</h3>
                <p className="text-[13px] text-[#8c8c8c]">Bulk catalog generation from CAD renders, enabling pre-production marketing and trade show materials.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">Our Commitment</h2>
            <div className="space-y-3 mt-4">
              {[
                "Zero design changes — your jewelry stays untouched, guaranteed.",
                "Transparent pricing — no hidden fees, no surprise charges.",
                "Data privacy — your images are yours, we never use them without consent.",
                "Continuous improvement — we ship updates weekly based on jeweler feedback.",
              ].map((point) => (
                <div key={point} className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-[#8b7355] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  <span className="text-[14px] text-[#4a4a4a]">{point}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">Get In Touch</h2>
            <p>Questions, feedback, or partnership inquiries — we&apos;d love to hear from you.</p>
            <p className="mt-2"><strong>Email:</strong> <a href="mailto:contact@soraipixel.com" className="text-[#8b7355] underline">contact@soraipixel.com</a></p>
            <p><strong>WhatsApp:</strong> <a href="https://wa.me/916351068776" className="text-[#8b7355] underline">+91 63510 68776</a></p>
          </section>
        </div>

        <div className="mt-12 text-center">
          <Link href="/jewelry" className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#0a0a0a] text-white text-[14px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all active:scale-[0.97]">
            Try SoraiPixel Free
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
          </Link>
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
