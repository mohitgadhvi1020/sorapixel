"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/ui/Logo";

/* ══════════ IMAGES — all 1376×768 (16:9) except before/after ══════════ */

const IMG = {
  hero: "/images/hero-jewelry.png",
  heroMobile: "/images/hero-mobile.png",
  before: "/images/before-rough.png",
  after: "/images/after-magic.png",
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
  womanEarring: "/images/woman-earring.png",
  womanNecklace: "/images/woman-necklace-v2.png",
  marbleSurface: "/images/marble-surface.png",
  cardHero: "/images/card-hero-shots.png",
  cardCloseup: "/images/card-closeup.png",
  cardLifestyle: "/images/card-lifestyle.png",
  cardModel: "/images/card-model-catalogue.png",
};

/* ══════════ DATA ══════════ */

const metrics = [
  { label: "Precision", value: 96.2, suffix: "%" },
  { label: "Detail Retention", value: 98.1, suffix: "%" },
  { label: "Color Accuracy", value: 97.4, suffix: "%" },
  { label: "Avg Delivery", value: 4.2, suffix: "s" },
];

const capabilities = [
  { num: "01", title: "Your Jewelry, Not Ours", desc: "Other AI tools subtly change your designs. We don't. Every prong, every stone setting, every engraving — untouched." },
  { num: "02", title: "3 Angles, One Upload", desc: "Hero shot, close-up, and alternate angle from a single photo. No reshooting. No waiting for a photographer's schedule." },
  { num: "03", title: "Sell Faster", desc: "Listings with professional photos convert 3x better. Go from raw product shot to marketplace-ready in under 30 seconds." },
];

const steps = [
  { num: "01", title: "Upload Your Jewelry", desc: "Drop in any photo — phone snap, CAD render, or product shot. Our AI prepares it automatically.", img: IMG.cadRender },
  { num: "02", title: "Choose Your Vision", desc: "Pick a scene, model, pose, and style. Velvet display, marble surface, lifestyle, or on-model editorial.", img: IMG.lifestyleScene },
  { num: "03", title: "Download & Sell", desc: "Get studio-quality images in seconds. Every detail stays pixel-perfect. Ready for any marketplace.", img: IMG.womanEarring },
];

const features = [
  { title: "Hero Shots", desc: "Stunning front-facing product shots that make your jewelry the star.", img: IMG.cardHero },
  { title: "Close-Up Detail", desc: "Show every facet, stone, and texture with AI-enhanced macro shots.", img: IMG.cardCloseup },
  { title: "Lifestyle Scenes", desc: "Place your jewelry in beautiful real-world contexts automatically.", img: IMG.cardLifestyle },
  { title: "Model Catalogue", desc: "Generate photos of AI models wearing your jewelry — no photoshoot needed.", img: IMG.cardModel },
];

const showcase = [
  IMG.goldNecklace, IMG.modelBracelet, IMG.darkElegance, IMG.earring,
  IMG.necklaceModel, IMG.diamondRing, IMG.ringHand, IMG.studioShot,
];

const stylePresets = [
  { name: "Velvet Display", img: IMG.darkElegance },
  { name: "Marble Surface", img: IMG.marbleSurface },
  { name: "Dark Dramatic", img: IMG.goldNecklace },
  { name: "Warm Lifestyle", img: IMG.necklaceModel },
  { name: "On-Model", img: IMG.womanNecklace },
  { name: "Clean White", img: IMG.diamondRing },
];

const useCases = [
  { title: "Jewelry Brands", desc: "Transform raw product shots into stunning catalogue imagery. Hero shots, angle packs, close-ups — everything for your online store.", stat: "90%", statLabel: "cost reduction" },
  { title: "Individual Sellers", desc: "Selling on Etsy, Instagram, or WhatsApp? Get professional product photos that sell, without spending on a photographer.", stat: "10x", statLabel: "faster delivery" },
  { title: "Manufacturers", desc: "Bulk-generate listings with consistent style across hundreds of SKUs. Metal recoloring, model shots, and marketplace-ready descriptions.", stat: "98%", statLabel: "detail accuracy" },
];

