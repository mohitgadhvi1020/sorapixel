"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AppProvider";
import CompareSlider from "@/components/ui/CompareSlider";
import PricingModal from "@/components/pricing/PricingModal";
import ContactFloat from "@/components/ui/ContactFloat";
import ExitIntentPopup from "@/components/ui/ExitIntentPopup";
import { useGeoCountry } from "@/hooks/useGeoCountry";
import Logo from "@/components/ui/Logo";
import Header from "@/components/layout/Header";
import MobileNav from "@/components/layout/MobileNav";

interface FeedItem {
  id: string;
  title: string;
  before_image_url: string;
  after_image_url: string;
}

const FALLBACK_IMG = "https://placehold.co/800x600/1a1a1a/333?text=Product";

function ImgCard({ src, alt, children, className = "", ratio = "3/4" }: { src: string; alt: string; children?: React.ReactNode; className?: string; ratio?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl group ${className}`} style={{ aspectRatio: ratio }}>
      <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      {children && <div className="relative z-10 h-full flex flex-col justify-end p-5 sm:p-6">{children}</div>}
    </div>
  );
}

export default function HomePageClient() {
  const { isAuthenticated } = useAuth();
  const { currency, isIndia } = useGeoCountry();
  const [activeTransformation, setActiveTransformation] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "/api/v1"}/feed?limit=31`)
      .then((r) => r.json())
      .then((d) => { if (d.items?.length) setFeedItems(d.items); })
      .catch(() => {});
  }, []);

  const findByTitle = (keyword: string) =>
    feedItems.find((it) => it.title?.toLowerCase().includes(keyword.toLowerCase())) || null;
  const imgByTitle = (keyword: string, field: "before_image_url" | "after_image_url") =>
    findByTitle(keyword)?.[field] || FALLBACK_IMG;

  const transformationPicks = ["Bag", "Perfume", "Purses", "Chair", "Chips", "Bicycle"];
  const transformations = transformationPicks
    .map((label) => findByTitle(label))
    .filter(Boolean)
    .map((item) => ({
      before: item!.before_image_url || FALLBACK_IMG,
      after: item!.after_image_url || FALLBACK_IMG,
      label: item!.title?.trim() || "",
    }));

  const features = [
    { title: "Hero Shots", desc: "Stunning front-facing product shots that make your product the star.", img: "https://ynxppssttkicwglxiraw.supabase.co/storage/v1/object/public/sorapixel-images/homepage/feature_hero_shots_f8389597-0c2f-46ee-b7c8-b0d9a633118a.png" },
    { title: "Close-Up Detail", desc: "Show every texture, color, and detail with AI-enhanced macro shots.", img: "https://ynxppssttkicwglxiraw.supabase.co/storage/v1/object/public/sorapixel-images/homepage/feature_closeup_detail_6af0c9f4-c1f2-49cf-af77-f146d1fe2c39.png" },
    { title: "Lifestyle Scenes", desc: "Place your product in beautiful real-world contexts automatically.", img: "https://ynxppssttkicwglxiraw.supabase.co/storage/v1/object/public/sorapixel-images/homepage/feature_lifestyle_4845b791-72e1-437b-a9da-a022b20c0faf.png" },
    { title: "Model Shots", desc: "AI models showcasing your product — no photoshoot needed.", img: "https://ynxppssttkicwglxiraw.supabase.co/storage/v1/object/public/sorapixel-images/homepage/feature_model_shots_e65e55ae-3f92-431f-98cc-6738499acf17.png" },
  ];

  const starterPrice = isIndia ? "₹149" : currency === "EUR" ? "€4.99" : "$4.99";
  const growthPrice = isIndia ? "₹549" : currency === "EUR" ? "€17.99" : "$19.99";
  const businessPrice = isIndia ? "₹1499" : currency === "EUR" ? "€44.99" : "$49.99";
  const perImageCost = isIndia ? "₹15" : currency === "EUR" ? "€0.50" : "$0.50";
  const starterPerImage = isIndia ? "~₹15/image" : currency === "EUR" ? "~€0.50/image" : "~$0.50/image";
  const growthPerImage = isIndia ? "~₹11/image" : currency === "EUR" ? "~€0.36/image" : "~$0.40/image";
  const businessPerImage = isIndia ? "~₹10/image" : currency === "EUR" ? "~€0.30/image" : "~$0.33/image";
  const growthSavings = isIndia ? "26" : currency === "EUR" ? "28" : "20";
  const businessSavings = isIndia ? "33" : currency === "EUR" ? "40" : "33";
  const traditionalCost = isIndia ? "₹2,000–₹5,000" : currency === "EUR" ? "€200–€500" : "$200–$500";

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <PricingModal />

      {/* ═══ NAVBAR ═══ */}
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <Header
        variant="homepage"
        showMenu
        onMenuToggle={() => setMobileNavOpen(true)}
      />

      {/* ═══ HERO ═══ */}
      <section className="relative bg-[#0a0a0a] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#1a1610] to-[#0a0a0a]" />
          <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-[#8b7355]/[0.07] rounded-full blur-[150px]" />
          <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-[#c4a67d]/[0.04] rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pt-32 md:pt-44 pb-24 md:pb-40 text-center">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/[0.06] text-white/50 text-[10px] sm:text-[11px] font-medium tracking-[0.15em] uppercase rounded-full border border-white/[0.06] mb-8">
              <span className="w-1.5 h-1.5 bg-[#c4a67d] rounded-full animate-pulse" />
              AI Product Photography
            </span>
          </div>
          <div className="animate-slide-up" style={{ animationDelay: "80ms" }}>
            <h1 className="font-display font-extrabold text-white uppercase leading-[0.85] tracking-[-0.05em] text-[2.8rem] min-[375px]:text-[3.5rem] sm:text-[5rem] md:text-[6rem] lg:text-[8rem]">
              Your Products,<br />
              <span className="bg-gradient-to-r from-[#c4a67d] via-[#e8d5b5] to-[#8b7355] bg-clip-text text-transparent">Studio Quality</span>
            </h1>
          </div>
          <p className="mt-6 md:mt-8 text-[15px] md:text-[18px] text-white/35 max-w-lg mx-auto leading-relaxed font-light animate-slide-up" style={{ animationDelay: "160ms" }}>
            Transform any product photo into professional imagery in seconds.
          </p>
          <div className="mt-10 md:mt-12 flex flex-wrap items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "240ms" }}>
            <Link href="/studio" className="px-8 py-4 bg-white text-[#0a0a0a] text-[14px] font-semibold rounded-full hover:bg-white/90 transition-all active:scale-[0.97] shadow-[0_4px_24px_rgba(255,255,255,0.08)]">
              Try It Free
            </Link>
            <Link href="/pricing" prefetch={false} className="px-7 py-4 text-white/30 text-[14px] font-medium hover:text-white/60 transition-colors">
              View Pricing →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ TRANSFORMATION GALLERY ═══ */}
      <section className="bg-[#f7f7f5]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-20 md:py-32">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#8b7355] tracking-[0.15em] uppercase mb-4 block">See The Results</span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.03em] text-[1.75rem] sm:text-[2.5rem] md:text-[3.5rem] leading-[0.95]">
              Every Transformation,<br /><span className="text-[#8b7355]">Pixel-Perfect</span>
            </h2>
          </div>

          {transformations.length > 0 && (
            <>
              <div className="hidden" aria-hidden="true">
                {transformations.map((t) => (
                  <span key={t.label}>
                    <img src={t.before} alt="" />
                    <img src={t.after} alt="" />
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 mb-10 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap">
                {transformations.map((t, i) => (
                  <button
                    key={t.label}
                    onClick={() => setActiveTransformation(i)}
                    className={`shrink-0 px-5 py-2.5 rounded-full text-[12px] font-medium transition-all duration-200 whitespace-nowrap ${
                      activeTransformation === i
                        ? "bg-[#0a0a0a] text-white shadow-sm"
                        : "bg-transparent text-[#8c8c8c] hover:text-[#0a0a0a]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="max-w-md mx-auto">
                <CompareSlider
                  key={activeTransformation}
                  beforeSrc={transformations[activeTransformation].before}
                  afterSrc={transformations[activeTransformation].after}
                  beforeLabel="Original"
                  afterLabel="AI Generated"
                  aspectRatio="3/4"
                  className="shadow-2xl shadow-black/10 border border-[#e8e5df]"
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* ═══ FEATURES — Sticky text + 2x2 image grid ═══ */}
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div className="lg:sticky lg:top-28">
              <span className="text-[10px] sm:text-[11px] font-semibold text-[#8b7355] tracking-[0.15em] uppercase mb-5 block">What You Get</span>
              <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.03em] text-[1.75rem] min-[375px]:text-[2rem] sm:text-[2.5rem] md:text-[3.5rem] leading-[0.92]">
                Every Angle,<br />Every Detail,<br /><span className="text-[#8b7355]">Every Time</span>
              </h2>
              <p className="mt-6 text-[#8c8c8c] text-[15px] leading-relaxed max-w-sm">
                Hero shots, close-ups, model photos, and lifestyle scenes — all from a single upload.
              </p>
              <div className="mt-8">
                <Link href="/studio" className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#0a0a0a] text-white text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all active:scale-[0.97]">
                  Try Product Studio
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {features.map((f) => (
                <ImgCard key={f.title} src={f.img} alt={f.title} ratio="4/5">
                  <h3 className="font-display font-bold text-white text-[13px] sm:text-[14px] tracking-[0.04em] uppercase mb-1">{f.title}</h3>
                  <p className="text-white/70 text-[11px] sm:text-[12px] leading-relaxed">{f.desc}</p>
                </ImgCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#141210] to-[#0a0a0a]" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#c4a67d]/[0.05] rounded-full blur-[150px]" />

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-20 md:py-32">
          <div className="text-center mb-12">
            <h2 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[2rem] min-[375px]:text-[2.5rem] sm:text-[3rem] md:text-[3.5rem] leading-[0.92]">
              Professional Photos<br />
              <span className="bg-gradient-to-r from-[#c4a67d] via-[#e8d5b5] to-[#8b7355] bg-clip-text text-transparent">At a Fraction of the Cost</span>
            </h2>
            <p className="mt-5 text-white/35 text-[15px] max-w-md mx-auto leading-relaxed">
              Traditional product photography costs {traditionalCost} per product. AI photos starting at just {perImageCost}/image.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 max-w-3xl mx-auto">
            <div className="relative bg-white/[0.04] rounded-2xl p-6 md:p-7 border border-white/[0.08] text-center hover:border-white/[0.15] transition-all duration-300 group">
              <div className="text-[11px] font-bold text-white/40 uppercase tracking-[0.1em] mb-4">Starter</div>
              <div className="font-display font-extrabold text-[2.5rem] text-white leading-none">{starterPrice}</div>
              <div className="text-[12px] text-white/25 mt-1 mb-6">80 tokens · {starterPerImage}</div>
              <div className="space-y-2 text-left mb-6">
                {["10 Standard images", "4 Pro quality images", "No expiry on tokens"].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-400/70 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-[12px] text-white/40">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/pricing" prefetch={false} className="block w-full py-2.5 rounded-xl text-[13px] font-semibold text-white/50 border border-white/[0.1] hover:border-white/[0.2] hover:text-white transition-all">Get Started</Link>
            </div>

            <div className="relative bg-gradient-to-b from-[rgba(196,166,125,0.12)] to-[rgba(196,166,125,0.04)] rounded-2xl p-6 md:p-7 border-2 border-[#c4a67d]/40 text-center shadow-[0_0_60px_rgba(196,166,125,0.1)] sm:-mt-3 sm:-mb-3">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-[10px] font-bold uppercase tracking-[0.12em] rounded-full">Popular</span>
              <div className="text-[11px] font-bold text-[#c4a67d] uppercase tracking-[0.1em] mb-4">Growth</div>
              <div className="font-display font-extrabold text-[2.5rem] text-white leading-none">{growthPrice}</div>
              <div className="text-[12px] text-[#c4a67d]/50 mt-1">400 tokens/mo · {growthPerImage}</div>
              <div className="inline-block mt-2 mb-4 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400/80 text-[10px] font-bold">Save {growthSavings}%</div>
              <div className="space-y-2 text-left mb-6">
                {["50 Standard images/mo", "Pro quality renders", "Model catalogue access", "Priority processing"].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-[#c4a67d]/70 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-[12px] text-white/50">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/pricing" prefetch={false} className="block w-full py-2.5 rounded-xl text-[13px] font-bold text-white bg-gradient-to-r from-[#8b7355] to-[#c4a67d] hover:shadow-[0_6px_24px_rgba(196,166,125,0.3)] transition-all active:scale-[0.97]">Get Growth Plan</Link>
            </div>

            <div className="bg-white/[0.04] rounded-2xl p-6 md:p-7 border border-white/[0.08] text-center hover:border-white/[0.15] transition-all duration-300 group">
              <div className="text-[11px] font-bold text-white/40 uppercase tracking-[0.1em] mb-4">Business</div>
              <div className="font-display font-extrabold text-[2.5rem] text-white leading-none">{businessPrice}</div>
              <div className="text-[12px] text-white/25 mt-1">1200 tokens/mo · {businessPerImage}</div>
              <div className="inline-block mt-2 mb-4 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400/80 text-[10px] font-bold">Save {businessSavings}%</div>
              <div className="space-y-2 text-left mb-6">
                {["150 Standard images/mo", "Everything in Growth", "Bulk listing tools", "API access"].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-400/70 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-[12px] text-white/40">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/pricing" prefetch={false} className="block w-full py-2.5 rounded-xl text-[13px] font-semibold text-white/50 border border-white/[0.1] hover:border-white/[0.2] hover:text-white transition-all">Go Business</Link>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link href="/pricing" prefetch={false} className="inline-flex items-center gap-1.5 text-[13px] text-[#c4a67d]/50 hover:text-[#c4a67d] transition-colors">
              Compare all plans →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="bg-[#f7f7f5]">
        <div className="max-w-[720px] mx-auto px-4 sm:px-8 lg:px-12 py-20 md:py-32">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.03em] text-[1.75rem] sm:text-[2.5rem] md:text-[3rem] leading-[0.95]">
              Common <span className="text-[#8b7355]">Questions</span>
            </h2>
          </div>
          <div className="space-y-2">
            {[
              { q: "Will AI change my product design?", a: "Absolutely not. SoraiPixel guarantees zero design changes. Every detail of your product stays exactly as it is. Only the background, lighting, and presentation change." },
              { q: "What image quality do I need to upload?", a: "Any photo works — even a phone snap taken on your desk. Our AI is trained to work with low-light, uneven backgrounds, and even CAD renders. Better input gives better output, but you don't need professional equipment." },
              { q: "Can I use these images on Amazon, Etsy, and Shopify?", a: "Yes. Generated images are marketplace-optimized with correct dimensions and white background variants included. They're ready to upload directly to any e-commerce platform without manual resizing." },
              { q: "How is SoraiPixel different from ChatGPT or Midjourney?", a: "Generic AI tools don't understand product photography. They'll alter your product design, shift colors, and produce inconsistent results. SoraiPixel is purpose-built for product photography — it preserves every detail and guarantees design integrity." },
              { q: "What products does SoraiPixel work with?", a: "Everything — jewelry, fashion, cosmetics, electronics, food, home goods, accessories, and more. Our AI adapts to your product category automatically." },
              { q: "How does the token system work?", a: "Each image generation costs tokens (8 for standard quality, 20 for pro). You get free daily tokens plus a free first generation. Token packs start at just ₹149 / $4.99 and never expire. Monthly plans include tokens that refresh each month." },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#e8e5df] overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-semibold text-[#0a0a0a] text-[14px] pr-4">{faq.q}</span>
                  <svg className={`w-4 h-4 text-[#8c8c8c] flex-shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-[#8c8c8c] text-[14px] leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                { "@type": "Question", name: "Will AI change my product design?", acceptedAnswer: { "@type": "Answer", text: "Absolutely not. SoraiPixel guarantees zero design changes. Every detail stays exactly as it is." } },
                { "@type": "Question", name: "What image quality do I need to upload?", acceptedAnswer: { "@type": "Answer", text: "Any photo works — even a phone snap. Our AI works with low-light, uneven backgrounds, and even CAD renders." } },
                { "@type": "Question", name: "Can I use these images on Amazon, Etsy, and Shopify?", acceptedAnswer: { "@type": "Answer", text: "Yes. Generated images are marketplace-optimized with correct dimensions and white background variants included." } },
                { "@type": "Question", name: "How is SoraiPixel different from ChatGPT or Midjourney?", acceptedAnswer: { "@type": "Answer", text: "Generic AI tools alter product designs and shift colors. SoraiPixel is purpose-built for product photography with guaranteed design integrity." } },
                { "@type": "Question", name: "What products does SoraiPixel work with?", acceptedAnswer: { "@type": "Answer", text: "Everything — jewelry, fashion, cosmetics, electronics, food, home goods, accessories, and more." } },
                { "@type": "Question", name: "How does the token system work?", acceptedAnswer: { "@type": "Answer", text: "Each image generation costs tokens. You get free daily tokens. Token packs start at ₹149 / $4.99 and never expire." } },
              ],
            }),
          }}
        />
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-[#0a0a0a] border-t border-white/5 safe-bottom">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 mb-10">
            <div className="md:col-span-1">
              <div className="flex items-center mb-4">
                <Logo className="text-lg opacity-80" variant="light" />
              </div>
              <p className="text-[13px] text-white/25 leading-relaxed">AI-powered product photography. Studio-quality images, videos &amp; UGC from any photo, in seconds.</p>
            </div>
            {[
              { title: "Products", links: [{ l: "Product Studio", h: "/studio" }, { l: "Video Studio", h: "/video" }, { l: "UGC & Models", h: "/ugc" }, { l: "Blog Images", h: "/blog-images" }, { l: "Bulk Listings", h: "/batch-listing" }] },
              { title: "Resources", links: [{ l: "Pricing", h: "/pricing" }, { l: "Blog", h: "/blog" }, { l: "Gallery", h: "/gallery" }, { l: "AI Photography", h: "/ai-photography" }] },
              { title: "Company", links: [{ l: "About", h: "/about" }, { l: "Privacy Policy", h: "/privacy" }, { l: "Terms of Service", h: "/terms" }] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-[10px] font-bold text-white/40 tracking-[0.15em] uppercase mb-4">{col.title}</h4>
                <div className="space-y-2.5">
                  {col.links.map((lnk) => <Link key={lnk.l} href={lnk.h} prefetch={false} className="block text-[13px] text-white/30 hover:text-white/60 transition-colors">{lnk.l}</Link>)}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[11px] text-white/15">&copy; {new Date().getFullYear()} SoraiPixel. All rights reserved.</span>
            <span className="text-[11px] text-white/15">AI Product Photography</span>
          </div>
        </div>
      </footer>

      <ContactFloat />
      <ExitIntentPopup />
    </div>
  );
}
