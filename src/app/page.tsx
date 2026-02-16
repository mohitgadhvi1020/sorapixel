import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-[#e8e5df]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="SoraPixel" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
            <span className="font-semibold text-base sm:text-lg tracking-tight text-[#1b1b1f]">
              SoraPixel
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/jewelry"
              className="px-3 py-2 sm:px-4 sm:py-2.5 text-[#8c8c8c] text-sm font-medium rounded-lg hover:text-[#1b1b1f] hover:bg-[#f5f0e8] transition-all duration-300 active:scale-[0.97]"
            >
              Jewelry
            </Link>
            <Link
              href="/tryon"
              className="px-3 py-2 sm:px-4 sm:py-2.5 text-[#8c8c8c] text-sm font-medium rounded-lg hover:text-[#1b1b1f] hover:bg-[#f5f0e8] transition-all duration-300 active:scale-[0.97]"
            >
              Try-On
            </Link>
            <Link
              href="/admin"
              className="px-3 py-2 sm:px-4 sm:py-2.5 text-xs font-medium text-[#8b7355] bg-[#f5f0e8] rounded-lg hover:bg-[#ece3d3] transition-all duration-300 active:scale-[0.97]"
            >
              Admin
            </Link>
            <Link
              href="/login"
              className="px-3 py-2 sm:px-4 sm:py-2.5 text-white text-sm font-medium bg-gradient-to-r from-[#8b7355] to-[#6b5740] rounded-lg transition-all duration-300 active:scale-[0.97]"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-36 pb-14 sm:pb-24 text-center">
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-[#f5f0e8] text-[#8b7355] text-xs sm:text-sm font-medium rounded-full mb-6 sm:mb-8 border border-[#e8e5df]">
            <span className="w-1.5 h-1.5 bg-[#8b7355] rounded-full animate-pulse" />
            AI-Powered Product Photography
          </div>
        </div>

        <h1
          className="text-3xl sm:text-5xl lg:text-7xl font-bold text-[#1b1b1f] tracking-tight leading-[1.12] sm:leading-[1.08] animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          Studio-quality photos
          <br />
          <span className="bg-gradient-to-r from-[#8b7355] to-[#c4a67d] bg-clip-text text-transparent">
            in seconds
          </span>
        </h1>

        <p
          className="mt-4 sm:mt-7 text-base sm:text-xl text-[#8c8c8c] max-w-2xl mx-auto leading-relaxed animate-slide-up px-2"
          style={{ animationDelay: "200ms" }}
        >
          Transform raw product photos into professional studio shots.
          Upload a picture of your kitchenware, pick a style, and let AI
          create magazine-worthy images.
        </p>

        <div
          className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-slide-up"
          style={{ animationDelay: "300ms" }}
        >
          <Link
            href="/jewelry"
            className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-gradient-to-r from-[#8b7355] to-[#6b5740] text-white rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 shadow-lg shadow-[#8b7355]/20 hover:shadow-[#8b7355]/35 active:scale-[0.98] text-center"
          >
            Try It Free
          </Link>
          <a
            href="#how-it-works"
            className="px-8 py-3 text-[#8c8c8c] font-medium text-base sm:text-lg hover:text-[#1b1b1f] transition-colors duration-300"
          >
            See how it works
          </a>
        </div>

        {/* Decorative floating shapes — hidden on mobile */}
        <div className="relative mt-12 sm:mt-16 hidden sm:flex justify-center gap-6 opacity-40">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f5f0e8] to-[#e8e5df] animate-float" style={{ animationDelay: "0s" }} />
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f5f0e8] to-[#e8e5df] animate-float" style={{ animationDelay: "0.5s" }} />
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#f5f0e8] to-[#e8e5df] animate-float" style={{ animationDelay: "1s" }} />
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white border-y border-[#e8e5df]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
          <div className="text-center mb-10 sm:mb-16">
            <p className="text-xs sm:text-sm font-semibold text-[#8b7355] tracking-wider uppercase mb-2 sm:mb-3">
              How It Works
            </p>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#1b1b1f] tracking-tight">
              Three simple steps
            </h2>
            <p className="text-[#8c8c8c] text-sm sm:text-base mt-2 sm:mt-3 max-w-md mx-auto">
              No design skills needed. No expensive studio setup. Just upload and go.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 stagger-children">
            {[
              {
                step: "01",
                title: "Upload",
                description: "Drop in a photo of your product. Even a phone picture works. Our AI handles the rest.",
                icon: (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Choose a Style",
                description: "Pick from kitchenware-optimized presets — marble surface, rustic wood, lifestyle kitchen, and more.",
                icon: (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "Download",
                description: "Get a studio-quality image in seconds. Product details stay pixel-perfect — no distortion.",
                icon: (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="bg-[#fafaf8] rounded-2xl border border-[#e8e5df] p-6 sm:p-8 card-hover">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#f5f0e8] text-[#8b7355] rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                  {item.icon}
                </div>
                <div className="text-xs font-bold text-[#8b7355] tracking-widest uppercase mb-2">
                  Step {item.step}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#1b1b1f] mb-1.5 sm:mb-2">
                  {item.title}
                </h3>
                <p className="text-[#8c8c8c] leading-relaxed text-sm">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Styles Preview */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24">
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-xs sm:text-sm font-semibold text-[#8b7355] tracking-wider uppercase mb-2 sm:mb-3">
            Photography Styles
          </p>
          <h2 className="text-2xl sm:text-4xl font-bold text-[#1b1b1f] tracking-tight">
            Kitchenware-optimized presets
          </h2>
          <p className="text-[#8c8c8c] text-sm sm:text-base mt-2 sm:mt-3 max-w-md mx-auto">
            Each style is fine-tuned for kitchenware photography — pots, pans, cutlery, glasses, and more.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 stagger-children">
          {[
            { name: "Kitchen Counter", emoji: "🏠" },
            { name: "Lifestyle Scene", emoji: "🌿" },
            { name: "Clean E-commerce", emoji: "⬜" },
            { name: "Dramatic Lighting", emoji: "🌑" },
            { name: "Marble Surface", emoji: "🪨" },
            { name: "Rustic Wood", emoji: "🪵" },
            { name: "Morning Light", emoji: "☀️" },
          ].map((style) => (
            <div key={style.name} className="bg-white rounded-xl p-4 sm:p-6 text-center border border-[#e8e5df] card-hover cursor-default">
              <span className="text-3xl sm:text-4xl block">{style.emoji}</span>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm font-semibold text-[#1b1b1f]">
                {style.name}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#1b1b1f] to-[#2d2b3a]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-3 sm:mb-4 tracking-tight">
            Ready to transform your product photos?
          </h2>
          <p className="text-[#a0a0a0] text-base sm:text-lg mb-8 sm:mb-10 max-w-lg mx-auto">
            Stop paying for expensive studio shoots. Get studio-quality images for a fraction of the cost.
          </p>
          <Link
            href="/jewelry"
            className="inline-block w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 shadow-lg active:scale-[0.98] text-center"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e8e5df] bg-white safe-bottom">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-[#8c8c8c]">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="SoraPixel" className="w-5 h-5 object-contain" />
            <span className="font-medium">SoraPixel</span>
          </div>
          <span className="text-xs sm:text-sm">AI Product Photography for Kitchenware</span>
        </div>
      </footer>
    </div>
  );
}
