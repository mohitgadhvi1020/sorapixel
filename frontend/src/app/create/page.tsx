"use client";

import Link from "next/link";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";

// Creation hub — single discoverable entry point for every tool. Replaces
// the old modal with a dedicated page so new users can see the range of
// capabilities at a glance and share the URL.
const TILES = [
  {
    href: "/jewelry",
    title: "Jewelry Studio",
    tagline: "Turn a raw jewelry photo into themed product shots.",
    image: "/images/hero-jewelry.png",
    tone: "from-[#8b7355] to-[#c4a67d]",
    badge: "Most popular",
  },
  {
    href: "/studio",
    title: "Product Studio",
    tagline: "Put any product on a studio backdrop in seconds.",
    image: "/images/tile-product-studio.png",
    tone: "from-[#8b7355] to-[#c4a67d]",
  },
  {
    href: "/ugc",
    title: "Model Shots (UGC)",
    tagline: "See your product worn by a real-looking model.",
    image: "/images/necklace-model.png",
    tone: "from-[#ec4899] to-[#f472b6]",
  },
  {
    href: "/create/video",
    title: "Video",
    tagline: "Reels, 360° spins, product reveals — pick a mode on the next step.",
    image: "/images/card-lifestyle.png",
    tone: "from-[#7c3aed] to-[#a78bfa]",
    badge: "New",
  },
];

export default function CreateHubPage() {
  return (
    <ResponsiveLayout title="Create">
      <div className="max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0ms" }}>
          <h1 className="text-2xl md:text-4xl font-bold text-white font-display tracking-tight">
            What do you want to create?
          </h1>
          <p className="text-sm md:text-base text-[rgba(255,255,255,0.55)] mt-2 max-w-xl">
            Pick a tool. Each one takes a single upload and gives you a finished asset —
            no step-by-step required.
          </p>
        </div>

        {/* Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {TILES.map((tile, i) => (
            <Link
              key={tile.href}
              href={tile.href}
              prefetch={false}
              className="group relative rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(196,166,125,0.35)] transition-all duration-300 animate-fade-in-up hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
              style={{ animationDelay: `${80 + i * 70}ms` }}
            >
              {/* Image */}
              <div className="aspect-[4/3] relative overflow-hidden bg-[rgba(0,0,0,0.4)]">
                <img
                  src={tile.image}
                  alt={tile.title}
                  className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-out"
                />
                {/* Colored tone wash — kept subtle for brand identity */}
                <div className={`absolute inset-0 bg-gradient-to-br ${tile.tone} opacity-15 group-hover:opacity-10 transition-opacity duration-300`} />
                {tile.badge && (
                  <span className="absolute top-3 left-3 text-[9px] font-bold tracking-wider uppercase bg-white/95 text-black px-2 py-0.5 rounded-full backdrop-blur-sm">
                    {tile.badge}
                  </span>
                )}
              </div>

              {/* Copy */}
              <div className="p-4 md:p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base md:text-lg font-bold text-white">{tile.title}</h3>
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[rgba(255,255,255,0.4)] group-hover:bg-[#c4a67d] group-hover:text-white group-hover:border-[#c4a67d] group-hover:translate-x-0.5 transition-all duration-250">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                </div>
                <p className="text-[12.5px] text-[rgba(255,255,255,0.5)] mt-1.5 leading-relaxed">
                  {tile.tagline}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Batch callout — different intent, gets its own row */}
        <div
          className="mt-10 animate-fade-in-up"
          style={{ animationDelay: `${80 + TILES.length * 70}ms` }}
        >
          <p className="text-[10px] font-semibold text-[rgba(255,255,255,0.35)] uppercase tracking-[0.12em] mb-3">
            Working at scale?
          </p>
          <Link
            href="/batch-listing"
            prefetch={false}
            className="group flex items-center gap-4 p-5 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(196,166,125,0.35)] hover:bg-[rgba(196,166,125,0.05)] transition-all duration-300"
          >
            <div className="w-11 h-11 rounded-xl bg-[rgba(196,166,125,0.1)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm md:text-base font-bold text-white">Bulk Listings</h3>
                <span className="text-[9px] font-bold tracking-wider uppercase text-[#c4a67d]/70 bg-[rgba(196,166,125,0.08)] px-1.5 py-0.5 rounded">
                  Batch
                </span>
              </div>
              <p className="text-[12px] text-[rgba(255,255,255,0.5)] mt-0.5">
                Upload dozens of products at once — listings, titles and descriptions generated together.
              </p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 group-hover:text-[#c4a67d] group-hover:translate-x-1 transition-all duration-250">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </div>
    </ResponsiveLayout>
  );
}
