"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AppProvider";
import Logo from "@/components/ui/Logo";
import CompareSlider from "@/components/ui/CompareSlider";
import PricingModal from "@/components/pricing/PricingModal";

const IMG = {
  before: "/images/ring-before-phone.png",
  after: "/images/ring-after-studio.png",
  beforeRaw: "/images/before-raw.png",
  afterStyled: "/images/after-styled.png",
  goldNecklace: "/images/gold-necklace.png",
  modelBracelet: "/images/model-bracelet.png",
  darkElegance: "/images/dark-elegance.png",
  earring: "/images/earring-detail.png",
  necklaceModel: "/images/necklace-model.png",
  diamondRing: "/images/diamond-ring.png",
  ringHand: "/images/ring-hand.png",
  studioShot: "/images/studio-shot.png",
  cadRender: "/images/cad-render.png",
  lifestyleScene: "/images/lifestyle-scene.png",
  gemstoneBefore: "/images/gemstone-before-phone.png",
  gemstoneAfter: "/images/gemstone-after-studio.png",
  womanEarring: "/images/woman-earring.png",
  womanNecklace: "/images/woman-necklace-v2.png",
  cardHero: "/images/card-hero-shots.png",
  cardCloseup: "/images/card-closeup.png",
  cardLifestyle: "/images/card-lifestyle.png",
  cardModel: "/images/card-model-catalogue.png",
};

const steps = [
  { num: "01", title: "Upload Any Photo", desc: "Phone snap, CAD render, or product shot. Our AI handles the rest.", img: IMG.cadRender },
  { num: "02", title: "Pick Your Style", desc: "Velvet display, marble surface, lifestyle scene, or on-model editorial.", img: IMG.lifestyleScene },
  { num: "03", title: "Download & Sell", desc: "Studio-quality images in seconds. Ready for any marketplace.", img: IMG.womanEarring },
];

const features = [
  { title: "Hero Shots", desc: "Stunning front-facing product shots that make your jewelry the star.", img: IMG.cardHero },
  { title: "Close-Up Detail", desc: "Show every facet, stone, and texture with AI-enhanced macro shots.", img: IMG.cardCloseup },
  { title: "Lifestyle Scenes", desc: "Place your jewelry in beautiful real-world contexts automatically.", img: IMG.cardLifestyle },
  { title: "Model Shots", desc: "AI models wearing your jewelry — no photoshoot needed.", img: IMG.cardModel },
];

const transformations = [
  { before: IMG.gemstoneBefore, after: IMG.gemstoneAfter, label: "Gemstone Ring — Phone to Styled" },
  { before: IMG.cadRender, after: IMG.darkElegance, label: "Necklace — CAD to Lifestyle" },
  { before: IMG.beforeRaw, after: IMG.afterStyled, label: "Earring — Raw to Editorial" },
];

