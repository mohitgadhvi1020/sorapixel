"use client";

import { useState, useMemo, useEffect } from "react";

export interface ThemeShot {
  id: string;
  name: string;
  short_name: string;
  description: string;
  type: "product" | "model";
  is_default: boolean;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  category: string;
  preview_image: string | null;
  preview_color?: string;
  default_color: string;
  status: "available" | "pro_only";
  shots: ThemeShot[];
  default_shots: string[];
}

export interface ThemeCategory {
  id: string;
  label: string;
  icon: string;
}

interface ThemeGalleryProps {
  themes: Theme[];
  categories: ThemeCategory[];
  selectedThemeId: string | null;
  onSelectTheme: (theme: Theme) => void;
  onBack: () => void;
  jewelryType?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  crown: "👑",
  gem: "💎",
  leaf: "🌿",
  fabric: "🎀",
  square: "◻️",
  tree: "🪵",
  lamp: "🪔",
  circle: "🔵",
};

export default function ThemeGallery({
  themes,
  categories,
  selectedThemeId,
  onSelectTheme,
  onBack,
  jewelryType,
}: ThemeGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Preload theme images in background for faster display
  useEffect(() => {
    if (themes.length === 0) return;
    
    // Preload first 8 visible theme images immediately
    const preloadImages = themes.slice(0, 8).map((theme) => {
      const src = jewelryType 
        ? `/theme-previews/${jewelryType}/${theme.id}.jpg`
        : theme.preview_image;
      if (src) {
        const img = new Image();
        img.src = src;
      }
    });
  }, [themes, jewelryType]);

  const filteredThemes = useMemo(() => {
    let filtered = themes;
    if (activeCategory) {
      filtered = filtered.filter((t) => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [themes, activeCategory, searchQuery]);

  const sceneThemes = filteredThemes.filter((t) => t.category !== "solid");
  const allSolidThemes = themes.filter((t) => t.category === "solid");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[rgba(255,255,255,0.5)] hover:text-white hover:border-[rgba(255,255,255,0.15)] transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Choose a Theme</h2>
          <p className="text-xs text-[rgba(255,255,255,0.45)] mt-0.5">
            Select a style for your product shots
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search themes..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(196,166,125,0.4)] transition-all"
        />
      </div>

      {/* Solid Colors — quick-access strip */}
      {allSolidThemes.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-2.5">
            Solid Colors
          </h3>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {allSolidThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => onSelectTheme(theme)}
                className={`flex-shrink-0 flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full border transition-all duration-200 ${
                  selectedThemeId === theme.id
                    ? "border-[#c4a67d] bg-[rgba(196,166,125,0.12)] shadow-[0_0_12px_rgba(196,166,125,0.15)]"
                    : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.18)] hover:bg-[rgba(255,255,255,0.06)]"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex-shrink-0 border ${
                    selectedThemeId === theme.id
                      ? "border-[#c4a67d] ring-2 ring-[rgba(196,166,125,0.3)]"
                      : "border-[rgba(255,255,255,0.12)]"
                  }`}
                  style={{ backgroundColor: theme.preview_color || "#1a1a1a" }}
                />
                <span className={`text-xs font-medium whitespace-nowrap ${
                  selectedThemeId === theme.id ? "text-[#c4a67d]" : "text-[rgba(255,255,255,0.55)]"
                }`}>
                  {theme.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category filter pills */}
      <div>
        <h3 className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-2.5">
          Scene Themes
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeCategory === null
                ? "bg-[rgba(196,166,125,0.2)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]"
                : "bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"
            }`}
          >
            All
          </button>
          {categories.filter(c => c.id !== "solid").map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? "bg-[rgba(196,166,125,0.2)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]"
                  : "bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"
              }`}
            >
              <span className="text-[11px]">{CATEGORY_ICONS[cat.icon] || "📁"}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scene Themes Grid */}
      {sceneThemes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sceneThemes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isSelected={selectedThemeId === theme.id}
              onSelect={() => onSelectTheme(theme)}
              jewelryType={jewelryType}
            />
          ))}
        </div>
      )}

      {filteredThemes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[rgba(255,255,255,0.4)] text-sm">No themes found matching your search.</p>
        </div>
      )}
    </div>
  );
}

function ThemeCard({
  theme,
  isSelected,
  onSelect,
  jewelryType,
}: {
  theme: Theme;
  isSelected: boolean;
  onSelect: () => void;
  jewelryType?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const previewSrc = useMemo(() => {
    if (jewelryType && !imgError) {
      return `/theme-previews/${jewelryType}/${theme.id}.jpg`;
    }
    return theme.preview_image;
  }, [jewelryType, theme.id, theme.preview_image, imgError]);

  const handleImgError = () => {
    if (jewelryType && !imgError) {
      setImgError(true);
    }
  };

  return (
    <button
      onClick={onSelect}
      className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 text-left ${
        isSelected
          ? "border-[#c4a67d] ring-2 ring-[rgba(196,166,125,0.25)] shadow-[0_0_20px_rgba(196,166,125,0.15)]"
          : "border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
      }`}
    >
      {/* Preview Image */}
      <div className="aspect-square relative bg-[rgba(255,255,255,0.03)] overflow-hidden">
        {previewSrc ? (
          <>
            {!imgLoaded && (
              <div 
                className="absolute inset-0 animate-pulse"
                style={{ backgroundColor: theme.preview_color || "#2a2a2a" }}
              />
            )}
            <img
              src={previewSrc}
              alt={theme.name}
              className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={handleImgError}
            />
          </>
        ) : (
          <div
            className="w-full h-full"
            style={{ backgroundColor: theme.preview_color || "#1a1a1a" }}
          />
        )}

        {/* Selected checkmark */}
        {isSelected && (
          <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-[#c4a67d] flex items-center justify-center shadow-lg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-semibold text-white truncate">{theme.name}</p>
        <p className="text-[11px] text-[rgba(255,255,255,0.4)] mt-0.5 line-clamp-1">{theme.description}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] font-semibold text-[#7dcf5a] bg-[rgba(125,207,90,0.1)] px-2 py-0.5 rounded-full">
            Available
          </span>
          <span className="text-[10px] text-[rgba(255,255,255,0.3)]">
            {theme.shots.length} shots
          </span>
        </div>
      </div>
    </button>
  );
}

function SolidColorCard({
  theme,
  isSelected,
  onSelect,
}: {
  theme: Theme;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group relative rounded-xl overflow-hidden border transition-all duration-200 text-left ${
        isSelected
          ? "border-[#c4a67d] ring-2 ring-[rgba(196,166,125,0.25)]"
          : "border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)]"
      }`}
    >
      <div
        className="aspect-square relative overflow-hidden"
        style={{ backgroundColor: theme.preview_color || "#1a1a1a" }}
      >
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#c4a67d] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className="text-xs font-semibold text-white truncate">{theme.name}</p>
        <span className="text-[10px] font-semibold text-[#7dcf5a]">Available</span>
      </div>
    </button>
  );
}
