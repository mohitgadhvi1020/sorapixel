import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";

export const metadata: Metadata = {
  title: "Gallery — AI Jewelry Photography Examples & Before/After",
  description:
    "See real before and after examples of AI-powered jewelry photography. Phone snaps transformed into studio-quality product images — hero shots, model photos, and lifestyle scenes.",
  keywords: [
    "AI jewelry photography examples",
    "before after jewelry photos",
    "AI product photography gallery",
    "jewelry photo transformation",
    "AI enhanced jewelry images",
  ],
  alternates: { canonical: "/gallery" },
  openGraph: {
    title: "Gallery — SoraiPixel AI Jewelry Photography Examples",
    description:
      "See real before and after examples of AI-powered jewelry photography. Phone snaps transformed into studio-quality product images.",
    url: `${SITE_URL}/gallery`,
    siteName: "SoraiPixel",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/images/hero-jewelry.png`,
        width: 1376,
        height: 768,
        alt: "SoraiPixel AI Jewelry Photography Gallery",
      },
    ],
  },
};

const showcaseItems = [
  {
    title: "Gold Necklace — Hero Shot",
    desc: "Simple phone photo transformed into a professional hero shot with perfect lighting and reflections.",
    img: "/images/gold-necklace.png",
    category: "Hero Shots",
  },
  {
    title: "Diamond Ring — Studio Quality",
    desc: "Raw product photo turned into a clean studio image with controlled shadows and sparkle.",
    img: "/images/diamond-ring.png",
    category: "Studio Photography",
  },
  {
    title: "Earring — Close-Up Detail",
    desc: "AI-enhanced macro shot revealing every facet, texture, and stone detail.",
    img: "/images/earring-detail.png",
    category: "Close-Up Detail",
  },
  {
    title: "Bracelet — On-Model Photography",
    desc: "AI-generated model wearing the bracelet. No photoshoot needed, no model hired.",
    img: "/images/model-bracelet.png",
    category: "Model Catalogue",
  },
  {
    title: "Necklace — Lifestyle Scene",
    desc: "Jewelry placed in a warm, lifestyle context automatically by AI.",
    img: "/images/necklace-model.png",
    category: "Lifestyle",
  },
  {
    title: "Dark Elegance — Dramatic Styling",
    desc: "Moody, editorial-style product shot with deep shadows and luxury feel.",
    img: "/images/dark-elegance.png",
    category: "Editorial",
  },
  {
    title: "Ring on Hand — Context Shot",
    desc: "AI places your ring on a hand model for scale and wearability context.",
    img: "/images/ring-hand.png",
    category: "On-Model",
  },
  {
    title: "Professional Studio Shot",
    desc: "Clean, white-background studio photography — the e-commerce standard.",
    img: "/images/studio-shot.png",
    category: "Studio Photography",
  },
];

const categories = ["All", "Hero Shots", "Studio Photography", "Close-Up Detail", "Model Catalogue", "Lifestyle", "Editorial", "On-Model"];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ImageGallery",
  name: "SoraiPixel AI Jewelry Photography Gallery",
  description: "Before and after examples of AI-powered jewelry photography transformations.",
  url: `${SITE_URL}/gallery`,
  publisher: {
    "@type": "Organization",
    name: "SoraiPixel",
    url: SITE_URL,
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Gallery", item: `${SITE_URL}/gallery` },
  ],
};

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Header */}
      <header className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0a0a0a] flex items-center justify-center">
                <span className="text-white text-xs font-bold">SP</span>
              </div>
              <span className="font-display font-bold text-[15px] tracking-tight text-[#0a0a0a]">
                SoraiPixel
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/blog"
                className="text-[13px] font-medium text-[#4a4a4a] hover:text-[#0a0a0a] transition-colors hidden sm:block"
              >
                Blog
              </Link>
              <Link
                href="/pricing"
                className="text-[13px] font-medium text-[#4a4a4a] hover:text-[#0a0a0a] transition-colors hidden sm:block"
              >
                Pricing
              </Link>
              <Link
                href="/jewelry"
                className="px-5 py-2 bg-[#0a0a0a] text-white text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all"
              >
                Start Creating
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="bg-[#0a0a0a] overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24 text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#8b7355]/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[11px] sm:text-xs font-semibold text-[#c4a67d]/60 tracking-[0.12em] uppercase mb-4 block">
              Gallery
            </span>
            <h1 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[2rem] sm:text-[3rem] md:text-[4rem] leading-[0.95] mb-5">
              AI Jewelry Photography<br />
              <span className="text-[#c4a67d]">In Action</span>
            </h1>
            <p className="text-white/40 text-[15px] md:text-[17px] max-w-lg mx-auto leading-relaxed">
              Every image below was generated by SoraiPixel&apos;s AI from a simple product photo. No studio, no photographer, no retouching.
            </p>
          </div>
        </div>
      </section>

      {/* Before/After Highlight */}
      <section className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-14 md:py-20">
          <div className="text-center mb-10">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
              Before &amp; After
            </span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.5rem] sm:text-[2rem] md:text-[2.5rem] leading-[1.0]">
              Phone Snap <span className="text-[#8b7355]">to Studio Quality</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="rounded-2xl overflow-hidden border border-[#e8e5df]">
              <div className="px-4 py-2.5 bg-[#fafaf8] border-b border-[#e8e5df]">
                <span className="text-[11px] font-semibold text-[#8c8c8c] tracking-wider uppercase">Before — Phone Photo</span>
              </div>
              <img
                src="/images/before-rough.png"
                alt="Raw jewelry phone photo before AI enhancement"
                className="w-full aspect-square object-cover"
              />
            </div>
            <div className="rounded-2xl overflow-hidden border border-[#c4a67d]/30">
              <div className="px-4 py-2.5 bg-[#f5f0e8] border-b border-[#c4a67d]/20">
                <span className="text-[11px] font-semibold text-[#8b7355] tracking-wider uppercase">After — AI Enhanced</span>
              </div>
              <img
                src="/images/after-magic.png"
                alt="AI-enhanced studio-quality jewelry photo by SoraiPixel"
                className="w-full aspect-square object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category filter (static for SEO — not interactive) */}
      <section className="bg-[#f7f7f5]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pt-14 md:pt-20 pb-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat, i) => (
              <span
                key={cat}
                className={`px-4 py-2 rounded-full text-[12px] font-semibold transition-all ${
                  i === 0
                    ? "bg-[#0a0a0a] text-white"
                    : "bg-white text-[#4a4a4a] border border-[#e8e5df]"
                }`}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery grid */}
      <section className="bg-[#f7f7f5]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-10 md:py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {showcaseItems.map((item) => (
              <article
                key={item.title}
                className="group rounded-2xl overflow-hidden border border-[#e8e5df] bg-white hover:border-[#c4a67d]/30 transition-all duration-300"
              >
                <div className="relative overflow-hidden" style={{ aspectRatio: "4/3" }}>
                  <img
                    src={item.img}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold tracking-wider uppercase rounded-full">
                      {item.category}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-display font-bold text-[#0a0a0a] text-[14px] tracking-tight mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-[#8c8c8c] text-[13px] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0a0a0a]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24 text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#8b7355]/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="relative z-10">
            <h2 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[1.75rem] sm:text-[2.5rem] md:text-[3.5rem] leading-[0.95] mb-5">
              Create Your Own<br />
              <span className="text-[#c4a67d]">Studio Photos</span>
            </h2>
            <p className="text-white/40 text-[15px] max-w-md mx-auto mb-8 leading-relaxed">
              Upload any jewelry photo and get studio-quality images in seconds. Start free — no credit card required.
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
