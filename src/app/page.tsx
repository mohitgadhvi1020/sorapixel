import Link from "next/link";

/* ---------- placeholder gradient cards (replace with real images later) ---------- */
const showcaseItems = [
  { id: 1, gradient: "from-amber-100 to-orange-200", label: "Jewelry", span: "col-span-2 row-span-2" },
  { id: 2, gradient: "from-stone-200 to-stone-300", label: "Kitchenware", span: "" },
  { id: 3, gradient: "from-slate-800 to-slate-900", label: "Dark Mode", span: "", dark: true },
  { id: 4, gradient: "from-rose-100 to-pink-200", label: "Lifestyle", span: "" },
  { id: 5, gradient: "from-emerald-100 to-teal-200", label: "Studio", span: "" },
  { id: 6, gradient: "from-violet-100 to-purple-200", label: "Editorial", span: "col-span-2" },
  { id: 7, gradient: "from-sky-100 to-blue-200", label: "Morning Light", span: "" },
  { id: 8, gradient: "from-zinc-800 to-zinc-900", label: "Dramatic", span: "", dark: true },
];

const featureCards = [
  {
    title: "NEVER STOP CREATING",
    desc: "Upload any product photo and watch AI transform it into studio-quality imagery.",
    gradient: "from-amber-200 via-orange-100 to-yellow-50",
    size: "md:col-span-1 md:row-span-2",
  },
  {
    title: "CUSTOM STYLES",
    desc: "Choose from curated photography presets or describe your own scene.",
    gradient: "from-rose-200 via-pink-100 to-rose-50",
    size: "",
  },
  {
    title: "INSTANT RESULTS",
    desc: "Get studio-quality images in seconds, not hours.",
    gradient: "from-teal-200 via-emerald-100 to-green-50",
    size: "",
  },
  {
    title: "AI-POWERED PRECISION",
    desc: "Product details stay pixel-perfect. No distortion, no artifacts.",
    gradient: "from-violet-200 via-purple-100 to-indigo-50",
    size: "md:col-span-2",
  },
];

const stylePresets = [
  { name: "Kitchen Counter", gradient: "from-amber-100 to-orange-50", icon: "01" },
  { name: "Marble Surface", gradient: "from-stone-200 to-stone-100", icon: "02" },
  { name: "Dramatic Dark", gradient: "from-zinc-800 to-zinc-900", icon: "03", dark: true },
  { name: "Lifestyle Scene", gradient: "from-emerald-100 to-teal-50", icon: "04" },
  { name: "Morning Light", gradient: "from-amber-50 to-yellow-100", icon: "05" },
  { name: "Rustic Wood", gradient: "from-orange-200 to-amber-100", icon: "06" },
];

