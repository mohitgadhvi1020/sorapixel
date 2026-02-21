"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { cacheGet, cacheSet } from "@/lib/cache";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Category { id: string; name: string; slug: string; }
interface FeedItem {
  id: string;
  title: string;
  before_image_url: string;
  after_image_url: string;
  item_type: string;
  tags: {
    prompt_type?: string;
    background?: string;
    model?: string;
    description?: string;
    poses?: string[];
  };
}

const SUB_TABS = [
  { id: "photoshoot", label: "Photo Shoot" },
  { id: "catalogue", label: "Catalogue" },
  { id: "branding", label: "Branding" },
];

const CATEGORIES_CACHE_KEY = "home_categories";
function feedCacheKey(catId: string, subTab: string) {
  return `feed_${catId}_${subTab}`;
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const cachedCategories = cacheGet<Category[]>(CATEGORIES_CACHE_KEY);
  const [categories, setCategories] = useState<Category[]>(cachedCategories ?? []);
  const [activeCategory, setActiveCategory] = useState<string | null>(
    cachedCategories?.[0]?.id ?? null
  );
  const [activeSubTab, setActiveSubTab] = useState("photoshoot");

  const initialFeedKey = cachedCategories?.[0]?.id
    ? feedCacheKey(cachedCategories[0].id, "photoshoot")
    : null;
  const cachedFeed = initialFeedKey ? cacheGet<FeedItem[]>(initialFeedKey) : undefined;
  const [feedItems, setFeedItems] = useState<FeedItem[]>(cachedFeed ?? []);
  const [loading, setLoading] = useState(false);

  const categoriesLoaded = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (!user.category_id) { router.push("/onboarding"); return; }
    if (!categoriesLoaded.current) {
      categoriesLoaded.current = true;
      loadCategories();
    }
  }, [authLoading, user, router]);

  async function loadCategories() {
    try {
      const data = await api.get<{ categories: Category[] }>("/feed/categories");
      setCategories(data.categories);
      cacheSet(CATEGORIES_CACHE_KEY, data.categories);
      if (data.categories.length > 0) {
        const firstId = data.categories[0].id;
        if (!activeCategory) {
          setActiveCategory(firstId);
        }
        loadFeed(activeCategory || firstId, activeSubTab);
      }
    } catch { /* silent */ }
  }

  async function loadFeed(categoryId: string, subTab: string) {
    const key = feedCacheKey(categoryId, subTab);
    const cached = cacheGet<FeedItem[]>(key);

    if (cached && feedItems.length > 0) {
      try {
        const data = await api.get<{ items: FeedItem[] }>(`/feed/?category=${categoryId}&item_type=${subTab}`);
        const items = (data.items || []).map(item => ({
          ...item,
          tags: typeof item.tags === "string" ? JSON.parse(item.tags) : (item.tags || {}),
        }));
        setFeedItems(items);
        cacheSet(key, items);
      } catch { /* keep existing data */ }
    } else {
      if (!cached) setLoading(true);
      if (cached) setFeedItems(cached);

      try {
        const data = await api.get<{ items: FeedItem[] }>(`/feed/?category=${categoryId}&item_type=${subTab}`);
        const items = (data.items || []).map(item => ({
          ...item,
          tags: typeof item.tags === "string" ? JSON.parse(item.tags) : (item.tags || {}),
        }));
        setFeedItems(items);
        cacheSet(key, items);
      } catch {
        if (!cached) setFeedItems([]);
      }
      setLoading(false);
    }
  }

  function selectCategory(id: string) {
    setActiveCategory(id);
    const key = feedCacheKey(id, activeSubTab);
    const cached = cacheGet<FeedItem[]>(key);
    if (cached) setFeedItems(cached);
    loadFeed(id, activeSubTab);
  }

  function selectSubTab(id: string) {
    setActiveSubTab(id);
    if (activeCategory) {
      const key = feedCacheKey(activeCategory, id);
      const cached = cacheGet<FeedItem[]>(key);
      if (cached) setFeedItems(cached);
      loadFeed(activeCategory, id);
    }
  }

  function handleTryIt(item: FeedItem) {
    if (item.item_type === "catalogue" || item.item_type === "branding") {
      const params = new URLSearchParams();
      if (item.tags?.model) params.set("model", item.tags.model);
      if (item.tags?.background) params.set("bg", item.tags.background);
      if (item.tags?.poses?.length) params.set("poses", item.tags.poses.join(","));
      const qs = params.toString();
      router.push(`/catalogue${qs ? `?${qs}` : ""}`);
    } else {
      const bg = item.tags?.background || "";
      router.push(`/studio${bg ? `?bg=${bg}` : ""}`);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0E0F14] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[rgba(255,106,0,0.2)] border-t-[#FF6A00] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ResponsiveLayout title="Home">
      {/* Category & Sub-tab bar */}
      <div className="space-y-4 mb-8">
        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => selectCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-250 whitespace-nowrap ${activeCategory === cat.id
                ? "bg-gradient-to-r from-[#FF6A00] to-[#FF8A3D] text-white shadow-[0_4px_16px_rgba(255,106,0,0.3)]"
                : "bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.08)]"
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Sub tabs */}
        <div className="flex border-b border-[rgba(255,255,255,0.06)]">
          {SUB_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => selectSubTab(tab.id)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-all duration-250 ${activeSubTab === tab.id
                ? "text-white"
                : "text-[rgba(255,255,255,0.4)] hover:text-white"
                }`}
            >
              {tab.label}
              {activeSubTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#FF6A00] to-[#FF8A3D] rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Quick action banner */}
      <Card variant="accent" className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" padding="md">
        <div>
          <h3 className="text-sm font-semibold text-white">Ready to create?</h3>
          <p className="text-xs text-[rgba(255,255,255,0.5)] mt-0.5">
            Transform your product photos with AI-powered studio quality.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => router.push("/studio")}>
            Studio
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push("/catalogue")}>
            Catalogue
          </Button>
        </div>
      </Card>

      {/* Feed */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-[rgba(255,106,0,0.2)] border-t-[#FF6A00] rounded-full animate-spin" />
          </div>
        ) : feedItems.length === 0 ? (
          <EmptyFeed onTry={() => router.push("/studio")} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {feedItems.map(item => (
              <FeedCard key={item.id} item={item} onTryIt={() => handleTryIt(item)} />
            ))}
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
}

function EmptyFeed({ onTry }: { onTry: () => void }) {
  return (
    <Card padding="lg" className="text-center max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-[rgba(255,106,0,0.1)] flex items-center justify-center mx-auto mb-5">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-white">Create your first studio transformation</h3>
      <p className="text-sm text-[rgba(255,255,255,0.5)] mt-2 mb-6">
        Upload a product photo and watch AI transform it into studio-quality imagery.
      </p>
      <Button onClick={onTry} size="lg">
        Start Creating
      </Button>
    </Card>
  );
}

function FeedCard({ item, onTryIt }: { item: FeedItem; onTryIt: () => void }) {
  const [showBefore, setShowBefore] = useState(false);
  const touchStartX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) setShowBefore(!showBefore);
  }, [showBefore]);

  const typeLabel = item.item_type === "catalogue" ? "UGC / Model Shot"
    : item.item_type === "branding" ? "Branding"
      : "Studio / Background";

  const description = item.tags?.description || item.title;

  return (
    <Card padding="none" hover>
      {/* Image section */}
      <div
        className="relative cursor-pointer select-none group"
        onClick={() => setShowBefore(!showBefore)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={showBefore ? item.before_image_url : item.after_image_url}
          alt={showBefore ? "Before" : "After"}
          className="w-full aspect-square object-cover rounded-t-[20px] transition-opacity duration-200"
          loading="lazy"
        />
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[20px]" />
        <span className={`absolute top-3 left-3 text-xs px-2.5 py-1 rounded-lg font-medium ${showBefore ? "bg-black/60 text-white backdrop-blur-sm" : "bg-[rgba(255,106,0,0.9)] text-white"
          }`}>
          {showBefore ? "Before" : "After"}
        </span>
        <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="8 4 16 12 8 20" /></svg>
          Tap to toggle
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${!showBefore ? "bg-[#FF6A00] w-3" : "bg-white/40"}`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-all ${showBefore ? "bg-[#FF6A00] w-3" : "bg-white/40"}`} />
        </div>
      </div>

      {/* Info section */}
      <div className="p-4 space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium text-[#FF8A3D] uppercase tracking-wider">{typeLabel}</span>
          </div>
          <p className="text-sm font-medium text-white">{item.title}</p>
          {description !== item.title && (
            <p className="text-xs text-[rgba(255,255,255,0.5)] mt-0.5 line-clamp-2">{description}</p>
          )}
        </div>

        {/* Thumbnails */}
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowBefore(false); }}
            className={`flex-1 rounded-xl overflow-hidden border transition-all duration-250 ${!showBefore ? "border-[#FF6A00]" : "border-[rgba(255,255,255,0.08)]"}`}
          >
            <img src={item.after_image_url} alt="After" className="w-full aspect-video object-cover" loading="lazy" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowBefore(true); }}
            className={`flex-1 rounded-xl overflow-hidden border transition-all duration-250 ${showBefore ? "border-[#FF6A00]" : "border-[rgba(255,255,255,0.08)]"}`}
          >
            <img src={item.before_image_url} alt="Before" className="w-full aspect-video object-cover" loading="lazy" />
          </button>
        </div>

        <Button onClick={onTryIt} fullWidth variant="secondary" size="sm">
          Try This Style
        </Button>
      </div>
    </Card>
  );
}