const drawerCategories = [
  { name: "Fashion & Apparel", desc: "Clothing, shoes, bags — flat lays to model shots.", src: "/images/icon-fashion.png", href: "/studio" },
  { name: "Accessories", desc: "Watches, sunglasses, belts — studio quality in seconds.", src: "/images/icon-watch.png", href: "/studio" },
  { name: "Home & Decor", desc: "Candles, ceramics, art — styled scenes automatically.", src: "/images/icon-home.png", href: "/studio" },
  { name: "Beauty & Cosmetics", desc: "Skincare, makeup, perfumes — luxe product photography.", src: "/images/icon-beauty.png", href: "/studio" },
  { name: "Food & Beverage", desc: "Gourmet shots for restaurants, cafes, and food brands.", src: "/images/icon-food.png", href: "/studio" },
];

/* ══════════ BEFORE / AFTER LOOP ══════════ */

function BeforeAfterLoop() {
  const [showAfter, setShowAfter] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setShowAfter((v) => !v), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ aspectRatio: "1 / 1" }}>
      <div className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out" style={{ opacity: showAfter ? 0 : 1 }}>
        <img src={IMG.before} alt="Original phone photo" className="w-full h-full object-cover" />
      </div>
      <div className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out" style={{ opacity: showAfter ? 1 : 0 }}>
        <img src={IMG.after} alt="AI enhanced result" className="w-full h-full object-cover" />
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="px-4 py-1.5 rounded-full backdrop-blur-md transition-all duration-[1200ms]" style={{ background: showAfter ? "rgba(139,115,85,0.7)" : "rgba(0,0,0,0.55)" }}>
          <span className="text-[11px] font-semibold text-white tracking-[0.15em] uppercase">{showAfter ? "AI Enhanced" : "Phone Photo"}</span>
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: showAfter ? "8px" : "24px", background: showAfter ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.8)" }} />
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: showAfter ? "24px" : "8px", background: showAfter ? "rgba(196,166,125,0.9)" : "rgba(255,255,255,0.25)" }} />
      </div>
    </div>
  );
}

/* ══════════ ANIMATED METRIC ══════════ */

function Metric({ value, suffix, label, delay = 0 }: { value: number; suffix: string; label: string; delay?: number }) {
  const [displayed, setDisplayed] = useState("0");
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const ran = useRef(false);
  const hasDecimal = value % 1 !== 0;
  const intPart = Math.floor(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !ran.current) {
        ran.current = true;
        setVisible(true);
        setTimeout(() => {
          const dur = 2000, start = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 4);
            if (p < 0.85) setDisplayed(String(Math.round(eased * intPart)));
            else if (p < 1) setDisplayed(String(intPart));
            else setDisplayed(hasDecimal ? value.toFixed(1) : String(intPart));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }, delay);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, intPart, hasDecimal, delay]);

  const fill = suffix === "%" ? value : Math.min(value * 10, 100);

  return (
    <div ref={ref} className={`text-center transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
      <div className="font-display font-extrabold text-[2rem] sm:text-[2.5rem] md:text-[3rem] text-[#0a0a0a] leading-none tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
        {displayed}<span className="text-[#8b7355]">{suffix}</span>
      </div>
      <div className="mt-3 mx-auto w-16 h-[3px] rounded-full bg-[#e8e5df] overflow-hidden">
        <div className="h-full rounded-full bg-[#8b7355] transition-all duration-[2000ms] ease-out" style={{ width: visible ? `${fill}%` : "0%", transitionDelay: `${delay}ms` }} />
      </div>
      <div className="mt-3 text-[12px] sm:text-[13px] font-medium text-[#8c8c8c] tracking-wide uppercase">{label}</div>
    </div>
  );
}

/* ══════════ 16:9 IMAGE CARD ══════════ */

function ImgCard({ src, alt, children, className = "" }: { src: string; alt: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl group ${className}`} style={{ aspectRatio: "16/9" }}>
      <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      {children && <div className="relative z-10 h-full flex flex-col justify-end p-5 sm:p-6">{children}</div>}
    </div>
  );
}

/* ══════════ MAIN PAGE ══════════ */

