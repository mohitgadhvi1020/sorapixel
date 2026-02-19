"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/shared/BottomNav";
import DailyRewardModal from "@/components/shared/DailyRewardModal";
import type { Category, FeedItem } from "@/lib/types";

const CATEGORY_TABS = [
  "Jewellery", "Fashion & Clothing", "Accessories", "Kids",
  "Home & Living", "Art & Craft", "Beauty & Wellness",
];

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Jewellery");
  const [subTab, setSubTab] = useState<"photoshoot" | "catalogue" | "branding">("photoshoot");
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
    loadFeed();
  }, [activeTab, subTab]);

  async function loadCategories() {
    try {
      const data = await api.get<{ categories: Category[] }>("/feed/categories");
      setCategories(data.categories);
    } catch { /* silent */ }
  }

  async function loadFeed() {
    setLoading(true);
    try {
      const cat = categories.find((c) => c.name === activeTab);
      const params = new URLSearchParams();
      if (cat) params.set("category", cat.id);
      params.set("item_type", subTab);
      const data = await api.get<{ items: FeedItem[] }>(`/feed/?${params}`);
      setFeedItems(data.items);
    } catch {
      setFeedItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Category Tabs */}
      <div className="bg-white overflow-x-auto">
        <div className="flex gap-2 px-4 py-3 min-w-max">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-pink-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Sub Tabs: Photo Shoot / Catalogue / Branding */}
      <div className="bg-white border-b flex justify-around">
        {(["photoshoot", "catalogue", "branding"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`flex-1 py-3 text-center text-sm font-medium capitalize transition-colors ${
              subTab === t ? "text-pink-500 border-b-2 border-pink-500" : "text-gray-400"
            }`}
          >
            {t === "photoshoot" ? "Photo Shoot" : t === "catalogue" ? "Catalogue" : "Branding"}
          </button>
        ))}
      </div>

      {/* Learn banner */}
      <div className="mx-4 mt-4 bg-pink-50 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">Learn How SoraPixel Works</p>
          <button className="bg-red-500 text-white text-xs px-3 py-1 rounded-full mt-1">
            Watch Video
          </button>
        </div>
        <div className="flex -space-x-2">
          <div className="w-10 h-10 bg-pink-200 rounded-lg" />
          <div className="w-10 h-10 bg-pink-300 rounded-lg" />
        </div>
      </div>

      {/* Feed */}
      <div className="p-4 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" />
          </div>
        ) : feedItems.length === 0 ? (
          /* Placeholder content when feed is empty */
          <div className="space-y-6">
            <div className="bg-white rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b">
                <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-xs font-bold text-pink-500">SP</div>
                <span className="font-medium text-sm">SoraPixel</span>
                <div className="flex-1" />
                <button className="text-green-500 text-lg">💬</button>
                <button className="text-gray-400">⬇</button>
              </div>
              <div className="bg-gray-100 h-72 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <p className="text-lg mb-2">No examples yet</p>
                  <p className="text-sm">Create your first image to see it here!</p>
                </div>
              </div>
              <div className="p-4">
                <button
                  onClick={() => router.push(isAuthenticated ? "/create" : "/login")}
                  className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold"
                >
                  Try it out!
                </button>
              </div>
            </div>
          </div>
        ) : (
          feedItems.map((item) => (
            <div key={item.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-4 py-3 border-b">
                <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-xs font-bold text-pink-500">SP</div>
                <span className="font-medium text-sm">SoraPixel</span>
                <div className="flex-1" />
                <button className="text-green-500 text-lg">💬</button>
                <button className="text-gray-400">⬇</button>
              </div>

              {item.after_image_url && (
                <div className="relative">
                  <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">After</span>
                  <img src={item.after_image_url} alt={item.title || "Generated"} className="w-full h-auto" />
                </div>
              )}

              <div className="p-4">
                <button
                  onClick={() => router.push(isAuthenticated ? "/create" : "/login")}
                  className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold"
                >
                  Try it out!
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Daily reward modal */}
      {isAuthenticated && <DailyRewardModal />}

      <BottomNav />
    </div>
  );
}
