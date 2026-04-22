"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/AppProvider";
import Logo from "@/components/ui/Logo";
import CompareSlider from "@/components/ui/CompareSlider";
import PricingModal from "@/components/pricing/PricingModal";
import ContactFloat from "@/components/ui/ContactFloat";
import ExitIntentPopup from "@/components/ui/ExitIntentPopup";
import { useGeoCountry } from "@/hooks/useGeoCountry";

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
  tileProductStudio: "/images/tile-product-studio.png",
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
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { currency, isIndia } = useGeoCountry();
  const [activeTransformation, setActiveTransformation] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => { setAuthReady(true); }, []);

  const sym = currency === "INR" ? "₹" : currency === "EUR" ? "€" : "$";
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
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-3 md:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <Logo className="text-lg sm:text-xl" variant="dark" />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link href="/create" className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#0a0a0a] bg-[#f5f0e8] rounded-lg transition-all hover:bg-[#ece4d4]">Create</Link>
            <Link href="/batch-listing" prefetch={false} className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all hidden sm:block">Bulk Listings</Link>
            <Link href="/projects" prefetch={false} className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all hidden sm:block">My Creations</Link>
            <Link href="/pricing" prefetch={false} className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all hidden sm:block">Pricing</Link>
            {!authReady ? (
              <span className="ml-1 sm:ml-2 w-[110px] h-[36px] rounded-full bg-black/5 animate-pulse" aria-hidden />
            ) : isAuthenticated ? (
              <Link href="/profile" prefetch={false} aria-label="Profile" className="ml-1 sm:ml-2 w-9 h-9 flex items-center justify-center bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-[13px] font-bold rounded-full hover:shadow-[0_4px_16px_rgba(196,166,125,0.3)] transition-all active:scale-[0.97]">
                {(user?.contact_name || user?.company_name || "U").charAt(0).toUpperCase()}
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
                  Try with YOUR Jewelry — Free
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
              Loved by jewelers from Jaipur to New York
            </span>
            <span className="hidden sm:inline text-[#e8e5df]">|</span>
            <span>Preserves every stone, prong &amp; engraving</span>
            <span className="hidden sm:inline text-[#e8e5df]">|</span>
            <span>Under 30 seconds per image</span>
            <span className="hidden sm:inline text-[#e8e5df]">|</span>
            <span>Zero design changes guaranteed</span>
          </div>
        </div>
      </section>

      {/* ═══ WHAT TO CREATE — 5 tools, mirrors /create ═══ */}
      <section className="bg-[#f7f7f5] border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24">
          <div className="text-center mb-10 md:mb-14">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">Five tools, one workflow</span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
              What do you want to <span className="text-[#8b7355]">create</span>?
            </h2>
            <p className="mt-4 text-[#8c8c8c] text-[15px] max-w-xl mx-auto leading-relaxed">
              One upload, many outcomes. Pick a tool — each one is built for a specific job.
            </p>
          </div>

          {/* 5-tile grid — same shape as /create */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 max-w-5xl mx-auto">
            {[
              { href: "/jewelry",    title: "Jewelry Studio",    tagline: "Raw jewelry photo \u2192 themed product shots.",       image: IMG.darkElegance,  tone: "from-[#8b7355] to-[#c4a67d]", badge: "Most popular" },
              { href: "/studio",     title: "Product Studio",    tagline: "Any product on a studio backdrop in seconds.",          image: IMG.tileProductStudio, tone: "from-[#8b7355] to-[#c4a67d]" },
              { href: "/ugc",        title: "Model Shots (UGC)", tagline: "See your product worn by a real-looking model.",        image: IMG.necklaceModel, tone: "from-[#ec4899] to-[#f472b6]" },
              { href: "/create/video", title: "Video", tagline: "Reels, 360\u00b0 spins, product reveals \u2014 pick a mode on the next step.", image: IMG.cardLifestyle, tone: "from-[#7c3aed] to-[#a78bfa]", badge: "New" },
            ].map((tile, i) => (
              <Link
                key={tile.href}
                href={tile.href}
                prefetch={false}
                className="group relative rounded-2xl overflow-hidden border border-[#e8e5df] bg-white hover:border-[#c4a67d]/50 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="aspect-[4/3] relative overflow-hidden bg-[#f0ebe3]">
                  <img src={tile.image} alt={tile.title} className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-out" loading="lazy" />
                  <div className={`absolute inset-0 bg-gradient-to-br ${tile.tone} opacity-15 group-hover:opacity-10 transition-opacity duration-300`} />
                  {tile.badge && (
                    <span className="absolute top-3 left-3 text-[9px] font-bold tracking-wider uppercase bg-white/95 text-[#0a0a0a] px-2 py-0.5 rounded-full shadow-sm">
                      {tile.badge}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base md:text-lg font-bold text-[#0a0a0a] tracking-tight">{tile.title}</h3>
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#f5f0e8] border border-[#e8e5df] flex items-center justify-center text-[#8b7355] group-hover:bg-[#c4a67d] group-hover:text-white group-hover:border-[#c4a67d] group-hover:translate-x-0.5 transition-all duration-250">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </span>
                  </div>
                  <p className="text-[13px] text-[#6b6b6b] mt-1.5 leading-relaxed">{tile.tagline}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Bulk callout — different intent, lives outside the tile grid */}
          <div className="mt-8 max-w-5xl mx-auto animate-fade-in-up" style={{ animationDelay: "480ms" }}>
            <Link
              href="/batch-listing"
              prefetch={false}
              className="group flex items-center gap-4 p-5 rounded-2xl border border-[#e8e5df] bg-white hover:border-[#c4a67d]/40 hover:bg-[#fcfaf7] transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl bg-[#f5f0e8] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b7355" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm md:text-base font-bold text-[#0a0a0a]">Bulk Listings</h3>
                  <span className="text-[9px] font-bold tracking-wider uppercase text-[#8b7355] bg-[#f5f0e8] px-1.5 py-0.5 rounded">
                    Batch
                  </span>
                </div>
                <p className="text-[12px] text-[#6b6b6b] mt-0.5">
                  Upload dozens of products at once — listings, titles and descriptions in one go.
                </p>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8c8c8c" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 group-hover:text-[#8b7355] group-hover:translate-x-1 transition-all duration-250">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Legacy two-studio section — kept hidden in a never-rendered block */}
      {false && (
      <section className="bg-[#f7f7f5] border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Jewelry Studio Card */}
            <div className="relative bg-white rounded-2xl border-2 border-[#c4a67d]/30 overflow-hidden hover:border-[#c4a67d]/60 transition-all duration-300 group shadow-sm hover:shadow-lg">
              <div className="absolute top-4 right-4">
                <span className="px-2.5 py-1 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-[10px] font-bold uppercase tracking-[0.08em] rounded-full">Popular</span>
              </div>
              <div className="h-48 overflow-hidden bg-gradient-to-br from-[#1a1610] to-[#0a0a0a]">
                <img src={IMG.darkElegance} alt="Jewelry Studio" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" loading="lazy" />
              </div>
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#f5f0e8] flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#8b7355]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  </div>
                  <h3 className="font-display font-bold text-[#0a0a0a] text-[18px] tracking-tight">Jewelry Studio</h3>
                </div>
                <p className="text-[#8c8c8c] text-[14px] leading-relaxed mb-5">
                  Purpose-built for rings, necklaces, earrings &amp; bracelets. Themed backgrounds, model shots, close-ups, and marketplace-ready listings.
                </p>
                <div className="space-y-2 mb-6">
                  {["Velvet, marble & lifestyle themes", "On-model catalog shots", "Bulk listing generation", "Zero design changes"].map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-[#8b7355] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      <span className="text-[13px] text-[#4a4a4a]">{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/jewelry" className="inline-flex items-center gap-2 w-full justify-center px-6 py-3 bg-[#0a0a0a] text-white text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all active:scale-[0.97]">
                  Open Jewelry Studio
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
                </Link>
              </div>
            </div>

            {/* Product Studio Card */}
            <div className="relative bg-white rounded-2xl border border-[#e8e5df] overflow-hidden hover:border-[#8c8c8c]/40 transition-all duration-300 group shadow-sm hover:shadow-lg">
              <div className="h-48 overflow-hidden bg-gradient-to-br from-[#f0ebe3] to-[#e8e5df]">
                <img src={IMG.studioShot} alt="Product Studio" className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" loading="lazy" />
              </div>
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#f0f0ee] flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#4a4a4a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                  </div>
                  <h3 className="font-display font-bold text-[#0a0a0a] text-[18px] tracking-tight">Product Studio</h3>
                </div>
                <p className="text-[#8c8c8c] text-[14px] leading-relaxed mb-5">
                  For any product — cosmetics, electronics, food, fashion, home goods &amp; more. Upload your product and pick a professional background.
                </p>
                <div className="space-y-2 mb-6">
                  {["Works with any product category", "Scene & solid color backgrounds", "Custom instructions support", "Studio-quality in seconds"].map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-[#4a4a4a] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      <span className="text-[13px] text-[#4a4a4a]">{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/studio" className="inline-flex items-center gap-2 w-full justify-center px-6 py-3 border-2 border-[#0a0a0a] text-[#0a0a0a] text-[13px] font-semibold rounded-full hover:bg-[#0a0a0a] hover:text-white transition-all active:scale-[0.97]">
                  Open Product Studio
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

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

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="bg-[#f7f7f5] border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24">
          <div className="text-center mb-10 md:mb-14">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">What Jewelers Say</span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
              Real Results From<br /><span className="text-[#8b7355]">Real Jewelers</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { quote: "SoraiPixel turned my phone photos into images I'd expect from a professional studio. My Etsy listing views jumped in the first week.", name: "Priya Sharma", business: "Lumina Jewels", location: "Jaipur, India", initials: "PS" },
              { quote: "I used to spend hours editing product photos. Now I upload, pick a style, and I'm done in 30 seconds. The quality is incredible for the price.", name: "Rachel Kim", business: "Moonstone Designs", location: "Los Angeles, USA", initials: "RK" },
              { quote: "As a manufacturer, I can now create marketing photos directly from CAD renders — before we even produce the piece. A game-changer for trade shows.", name: "Vikram Patel", business: "Shree Gold Exports", location: "Surat, India", initials: "VP" },
            ].map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-7 md:p-8 border border-[#e8e5df] hover:border-[#c4a67d]/30 transition-all duration-300">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-[#c4a67d]" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  ))}
                </div>
                <p className="text-[#4a4a4a] text-[14px] leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#f5f0e8] flex items-center justify-center">
                    <span className="text-[12px] font-bold text-[#8b7355]">{t.initials}</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#0a0a0a]">{t.name}</p>
                    <p className="text-[12px] text-[#8c8c8c]">{t.business} · {t.location}</p>
                  </div>
                </div>
              </div>
            ))}
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

      {/* ═══ WHY NOT CHATGPT / CANVA ═══ */}
      <section className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24">
          <div className="text-center mb-12 md:mb-16">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">Built for Jewelry</span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
              Why Generic AI<br /><span className="text-[#8b7355]">Fails on Jewelry</span>
            </h2>
            <p className="mt-4 text-[#8c8c8c] text-[15px] max-w-lg mx-auto leading-relaxed">
              ChatGPT, Midjourney, and Canva weren&apos;t built for jewelry. Here&apos;s why that matters.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { title: "Metal Reflections", desc: "Generic AI doesn't understand how gold, silver, and platinum reflect light differently. Results look flat or artificial. SoraiPixel renders accurate metallic reflections.", icon: "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" },
              { title: "Gemstone Detail", desc: "Diamond facets, emerald inclusions, sapphire depth — these require specialized rendering. General tools blur or distort the very details that sell your jewelry.", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" },
              { title: "Zero Design Changes", desc: "ChatGPT and Midjourney will alter your jewelry design — adding stones, changing prongs, modifying settings. SoraiPixel never touches your design. Guaranteed.", icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" },
              { title: "Marketplace-Ready Output", desc: "Correct dimensions for Etsy, Amazon, and Shopify. White background variants included. No manual resizing or reformatting needed.", icon: "M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0a2.999 2.999 0 00.739-1.052l1.174-2.64A1.876 1.876 0 016.621 4.5h10.758a1.876 1.876 0 011.708 1.157l1.174 2.64A3.001 3.001 0 0021 9.35" },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-6 bg-[#fafaf8] rounded-2xl border border-[#e8e5df] hover:border-[#c4a67d]/30 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-[#f5f0e8] flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#8b7355]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                </div>
                <div>
                  <h3 className="font-display font-bold text-[#0a0a0a] text-[15px] tracking-tight mb-2">{item.title}</h3>
                  <p className="text-[#8c8c8c] text-[13px] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/jewelry" className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#0a0a0a] text-white text-[14px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all active:scale-[0.97]">
              See the Difference Yourself
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
            </Link>
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
              Traditional jewelry photography costs {traditionalCost} per product. AI photos starting at just {perImageCost}/image.
            </p>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 max-w-3xl mx-auto">
            {/* Starter */}
            <div className="relative bg-white/[0.04] rounded-2xl p-6 md:p-7 border border-white/[0.08] text-center hover:border-white/[0.15] transition-all duration-300 group">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500/90 text-white text-[9px] font-bold uppercase tracking-[0.1em] rounded-full whitespace-nowrap">
                Limited Time
              </span>
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center mx-auto mb-4 group-hover:bg-white/[0.1] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <div className="text-[11px] font-bold text-white/40 uppercase tracking-[0.1em] mb-3">Starter Pack</div>
              <div className="font-display font-extrabold text-[2.5rem] text-white leading-none">{starterPrice}</div>
              <div className="text-[12px] text-white/30 mt-1 mb-5">80 tokens · {starterPerImage}</div>
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
              <div className="font-display font-extrabold text-[2.5rem] text-white leading-none">{growthPrice}</div>
              <div className="text-[12px] text-[#c4a67d]/60 mt-1">400 tokens/mo · {growthPerImage}</div>
              <div className="inline-block mt-2 mb-3 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-bold">Save {growthSavings}% vs Starter</div>
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
              <div className="font-display font-extrabold text-[2.5rem] text-white leading-none">{businessPrice}</div>
              <div className="text-[12px] text-white/30 mt-1">1200 tokens/mo · {businessPerImage}</div>
              <div className="inline-block mt-2 mb-3 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-bold">Save {businessSavings}% vs Starter</div>
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
              Secure payments
            </span>
            <span className="hidden sm:inline text-white/10">|</span>
            <span>Cancel anytime, no lock-in</span>
            <span className="hidden sm:inline text-white/10">|</span>
            <span>{isIndia ? "UPI, Cards, Net Banking accepted" : "Visa, Mastercard, PayPal accepted"}</span>
          </div>

          <div className="text-center mt-6">
            <Link href="/pricing" prefetch={false} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#c4a67d]/70 hover:text-[#c4a67d] transition-colors">
              Compare all plans in detail
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="bg-[#f7f7f5] border-b border-[#e8e5df]">
        <div className="max-w-[800px] mx-auto px-4 sm:px-8 lg:px-12 py-16 md:py-24">
          <div className="text-center mb-10 md:mb-14">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">FAQ</span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
              Common <span className="text-[#8b7355]">Questions</span>
            </h2>
          </div>
          <div className="space-y-3">
            {[
              { q: "Will AI change my jewelry design?", a: "Absolutely not. SoraiPixel guarantees zero design changes. Every stone, prong, engraving, and setting stays exactly as you crafted it. Only the background, lighting, and presentation change. If you ever feel the AI altered your design, we'll re-generate for free or refund you." },
              { q: "What image quality do I need to upload?", a: "Any photo works — even a phone snap taken on your desk. Our AI is trained to work with low-light, uneven backgrounds, and even CAD renders. Of course, better input gives better output, but you don't need professional equipment." },
              { q: "Can I use these images on Amazon, Etsy, and Shopify?", a: "Yes. Generated images are marketplace-optimized with correct dimensions and white background variants included. They're ready to upload directly to any e-commerce platform without manual resizing." },
              { q: "How is SoraiPixel different from ChatGPT or Midjourney?", a: "Generic AI tools don't understand jewelry. They'll blur diamond facets, flatten gold reflections, and often alter your design entirely. SoraiPixel is purpose-built for jewelry — it understands metal reflections, gemstone light behavior, and guarantees design integrity." },
              { q: "Do you offer refunds?", a: "Yes. We offer a 100% satisfaction guarantee on all paid plans. If you're not happy with the quality, contact us within 7 days of purchase for a full refund." },
              { q: "How does the token system work?", a: "Each image generation costs tokens (8 for standard quality, 20 for pro). You get free daily tokens plus a free first generation. Token packs start at just ₹149 / $4.99 and never expire. Monthly plans include a set number of tokens that refresh each month." },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#e8e5df] overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-semibold text-[#0a0a0a] text-[14px] pr-4">{faq.q}</span>
                  <svg className={`w-5 h-5 text-[#8c8c8c] flex-shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
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
                { "@type": "Question", name: "Will AI change my jewelry design?", acceptedAnswer: { "@type": "Answer", text: "Absolutely not. SoraiPixel guarantees zero design changes. Every stone, prong, engraving, and setting stays exactly as you crafted it." } },
                { "@type": "Question", name: "What image quality do I need to upload?", acceptedAnswer: { "@type": "Answer", text: "Any photo works — even a phone snap. Our AI works with low-light, uneven backgrounds, and even CAD renders." } },
                { "@type": "Question", name: "Can I use these images on Amazon, Etsy, and Shopify?", acceptedAnswer: { "@type": "Answer", text: "Yes. Generated images are marketplace-optimized with correct dimensions and white background variants included." } },
                { "@type": "Question", name: "How is SoraiPixel different from ChatGPT or Midjourney?", acceptedAnswer: { "@type": "Answer", text: "Generic AI tools blur diamond facets, flatten gold reflections, and alter designs. SoraiPixel is purpose-built for jewelry with guaranteed design integrity." } },
                { "@type": "Question", name: "Do you offer refunds?", acceptedAnswer: { "@type": "Answer", text: "Yes. 100% satisfaction guarantee on all paid plans. Contact us within 7 days for a full refund." } },
                { "@type": "Question", name: "How does the token system work?", acceptedAnswer: { "@type": "Answer", text: "Each image generation costs tokens. You get free daily tokens. Token packs start at ₹149 / $4.99 and never expire." } },
              ],
            }),
          }}
        />
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
              { title: "Products", links: [{ l: "Jewelry Studio", h: "/jewelry" }, { l: "Bulk Listings", h: "/batch-listing" }, { l: "Product Studio", h: "/studio" }] },
              { title: "Resources", links: [{ l: "Pricing", h: "/pricing" }, { l: "Blog", h: "/blog" }, { l: "Gallery", h: "/gallery" }, { l: "AI Photography", h: "/ai-photography" }] },
              { title: "Company", links: [{ l: "AI Jewelry Photography", h: "/ai-jewelry-photography" }, { l: "About", h: "/about" }, { l: "Privacy Policy", h: "/privacy" }, { l: "Terms of Service", h: "/terms" }] },
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

      <ContactFloat />
      <ExitIntentPopup />
    </div>
  );
}
