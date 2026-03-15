import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";

export const metadata: Metadata = {
  title: "Amazon Jewelry Photography — White Background AI Photos",
  description:
    "Amazon jewelry photography that meets strict image requirements. AI-generated white background product photos. Amazon-compliant images in seconds — no studio needed.",
  alternates: { canonical: "/amazon-jewelry-photography" },
  openGraph: {
    title: "Amazon Jewelry Photography — White Background AI Photos | SoraiPixel",
    description:
      "Amazon-compliant jewelry photography. AI white background images that meet Amazon's strict requirements.",
    url: `${SITE_URL}/amazon-jewelry-photography`,
    siteName: "SoraiPixel",
    type: "website",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Amazon Jewelry Photography", item: `${SITE_URL}/amazon-jewelry-photography` },
  ],
};

export default function AmazonJewelryPhotographyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="min-h-screen bg-[#f7f7f5]">
        <header className="bg-white border-b border-[#e8e5df]">
          <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Logo className="text-lg" />
            </Link>
            <Link href="/" className="text-[13px] font-medium text-[#4a4a4a] hover:text-[#0a0a0a] transition-colors">
              Back to Home
            </Link>
          </div>
        </header>

        {/* Hero — dark bg */}
        <section className="relative bg-[#0a0a0a] overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#1a1610] to-[#0a0a0a]" />
            <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-[#8b7355]/[0.07] rounded-full blur-[150px]" />
          </div>
          <div className="relative z-10 max-w-[900px] mx-auto px-4 sm:px-8 py-16 md:py-24">
            <span className="text-[11px] sm:text-xs font-semibold text-[#c4a67d] tracking-[0.12em] uppercase mb-4 block">
              Amazon Sellers
            </span>
            <h1 className="font-display font-bold text-white text-[2rem] md:text-[2.75rem] tracking-tight leading-[1.1] mb-4">
              Amazon Jewelry Photography
            </h1>
            <p className="text-white/60 text-[15px] md:text-[16px] max-w-xl leading-relaxed">
              White background product photos that meet Amazon&apos;s strict image requirements. AI-generated, compliant imagery in seconds — no studio, no editing hassles.
            </p>
            <Link
              href="/jewelry"
              className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[#0a0a0a] text-[14px] font-semibold rounded-full hover:bg-white/90 transition-all active:scale-[0.97]"
            >
              Create Amazon Photos
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            </Link>
          </div>
        </section>

        <main className="max-w-[900px] mx-auto px-4 sm:px-8 py-12 md:py-20">
          <section className="mb-14">
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.5rem] mb-4">
              Amazon&apos;s Strict Image Requirements
            </h2>
            <p className="text-[#4a4a4a] text-[15px] leading-relaxed">
              Amazon requires main product images on a pure white background (RGB 255, 255, 255), with the product filling at least 85% of the frame. No props, watermarks, or lifestyle elements on the main image. Non-compliant listings get suppressed from search or rejected — costing you visibility and sales.
            </p>
          </section>

          <section className="mb-14">
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.5rem] mb-4">
              Auto-Generated Compliant White Backgrounds
            </h2>
            <p className="text-[#4a4a4a] text-[15px] leading-relaxed mb-6">
              SoraiPixel automatically generates Amazon-compliant white background images from any source photo. Upload a phone snap, CAD render, or existing product shot — our AI isolates your jewelry and places it on a clean white background that meets Amazon&apos;s specs. No manual masking or Photoshop required.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: "Pure White Background", desc: "RGB 255,255,255 — meets Amazon's main image requirement." },
                { title: "Product-Focused", desc: "Jewelry fills the frame with no props or distractions." },
                { title: "High Resolution", desc: "Output at 1000px+ on the longest side for crisp detail." },
                { title: "Batch Ready", desc: "Process multiple SKUs for catalog-scale listings." },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-xl p-5 border border-[#e8e5df]">
                  <h3 className="font-display font-bold text-[#0a0a0a] text-[15px] mb-2">{item.title}</h3>
                  <p className="text-[13px] text-[#8c8c8c]">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-14">
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.5rem] mb-4">
              A+ Content & Lifestyle Photos
            </h2>
            <p className="text-[#4a4a4a] text-[15px] leading-relaxed">
              Beyond the main image, Amazon allows lifestyle and alternate shots in your gallery and A+ Content. SoraiPixel generates hero shots, model photos, and lifestyle scenes — perfect for secondary images that showcase your jewelry in context and drive conversions.
            </p>
          </section>

          <section className="mb-14">
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.5rem] mb-4">
              Zero Design Changes
            </h2>
            <p className="text-[#4a4a4a] text-[15px] leading-relaxed">
              Our AI never alters your jewelry design. Every stone, prong, engraving, and metal finish stays exactly as you crafted it. Only the background and lighting change — so your product listing accurately represents what customers receive.
            </p>
          </section>

          {/* CTA */}
          <section className="text-center py-12 bg-white rounded-2xl border border-[#e8e5df]">
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">
              Ready for Amazon-Compliant Jewelry Photos?
            </h2>
            <p className="text-[#8c8c8c] text-[14px] mb-6 max-w-md mx-auto">
              Try SoraiPixel free — white background images in seconds. No credit card required.
            </p>
            <Link
              href="/jewelry"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#0a0a0a] text-white text-[14px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all active:scale-[0.97]"
            >
              Try SoraiPixel Free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            </Link>
          </section>
        </main>

        <footer className="bg-[#0a0a0a] border-t border-white/5">
          <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[11px] text-white/20">&copy; {new Date().getFullYear()} SoraiPixel. All rights reserved.</span>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
