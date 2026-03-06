import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";

export const metadata: Metadata = {
  title: "Jewelry Photography for Etsy — AI Product Photos",
  description:
    "Professional jewelry photography for Etsy sellers. AI-generated product photos that meet marketplace requirements. Etsy product photos in seconds — no studio needed.",
  alternates: { canonical: "/etsy-jewelry-photos" },
  openGraph: {
    title: "Jewelry Photography for Etsy — AI Product Photos | SoraiPixel",
    description:
      "Professional jewelry photography for Etsy. AI product photos that meet marketplace requirements. Try free.",
    url: `${SITE_URL}/etsy-jewelry-photos`,
    siteName: "SoraiPixel",
    type: "website",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Etsy Jewelry Photos", item: `${SITE_URL}/etsy-jewelry-photos` },
  ],
};

export default function EtsyJewelryPhotosPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="min-h-screen bg-[#f7f7f5]">
        <header className="bg-white border-b border-[#e8e5df]">
          <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0a0a0a] flex items-center justify-center">
                <span className="text-white text-xs font-bold">SP</span>
              </div>
              <span className="font-display font-bold text-[15px] tracking-tight text-[#0a0a0a]">SoraiPixel</span>
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
              Etsy Sellers
            </span>
            <h1 className="font-display font-bold text-white text-[2rem] md:text-[2.75rem] tracking-tight leading-[1.1] mb-4">
              Jewelry Photography for Etsy
            </h1>
            <p className="text-white/60 text-[15px] md:text-[16px] max-w-xl leading-relaxed">
              Professional product photos that make your Etsy listings stand out. AI-generated imagery in seconds — marketplace-ready dimensions, no studio required.
            </p>
            <Link
              href="/jewelry"
              className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[#0a0a0a] text-[14px] font-semibold rounded-full hover:bg-white/90 transition-all active:scale-[0.97]"
            >
              Create Etsy Photos
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            </Link>
          </div>
        </section>

        <main className="max-w-[900px] mx-auto px-4 sm:px-8 py-12 md:py-20">
          <section className="mb-14">
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.5rem] mb-4">
              Why Etsy Needs Professional Photos
            </h2>
            <p className="text-[#4a4a4a] text-[15px] leading-relaxed">
              Etsy buyers can&apos;t touch or try on your jewelry — they rely entirely on your images. Listings with crisp, well-lit product photos get more clicks, higher conversion rates, and better placement in search. Phone snaps on a cluttered desk rarely convey the craftsmanship that justifies your price.
            </p>
          </section>

          <section className="mb-14">
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.5rem] mb-4">
              How SoraiPixel Helps Etsy Sellers
            </h2>
            <p className="text-[#4a4a4a] text-[15px] leading-relaxed mb-6">
              Upload any photo of your jewelry — even a quick phone shot — and get studio-quality images in under 30 seconds. Our AI preserves every detail of your design while transforming backgrounds, lighting, and presentation. Perfect for rings, necklaces, earrings, bracelets, and more.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: "Hero Shots", desc: "Clean, front-facing product photos that highlight your craftsmanship." },
                { title: "Lifestyle Scenes", desc: "Jewelry in elegant settings that tell a story and inspire purchases." },
                { title: "Model Shots", desc: "AI models wearing your pieces — no photoshoot or model fees." },
                { title: "Close-Up Detail", desc: "Macro-style shots that show stones, prongs, and textures." },
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
              Marketplace-Ready Dimensions
            </h2>
            <p className="text-[#4a4a4a] text-[15px] leading-relaxed">
              Etsy recommends images at least 2000px on the longest side. SoraiPixel outputs high-resolution images in multiple aspect ratios — 1:1 for thumbnails, 3:4 for galleries, 9:16 for social — so your listings look sharp on desktop and mobile.
            </p>
          </section>

          <section className="mb-14">
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.5rem] mb-4">
              Tips for Etsy Listings
            </h2>
            <ul className="space-y-3">
              {[
                "Use your best image as the main listing photo — it appears in search results.",
                "Include at least 5 images: hero shot, lifestyle, detail, and alternate angles.",
                "Keep backgrounds clean or complementary so the jewelry stays the focus.",
                "Show scale when possible — a ring on a hand or necklace on a mannequin.",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-[#8b7355] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[14px] text-[#4a4a4a]">{tip}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* CTA */}
          <section className="text-center py-12 bg-white rounded-2xl border border-[#e8e5df]">
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">
              Ready to Upgrade Your Etsy Listings?
            </h2>
            <p className="text-[#8c8c8c] text-[14px] mb-6 max-w-md mx-auto">
              Try SoraiPixel free — no credit card required. Get professional jewelry photos in seconds.
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
