"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

/* ══════════ IMAGE ASSETS ══════════ */

const IMAGES = {
  hero: "https://images.unsplash.com/photo-1515562141589-67f0d93e230a?auto=format&fit=crop&w=1920&q=85",
  heroMobile: "https://images.unsplash.com/photo-1515562141589-67f0d93e230a?auto=format&fit=crop&w=800&q=80",
  necklaceModel: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80",
  ringHand: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80",
  earring: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80",
  darkElegance: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=800&q=80",
  diamondRing: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=800&q=80",
  studioShot: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=800&q=80",
  goldNecklace: "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=800&q=80",
  modelBracelet: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=80",
  beforeRaw: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=900&q=80",
  afterStyled: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=80",
  cadRender: "https://images.unsplash.com/photo-1586880244406-556ebe35f282?auto=format&fit=crop&w=600&q=80",
  lifestyleScene: "https://images.unsplash.com/photo-1600721391776-b5cd0e0048f9?auto=format&fit=crop&w=600&q=80",
  womanEarring: "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=600&q=80",
  womanNecklace: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=600&q=80",
};

/* ══════════ TRUST METRICS ══════════ */

const trustMetrics = [
  { label: "Precision", value: 96.2, suffix: "%" },
  { label: "Detail Retention", value: 98.1, suffix: "%" },
  { label: "Color Accuracy", value: 97.4, suffix: "%" },
  { label: "Avg Delivery", value: 4.2, suffix: "s" },
];

/* ══════════ SHOWCASE GRID ══════════ */

const showcaseItems = [
  { id: 1, src: IMAGES.goldNecklace, label: "Gold Collection", span: "col-span-2 row-span-2" },
  { id: 2, src: IMAGES.modelBracelet, label: "On-Model Shots" },
  { id: 3, src: IMAGES.darkElegance, label: "Dark Elegance" },
  { id: 4, src: IMAGES.earring, label: "Earring Detail" },
  { id: 5, src: IMAGES.necklaceModel, label: "Morning Light" },
  { id: 6, src: IMAGES.diamondRing, label: "Diamond Rings", span: "col-span-2" },
  { id: 7, src: IMAGES.ringHand, label: "Bangles & Bracelets" },
  { id: 8, src: IMAGES.studioShot, label: "Studio Compositions" },
];

/* ══════════ FEATURE CAPABILITIES ══════════ */

const capabilities = [
  {
    num: "01",
    title: "Your Jewelry, Not Ours",
    desc: "Other AI tools subtly change your designs. We don't. Every prong, every stone setting, every engraving — untouched.",
  },
  {
    num: "02",
    title: "3 Angles, One Upload",
    desc: "Hero shot, close-up, and alternate angle from a single photo. No reshooting. No waiting for a photographer's schedule.",
  },
  {
    num: "03",
    title: "Sell Faster",
    desc: "Listings with professional photos convert 3x better. Go from raw product shot to marketplace-ready in under 30 seconds.",
  },
];

/* ══════════ WORKFLOW STEPS ══════════ */

const workflowSteps = [
  {
    num: "01",
    title: "Upload Your Jewelry",
    desc: "Drop in any photo — phone snap, CAD render, or product shot. Our AI prepares it automatically.",
    img: IMAGES.cadRender,
  },
  {
    num: "02",
    title: "Choose Your Vision",
    desc: "Pick a scene, model, pose, and style. Velvet display, marble surface, lifestyle, or on-model editorial.",
    img: IMAGES.lifestyleScene,
  },
  {
    num: "03",
    title: "Download & Sell",
    desc: "Get studio-quality images in seconds. Every detail stays pixel-perfect. Ready for any marketplace.",
    img: IMAGES.womanEarring,
  },
];

/* ══════════ USE CASES ══════════ */

const useCases = [
  {
    title: "Jewelry Brands",
    desc: "Transform raw product shots into stunning catalogue imagery. Hero shots, angle packs, close-ups — everything for your online store.",
    stat: "90%",
    statLabel: "cost reduction",
  },
  {
    title: "Individual Sellers",
    desc: "Selling on Etsy, Instagram, or WhatsApp? Get professional product photos that sell, without spending on a photographer.",
    stat: "10x",
    statLabel: "faster delivery",
  },
  {
    title: "Manufacturers",
    desc: "Bulk-generate listings with consistent style across hundreds of SKUs. Metal recoloring, model shots, and marketplace-ready descriptions.",
    stat: "98%",
    statLabel: "detail accuracy",
  },
];

