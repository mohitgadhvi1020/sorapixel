import Link from "next/link";

/* ---------- Unsplash images for showcase grid ---------- */
const showcaseItems = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?auto=format&fit=crop&w=800&q=80",
    label: "Jewelry",
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=600&q=80",
    label: "Kitchenware",
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=600&q=80",
    label: "Dark Mode",
    dark: true,
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=600&q=80",
    label: "Lifestyle",
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80",
    label: "Studio",
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=800&q=80",
    label: "Editorial",
  },
  {
    id: 7,
    src: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80",
    label: "Morning Light",
  },
  {
    id: 8,
    src: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=600&q=80",
    label: "Dramatic",
    dark: true,
  },
];

/* ---------- Feature cards ---------- */
const featureCards = [
  {
    title: "NEVER STOP CREATING",
    desc: "Upload any product photo and watch AI transform it into studio-quality imagery.",
    src: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80",
    size: "md:col-span-1 md:row-span-2",
  },
  {
    title: "CUSTOM STYLES",
    desc: "Choose from curated photography presets or describe your own scene.",
    src: "https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&w=600&q=80",
    size: "",
  },
  {
    title: "INSTANT RESULTS",
    desc: "Get studio-quality images in seconds, not hours.",
    src: "https://images.unsplash.com/photo-1611085583191-a3b181a88401?auto=format&fit=crop&w=600&q=80",
    size: "",
  },
  {
    title: "AI-POWERED PRECISION",
    desc: "Product details stay pixel-perfect. No distortion, no artifacts.",
    src: "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?auto=format&fit=crop&w=800&q=80",
    size: "md:col-span-2",
  },
];

/* ---------- Style presets ---------- */
const stylePresets = [
  {
    name: "Kitchen Counter",
    src: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=600&q=80",
    icon: "01",
  },
  {
    name: "Marble Surface",
    src: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=600&q=80",
    icon: "02",
  },
  {
    name: "Dramatic Dark",
    src: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=600&q=80",
    icon: "03",
    dark: true,
  },
  {
    name: "Lifestyle Scene",
    src: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80",
    icon: "04",
  },
  {
    name: "Morning Light",
    src: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80",
    icon: "05",
  },
  {
    name: "Rustic Wood",
    src: "https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?auto=format&fit=crop&w=600&q=80",
    icon: "06",
  },
];