const steps = [
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
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-full bg-[#0a0a0a] flex items-center justify-center">
              <span className="text-white text-xs font-bold">SP</span>
            </div>
            <span className="font-display font-bold text-[15px] tracking-tight text-[#0a0a0a] hidden sm:block">
              SoraPixel
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/jewelry"
              className="px-3 py-2 text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200"
            >
              Jewelry
            </Link>
            <Link
              href="/tryon"
              className="px-3 py-2 text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200 hidden sm:block"
            >
              Try-On
            </Link>
            <Link
              href="/admin"
              className="px-3 py-2 text-[13px] font-medium text-[#8b7355] bg-[#f5f0e8] rounded-lg hover:bg-[#ece3d3] transition-all duration-200 hidden md:block"
            >
              Admin
            </Link>
            <Link
              href="/login"
              className="ml-1 px-4 py-2 text-[13px] font-semibold text-white bg-[#0a0a0a] rounded-lg hover:bg-[#1a1a1a] transition-all duration-200"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* ===================== HERO ===================== */}
      <section className="relative min-h-[85vh] md:min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#0a0a0a] to-[#16213e]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#8b7355]/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#c4a67d]/8 rounded-full blur-[100px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-32 md:py-40 w-full">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="animate-slide-up">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 text-white/70 text-[11px] sm:text-xs font-medium tracking-[0.1em] uppercase rounded-full border border-white/10 mb-8 md:mb-10">
                <span className="w-1.5 h-1.5 bg-[#c4a67d] rounded-full animate-pulse" />
                AI-Powered Photography
              </span>
            </div>

            {/* Headline */}
            <h1
              className="font-display font-extrabold text-white uppercase leading-[0.92] tracking-[-0.03em] text-[2.75rem] sm:text-[4rem] md:text-[5.5rem] lg:text-[7rem] animate-slide-up"
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
              className="mt-6 md:mt-8 text-[15px] md:text-[17px] text-white/50 max-w-md leading-relaxed animate-slide-up"
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
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 hidden md:flex">
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

          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[3px] stagger-children">
            {showcaseItems.map((item) => (
              <div
                key={item.id}
                className={`relative overflow-hidden group cursor-pointer ${item.span} aspect-square img-zoom`}
              >
                <div
                  className={`img-inner absolute inset-0 bg-gradient-to-br ${item.gradient}`}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500" />
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                  <span className={`text-[11px] sm:text-xs font-semibold tracking-[0.08em] uppercase ${item.dark ? "text-white/70" : "text-black/50"}`}>
                    {item.label}
                  </span>
                </div>
              </div>
            ))}
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
              <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[2rem] sm:text-[2.5rem] md:text-[3.25rem] leading-[0.95]">
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

            {/* Right — Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
              {featureCards.map((card) => (
                <div
                  key={card.title}
                  className={`relative overflow-hidden rounded-xl p-6 sm:p-7 ${card.size} card-hover`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
                  <div className="relative z-10">
                    <h3 className="font-display font-bold text-[#0a0a0a] text-[13px] sm:text-[14px] tracking-[0.04em] uppercase mb-2.5">
                      {card.title}
                    </h3>
                    <p className="text-[#4a4a4a] text-[13px] leading-relaxed">
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
          {/* Header */}
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

          {/* Style Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger-children">
            {stylePresets.map((style) => (
              <div
                key={style.name}
                className="relative overflow-hidden rounded-xl aspect-[4/3] group cursor-pointer img-zoom"
              >
                <div className={`img-inner absolute inset-0 bg-gradient-to-br ${style.gradient}`} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-500" />
                <div className="relative z-10 h-full flex flex-col justify-between p-5 sm:p-6">
                  <span className={`font-display font-bold text-[32px] sm:text-[40px] md:text-[48px] leading-none ${style.dark ? "text-white/20" : "text-black/10"}`}>
                    {style.icon}
                  </span>
                  <div>
                    <h3 className={`font-display font-bold text-[14px] sm:text-[16px] tracking-[0.02em] uppercase ${style.dark ? "text-white" : "text-[#0a0a0a]"}`}>
                      {style.name}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== HOW IT WORKS (3 STEPS) ===================== */}
      <section className="bg-[#f7f7f5] border-y border-[#e8e5df]">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
          {/* Header */}
          <div className="mb-10 md:mb-14">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
              How It Works
            </span>
            <h2 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[3rem] leading-[1.0]">
              Three Simple Steps
            </h2>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-[#e8e5df]">
            {[
              {
                step: "01",
                title: "Upload",
                desc: "Drop in any product photo — even a phone picture works. Our AI removes backgrounds and optimizes automatically.",
              },
              {
                step: "02",
                title: "Choose Style",
                desc: "Pick from curated photography presets or describe your own scene. Marble surface, rustic wood, lifestyle kitchen, and more.",
              },
              {
                step: "03",
                title: "Download",
                desc: "Get a studio-quality image in seconds. Product details stay pixel-perfect — no distortion, no artifacts.",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className={`py-8 md:py-10 ${i < 2 ? "border-b md:border-b-0 md:border-r border-[#e8e5df]" : ""} ${i > 0 ? "md:pl-8 lg:pl-12" : ""} ${i < 2 ? "md:pr-8 lg:pr-12" : ""}`}
              >
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
            {steps.map((step) => (
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
            {["Get Help", "What's New", "Try SoraPixel"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-[13px] font-semibold text-[#4a4a4a] hover:text-[#0a0a0a] tracking-[0.04em] uppercase transition-colors duration-200"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== DARK CTA SECTION ===================== */}
      <section className="bg-[#0a0a0a] overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-20 md:py-32 relative">
          {/* Background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#8b7355]/5 rounded-full blur-[120px]" />

          {/* Split heading */}
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-16 md:mb-24">
            <h2 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[2.5rem] sm:text-[3.5rem] md:text-[5rem] lg:text-[6rem] leading-[0.9]">
              For All
            </h2>
            <h2 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[2.5rem] sm:text-[3.5rem] md:text-[5rem] lg:text-[6rem] leading-[0.9] sm:text-right">
              Creators
            </h2>
          </div>

          {/* Decorative grid */}
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-[3px]">
            <div className="aspect-[4/3] rounded-lg overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] flex items-center justify-center">
                <svg className="w-10 h-10 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              </div>
            </div>
            <div className="aspect-[4/3] rounded-lg overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-[#8b7355]/20 to-[#8b7355]/5" />
            </div>
            <div className="aspect-[4/3] rounded-lg overflow-hidden hidden md:block">
              <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#252525]" />
            </div>
            <div className="aspect-[4/3] rounded-lg overflow-hidden hidden md:block">
              <div className="w-full h-full bg-gradient-to-br from-[#c4a67d]/10 to-[#8b7355]/5 flex items-center justify-center">
                <svg className="w-10 h-10 text-[#c4a67d]/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== BOTTOM DARK STATEMENT ===================== */}
      <section className="bg-[#0a0a0a] border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
            <h2 className="font-display font-extrabold text-white uppercase tracking-[-0.03em] text-[2rem] sm:text-[2.5rem] md:text-[3.5rem] leading-[0.95]">
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
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-8 md:py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            {/* Logo + Brand */}
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">SP</span>
              </div>
              <span className="font-display font-bold text-[14px] text-white/70">
                SoraPixel
              </span>
            </div>

            {/* Footer Links */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link href="/jewelry" className="text-[12px] text-white/40 hover:text-white/70 transition-colors duration-200 tracking-wide uppercase">
                Jewelry
              </Link>
              <Link href="/tryon" className="text-[12px] text-white/40 hover:text-white/70 transition-colors duration-200 tracking-wide uppercase">
                Try-On
              </Link>
              <Link href="/admin" className="text-[12px] text-white/40 hover:text-white/70 transition-colors duration-200 tracking-wide uppercase">
                Admin
              </Link>
            </div>

            {/* Copyright */}
            <span className="text-[11px] text-white/25 tracking-wide">
              AI Product Photography
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