export default function HomePageClient() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#f7f7f5]">

      {/* ═══ NAVBAR ═══ */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-3 md:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <Logo className="text-lg sm:text-xl" variant="dark" />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/jewelry" className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#0a0a0a] bg-[#f5f0e8] rounded-lg transition-all">Jewelry Studio</Link>
            <Link href="/catalogue" className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all">Catalogue</Link>
            <Link href="/batch-listing" className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all hidden sm:block">Bulk Listings</Link>
            <button onClick={() => setDrawerOpen(true)} className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#8b7355] rounded-lg hover:bg-[#f5f0e8] transition-all hidden sm:flex items-center gap-1">
              More <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
            {isAuthenticated ? (
              <Link href="/profile" className="ml-1 sm:ml-2 flex items-center gap-2 px-4 sm:px-5 py-2 bg-[#0a0a0a] text-white text-[12px] sm:text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all active:scale-[0.97]">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">{(user?.contact_name || user?.company_name || "U").charAt(0).toUpperCase()}</span>
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="ml-1 sm:ml-2 px-4 sm:px-5 py-2 bg-[#0a0a0a] text-white text-[12px] sm:text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all active:scale-[0.97]">Sign In</Link>
            )}
          </nav>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[80vh] md:min-h-screen flex items-center overflow-hidden bg-[#0a0a0a]">
        {/* Gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#1a1610] to-[#0a0a0a]" />
          <div className="absolute top-0 right-0 w-[70%] h-[70%] bg-[#8b7355]/[0.07] rounded-full blur-[150px]" />
          <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-[#c4a67d]/[0.04] rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-20 md:py-0 w-full">
          <div className="max-w-4xl">
            <div className="animate-slide-up">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/[0.06] text-white/60 text-[11px] sm:text-xs font-medium tracking-[0.1em] uppercase rounded-full border border-white/[0.08] mb-6 md:mb-8">
                <span className="w-1.5 h-1.5 bg-[#c4a67d] rounded-full animate-pulse" />
                AI-Powered Jewelry Photography
              </span>
            </div>
            <div className="space-y-0 animate-slide-up" style={{ animationDelay: "80ms" }}>
              <h1 className="font-display font-extrabold text-white uppercase leading-[0.88] tracking-[-0.04em] text-[2.5rem] min-[375px]:text-[3rem] sm:text-[4.5rem] md:text-[6rem] lg:text-[7.5rem]">Your</h1>
              <h1 className="font-display font-extrabold text-white uppercase leading-[0.88] tracking-[-0.04em] text-[2.5rem] min-[375px]:text-[3rem] sm:text-[4.5rem] md:text-[6rem] lg:text-[7.5rem]">Jewelry</h1>
              <h1 className="font-display font-extrabold uppercase leading-[0.88] tracking-[-0.04em] text-[2.5rem] min-[375px]:text-[3rem] sm:text-[4.5rem] md:text-[6rem] lg:text-[7.5rem] bg-gradient-to-r from-[#c4a67d] via-[#e8d5b5] to-[#8b7355] bg-clip-text text-transparent">Unchanged</h1>
            </div>
            <p className="mt-6 md:mt-8 text-[14px] md:text-[17px] text-white/45 max-w-lg leading-relaxed animate-slide-up" style={{ animationDelay: "160ms" }}>
              AI imagery you can trust. No hallucinations. No subtle changes. Ever. Your jewelry accurately shown in stunning studio-quality photography.
            </p>
            <div className="mt-8 md:mt-10 flex flex-wrap items-center gap-4 animate-slide-up" style={{ animationDelay: "240ms" }}>
              <Link href="/jewelry" className="px-7 py-3.5 bg-white text-[#0a0a0a] text-[14px] font-semibold rounded-full hover:bg-white/90 transition-all active:scale-[0.97] shadow-[0_4px_24px_rgba(255,255,255,0.1)]">Start Creating</Link>
              <a href="#comparison" className="px-6 py-3.5 text-white/40 text-[14px] font-medium hover:text-white transition-colors flex items-center gap-2 group">
                <svg className="w-8 h-8 border border-white/15 rounded-full p-1.5 group-hover:border-white/40 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                Watch Tutorial
              </a>
            </div>
          </div>
          <div className="absolute bottom-6 right-8 md:right-12 flex-col items-center gap-2 hidden md:flex">
            <span className="text-[10px] text-white/20 tracking-[0.2em] uppercase">Scroll</span>
            <div className="w-[1px] h-8 bg-gradient-to-b from-white/20 to-transparent animate-scroll-hint" />
          </div>
        </div>
      </section>

      {/* ═══ TRUST METRICS ═══ */}
      <section className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-12 md:py-16">
          <div className="text-center mb-10">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">Why SoraiPixel</span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.5rem] sm:text-[2rem] md:text-[2.5rem] leading-[1.0]">
              AI Photography You Can <br /><span className="text-[#8b7355]">Actually Trust</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {metrics.map((m, i) => <Metric key={m.label} value={m.value} suffix={m.suffix} label={m.label} delay={i * 150} />)}
          </div>
        </div>
      </section>

      {/* ═══ WHAT YOU GET ═══ */}
      <section className="bg-[#f7f7f5] border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-14 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x divide-[#e8e5df]">
            {capabilities.map((c, i) => (
              <div key={c.title} className={`py-6 md:py-0 ${i > 0 ? "border-t md:border-t-0 border-[#e8e5df] md:pl-10 lg:pl-14" : ""} ${i < 2 ? "md:pr-10 lg:pr-14" : ""}`}>
                <span className="font-display font-bold text-[40px] sm:text-[48px] text-[#e8e5df] leading-none block mb-4 select-none">{c.num}</span>
                <h3 className="font-display font-bold text-[#0a0a0a] text-[17px] sm:text-[19px] tracking-tight mb-3">{c.title}</h3>
                <p className="text-[#8c8c8c] text-[14px] leading-[1.7]">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BEFORE / AFTER ═══ */}
      <section id="comparison" className="bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-4 block">See The Difference</span>
              <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] min-[375px]:text-[2rem] sm:text-[2.5rem] md:text-[3rem] leading-[0.95]">
                From Phone Snap<br /><span className="text-[#8b7355]">To Studio Quality</span>
              </h2>
              <p className="mt-5 text-[#8c8c8c] text-[15px] leading-relaxed max-w-md">
                Watch how SoraiPixel transforms a simple jewelry photo into magazine-worthy product imagery — with zero changes to your actual jewelry design.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#d4d0c8] ring-2 ring-[#d4d0c8]/30" /><span className="text-[13px] text-[#666] font-medium">Phone Photo</span></div>
                <div className="w-px h-4 bg-[#e0ddd7]" />
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#8b7355] ring-2 ring-[#8b7355]/30" /><span className="text-[13px] text-[#666] font-medium">AI Enhanced</span></div>
              </div>
            </div>
            <BeforeAfterLoop />
          </div>
        </div>
      </section>

      {/* ═══ SHOWCASE CAROUSEL ═══ */}
      <section className="bg-[#f7f7f5] border-y border-[#e8e5df] overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pt-14 md:pt-20 pb-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div>
              <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">Jewelry Showcase</span>
              <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
                AI-Generated<br className="hidden sm:block" /> Jewelry Photos
              </h2>
            </div>
            <p className="text-[#8c8c8c] text-sm max-w-xs leading-relaxed">Every image below was created by AI from a simple jewelry photo. No studio, no photographer, no retouching.</p>
          </div>
        </div>

        {/* Row 1 → */}
        <div className="relative mb-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10 bg-gradient-to-r from-[#f7f7f5] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10 bg-gradient-to-l from-[#f7f7f5] to-transparent" />
          <div className="flex gap-1 w-max" style={{ animation: "scroll-left 30s linear infinite" }}>
            {[...showcase, ...showcase].map((src, i) => (
              <div key={`a${i}`} className="flex-shrink-0 w-[260px] sm:w-[300px] md:w-[340px] rounded-lg overflow-hidden relative group" style={{ aspectRatio: "16/9" }}>
                <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 ← */}
        <div className="relative pb-10 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10 bg-gradient-to-r from-[#f7f7f5] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10 bg-gradient-to-l from-[#f7f7f5] to-transparent" />
          <div className="flex gap-1 w-max" style={{ animation: "scroll-right 35s linear infinite" }}>
            {[...showcase.slice().reverse(), ...showcase.slice().reverse()].map((src, i) => (
              <div key={`b${i}`} className="flex-shrink-0 w-[260px] sm:w-[300px] md:w-[340px] rounded-lg overflow-hidden relative group" style={{ aspectRatio: "16/9" }}>
                <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">How It Works</span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
              From Upload To<br /><span className="text-[#8b7355]">Masterpiece</span>
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
        </div>
      </section>

      {/* ═══ FEATURES — 2×2 GRID (all 16:9) ═══ */}
      <section className="bg-[#f7f7f5] border-y border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div className="lg:sticky lg:top-28">
              <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-4 block">Made for Jewelers</span>
              <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] min-[375px]:text-[2rem] sm:text-[2.5rem] md:text-[3.25rem] leading-[0.95]">
                Every Angle,<br />Every Detail,<br /><span className="text-[#8b7355]">Every Time</span>
              </h2>
              <p className="mt-6 text-[#8c8c8c] text-[15px] leading-relaxed max-w-sm">
                Professional jewelry photography costs thousands per shoot. SoraiPixel gives you hero shots, close-ups, model photos, and lifestyle scenes from a single upload.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/jewelry" className="inline-flex items-center gap-2 px-6 py-3 bg-[#0a0a0a] text-white text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all active:scale-[0.97]">
                  Try Jewelry Studio
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
                </Link>
                <Link href="/catalogue" className="inline-flex items-center gap-2 px-6 py-3 border border-[#e8e5df] text-[#4a4a4a] text-[13px] font-semibold rounded-full hover:border-[#0a0a0a] hover:text-[#0a0a0a] transition-all">Model Catalogue</Link>
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
              <div key={uc.title} className="bg-[#fafaf8] rounded-2xl p-7 md:p-8 border border-[#e8e5df] hover:border-[#c4a67d]/30 transition-all duration-300">
                <div className="font-display font-extrabold text-[2.5rem] md:text-[3rem] text-[#0a0a0a] leading-none tracking-tight mb-1">{uc.stat}</div>
                <div className="text-[11px] font-semibold text-[#8b7355] tracking-[0.1em] uppercase mb-5">{uc.statLabel}</div>
                <h3 className="font-display font-bold text-[#0a0a0a] text-[16px] tracking-tight mb-3">{uc.title}</h3>
                <p className="text-[#8c8c8c] text-[14px] leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STYLE PRESETS ═══ */}
      <section className="bg-[#f7f7f5] border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24">
          <div className="text-center mb-10 md:mb-14">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">Jewelry Styles</span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
              Choose Your <span className="text-[#8b7355]">Scene</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {stylePresets.map((s, i) => (
              <div key={s.name} className="relative overflow-hidden rounded-xl group cursor-pointer" style={{ aspectRatio: "16/9" }}>
                <img src={s.img} alt={s.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="relative z-10 h-full flex flex-col justify-between p-4 sm:p-5">
                  <span className="font-display font-bold text-[28px] sm:text-[36px] md:text-[44px] leading-none text-white/15">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="font-display font-bold text-[13px] sm:text-[15px] tracking-[0.02em] uppercase text-white">{s.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LINKS BAR ═══ */}
      <section className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 py-5 md:py-6">
            {[{ l: "Jewelry Studio", h: "/jewelry" }, { l: "Model Catalogue", h: "/catalogue" }, { l: "Bulk Listings", h: "/batch-listing" }, { l: "Try On", h: "/tryon" }].map((lnk) => (
              <Link key={lnk.l} href={lnk.h} className="text-[13px] font-semibold text-[#4a4a4a] hover:text-[#0a0a0a] tracking-[0.04em] uppercase transition-colors">{lnk.l}</Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DARK CTA ═══ */}
      <section className="bg-[#0a0a0a] overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-20 md:py-32 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#8b7355]/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="relative z-10 text-center">
            <span className="text-[11px] sm:text-xs font-semibold text-[#c4a67d]/60 tracking-[0.12em] uppercase mb-6 block">Ready To Create?</span>
            <h2 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[2rem] min-[375px]:text-[2.5rem] sm:text-[3.5rem] md:text-[5rem] lg:text-[6rem] leading-[0.9] mb-6">
              Professional Photoshoots<br /><span className="text-[#c4a67d]">In Seconds</span>
            </h2>
            <p className="text-white/40 text-[15px] md:text-[17px] max-w-lg mx-auto leading-relaxed mb-10">
              Mathematically verified accuracy. Your jewelry, perfectly preserved. Start with a free upload — no credit card required.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/jewelry" className="px-8 py-4 bg-white text-[#0a0a0a] text-[14px] font-semibold rounded-full hover:bg-white/90 transition-all active:scale-[0.97] shadow-lg">Start Your Photoshoot</Link>
              <Link href="/pricing" className="px-8 py-4 border border-white/15 text-white/60 text-[14px] font-medium rounded-full hover:border-white/30 hover:text-white transition-all">View Pricing</Link>
            </div>
          </div>
          <div className="relative z-10 mt-16 grid grid-cols-2 md:grid-cols-4 gap-[3px] rounded-xl overflow-hidden">
            {[IMG.goldNecklace, IMG.modelBracelet, IMG.earring, IMG.diamondRing].map((src, i) => (
              <div key={i} className={`overflow-hidden ${i >= 2 ? "hidden md:block" : ""}`} style={{ aspectRatio: "16/9" }}>
                <img src={src} alt="" className="w-full h-full object-cover opacity-50 hover:opacity-75 transition-opacity duration-500" loading="lazy" />
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
              { title: "Products", links: [{ l: "Jewelry Studio", h: "/jewelry" }, { l: "Model Catalogue", h: "/catalogue" }, { l: "Bulk Listings", h: "/batch-listing" }, { l: "General Studio", h: "/studio" }] },
              { title: "Resources", links: [{ l: "Pricing", h: "/pricing" }, { l: "Blog", h: "/blog" }, { l: "Gallery", h: "/gallery" }, { l: "AI Photography", h: "/ai-photography" }] },
              { title: "Company", links: [{ l: "AI Jewelry Photography", h: "/ai-jewelry-photography" }, { l: "About", h: "#" }, { l: "Privacy Policy", h: "#" }, { l: "Terms of Service", h: "#" }] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-[11px] font-bold text-white/50 tracking-[0.12em] uppercase mb-4">{col.title}</h4>
                <div className="space-y-2.5">
                  {col.links.map((lnk) => <Link key={lnk.l} href={lnk.h} className="block text-[13px] text-white/35 hover:text-white/70 transition-colors">{lnk.l}</Link>)}
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

      {/* ═══ MORE PILL ═══ */}
      <button onClick={() => setDrawerOpen(true)} className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-[#0a0a0a]/80 hover:bg-[#0a0a0a] text-white/60 hover:text-white backdrop-blur-sm px-2.5 py-4 rounded-l-xl border border-r-0 border-white/10 transition-all shadow-lg hidden sm:flex flex-col items-center gap-1.5" aria-label="More categories">
        <svg className="w-4 h-4 group-hover:text-[#c4a67d] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        <span className="text-[9px] font-bold tracking-[0.15em] uppercase [writing-mode:vertical-rl] rotate-180">More</span>
      </button>

      {/* ═══ SIDE DRAWER ═══ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[#fafaf8] animate-slide-in-right shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#e8e5df]">
              <div>
                <span className="text-[10px] font-semibold text-[#8b7355] tracking-[0.12em] uppercase block mb-1">Explore</span>
                <h3 className="font-display font-bold text-[#0a0a0a] text-[18px] uppercase tracking-tight">More Categories</h3>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors text-[#8c8c8c]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <p className="text-[13px] text-[#8c8c8c] mb-6 leading-relaxed">SoraiPixel works for any product category. While we specialize in jewelry, you can use the Studio for any product photography.</p>
              <div className="space-y-3">
                {drawerCategories.map((cat) => (
                  <Link key={cat.name} href={cat.href} onClick={() => setDrawerOpen(false)} className="flex gap-4 p-3 rounded-xl hover:bg-white border border-transparent hover:border-[#e8e5df] transition-all group">
                    <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden" style={{ aspectRatio: "1/1" }}>
                      <img src={cat.src} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[14px] font-semibold text-[#0a0a0a] group-hover:text-[#8b7355] transition-colors">{cat.name}</h4>
                      <p className="text-[12px] text-[#8c8c8c] mt-0.5 leading-relaxed">{cat.desc}</p>
                    </div>
                    <svg className="w-4 h-4 text-[#e8e5df] group-hover:text-[#8b7355] flex-shrink-0 mt-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </Link>
                ))}
              </div>
            </div>
            <div className="px-6 py-5 border-t border-[#e8e5df] bg-white">
              <Link href="/studio" onClick={() => setDrawerOpen(false)} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0a0a0a] text-white text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all active:scale-[0.97]">
                Open General Studio
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
