import type { Metadata } from "next";
import Link from "next/link";

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
    link: "/ai-jewelry-photography",
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
    a: "AI photography works best with jewelry, accessories, watches, and small products. SoraiPixel specializes in jewelry photography — the most technically demanding product category — which means it handles simpler products with ease.",
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

      <div className="min-h-screen bg-background text-foreground">
        {/* Hero */}
        <section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24">
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(196,166,125,0.06)] to-transparent" />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-xs sm:text-sm font-medium tracking-widest uppercase text-[#c4a67d] mb-4">
              The Future of Product Photography
            </p>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6">
              <span className="text-[#c4a67d]">AI Photography</span>
              <br />
              <span className="text-foreground">Professional Product Images, Instantly</span>
            </h1>
            <p className="max-w-2xl mx-auto text-base sm:text-lg text-text-secondary leading-relaxed mb-8">
              Upload any product photo. AI generates studio-quality hero shots, lifestyle scenes,
              model photography, and close-ups — in under 10 seconds. No camera. No studio.
              No photographer.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/jewelry"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#c4a67d] text-[#1a1a2e] font-semibold text-sm hover:bg-[#d4b88d] transition-all shadow-lg shadow-[rgba(196,166,125,0.25)]"
              >
                Try AI Photography Free
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </Link>
              <Link
                href="/ai-jewelry-photography"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-text-secondary font-medium text-sm hover:border-[#c4a67d] hover:text-[#c4a67d] transition-all"
              >
                Jewelry Photography
              </Link>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 sm:py-24 border-t border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
              Why AI Photography Is Replacing Traditional Studios
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((b) => (
                <div key={b.title} className="rounded-2xl border border-border bg-surface p-6 text-center hover:border-[rgba(196,166,125,0.3)] transition-colors">
                  <div className="text-3xl font-bold text-[#c4a67d] mb-2">{b.stat}</div>
                  <h3 className="font-semibold text-foreground mb-2">{b.title}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16 sm:py-24 bg-surface border-t border-border">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
              AI Photography vs Traditional Photography
            </h2>
            <p className="text-text-secondary text-center mb-10 max-w-xl mx-auto">
              See how AI photography compares to hiring a professional photographer.
            </p>
            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Feature</th>
                    <th className="text-center px-4 py-3 font-medium text-text-secondary">Traditional</th>
                    <th className="text-center px-4 py-3 font-medium text-[#c4a67d]">AI (SoraiPixel)</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((c) => (
                    <tr key={c.feature} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-foreground font-medium">{c.feature}</td>
                      <td className="px-4 py-3 text-center text-text-secondary">{c.traditional}</td>
                      <td className="px-4 py-3 text-center text-[#c4a67d] font-medium">{c.ai}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-16 sm:py-24 border-t border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
              AI Photography Use Cases
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {useCases.map((u) => (
                <Link
                  key={u.title}
                  href={u.link}
                  className="rounded-2xl border border-border bg-surface p-6 hover:border-[rgba(196,166,125,0.3)] transition-colors group block"
                >
                  <h3 className="font-semibold text-foreground mb-2 group-hover:text-[#c4a67d] transition-colors">
                    {u.title}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed mb-3">{u.desc}</p>
                  <span className="text-xs text-[#c4a67d] font-medium flex items-center gap-1">
                    Learn more
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 sm:py-24 bg-surface border-t border-border">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
              AI Photography — Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-xl border border-border bg-background overflow-hidden"
                >
                  <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-sm font-medium text-foreground hover:text-[#c4a67d] transition-colors">
                    {f.q}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 ml-3 transition-transform group-open:rotate-180"><polyline points="6 9 12 15 18 9" /></svg>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-text-secondary leading-relaxed">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-24 border-t border-border">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Try AI Photography Today — Free
            </h2>
            <p className="text-text-secondary mb-8 max-w-xl mx-auto">
              8 free tokens every day — 1 free image daily. No credit card. No commitment.
              See for yourself why thousands of sellers are switching to AI photography.
            </p>
            <Link
              href="/jewelry"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#c4a67d] text-[#1a1a2e] font-semibold text-sm hover:bg-[#d4b88d] transition-all shadow-lg shadow-[rgba(196,166,125,0.25)]"
            >
              Start Free — Upload Your First Photo
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
