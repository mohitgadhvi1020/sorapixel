"use client";

import Link from "next/link";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";

// Mini-picker for the Video category. The parent /create hub collapses
// both video tools into one "Video" tile; this page is the one extra pit
// stop where the user picks a mode. Keeping two distinct routes below
// so each product flow can evolve independently.
const MODES = [
  {
    href: "/flow-video",
    title: "Model Reel",
    tagline: "Short reel: your product → model grand reveal. Best for social + ads.",
    image: "/images/model-bracelet.png",
    tone: "from-[#7c3aed] to-[#a78bfa]",
    badge: "New",
  },
  {
    href: "/video",
    title: "Product Video",
    tagline: "360° spin, push-in, lifestyle motion. Any product, from a single frame.",
    image: "/images/card-lifestyle.png",
    tone: "from-[#0ea5e9] to-[#22d3ee]",
  },
];

export default function CreateVideoPicker() {
  return (
    <ResponsiveLayout title="Video">
      <div className="max-w-4xl mx-auto pb-12">
        {/* Breadcrumb + header */}
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: "0ms" }}>
          <Link
            href="/create"
            prefetch={false}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] transition-colors mb-4"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Create
          </Link>
          <h1 className="text-2xl md:text-4xl font-bold text-white font-display tracking-tight">
            Which kind of video?
          </h1>
          <p className="text-sm md:text-base text-[rgba(255,255,255,0.55)] mt-2 max-w-xl">
            Two different tools, same starting point — a single product photo.
          </p>
        </div>

        {/* Two-mode grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          {MODES.map((mode, i) => (
            <Link
              key={mode.href}
              href={mode.href}
              prefetch={false}
              className="group relative rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(196,166,125,0.35)] transition-all duration-300 animate-fade-in-up hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
              style={{ animationDelay: `${80 + i * 80}ms` }}
            >
              <div className="aspect-[4/3] relative overflow-hidden bg-[rgba(0,0,0,0.4)]">
                <img
                  src={mode.image}
                  alt={mode.title}
                  className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-out"
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${mode.tone} opacity-20 group-hover:opacity-12 transition-opacity duration-300`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                {mode.badge && (
                  <span className="absolute top-3 left-3 text-[9px] font-bold tracking-wider uppercase bg-white/95 text-black px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {mode.badge}
                  </span>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-white">{mode.title}</h3>
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[rgba(255,255,255,0.4)] group-hover:bg-[#c4a67d] group-hover:text-white group-hover:border-[#c4a67d] group-hover:translate-x-0.5 transition-all duration-250">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                </div>
                <p className="text-[12.5px] text-[rgba(255,255,255,0.55)] mt-1.5 leading-relaxed">
                  {mode.tagline}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </ResponsiveLayout>
  );
}