const useCases = [
  { title: "Jewelry Brands", desc: "Hero shots, angle packs, close-ups — everything for your online store.", stat: "90%", statLabel: "cost reduction", icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" },
  { title: "Etsy & Instagram Sellers", desc: "Professional product photos that sell, without a photographer.", stat: "10x", statLabel: "faster", icon: "M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0a2.999 2.999 0 00.739-1.052l1.174-2.64A1.876 1.876 0 016.621 4.5h10.758a1.876 1.876 0 011.708 1.157l1.174 2.64A3.001 3.001 0 0021 9.35" },
  { title: "Manufacturers", desc: "Bulk-generate listings with consistent style across hundreds of SKUs.", stat: "98%", statLabel: "accuracy", icon: "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" },
];

function ImgCard({ src, alt, children, className = "" }: { src: string; alt: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl group ${className}`} style={{ aspectRatio: "16/9" }}>
      <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      {children && <div className="relative z-10 h-full flex flex-col justify-end p-5 sm:p-6">{children}</div>}
    </div>
  );
}

export default function HomePageClient() {
  const { user, isAuthenticated } = useAuth();
  const [activeTransformation, setActiveTransformation] = useState(0);

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <PricingModal />

      {/* ═══ NAVBAR ═══ */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-3 md:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <Logo className="text-lg sm:text-xl" variant="dark" />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/jewelry" className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#0a0a0a] bg-[#f5f0e8] rounded-lg transition-all">Jewelry Studio</Link>
            <Link href="/batch-listing" prefetch={false} className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all hidden sm:block">Bulk Listings</Link>
            <Link href="/pricing" prefetch={false} className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all hidden sm:block">Pricing</Link>
            {isAuthenticated ? (
              <Link href="/profile" prefetch={false} className="ml-1 sm:ml-2 flex items-center gap-2 px-4 sm:px-5 py-2 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-[12px] sm:text-[13px] font-semibold rounded-full hover:shadow-[0_4px_16px_rgba(196,166,125,0.3)] transition-all active:scale-[0.97]">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">{(user?.contact_name || user?.company_name || "U").charAt(0).toUpperCase()}</span>
                Dashboard
              </Link>
            ) : (
              <Link href="/login" prefetch={false} className="ml-1 sm:ml-2 px-4 sm:px-5 py-2 bg-[#0a0a0a] text-white text-[12px] sm:text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all active:scale-[0.97]">Sign In</Link>
            )}
          </nav>
        </div>
      </header>

      {/* ═══ HERO — Split: text left, compare slider right ═══ */}
      <section className="relative bg-[#0a0a0a] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#1a1610] to-[#0a0a0a]" />
          <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-[#8b7355]/[0.07] rounded-full blur-[150px]" />
          <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-[#c4a67d]/[0.04] rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pt-28 md:pt-32 pb-16 md:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left: Text */}
            <div>
              <div className="animate-slide-up">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/[0.06] text-white/60 text-[11px] sm:text-xs font-medium tracking-[0.1em] uppercase rounded-full border border-white/[0.08] mb-6">
                  <span className="w-1.5 h-1.5 bg-[#c4a67d] rounded-full animate-pulse" />
                  AI Jewelry Photography
                </span>
              </div>
              <div className="animate-slide-up" style={{ animationDelay: "80ms" }}>
                <h1 className="font-display font-extrabold text-white uppercase leading-[0.88] tracking-[-0.04em] text-[2.5rem] min-[375px]:text-[3rem] sm:text-[4rem] md:text-[4.5rem] lg:text-[5.5rem]">
                  Your Jewelry,<br />
                  <span className="bg-gradient-to-r from-[#c4a67d] via-[#e8d5b5] to-[#8b7355] bg-clip-text text-transparent">Studio Quality</span>
                </h1>
              </div>
              <p className="mt-5 md:mt-6 text-[14px] md:text-[16px] text-white/45 max-w-md leading-relaxed animate-slide-up" style={{ animationDelay: "160ms" }}>
                Transform any jewelry photo into professional product imagery in seconds. No studio, no photographer, no design changes. Ever.
              </p>
              <div className="mt-7 md:mt-8 flex flex-wrap items-center gap-3 animate-slide-up" style={{ animationDelay: "240ms" }}>
                <Link href="/jewelry" className="px-7 py-3.5 bg-white text-[#0a0a0a] text-[14px] font-semibold rounded-full hover:bg-white/90 transition-all active:scale-[0.97] shadow-[0_4px_24px_rgba(255,255,255,0.1)]">
                  Try Free — No Signup
                </Link>
                <Link href="/pricing" prefetch={false} className="px-6 py-3.5 text-white/40 text-[14px] font-medium hover:text-white/70 transition-colors">
                  View Pricing
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-6 text-white/25 text-[12px] animate-slide-up" style={{ animationDelay: "320ms" }}>
                <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-[#c4a67d]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> Free daily tokens</span>
                <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-[#c4a67d]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> No credit card</span>
                <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-[#c4a67d]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> 30s delivery</span>
              </div>
            </div>

            {/* Right: Interactive Compare Slider */}
            <div className="animate-scale-in" style={{ animationDelay: "200ms" }}>
              <CompareSlider
                beforeSrc={IMG.before}
                afterSrc={IMG.after}
                beforeLabel="Phone Photo"
                afterLabel="AI Enhanced"
                aspectRatio="1/1"
                className="shadow-2xl shadow-black/40 border border-white/[0.06]"
              />
              <p className="text-center text-[11px] text-white/20 mt-3 tracking-wide">Drag to compare — actual AI output</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF STRIP ═══ */}
      <section className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-4 md:py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[12px] sm:text-[13px] text-[#8c8c8c]">
            <span className="flex items-center gap-2 font-semibold text-[#0a0a0a]">
              <svg className="w-4 h-4 text-[#c4a67d]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              Trusted by 500+ jewelers
            </span>
            <span className="hidden sm:inline text-[#e8e5df]">|</span>
            <span>98% detail accuracy</span>
            <span className="hidden sm:inline text-[#e8e5df]">|</span>
            <span>Under 30 seconds per image</span>
            <span className="hidden sm:inline text-[#e8e5df]">|</span>
            <span>Zero design changes guaranteed</span>
          </div>
        </div>
      </section>

      {/* ═══ TRANSFORMATION GALLERY — Before/After pairs ═══ */}
      <section className="bg-[#f7f7f5] border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24">
          <div className="text-center mb-10 md:mb-14">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">See The Results</span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
              Every Transformation,<br /><span className="text-[#8b7355]">Pixel-Perfect</span>
            </h2>
            <p className="mt-4 text-[#8c8c8c] text-[15px] max-w-lg mx-auto leading-relaxed">
              Real jewelry photos from our users. Drag each slider to see the original vs. the AI-generated result.
            </p>
          </div>

          {/* Transformation selector */}
          <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap">
            {transformations.map((t, i) => (
              <button
                key={t.label}
                onClick={() => setActiveTransformation(i)}
                className={`shrink-0 px-4 py-2.5 rounded-full text-[12px] sm:text-[13px] font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTransformation === i
                    ? "bg-[#0a0a0a] text-white shadow-sm"
                    : "bg-white text-[#4a4a4a] border border-[#e8e5df] hover:border-[#0a0a0a]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Active slider */}
          <div className="max-w-3xl mx-auto">
            <CompareSlider
              key={activeTransformation}
              beforeSrc={transformations[activeTransformation].before}
              afterSrc={transformations[activeTransformation].after}
              beforeLabel="Original"
              afterLabel="AI Generated"
              aspectRatio="4/3"
              className="shadow-xl border border-[#e8e5df]"
            />
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS — 3 steps ═══ */}
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">3 Simple Steps</span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
              Upload. Style. <span className="text-[#8b7355]">Sell.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {steps.map((s, i) => (
              <div key={s.num}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#f5f0e8] flex items-center justify-center">
                    <span className="font-display font-bold text-[14px] text-[#8b7355]">{s.num}</span>
                  </div>
                  {i < 2 && <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-[#e8e5df] to-transparent" />}
                </div>
                <div className="w-full rounded-xl overflow-hidden mb-4 border border-[#e8e5df]" style={{ aspectRatio: "16/9" }}>
                  <img src={s.img} alt={s.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" loading="lazy" />
                </div>
                <h3 className="font-display font-bold text-[#0a0a0a] text-[17px] sm:text-[19px] tracking-tight mb-2">{s.title}</h3>
                <p className="text-[#8c8c8c] text-[14px] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/jewelry" className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#0a0a0a] text-white text-[14px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all active:scale-[0.97]">
              Upload Your First Photo
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES — Sticky text + 2×2 image grid ═══ */}
      <section className="bg-[#f7f7f5] border-y border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div className="lg:sticky lg:top-28">
              <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-4 block">What You Get</span>
              <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] min-[375px]:text-[2rem] sm:text-[2.5rem] md:text-[3.25rem] leading-[0.95]">
                Every Angle,<br />Every Detail,<br /><span className="text-[#8b7355]">Every Time</span>
              </h2>
              <p className="mt-6 text-[#8c8c8c] text-[15px] leading-relaxed max-w-sm">
                Professional jewelry photography costs thousands per shoot. SoraiPixel gives you hero shots, close-ups, model photos, and lifestyle scenes from a single upload.
              </p>
              <div className="mt-6 space-y-3">
                {["Zero design changes — your jewelry stays untouched", "3 angles from one upload — hero, close-up, alternate", "Listings convert 3x better with professional photos"].map((point) => (
                  <div key={point} className="flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-[#8b7355] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-[14px] text-[#4a4a4a] leading-snug">{point}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/jewelry" className="inline-flex items-center gap-2 px-6 py-3 bg-[#0a0a0a] text-white text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all active:scale-[0.97]">
                  Try Jewelry Studio
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
                </Link>
                <Link href="/pricing" prefetch={false} className="inline-flex items-center gap-2 px-6 py-3 border border-[#e8e5df] text-[#4a4a4a] text-[13px] font-semibold rounded-full hover:border-[#0a0a0a] hover:text-[#0a0a0a] transition-all">View Pricing</Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((f) => (
                <ImgCard key={f.title} src={f.img} alt={f.title}>
                  <h3 className="font-display font-bold text-white text-[13px] sm:text-[14px] tracking-[0.04em] uppercase mb-1">{f.title}</h3>
                  <p className="text-white/70 text-[12px] sm:text-[13px] leading-relaxed">{f.desc}</p>
                </ImgCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ USE CASES ═══ */}
      <section className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24">
          <div className="text-center mb-12">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">Built For You</span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">For Every Jeweler</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {useCases.map((uc) => (
              <div key={uc.title} className="bg-[#fafaf8] rounded-2xl p-7 md:p-8 border border-[#e8e5df] hover:border-[#c4a67d]/30 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-[#f5f0e8] flex items-center justify-center mb-5 group-hover:bg-[#8b7355]/10 transition-colors">
                  <svg className="w-5 h-5 text-[#8b7355]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d={uc.icon} /></svg>
                </div>
                <div className="font-display font-extrabold text-[2.5rem] md:text-[3rem] text-[#0a0a0a] leading-none tracking-tight mb-1">{uc.stat}</div>
                <div className="text-[11px] font-semibold text-[#8b7355] tracking-[0.1em] uppercase mb-5">{uc.statLabel}</div>
                <h3 className="font-display font-bold text-[#0a0a0a] text-[16px] tracking-tight mb-3">{uc.title}</h3>
                <p className="text-[#8c8c8c] text-[14px] leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING BANNER ═══ */}
      <section className="relative overflow-hidden">
        {/* Dark background with gold accents */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#141210] to-[#0a0a0a]" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#c4a67d]/[0.06] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#8b7355]/[0.04] rounded-full blur-[120px]" />

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-20 md:py-28">
          {/* Top badge */}
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-[rgba(196,166,125,0.1)] border border-[rgba(196,166,125,0.2)] rounded-full text-[11px] sm:text-xs font-semibold text-[#c4a67d] tracking-[0.12em] uppercase mb-5">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              Limited Time Offer
            </span>
            <h2 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[2rem] min-[375px]:text-[2.5rem] sm:text-[3rem] md:text-[3.5rem] leading-[0.92]">
              Professional Photos<br />
              <span className="bg-gradient-to-r from-[#c4a67d] via-[#e8d5b5] to-[#8b7355] bg-clip-text text-transparent">At a Fraction of the Cost</span>
            </h2>
            <p className="mt-5 text-white/40 text-[15px] md:text-[17px] max-w-lg mx-auto leading-relaxed">
              Traditional jewelry photography costs ₹2,000–₹5,000 per product. AI photos starting at just ₹15/image.
            </p>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-white/[0.04] rounded-2xl p-6 md:p-7 border border-white/[0.08] text-center hover:border-white/[0.15] transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center mx-auto mb-4 group-hover:bg-white/[0.1] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <div className="text-[11px] font-bold text-white/40 uppercase tracking-[0.1em] mb-3">Starter Pack</div>
              <div className="font-display font-extrabold text-[2.5rem] text-white leading-none">₹149</div>
              <div className="text-[12px] text-white/30 mt-1 mb-5">80 tokens · ~₹15/image</div>
              <div className="space-y-2 text-left mb-6">
                {["10 Standard images", "4 Pro quality images", "No expiry on tokens"].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-[12px] text-white/50">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/pricing" prefetch={false} className="block w-full py-2.5 rounded-xl text-[13px] font-semibold text-white/60 border border-white/[0.1] hover:border-white/[0.2] hover:text-white transition-all">
                Get Started
              </Link>
            </div>

            {/* Pro — highlighted */}
            <div className="relative bg-gradient-to-b from-[rgba(196,166,125,0.12)] to-[rgba(196,166,125,0.04)] rounded-2xl p-6 md:p-7 border-2 border-[#c4a67d]/50 text-center shadow-[0_0_60px_rgba(196,166,125,0.12)] sm:-mt-3 sm:-mb-3">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-[10px] font-bold uppercase tracking-[0.12em] rounded-full shadow-lg shadow-[#c4a67d]/20">
                Most Popular
              </span>
              <div className="w-10 h-10 rounded-xl bg-[rgba(196,166,125,0.15)] flex items-center justify-center mx-auto mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div className="text-[11px] font-bold text-[#c4a67d] uppercase tracking-[0.1em] mb-3">Growth Monthly</div>
              <div className="font-display font-extrabold text-[2.5rem] text-white leading-none">₹549</div>
              <div className="text-[12px] text-[#c4a67d]/60 mt-1 mb-5">400 tokens/mo · ~₹11/image</div>
              <div className="space-y-2 text-left mb-6">
                {["50 Standard images/mo", "Pro quality renders", "Model catalogue access", "Priority processing"].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-[#c4a67d] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-[12px] text-white/60">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/pricing" prefetch={false} className="block w-full py-2.5 rounded-xl text-[13px] font-bold text-white bg-gradient-to-r from-[#8b7355] to-[#c4a67d] hover:shadow-[0_6px_24px_rgba(196,166,125,0.35)] transition-all active:scale-[0.97]">
                Get Growth Plan
              </Link>
            </div>

            {/* Business */}
            <div className="bg-white/[0.04] rounded-2xl p-6 md:p-7 border border-white/[0.08] text-center hover:border-white/[0.15] transition-all duration-300 group">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center mx-auto mb-4 group-hover:bg-white/[0.1] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                  <path d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                </svg>
              </div>
              <div className="text-[11px] font-bold text-white/40 uppercase tracking-[0.1em] mb-3">Business Monthly</div>
              <div className="font-display font-extrabold text-[2.5rem] text-white leading-none">₹1499</div>
              <div className="text-[12px] text-white/30 mt-1 mb-5">1200 tokens/mo · ~₹10/image</div>
              <div className="space-y-2 text-left mb-6">
                {["150 Standard images/mo", "Everything in Growth", "Bulk listing tools", "API access"].map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-[12px] text-white/50">{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/pricing" prefetch={false} className="block w-full py-2.5 rounded-xl text-[13px] font-semibold text-white/60 border border-white/[0.1] hover:border-white/[0.2] hover:text-white transition-all">
                Go Business
              </Link>
            </div>
          </div>

          {/* Bottom trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10 text-[12px] text-white/25">
            <span className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              Secure payments via Razorpay
            </span>
            <span className="hidden sm:inline text-white/10">|</span>
            <span>Cancel anytime, no lock-in</span>
            <span className="hidden sm:inline text-white/10">|</span>
            <span>UPI, Cards, Net Banking accepted</span>
          </div>

          <div className="text-center mt-6">
            <Link href="/pricing" prefetch={false} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#c4a67d]/70 hover:text-[#c4a67d] transition-colors">
              Compare all plans in detail
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="bg-[#0a0a0a] overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-20 md:py-32 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#8b7355]/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <h2 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[2rem] min-[375px]:text-[2.5rem] sm:text-[3.5rem] md:text-[4.5rem] leading-[0.9] mb-6">
              Your Jewelry Deserves<br /><span className="text-[#c4a67d]">Better Photos</span>
            </h2>
            <p className="text-white/40 text-[15px] md:text-[17px] max-w-md mx-auto leading-relaxed mb-10">
              Try free — no credit card required. Upload your first jewelry photo and see the transformation in seconds.
            </p>
            <Link href="/jewelry" className="px-8 py-4 bg-white text-[#0a0a0a] text-[14px] font-semibold rounded-full hover:bg-white/90 transition-all active:scale-[0.97] shadow-lg inline-flex items-center gap-2">
              Start Your Free Photoshoot
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
            </Link>
          </div>
          <div className="relative z-10 mt-16 grid grid-cols-2 md:grid-cols-4 gap-[3px] rounded-xl overflow-hidden">
            {[IMG.goldNecklace, IMG.modelBracelet, IMG.earring, IMG.diamondRing].map((src, i) => (
              <div key={i} className={`overflow-hidden ${i >= 2 ? "hidden md:block" : ""}`} style={{ aspectRatio: "16/9" }}>
                <img src={src} alt="" className="w-full h-full object-cover opacity-40 hover:opacity-65 transition-opacity duration-500" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="bg-[#0a0a0a] border-t border-white/5 safe-bottom">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 mb-10">
            <div className="md:col-span-1">
              <div className="flex items-center mb-4">
                <Logo className="text-lg opacity-80" variant="light" />
              </div>
              <p className="text-[13px] text-white/30 leading-relaxed">AI-powered jewelry photography. Studio-quality images from any photo, in seconds.</p>
            </div>
            {[
              { title: "Products", links: [{ l: "Jewelry Studio", h: "/jewelry" }, { l: "Bulk Listings", h: "/batch-listing" }, { l: "General Studio", h: "/studio" }] },
              { title: "Resources", links: [{ l: "Pricing", h: "/pricing" }, { l: "Blog", h: "/blog" }, { l: "Gallery", h: "/gallery" }, { l: "AI Photography", h: "/ai-photography" }] },
              { title: "Company", links: [{ l: "AI Jewelry Photography", h: "/ai-jewelry-photography" }, { l: "About", h: "#" }, { l: "Privacy Policy", h: "#" }, { l: "Terms of Service", h: "#" }] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-[11px] font-bold text-white/50 tracking-[0.12em] uppercase mb-4">{col.title}</h4>
                <div className="space-y-2.5">
                  {col.links.map((lnk) => <Link key={lnk.l} href={lnk.h} prefetch={false} className="block text-[13px] text-white/35 hover:text-white/70 transition-colors">{lnk.l}</Link>)}
                </div>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[11px] text-white/20">&copy; {new Date().getFullYear()} SoraiPixel. All rights reserved.</span>
            <span className="text-[11px] text-white/20">AI Jewelry Photography</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
