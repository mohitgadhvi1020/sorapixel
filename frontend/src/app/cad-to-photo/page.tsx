import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";

export const metadata: Metadata = {
  title: "From CAD Render to Product Photo in 30 Seconds — SoraiPixel",
  description:
    "Transform CAD renders into photorealistic product photos in 30 seconds. Jewelry CAD rendering to marketing-ready images. 3D jewelry to photo — hero shots, lifestyle scenes, model catalogue. No photoshoot needed.",
  keywords: [
    "CAD render to product photo",
    "jewelry CAD rendering",
    "3D jewelry to photo",
    "CAD to product photo",
    "jewelry render to photo",
    "3D render to marketing image",
    "CAD jewelry photography",
  ],
  alternates: { canonical: "/cad-to-photo" },
  openGraph: {
    title: "From CAD Render to Product Photo in 30 Seconds — SoraiPixel",
    description:
      "Transform 3D jewelry renders into photorealistic marketing assets. Hero shots, lifestyle scenes, model catalogue — all from your CAD file. No photoshoot, no waiting.",
    url: `${SITE_URL}/cad-to-photo`,
    siteName: "SoraiPixel",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/images/hero-jewelry.png`,
        width: 1376,
        height: 768,
        alt: "CAD render to product photo — SoraiPixel",
      },
    ],
  },
};

const benefits = [
  {
    title: "Pre-Production Marketing",
    desc: "Create catalogs, lookbooks, and listings before a single piece is manufactured. Sell from renders alone.",
  },
  {
    title: "Trade Show Ready",
    desc: "Full product lines photographed from renders alone. Launch collections at shows without physical samples.",
  },
  {
    title: "Zero Design Changes",
    desc: "AI preserves every detail from your CAD — prongs, stones, engravings, metal texture. Pixel-perfect fidelity.",
  },
  {
    title: "Multiple Angles",
    desc: "Hero shots, lifestyle scenes, model catalogue — all from one render. One upload, endless variations.",
  },
];

const targetAudience = [
  {
    title: "Jewelry Manufacturers",
    desc: "Showcase new collections to retailers before production. Generate B2B catalogs from CAD files.",
  },
  {
    title: "Independent Designers",
    desc: "Present designs to clients and investors. Create crowdfunding and pre-order imagery from renders.",
  },
  {
    title: "CAD/CAM Studios",
    desc: "Offer clients marketing-ready imagery as part of your design package. Add value without extra shoots.",
  },
];

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "CAD to Photo", item: `${SITE_URL}/cad-to-photo` },
  ],
};

export default function CadToPhotoPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Header */}
      <header className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center">
              <Logo className="text-lg" />
            </Link>
            <Link
              href="/"
              className="text-[13px] font-medium text-[#4a4a4a] hover:text-[#0a0a0a] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="bg-[#0a0a0a] overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24 text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#8b7355]/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[11px] sm:text-xs font-semibold text-[#c4a67d]/60 tracking-[0.12em] uppercase mb-4 block">
              CAD to Product Photo
            </span>
            <h1 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[2rem] sm:text-[3rem] md:text-[4rem] leading-[0.95] mb-5">
              From CAD Render to<br />
              <span className="text-[#c4a67d]">Product-Ready Image in 30 Seconds</span>
            </h1>
            <p className="text-white/40 text-[15px] md:text-[17px] max-w-lg mx-auto leading-relaxed">
              Transform 3D renders into photorealistic marketing assets. Hero shots, lifestyle scenes, model catalogue — no photoshoot, no physical samples, no waiting.
            </p>
          </div>
        </div>
      </section>

      {/* Before/After section */}
      <section className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-14 md:py-20">
          <div className="text-center mb-10">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
              Before &amp; After
            </span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.5rem] sm:text-[2rem] md:text-[2.5rem] leading-[1.0]">
              CAD Render <span className="text-[#8b7355]">to Photorealistic Photo</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="rounded-2xl overflow-hidden border border-[#e8e5df]">
              <div className="px-4 py-2.5 bg-[#fafaf8] border-b border-[#e8e5df]">
                <span className="text-[11px] font-semibold text-[#8c8c8c] tracking-wider uppercase">Before — CAD Render</span>
              </div>
              <img
                src="/images/cad-render.png"
                alt="Jewelry CAD render before AI transformation"
                className="w-full aspect-square object-cover"
              />
            </div>
            <div className="rounded-2xl overflow-hidden border border-[#c4a67d]/30">
              <div className="px-4 py-2.5 bg-[#f5f0e8] border-b border-[#c4a67d]/20">
                <span className="text-[11px] font-semibold text-[#8b7355] tracking-wider uppercase">After — AI Product Photo</span>
              </div>
              <img
                src="/images/dark-elegance.png"
                alt="Photorealistic jewelry product photo from CAD render by SoraiPixel"
                className="w-full aspect-square object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits section */}
      <section className="bg-[#f7f7f5]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-14 md:py-20">
          <div className="text-center mb-12">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
              Why CAD to Photo
            </span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.5rem] sm:text-[2rem] md:text-[2.5rem] leading-[1.0]">
              Built for <span className="text-[#8b7355]">Jewelry Manufacturers</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b) => (
              <article
                key={b.title}
                className="rounded-2xl border border-[#e8e5df] bg-white p-6 hover:border-[#c4a67d]/30 transition-all duration-300"
              >
                <h3 className="font-display font-bold text-[#0a0a0a] text-[15px] tracking-tight mb-2">
                  {b.title}
                </h3>
                <p className="text-[#8c8c8c] text-[13px] leading-relaxed">
                  {b.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Target audience section */}
      <section className="bg-white border-t border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-14 md:py-20">
          <div className="text-center mb-12">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
              Who It&apos;s For
            </span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.5rem] sm:text-[2rem] md:text-[2.5rem] leading-[1.0]">
              From <span className="text-[#8b7355]">Renders to Revenue</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {targetAudience.map((a) => (
              <article
                key={a.title}
                className="rounded-2xl border border-[#e8e5df] bg-[#fafaf8] p-6 hover:border-[#c4a67d]/30 transition-all duration-300"
              >
                <h3 className="font-display font-bold text-[#0a0a0a] text-[15px] tracking-tight mb-2">
                  {a.title}
                </h3>
                <p className="text-[#8c8c8c] text-[13px] leading-relaxed">
                  {a.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="bg-[#0a0a0a]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24 text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#8b7355]/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[1.75rem] sm:text-[2.5rem] md:text-[3.5rem] leading-[0.95] mb-5">
              Turn Your CAD Renders<br />
              <span className="text-[#c4a67d]">Into Product Photos Today</span>
            </h2>
            <p className="text-white/40 text-[15px] max-w-md mx-auto mb-8 leading-relaxed">
              Upload any jewelry render and get photorealistic marketing images in 30 seconds. Start free — no credit card required.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/jewelry"
                className="px-8 py-4 bg-white text-[#0a0a0a] text-[14px] font-semibold rounded-full hover:bg-white/90 transition-all active:scale-[0.97] shadow-lg"
              >
                Try It Free
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-4 border border-white/15 text-white/60 text-[14px] font-medium rounded-full hover:border-white/30 hover:text-white transition-all"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">Home</Link>
              <Link href="/cad-to-photo" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">CAD to Photo</Link>
              <Link href="/ai-photography" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">AI Photography</Link>
              <Link href="/ai-jewelry-photography" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">AI Jewelry Photography</Link>
              <Link href="/blog" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">Blog</Link>
              <Link href="/pricing" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">Pricing</Link>
            </div>
            <span className="text-[11px] text-white/20">&copy; {new Date().getFullYear()} SoraiPixel. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
