import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";

export const metadata: Metadata = {
  title: "Shopify Jewelry Product Images — AI Photography",
  description:
    "Professional Shopify jewelry product images. AI photography for lifestyle shots, hero images, and model photos. Consistent brand look for your Shopify store.",
  alternates: { canonical: "/shopify-jewelry-images" },
  openGraph: {
    title: "Shopify Jewelry Product Images — AI Photography | SoraiPixel",
    description:
      "AI jewelry photography for Shopify stores. Lifestyle, hero, and model shots in seconds.",
    url: `${SITE_URL}/shopify-jewelry-images`,
    siteName: "SoraiPixel",
    type: "website",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Shopify Jewelry Images", item: `${SITE_URL}/shopify-jewelry-images` },
  ],
};

export default function ShopifyJewelryImagesPage() {
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
              Shopify Stores
            </span>
            <h1 className="font-display font-bold text-white text-[2rem] md:text-[2.75rem] tracking-tight leading-[1.1] mb-4">
              Shopify Jewelry Product Images
            </h1>
            <p className="text-white/60 text-[15px] md:text-[16px] max-w-xl leading-relaxed">
              Professional AI photography for your Shopify jewelry store. Hero shots, lifestyle scenes, and model photos — consistent brand imagery in seconds.
            </p>
            <Link
              href="/jewelry"
              className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[#0a0a0a] text-[14px] font-semibold rounded-full hover:bg-white/90 transition-all active:scale-[0.97]"
            >
              Create Shopify Photos
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
              </svg>
            </Link>
          </div>
        </section>

        <main className="max-w-[900px] mx-auto px-4 sm:px-8 py-12 md:py-20">
          <section className="mb-14">
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.5rem] mb-4">
              How Professional Photos Increase Shopify Conversions
            </h2>
            <p className="text-[#4a4a4a] text-[15px] leading-relaxed">
              Shopify stores with high-quality product imagery convert significantly better than those with amateur photos. Shoppers can&apos;t try on your jewelry — they rely on images to imagine ownership. Crisp hero shots, lifestyle contexts, and model photos build trust and reduce hesitation at checkout.
            </p>
          </section>

          <section className="mb-14">
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.5rem] mb-4">
              Lifestyle, Hero & Model Shots for Shopify
            </h2>
            <p className="text-[#4a4a4a] text-[15px] leading-relaxed mb-6">
              SoraiPixel generates the full range of imagery your Shopify store needs. Upload one photo and get hero shots for product pages, lifestyle scenes for collections, and model photos for lookbooks — all in under 30 seconds per image.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: "Hero Shots", desc: "Clean, front-facing product images for your main product gallery." },
                { title: "Lifestyle Scenes", desc: "Jewelry in elegant settings — velvet, marble, editorial backdrops." },
                { title: "Model Shots", desc: "AI models wearing your pieces for collection pages and lookbooks." },
                { title: "Close-Up Detail", desc: "Macro shots that highlight stones, metalwork, and craftsmanship." },
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
              Consistent Brand Look
            </h2>
            <p className="text-[#4a4a4a] text-[15px] leading-relaxed">
              Mixing phone photos, stock imagery, and studio shots creates a disjointed store experience. SoraiPixel lets you generate a consistent visual style across your entire catalog — same lighting, same aesthetic, same quality. Your Shopify store looks like a cohesive brand, not a patchwork of sources.
            </p>
          </section>

          <section className="mb-14">
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.5rem] mb-4">
              Flexible Output for Shopify Themes
            </h2>
            <p className="text-[#4a4a4a] text-[15px] leading-relaxed">
              Export images in multiple aspect ratios — 1:1 for grids, 3:4 for product pages, 16:9 for banners — so they fit your Shopify theme perfectly. High-resolution output ensures your jewelry looks sharp on retina displays and mobile.
            </p>
          </section>

          {/* CTA */}
          <section className="text-center py-12 bg-white rounded-2xl border border-[#e8e5df]">
            <h2 className="font-display font-bold text-[#0a0a0a] text-[1.25rem] mb-3">
              Ready to Elevate Your Shopify Store?
            </h2>
            <p className="text-[#8c8c8c] text-[14px] mb-6 max-w-md mx-auto">
              Try SoraiPixel free — professional jewelry photos in seconds. No credit card required.
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
