import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/ui/Logo";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";

export const metadata: Metadata = {
  title: "AI Photography — Generate Studio-Quality Product Images Instantly",
  description:
    "AI photography platform for product images. Upload any photo and get hero shots, lifestyle scenes, model photos, and close-ups in seconds. No studio, no photographer, no waiting. Start free.",
  keywords: [
    "AI photography",
    "AI product photography",
    "AI photo generator",
    "AI image generator",
    "product photography AI",
    "AI photography tool",
    "automated product photography",
    "AI studio photography",
    "ecommerce AI photography",
    "AI photography app",
    "AI photography online",
    "free AI photography",
  ],
  alternates: { canonical: "/ai-photography" },
  openGraph: {
    title: "AI Photography — Studio-Quality Product Images in Seconds",
    description:
      "The AI photography platform that replaces studio shoots. Upload any product photo, get professional imagery back instantly.",
    url: `${SITE_URL}/ai-photography`,
    siteName: "SoraiPixel",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/images/hero-jewelry.png`,
        width: 1376,
        height: 768,
        alt: "AI Photography by SoraiPixel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Photography — Professional Product Images Instantly",
    description:
      "Upload a photo. Get studio-quality images. AI photography that actually works.",
    images: [`${SITE_URL}/images/hero-jewelry.png`],
  },
};

const benefits = [
  {
    title: "10-Second Generation",
    desc: "Upload any photo and receive studio-grade images in under 10 seconds. What used to take days now takes moments.",
    stat: "<10s",
  },
  {
    title: "90% Cost Reduction",
    desc: "Professional studio sessions cost thousands. AI photography delivers the same quality at a fraction of the cost.",
    stat: "90%",
  },
  {
    title: "Pixel-Perfect Accuracy",
    desc: "AI preserves every detail of your product — textures, colors, materials, reflections. Nothing is altered or lost.",
    stat: "96.2%",
  },
  {
    title: "Unlimited Varieties",
    desc: "One upload generates hero shots, close-ups, lifestyle scenes, and model photos. Multiple angles, backgrounds, and styles.",
    stat: "6+",
  },
];

const useCases = [
  {
    title: "Jewelry & Accessories",
    desc: "The most demanding product photography niche. AI handles reflections, sparkle, and micro-details that even professional photographers struggle with.",
    link: "/studio",
  },
  {
    title: "E-commerce Listings",
    desc: "Generate marketplace-compliant product images for Shopify, Amazon, Etsy, and any online store. Consistent quality across your entire catalog.",
    link: "/batch-listing",
  },
  {
    title: "Social Media Content",
    desc: "Create scroll-stopping product imagery for Instagram, Pinterest, and Facebook ads. AI-generated lifestyle scenes that convert.",
    link: "/gallery",
  },
];

const comparisons = [
  { feature: "Cost per session", traditional: "₹5,000 – ₹50,000", ai: "From ₹15/image" },
  { feature: "Turnaround time", traditional: "1–3 weeks", ai: "< 10 seconds" },
  { feature: "Photos per session", traditional: "10–50", ai: "Unlimited" },
  { feature: "Consistency", traditional: "Varies by photographer", ai: "100% consistent" },
  { feature: "Model photography", traditional: "Extra ₹10,000+", ai: "Included" },
  { feature: "Background changes", traditional: "Manual editing", ai: "Automatic" },
  { feature: "Metal recoloring", traditional: "Not possible", ai: "One click" },
  { feature: "Availability", traditional: "Business hours", ai: "24/7" },
];

const faqs = [
  {
    q: "What is AI photography?",
    a: "AI photography uses artificial intelligence to generate, enhance, or transform product images automatically. Instead of traditional studio photography with cameras, lights, and photographers, AI photography takes an existing photo (even a basic phone snap) and generates professional-quality images with perfect lighting, backgrounds, and composition.",
  },
  {
    q: "Is AI photography as good as professional studio photography?",
    a: "For product and e-commerce photography, AI has reached a point where the output is indistinguishable from professional studio work. AI excels at consistency, speed, and cost-effectiveness. It preserves product details with 96%+ accuracy while generating images that look like they came from a high-end photography studio.",
  },
  {
    q: "What kind of products work with AI photography?",
    a: "AI photography works with virtually any product — jewelry, fashion, cosmetics, electronics, food, home goods, accessories, and more. SoraiPixel adapts to your product category automatically.",
  },
  {
    q: "Do I need any photography experience?",
    a: "None at all. The AI handles everything — lighting, composition, background, and styling. You just upload a photo and choose what type of image you want. If you can take a photo with your phone, you can use AI photography.",
  },
  {
    q: "Can I use AI photos commercially?",
    a: "Yes. All images generated through SoraiPixel are yours to use commercially on any platform — Shopify, Amazon, Instagram, your own website, print materials, and more.",
  },
  {
    q: "How does AI photography pricing work?",
    a: "SoraiPixel offers free daily tokens to get started (no credit card needed). Paid plans give you more tokens and access to advanced features like model photography and bulk generation. Even the highest-tier plan costs less than a single professional photography session.",
  },
];

export default function AIPhotographyPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "AI Photography",
        item: `${SITE_URL}/ai-photography`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="min-h-screen bg-[#f7f7f5]">
        {/* Header */}
        <header className="bg-white border-b border-[#e8e5df]">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
            <div className="flex items-center justify-between py-4">
              <Link href="/" className="flex items-center">
                <Logo className="text-lg" />
              </Link>
              <div className="flex items-center gap-3">
                <Link href="/gallery" className="text-[13px] font-medium text-[#4a4a4a] hover:text-[#0a0a0a] transition-colors hidden sm:block">Gallery</Link>
                <Link href="/pricing" className="text-[13px] font-medium text-[#4a4a4a] hover:text-[#0a0a0a] transition-colors hidden sm:block">Pricing</Link>
                <Link href="/studio" className="px-5 py-2 bg-[#0a0a0a] text-white text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all">Start Creating</Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="bg-[#0a0a0a] overflow-hidden">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24 text-center relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#8b7355]/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="relative z-10">
              <span className="text-[11px] sm:text-xs font-semibold text-[#c4a67d]/60 tracking-[0.12em] uppercase mb-4 block">The Future of Product Photography</span>
              <h1 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[2rem] sm:text-[3rem] md:text-[4rem] leading-[0.95] mb-5">
                <span className="bg-gradient-to-r from-[#c4a67d] via-[#e8d5b5] to-[#8b7355] bg-clip-text text-transparent">AI Photography</span>
                <br />Professional Product Images, Instantly
              </h1>
              <p className="text-white/40 text-[15px] md:text-[17px] max-w-2xl mx-auto leading-relaxed mb-8">
                Upload any product photo. AI generates studio-quality hero shots, lifestyle scenes,
                model photography, and close-ups — in under 10 seconds. No camera. No studio.
                No photographer.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/studio" className="px-8 py-4 bg-white text-[#0a0a0a] text-[14px] font-semibold rounded-full hover:bg-white/90 transition-all active:scale-[0.97] shadow-[0_4px_24px_rgba(255,255,255,0.08)]">
                  Try AI Photography Free
                </Link>
                <Link href="/pricing" prefetch={false} className="px-7 py-4 text-white/30 text-[14px] font-medium hover:text-white/60 transition-colors">
                  View Pricing →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="bg-[#f7f7f5]">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-20 md:py-32">
            <div className="text-center mb-12 md:mb-16">
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#8b7355] tracking-[0.15em] uppercase mb-4 block">Why AI Photography</span>
              <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.03em] text-[1.75rem] sm:text-[2.5rem] md:text-[3.5rem] leading-[0.95]">
                Replacing Traditional <span className="text-[#8b7355]">Studios</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {benefits.map((b) => (
                <div key={b.title} className="bg-white rounded-2xl border border-[#e8e5df] p-6 text-center hover:border-[#c4a67d]/30 transition-colors">
                  <div className="font-display font-extrabold text-[2rem] text-[#8b7355] mb-2">{b.stat}</div>
                  <h3 className="font-display font-bold text-[#0a0a0a] text-[15px] mb-2">{b.title}</h3>
                  <p className="text-[#8c8c8c] text-[13px] leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="bg-white border-y border-[#e8e5df]">
          <div className="max-w-[900px] mx-auto px-4 sm:px-8 lg:px-12 py-20 md:py-32">
            <div className="text-center mb-12 md:mb-16">
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#8b7355] tracking-[0.15em] uppercase mb-4 block">Comparison</span>
              <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.03em] text-[1.75rem] sm:text-[2.5rem] md:text-[3rem] leading-[0.95]">
                AI vs <span className="text-[#8b7355]">Traditional</span>
              </h2>
              <p className="mt-4 text-[#8c8c8c] text-[15px] max-w-md mx-auto leading-relaxed">
                See how AI photography compares to hiring a professional photographer.
              </p>
            </div>
            <div className="rounded-2xl border border-[#e8e5df] overflow-hidden">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="border-b border-[#e8e5df] bg-[#f7f7f5]">
                    <th className="text-left px-5 py-3.5 font-semibold text-[#8c8c8c] text-[12px] uppercase tracking-[0.08em]">Feature</th>
                    <th className="text-center px-5 py-3.5 font-semibold text-[#8c8c8c] text-[12px] uppercase tracking-[0.08em]">Traditional</th>
                    <th className="text-center px-5 py-3.5 font-semibold text-[#8b7355] text-[12px] uppercase tracking-[0.08em]">AI (SoraiPixel)</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((c) => (
                    <tr key={c.feature} className="border-b border-[#e8e5df] last:border-0">
                      <td className="px-5 py-3.5 text-[#0a0a0a] font-medium">{c.feature}</td>
                      <td className="px-5 py-3.5 text-center text-[#8c8c8c]">{c.traditional}</td>
                      <td className="px-5 py-3.5 text-center text-[#8b7355] font-medium">{c.ai}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="bg-[#f7f7f5]">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-20 md:py-32">
            <div className="text-center mb-12 md:mb-16">
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#8b7355] tracking-[0.15em] uppercase mb-4 block">Use Cases</span>
              <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.03em] text-[1.75rem] sm:text-[2.5rem] md:text-[3rem] leading-[0.95]">
                AI Photography <span className="text-[#8b7355]">For Every Product</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {useCases.map((u) => (
                <Link
                  key={u.title}
                  href={u.link}
                  className="bg-white rounded-2xl border border-[#e8e5df] p-6 hover:border-[#c4a67d]/30 transition-colors group block"
                >
                  <h3 className="font-display font-bold text-[#0a0a0a] text-[15px] mb-2 group-hover:text-[#8b7355] transition-colors">
                    {u.title}
                  </h3>
                  <p className="text-[#8c8c8c] text-[13px] leading-relaxed mb-3">{u.desc}</p>
                  <span className="text-[12px] text-[#8b7355] font-semibold flex items-center gap-1">
                    Learn more →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white border-t border-[#e8e5df]">
          <div className="max-w-[720px] mx-auto px-4 sm:px-8 lg:px-12 py-20 md:py-32">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.03em] text-[1.75rem] sm:text-[2.5rem] md:text-[3rem] leading-[0.95]">
                Common <span className="text-[#8b7355]">Questions</span>
              </h2>
            </div>
            <div className="space-y-2">
              {faqs.map((f) => (
                <details
                  key={f.q}
                  className="group bg-[#f7f7f5] rounded-xl border border-[#e8e5df] overflow-hidden"
                >
                  <summary className="flex items-center justify-between cursor-pointer px-6 py-4 text-left">
                    <span className="font-semibold text-[#0a0a0a] text-[14px] pr-4">{f.q}</span>
                    <svg className="w-4 h-4 text-[#8c8c8c] flex-shrink-0 transition-transform duration-200 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                  </summary>
                  <div className="px-6 pb-5">
                    <p className="text-[#8c8c8c] text-[14px] leading-relaxed">{f.a}</p>
                  </div>
                </details>
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
                Try AI Photography<br /><span className="text-[#c4a67d]">Today — Free</span>
              </h2>
              <p className="text-white/40 text-[15px] max-w-md mx-auto mb-8 leading-relaxed">
                8 free tokens every day — 1 free image daily. No credit card. No commitment.
              </p>
              <Link href="/studio" className="px-8 py-4 bg-white text-[#0a0a0a] text-[14px] font-semibold rounded-full hover:bg-white/90 transition-all active:scale-[0.97] shadow-lg inline-block">
                Start Free — Upload Your First Photo
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#0a0a0a] border-t border-white/5">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">Home</Link>
                <Link href="/gallery" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">Gallery</Link>
                <Link href="/blog" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">Blog</Link>
                <Link href="/privacy" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">Privacy</Link>
                <Link href="/terms" className="text-[13px] text-white/35 hover:text-white/70 transition-colors">Terms</Link>
              </div>
              <span className="text-[11px] text-white/20">&copy; {new Date().getFullYear()} SoraiPixel. All rights reserved.</span>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