/* ---------- Use cases ---------- */
const useCases = [
  {
    num: "01",
    title: "FOR PRODUCT BRANDS",
    desc: "Transform raw product photos into studio-quality images. Perfect for e-commerce listings, social media, and marketing campaigns.",
  },
  {
    num: "02",
    title: "FOR CONTENT CREATORS",
    desc: "Create professional product photography without the studio. Ideal for influencers, bloggers, and social media managers.",
  },
  {
    num: "03",
    title: "FOR SMALL BUSINESSES",
    desc: "Get magazine-worthy product shots at a fraction of the cost. No photographer needed, no equipment required.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      {/* ===================== NAVBAR ===================== */}
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
              className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200"
            >
              Jewelry
            </Link>
            <Link
              href="/studio"
              className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200"
            >
              Studio
            </Link>
            <Link
              href="/tryon"
              className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200 hidden sm:block"
            >
              Try-On
            </Link>
            <Link
              href="/admin"
              className="px-2.5 sm:px-3 py-2 text-[12px] sm:text-[13px] font-medium text-[#8b7355] bg-[#f5f0e8] rounded-lg hover:bg-[#ece3d3] transition-all duration-200 hidden md:block"
            >
              Admin
            </Link>
            <Link
              href="/login"
              className="ml-0.5 sm:ml-1 px-3 sm:px-4 py-2 text-[12px] sm:text-[13px] font-semibold text-white bg-[#0a0a0a] rounded-lg hover:bg-[#1a1a1a] transition-all duration-200"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* ===================== HERO ===================== */}
      <section className="relative min-h-[85vh] md:min-h-screen flex items-end overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1920&q=80"
            alt="Jewelry photography"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 pb-16 md:pb-24 pt-32 w-full">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="animate-slide-up">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 text-white/70 text-[11px] sm:text-xs font-medium tracking-[0.1em] uppercase rounded-full border border-white/10 mb-8 md:mb-10 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 bg-[#c4a67d] rounded-full animate-pulse" />
                AI-Powered Photography
              </span>
            </div>

            {/* Headline */}
            <h1
              className="font-display font-extrabold text-white uppercase leading-[0.92] tracking-[-0.03em] text-[2rem] min-[375px]:text-[2.5rem] sm:text-[4rem] md:text-[5.5rem] lg:text-[7rem] animate-slide-up"
              style={{ animationDelay: "100ms" }}
            >
              Elevate Your
              <br />
              Product Photos
              <br />
              <span className="text-[#c4a67d]">With AI</span>
            </h1>

            {/* Subtitle */}
            <p
              className="mt-6 md:mt-8 text-[15px] md:text-[17px] text-white/60 max-w-md leading-relaxed animate-slide-up"
              style={{ animationDelay: "200ms" }}
            >
              Studio-quality product photography in seconds.
              Upload a photo, pick a style, and let AI create
              magazine-worthy images.
            </p>

            {/* CTA */}
            <div
              className="mt-8 md:mt-10 flex flex-wrap items-center gap-4 animate-slide-up"
              style={{ animationDelay: "300ms" }}
            >
              <Link
                href="/jewelry"
                className="px-7 py-3.5 bg-white text-[#0a0a0a] text-[14px] font-semibold rounded-full hover:bg-white/90 transition-all duration-200 active:scale-[0.97]"
              >
                Get Started
              </Link>
              <a
                href="#showcase"
                className="px-6 py-3.5 text-white/60 text-[14px] font-medium hover:text-white transition-colors duration-200 flex items-center gap-2"
              >
                Explore
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                </svg>
              </a>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 right-8 md:right-12 flex-col items-center gap-2 hidden md:flex">
            <span className="text-[10px] text-white/30 tracking-[0.2em] uppercase">Scroll</span>
            <div className="w-[1px] h-8 bg-gradient-to-b from-white/30 to-transparent animate-scroll-hint" />
          </div>
        </div>
      </section>

      {/* ===================== SHOWCASE GRID ===================== */}
      <section id="showcase" className="bg-white">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 md:mb-12">
            <div>
              <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
                Explore Results
              </span>
              <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
                AI-Generated
                <br className="hidden sm:block" />
                {" "}Photography
              </h2>
            </div>
            <p className="text-[#8c8c8c] text-sm max-w-xs leading-relaxed">
              Every image below was created by AI from a simple product photo. No studio, no photographer.
            </p>
          </div>

          {/* Grid — item 1 spans 2×2, item 6 spans 2 cols */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px stagger-children bg-[#e8e5df]">
            {showcaseItems.map((item) => {
              const spanClass =
                item.id === 1
                  ? "col-span-2 row-span-2"
                  : item.id === 6
                    ? "col-span-2"
                    : "";
              return (
                <div
                  key={item.id}
                  className={`relative overflow-hidden group cursor-pointer img-zoom bg-[#1a1a1a] ${spanClass}`}
                  style={{ aspectRatio: item.id === 6 ? "2/1" : "1/1" }}
                >
                  <img
                    src={item.src}
                    alt={item.label}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <span className="text-[11px] sm:text-xs font-semibold tracking-[0.08em] uppercase text-white/90">
                      {item.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== FEATURES SPLIT ===================== */}
      <section className="bg-[#f7f7f5] border-y border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            {/* Left — Typography */}
            <div className="lg:sticky lg:top-28">
              <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-4 block">
                Why SoraPixel
              </span>
              <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] min-[375px]:text-[2rem] sm:text-[2.5rem] md:text-[3.25rem] leading-[0.95]">
                Studio Quality
                <br />
                Without
                <br />
                <span className="text-[#8b7355]">The Studio</span>
              </h2>
              <p className="mt-6 text-[#8c8c8c] text-[15px] leading-relaxed max-w-sm">
                Professional product photography used to cost thousands. Now it takes seconds and a single upload.
              </p>
              <Link
                href="/jewelry"
                className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-[#0a0a0a] text-white text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all duration-200 active:scale-[0.97]"
              >
                Try It Free
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
                </svg>
              </Link>
            </div>

            {/* Right — Feature Cards with images */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
              {featureCards.map((card) => (
                <div
                  key={card.title}
                  className={`relative overflow-hidden rounded-xl ${card.size} card-hover group`}
                >
                  {/* Image */}
                  <div className="absolute inset-0">
                    <img
                      src={card.src}
                      alt={card.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
                  </div>
                  {/* Content */}
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

      {/* ===================== STYLE PRESETS ===================== */}
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
          <div className="text-center mb-10 md:mb-14">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
              Photography Styles
            </span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
              Introducing
              <br />
              <span className="text-[#8b7355]">Style Presets</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger-children">
            {stylePresets.map((style) => (
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
                  <span className="font-display font-bold text-[32px] sm:text-[40px] md:text-[48px] leading-none text-white/20">
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

      {/* ===================== HOW IT WORKS ===================== */}
      <section className="bg-[#f7f7f5] border-y border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
          <div className="mb-10 md:mb-14">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
              How It Works
            </span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
              Three Simple Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-[#e8e5df]">
            {[
              {
                step: "01",
                title: "Upload",
                desc: "Drop in any product photo — even a phone picture works. Our AI removes backgrounds and optimizes automatically.",
                img: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=400&q=80",
              },
              {
                step: "02",
                title: "Choose Style",
                desc: "Pick from curated photography presets or describe your own scene. Marble surface, rustic wood, lifestyle kitchen, and more.",
                img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=400&q=80",
              },
              {
                step: "03",
                title: "Download",
                desc: "Get a studio-quality image in seconds. Product details stay pixel-perfect — no distortion, no artifacts.",
                img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`py-8 md:py-10 ${i < 2 ? "border-b md:border-b-0 md:border-r border-[#e8e5df]" : ""} ${i > 0 ? "md:pl-8 lg:pl-12" : ""} ${i < 2 ? "md:pr-8 lg:pr-12" : ""}`}
              >
                {/* Step image */}
                <div className="w-full aspect-[16/10] rounded-lg overflow-hidden mb-5">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <span className="font-display font-bold text-[#e8e5df] text-[48px] sm:text-[56px] md:text-[64px] leading-none block mb-4">
                  {item.step}
                </span>
                <h3 className="font-display font-bold text-[#0a0a0a] text-[18px] sm:text-[20px] uppercase tracking-[0.02em] mb-3">
                  {item.title}
                </h3>
                <p className="text-[#8c8c8c] text-[14px] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== THREE-COLUMN USE CASES ===================== */}
      <section className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {useCases.map((step) => (
              <div key={step.num}>
                <span className="text-[11px] font-bold text-[#8b7355] tracking-[0.12em] uppercase block mb-3">
                  {step.num}
                </span>
                <h3 className="font-display font-bold text-[#0a0a0a] text-[15px] sm:text-[16px] tracking-[0.04em] uppercase mb-3">
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

      {/* ===================== LINKS BAR ===================== */}
      <section className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 py-5 md:py-6">
            {[
              { label: "Get Help", href: "#" },
              { label: "What's New", href: "#" },
              { label: "Try SoraPixel", href: "/jewelry" },
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

      {/* ===================== DARK CTA SECTION ===================== */}
      <section className="bg-[#0a0a0a] overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-20 md:py-32 relative">
          {/* Split heading */}
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-6 mb-10 sm:mb-12 md:mb-20">
            <h2 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[2rem] min-[375px]:text-[2.5rem] sm:text-[3.5rem] md:text-[5rem] lg:text-[6rem] leading-[0.9]">
              For All
            </h2>
            <h2 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[2rem] min-[375px]:text-[2.5rem] sm:text-[3.5rem] md:text-[5rem] lg:text-[6rem] leading-[0.9] sm:text-right">
              Creators
            </h2>
          </div>

          {/* Image grid */}
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-[3px] rounded-lg overflow-hidden">
            {[
              "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=500&q=80",
              "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80",
              "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80",
              "https://images.unsplash.com/photo-1629224316810-9d8805b95e76?auto=format&fit=crop&w=500&q=80",
            ].map((src, i) => (
              <div key={i} className={`aspect-[4/3] overflow-hidden ${i >= 2 ? "hidden md:block" : ""}`}>
                <img
                  src={src}
                  alt="Product photography"
                  className="w-full h-full object-cover opacity-60 hover:opacity-80 transition-opacity duration-500"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== BOTTOM DARK STATEMENT ===================== */}
      <section className="bg-[#0a0a0a] border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
            <h2 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[1.75rem] min-[375px]:text-[2rem] sm:text-[2.5rem] md:text-[3.5rem] leading-[0.95]">
              So You Can
              <br />
              <span className="text-[#c4a67d]">Make It</span>
            </h2>
            <Link
              href="/jewelry"
              className="px-8 py-3.5 bg-white text-[#0a0a0a] text-[14px] font-semibold rounded-full hover:bg-white/90 transition-all duration-200 active:scale-[0.97]"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="bg-[#0a0a0a] border-t border-white/5 safe-bottom">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-6 sm:py-8 md:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">SP</span>
              </div>
              <span className="font-display font-bold text-[14px] text-white/70">
                SoraPixel
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 sm:gap-x-6 gap-y-2">
              <Link href="/jewelry" className="text-[12px] text-white/40 hover:text-white/70 transition-colors duration-200 tracking-wide uppercase">
                Jewelry
              </Link>
              <Link href="/studio" className="text-[12px] text-white/40 hover:text-white/70 transition-colors duration-200 tracking-wide uppercase">
                Studio
              </Link>
              <Link href="/tryon" className="text-[12px] text-white/40 hover:text-white/70 transition-colors duration-200 tracking-wide uppercase">
                Try-On
              </Link>
              <Link href="/admin" className="text-[12px] text-white/40 hover:text-white/70 transition-colors duration-200 tracking-wide uppercase">
                Admin
              </Link>
            </div>

            <span className="text-[11px] text-white/25 tracking-wide">
              AI Product Photography
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