/* ══════════ COMPARISON SLIDER COMPONENT ══════════ */

function ComparisonSlider() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current || !isDragging.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const handleMouseDown = () => { isDragging.current = true; };
  const handleMouseUp = () => { isDragging.current = false; };

  useEffect(() => {
    const onMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onUp = () => { isDragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [handleMove]);

  return (
    <div
      ref={containerRef}
      className="comparison-slider relative rounded-2xl overflow-hidden aspect-[4/3] md:aspect-[16/10]"
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      {/* After (full background) */}
      <img
        src={IMAGES.afterStyled}
        alt="AI-generated result"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Before (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={IMAGES.beforeRaw}
          alt="Original jewelry photo"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: `${containerRef.current ? containerRef.current.offsetWidth : 1000}px`, maxWidth: "none" }}
          draggable={false}
        />
      </div>

      {/* Handle */}
      <div
        className="absolute top-0 bottom-0 z-10"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        <div className="w-[2px] h-full bg-white/90 mx-auto" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center cursor-ew-resize">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round">
            <path d="M8 4l-6 8 6 8" />
            <path d="M16 4l6 8-6 8" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
        <span className="text-[11px] font-semibold text-white/90 tracking-wide uppercase">Original</span>
      </div>
      <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full bg-[#8b7355]/70 backdrop-blur-sm">
        <span className="text-[11px] font-semibold text-white/90 tracking-wide uppercase">AI Enhanced</span>
      </div>
    </div>
  );
}

/* ══════════ ANIMATED METRIC ══════════ */

function AnimatedMetric({ value, suffix, label, delay = 0 }: { value: number; suffix: string; label: string; delay?: number }) {
  const [displayed, setDisplayed] = useState<string>("0");
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  const hasDecimal = value % 1 !== 0;
  const intPart = Math.floor(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          setVisible(true);

          setTimeout(() => {
            const duration = 2000;
            const start = performance.now();
            const tick = (now: number) => {
              const progress = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 4);

              if (progress < 0.85) {
                setDisplayed(String(Math.round(eased * intPart)));
              } else if (progress < 1) {
                setDisplayed(String(intPart));
              } else {
                setDisplayed(hasDecimal ? value.toFixed(1) : String(intPart));
              }

              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }, delay);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, intPart, hasDecimal, delay]);

  const fillPercent = suffix === "%" ? value : Math.min(value * 10, 100);

  return (
    <div ref={ref} className={`text-center transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
      <div className="font-display font-extrabold text-[2rem] sm:text-[2.5rem] md:text-[3rem] text-[#0a0a0a] leading-none tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
        {displayed}
        <span className="text-[#8b7355]">{suffix}</span>
      </div>
      <div className="mt-3 mx-auto w-16 h-[3px] rounded-full bg-[#e8e5df] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#8b7355] transition-all duration-[2000ms] ease-out"
          style={{ width: visible ? `${fillPercent}%` : "0%", transitionDelay: `${delay}ms` }}
        />
      </div>
      <div className="mt-3 text-[12px] sm:text-[13px] font-medium text-[#8c8c8c] tracking-wide uppercase">{label}</div>
    </div>
  );
}

/* ══════════ MAIN PAGE ══════════ */

export default function HomePage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      {/* ═══════════ NAVBAR ═══════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-3 md:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-[#0a0a0a] flex items-center justify-center">
              <span className="text-white text-xs font-bold">SP</span>
            </div>
            <span className="font-display font-bold text-[15px] tracking-tight text-[#0a0a0a] hidden sm:block">
              SoraPixel
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/jewelry"
              className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#0a0a0a] bg-[#f5f0e8] rounded-lg transition-all duration-200"
            >
              Jewelry Studio
            </Link>
            <Link
              href="/catalogue"
              className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200"
            >
              Catalogue
            </Link>
            <Link
              href="/batch-listing"
              className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200 hidden sm:block"
            >
              Bulk Listings
            </Link>
            <button
              onClick={() => setDrawerOpen(true)}
              className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#8b7355] rounded-lg hover:bg-[#f5f0e8] transition-all duration-200 hidden sm:flex items-center gap-1"
            >
              More
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {isAuthenticated ? (
              <Link
                href="/jewelry"
                className="ml-1 sm:ml-2 flex items-center gap-2 px-4 sm:px-5 py-2 bg-[#0a0a0a] text-white text-[12px] sm:text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all duration-200 active:scale-[0.97]"
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                  {(user?.contact_name || user?.company_name || "U").charAt(0).toUpperCase()}
                </span>
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="ml-1 sm:ml-2 px-4 sm:px-5 py-2 bg-[#0a0a0a] text-white text-[12px] sm:text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all duration-200 active:scale-[0.97]"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* ═══════════ HERO — STACKED TYPOGRAPHY ═══════════ */}
      <section className="relative min-h-[90vh] md:min-h-screen flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <picture>
            <source media="(max-width: 767px)" srcSet={IMAGES.heroMobile} />
            <img
              src={IMAGES.hero}
              alt="AI jewelry photography"
              className="w-full h-full object-cover"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/25" />
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 pb-12 md:pb-20 pt-32 w-full">
          <div className="max-w-5xl">
            <div className="animate-slide-up">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/10 text-white/70 text-[11px] sm:text-xs font-medium tracking-[0.1em] uppercase rounded-full border border-white/10 mb-6 md:mb-8 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 bg-[#c4a67d] rounded-full animate-pulse" />
                AI-Powered Jewelry Photography
              </span>
            </div>

            {/* Stacked hero heading — FormaNova style */}
            <div className="space-y-0 animate-slide-up" style={{ animationDelay: "80ms" }}>
              <h1 className="font-display font-extrabold text-white uppercase leading-[0.88] tracking-[-0.04em] text-[2.2rem] min-[375px]:text-[2.8rem] sm:text-[4.5rem] md:text-[6rem] lg:text-[7.5rem]">
                Your
              </h1>
              <h1 className="font-display font-extrabold text-white uppercase leading-[0.88] tracking-[-0.04em] text-[2.2rem] min-[375px]:text-[2.8rem] sm:text-[4.5rem] md:text-[6rem] lg:text-[7.5rem]">
                Jewelry
              </h1>
              <h1 className="font-display font-extrabold uppercase leading-[0.88] tracking-[-0.04em] text-[2.2rem] min-[375px]:text-[2.8rem] sm:text-[4.5rem] md:text-[6rem] lg:text-[7.5rem] text-[#c4a67d]">
                Unchanged
              </h1>
            </div>

            <p
              className="mt-5 md:mt-7 text-[14px] md:text-[17px] text-white/55 max-w-lg leading-relaxed animate-slide-up"
              style={{ animationDelay: "160ms" }}
            >
              AI imagery you can trust. No hallucinations. No subtle changes.
              Ever. Your jewelry accurately shown in stunning studio-quality photography.
            </p>

            <div
              className="mt-7 md:mt-9 flex flex-wrap items-center gap-4 animate-slide-up"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                href="/jewelry"
                className="px-7 py-3.5 bg-white text-[#0a0a0a] text-[14px] font-semibold rounded-full hover:bg-white/90 transition-all duration-200 active:scale-[0.97] shadow-lg"
              >
                Start Creating
              </Link>
              <a
                href="#comparison"
                className="px-6 py-3.5 text-white/50 text-[14px] font-medium hover:text-white transition-colors duration-200 flex items-center gap-2 group"
              >
                <svg className="w-8 h-8 border border-white/20 rounded-full p-1.5 group-hover:border-white/50 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                Watch Tutorial
              </a>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-6 right-8 md:right-12 flex-col items-center gap-2 hidden md:flex">
            <span className="text-[10px] text-white/25 tracking-[0.2em] uppercase">Scroll</span>
            <div className="w-[1px] h-8 bg-gradient-to-b from-white/25 to-transparent animate-scroll-hint" />
          </div>
        </div>
      </section>

      {/* ═══════════ TRUST METRICS BAR ═══════════ */}
      <section className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-12 md:py-16">
          <div className="text-center mb-10">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
              Why SoraPixel
            </span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.5rem] sm:text-[2rem] md:text-[2.5rem] leading-[1.0]">
              AI Photography You Can
              <br />
              <span className="text-[#8b7355]">Actually Trust</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {trustMetrics.map((m, i) => (
              <AnimatedMetric key={m.label} value={m.value} suffix={m.suffix} label={m.label} delay={i * 150} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ WHAT YOU GET ═══════════ */}
      <section className="bg-[#f7f7f5] border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x divide-[#e8e5df]">
            {capabilities.map((cap, i) => (
              <div
                key={cap.title}
                className={`py-6 md:py-0 ${i > 0 ? "border-t md:border-t-0 border-[#e8e5df]" : ""} ${i > 0 ? "md:pl-10 lg:pl-14" : ""} ${i < 2 ? "md:pr-10 lg:pr-14" : ""}`}
              >
                <span className="font-display font-bold text-[40px] sm:text-[48px] text-[#e8e5df] leading-none block mb-4 select-none">
                  {cap.num}
                </span>
                <h3 className="font-display font-bold text-[#0a0a0a] text-[17px] sm:text-[19px] tracking-tight mb-3">
                  {cap.title}
                </h3>
                <p className="text-[#8c8c8c] text-[14px] leading-[1.7]">
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ BEFORE / AFTER COMPARISON ═══════════ */}
      <section id="comparison" className="bg-white">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-4 block">
                See The Difference
              </span>
              <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] min-[375px]:text-[2rem] sm:text-[2.5rem] md:text-[3rem] leading-[0.95]">
                From Phone Snap
                <br />
                <span className="text-[#8b7355]">To Studio Quality</span>
              </h2>
              <p className="mt-5 text-[#8c8c8c] text-[15px] leading-relaxed max-w-md">
                Drag the slider to see how SoraPixel transforms a simple jewelry
                photo into magazine-worthy product imagery — with zero changes
                to your actual jewelry design.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#e8e5df]" />
                  <span className="text-[13px] text-[#8c8c8c]">Original Photo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#8b7355]" />
                  <span className="text-[13px] text-[#8c8c8c]">AI Enhanced</span>
                </div>
              </div>
            </div>
            <ComparisonSlider />
          </div>
        </div>
      </section>

      {/* ═══════════ SHOWCASE GRID ═══════════ */}
      <section className="bg-[#f7f7f5] border-y border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 md:mb-12">
            <div>
              <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
                Jewelry Showcase
              </span>
              <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
                AI-Generated
                <br className="hidden sm:block" />
                {" "}Jewelry Photos
              </h2>
            </div>
            <p className="text-[#8c8c8c] text-sm max-w-xs leading-relaxed">
              Every image below was created by AI from a simple jewelry photo.
              No studio, no photographer, no retouching.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[3px] stagger-children bg-[#e8e5df] rounded-xl overflow-hidden">
            {showcaseItems.map((item) => (
              <div
                key={item.id}
                className={`relative overflow-hidden group cursor-pointer bg-[#1a1a1a] ${item.span || ""}`}
                style={{ aspectRatio: item.id === 6 ? "2/1" : "1/1" }}
              >
                <img
                  src={item.src}
                  alt={item.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="text-[11px] sm:text-xs font-semibold tracking-[0.08em] uppercase text-white/90">
                    {item.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS — STEPPED WORKFLOW ═══════════ */}
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
              How It Works
            </span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
              From Upload To
              <br />
              <span className="text-[#8b7355]">Masterpiece</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0">
            {workflowSteps.map((step, i) => (
              <div
                key={step.num}
                className={`relative ${i < 2 ? "md:border-r border-[#e8e5df]" : ""} ${i > 0 ? "md:pl-10 lg:pl-14" : ""} ${i < 2 ? "md:pr-10 lg:pr-14" : ""}`}
              >
                {/* Step number badge */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-[#f5f0e8] flex items-center justify-center">
                    <span className="font-display font-bold text-[14px] text-[#8b7355]">{step.num}</span>
                  </div>
                  {i < 2 && (
                    <div className="hidden md:block flex-1 h-[1px] bg-gradient-to-r from-[#e8e5df] to-transparent" />
                  )}
                </div>

                {/* Image */}
                <div className="w-full aspect-[16/10] rounded-xl overflow-hidden mb-5 border border-[#e8e5df]">
                  <img
                    src={step.img}
                    alt={step.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>

                <h3 className="font-display font-bold text-[#0a0a0a] text-[17px] sm:text-[19px] tracking-tight mb-2">
                  {step.title}
                </h3>
                <p className="text-[#8c8c8c] text-[14px] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES SPLIT — DETAIL SECTION ═══════════ */}
      <section className="bg-[#f7f7f5] border-y border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div className="lg:sticky lg:top-28">
              <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-4 block">
                Made for Jewelers
              </span>
              <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] min-[375px]:text-[2rem] sm:text-[2.5rem] md:text-[3.25rem] leading-[0.95]">
                Every Angle,
                <br />
                Every Detail,
                <br />
                <span className="text-[#8b7355]">Every Time</span>
              </h2>
              <p className="mt-6 text-[#8c8c8c] text-[15px] leading-relaxed max-w-sm">
                Professional jewelry photography costs thousands per shoot.
                SoraPixel gives you hero shots, close-ups, model photos, and
                lifestyle scenes from a single upload.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/jewelry"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#0a0a0a] text-white text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all duration-200 active:scale-[0.97]"
                >
                  Try Jewelry Studio
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                  </svg>
                </Link>
                <Link
                  href="/catalogue"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-[#e8e5df] text-[#4a4a4a] text-[13px] font-semibold rounded-full hover:border-[#0a0a0a] hover:text-[#0a0a0a] transition-all duration-200"
                >
                  Model Catalogue
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
              {[
                {
                  title: "HERO SHOTS",
                  desc: "Stunning front-facing product shots that make your jewelry the star. Perfect for listings.",
                  src: IMAGES.ringHand,
                  size: "md:col-span-1 md:row-span-2",
                },
                {
                  title: "CLOSE-UP DETAIL",
                  desc: "Show every facet, stone, and texture with AI-enhanced macro shots.",
                  src: IMAGES.diamondRing,
                },
                {
                  title: "LIFESTYLE SCENES",
                  desc: "Place your jewelry in beautiful real-world contexts automatically.",
                  src: IMAGES.modelBracelet,
                },
                {
                  title: "MODEL CATALOGUE",
                  desc: "Generate photos of AI models wearing your jewelry — no photoshoot needed.",
                  src: IMAGES.studioShot,
                  size: "md:col-span-2",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className={`relative overflow-hidden rounded-xl ${card.size || ""} card-hover group`}
                >
                  <div className="absolute inset-0">
                    <img
                      src={card.src}
                      alt={card.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
                  </div>
                  <div className="relative z-10 p-6 sm:p-7 flex flex-col justify-end min-h-[200px]">
                    <h3 className="font-display font-bold text-white text-[13px] sm:text-[14px] tracking-[0.04em] uppercase mb-2">
                      {card.title}
                    </h3>
                    <p className="text-white/70 text-[13px] leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ USE CASES WITH STATS ═══════════ */}
      <section className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
          <div className="text-center mb-12">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
              Built For You
            </span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
              For Every Jeweler
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {useCases.map((uc) => (
              <div
                key={uc.title}
                className="bg-[#fafaf8] rounded-2xl p-7 md:p-8 border border-[#e8e5df] hover:border-[#c4a67d]/30 transition-all duration-300 group"
              >
                <div className="font-display font-extrabold text-[2.5rem] md:text-[3rem] text-[#0a0a0a] leading-none tracking-tight mb-1">
                  {uc.stat}
                </div>
                <div className="text-[11px] font-semibold text-[#8b7355] tracking-[0.1em] uppercase mb-5">
                  {uc.statLabel}
                </div>
                <h3 className="font-display font-bold text-[#0a0a0a] text-[16px] tracking-tight mb-3">
                  {uc.title}
                </h3>
                <p className="text-[#8c8c8c] text-[14px] leading-relaxed">
                  {uc.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ STYLE PRESETS MARQUEE ═══════════ */}
      <section className="bg-[#f7f7f5] border-b border-[#e8e5df] overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
          <div className="text-center mb-10 md:mb-14">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
              Jewelry Styles
            </span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
              Choose Your
              <br />
              <span className="text-[#8b7355]">Scene</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger-children">
            {[
              { name: "Velvet Display", src: IMAGES.darkElegance, icon: "01" },
              { name: "Marble Surface", src: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=600&q=80", icon: "02" },
              { name: "Dark Dramatic", src: IMAGES.goldNecklace, icon: "03" },
              { name: "Warm Lifestyle", src: IMAGES.necklaceModel, icon: "04" },
              { name: "On-Model Editorial", src: IMAGES.womanNecklace, icon: "05" },
              { name: "Clean White", src: IMAGES.diamondRing, icon: "06" },
            ].map((style) => (
              <div
                key={style.name}
                className="relative overflow-hidden rounded-xl aspect-[4/3] group cursor-pointer"
              >
                <img
                  src={style.src}
                  alt={style.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="relative z-10 h-full flex flex-col justify-between p-5 sm:p-6">
                  <span className="font-display font-bold text-[32px] sm:text-[40px] md:text-[48px] leading-none text-white/15">
                    {style.icon}
                  </span>
                  <h3 className="font-display font-bold text-[14px] sm:text-[16px] tracking-[0.02em] uppercase text-white">
                    {style.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ LINKS BAR ═══════════ */}
      <section className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 py-5 md:py-6">
            {[
              { label: "Jewelry Studio", href: "/jewelry" },
              { label: "Model Catalogue", href: "/catalogue" },
              { label: "Bulk Listings", href: "/batch-listing" },
              { label: "Try On", href: "/tryon" },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-[13px] font-semibold text-[#4a4a4a] hover:text-[#0a0a0a] tracking-[0.04em] uppercase transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ DARK CTA — READY TO CREATE ═══════════ */}
      <section className="bg-[#0a0a0a] overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-20 md:py-32 relative">
          {/* Ambient glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#8b7355]/5 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative z-10 text-center">
            <span className="text-[11px] sm:text-xs font-semibold text-[#c4a67d]/60 tracking-[0.12em] uppercase mb-6 block">
              Ready To Create?
            </span>
            <h2 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[2rem] min-[375px]:text-[2.5rem] sm:text-[3.5rem] md:text-[5rem] lg:text-[6rem] leading-[0.9] mb-6">
              Professional Photoshoots
              <br />
              <span className="text-[#c4a67d]">In Seconds</span>
            </h2>
            <p className="text-white/40 text-[15px] md:text-[17px] max-w-lg mx-auto leading-relaxed mb-10">
              Mathematically verified accuracy. Your jewelry, perfectly preserved.
              Start with a free upload — no credit card required.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/jewelry"
                className="px-8 py-4 bg-white text-[#0a0a0a] text-[14px] font-semibold rounded-full hover:bg-white/90 transition-all duration-200 active:scale-[0.97] shadow-lg"
              >
                Start Your Photoshoot
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-4 border border-white/15 text-white/60 text-[14px] font-medium rounded-full hover:border-white/30 hover:text-white transition-all duration-200"
              >
                View Pricing
              </Link>
            </div>
          </div>

          {/* Gallery strip */}
          <div className="relative z-10 mt-16 grid grid-cols-2 md:grid-cols-4 gap-[3px] rounded-xl overflow-hidden">
            {[IMAGES.goldNecklace, IMAGES.modelBracelet, IMAGES.earring, IMAGES.diamondRing].map((src, i) => (
              <div key={i} className={`aspect-[4/3] overflow-hidden ${i >= 2 ? "hidden md:block" : ""}`}>
                <img
                  src={src}
                  alt="Jewelry photography"
                  className="w-full h-full object-cover opacity-50 hover:opacity-75 transition-opacity duration-500"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-[#0a0a0a] border-t border-white/5 safe-bottom">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 mb-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">SP</span>
                </div>
                <span className="font-display font-bold text-[15px] text-white/80">
                  SoraPixel
                </span>
              </div>
              <p className="text-[13px] text-white/30 leading-relaxed">
                AI-powered jewelry photography. Studio-quality images from any photo, in seconds.
              </p>
            </div>

            {/* Products */}
            <div>
              <h4 className="text-[11px] font-bold text-white/50 tracking-[0.12em] uppercase mb-4">Products</h4>
              <div className="space-y-2.5">
                {[
                  { label: "Jewelry Studio", href: "/jewelry" },
                  { label: "Model Catalogue", href: "/catalogue" },
                  { label: "Bulk Listings", href: "/batch-listing" },
                  { label: "General Studio", href: "/studio" },
                ].map((link) => (
                  <Link key={link.href} href={link.href} className="block text-[13px] text-white/35 hover:text-white/70 transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-[11px] font-bold text-white/50 tracking-[0.12em] uppercase mb-4">Resources</h4>
              <div className="space-y-2.5">
                {[
                  { label: "Pricing", href: "/pricing" },
                  { label: "Blog", href: "/blog" },
                  { label: "Tutorial", href: "#" },
                  { label: "API Docs", href: "#" },
                ].map((link) => (
                  <Link key={link.label} href={link.href} className="block text-[13px] text-white/35 hover:text-white/70 transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-[11px] font-bold text-white/50 tracking-[0.12em] uppercase mb-4">Company</h4>
              <div className="space-y-2.5">
                {[
                  { label: "About", href: "#" },
                  { label: "Contact", href: "#" },
                  { label: "Privacy Policy", href: "#" },
                  { label: "Terms of Service", href: "#" },
                ].map((link) => (
                  <Link key={link.label} href={link.href} className="block text-[13px] text-white/35 hover:text-white/70 transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[11px] text-white/20">
              &copy; {new Date().getFullYear()} SoraPixel. All rights reserved.
            </span>
            <div className="flex items-center gap-4">
              <span className="text-[11px] text-white/20">AI Jewelry Photography</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══════════ FLOATING MORE PILL ═══════════ */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-[#0a0a0a]/80 hover:bg-[#0a0a0a] text-white/60 hover:text-white backdrop-blur-sm px-2.5 py-4 rounded-l-xl border border-r-0 border-white/10 transition-all duration-300 group shadow-lg hidden sm:flex flex-col items-center gap-1.5"
        aria-label="Explore more categories"
      >
        <svg className="w-4 h-4 group-hover:text-[#c4a67d] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        <span className="text-[9px] font-bold tracking-[0.15em] uppercase [writing-mode:vertical-rl] rotate-180">
          More
        </span>
      </button>

      {/* ═══════════ CATEGORIES SIDE DRAWER ═══════════ */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[#fafaf8] animate-slide-in-right shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#e8e5df]">
              <div>
                <span className="text-[10px] font-semibold text-[#8b7355] tracking-[0.12em] uppercase block mb-1">
                  Explore
                </span>
                <h3 className="font-display font-bold text-[#0a0a0a] text-[18px] uppercase tracking-tight">
                  More Categories
                </h3>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors text-[#8c8c8c]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <p className="text-[13px] text-[#8c8c8c] mb-6 leading-relaxed">
                SoraPixel works for any product category. While we specialize in
                jewelry, you can use the Studio for any product photography.
              </p>
              <div className="space-y-3">
                {[
                  { name: "Fashion & Apparel", desc: "Clothing, shoes, bags — flat lays to model shots.", src: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=400&q=80", href: "/studio" },
                  { name: "Accessories", desc: "Watches, sunglasses, belts — studio quality in seconds.", src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80", href: "/studio" },
                  { name: "Home & Decor", desc: "Candles, ceramics, art — styled scenes automatically.", src: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=400&q=80", href: "/studio" },
                  { name: "Beauty & Cosmetics", desc: "Skincare, makeup, perfumes — luxe product photography.", src: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=400&q=80", href: "/studio" },
                  { name: "Food & Beverage", desc: "Gourmet shots for restaurants, cafes, and food brands.", src: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=400&q=80", href: "/studio" },
                ].map((cat) => (
                  <Link
                    key={cat.name}
                    href={cat.href}
                    onClick={() => setDrawerOpen(false)}
                    className="flex gap-4 p-3 rounded-xl hover:bg-white border border-transparent hover:border-[#e8e5df] transition-all duration-200 group"
                  >
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden">
                      <img
                        src={cat.src}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[14px] font-semibold text-[#0a0a0a] group-hover:text-[#8b7355] transition-colors">
                        {cat.name}
                      </h4>
                      <p className="text-[12px] text-[#8c8c8c] mt-0.5 leading-relaxed">
                        {cat.desc}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-[#e8e5df] group-hover:text-[#8b7355] flex-shrink-0 mt-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>

            <div className="px-6 py-5 border-t border-[#e8e5df] bg-white">
              <Link
                href="/studio"
                onClick={() => setDrawerOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#0a0a0a] text-white text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all duration-200 active:scale-[0.97]"
              >
                Open General Studio
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
