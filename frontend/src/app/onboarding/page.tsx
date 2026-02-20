"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (!loading && user?.category_id) { router.push("/"); return; }
    loadCategories();
  }, [loading, user, router]);

  async function loadCategories() {
    try {
      const data = await api.get<{ categories: Category[] }>("/feed/categories");
      setCategories(data.categories);
    } catch { /* silent */ }
  }

  async function handleNext() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.put("/users/me", { category_id: selected });
      router.push("/");
    } catch { /* silent */ }
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-[#0E0F14] flex flex-col">
      <div className="max-w-xl mx-auto w-full flex-1 flex flex-col px-5 md:px-8">
        {/* Header */}
        <div className="pt-8 md:pt-16 pb-6">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6A00] to-[#FF8A3D] flex items-center justify-center shadow-[0_0_12px_rgba(255,106,0,0.3)]">
              <span className="text-white text-xs font-bold tracking-tight">SP</span>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-white">SoraPixel</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Select your category
          </h1>
          <p className="mt-2 text-[rgba(255,255,255,0.5)] text-sm">
            Choose your product category to personalize your experience.
          </p>
        </div>

        {/* Category list */}
        <div className="flex-1 space-y-2 overflow-y-auto pb-32">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelected(cat.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-250 text-left min-h-[56px] ${selected === cat.id
                  ? "border-[#FF6A00] bg-[rgba(255,106,0,0.08)] shadow-[0_0_16px_rgba(255,106,0,0.1)]"
                  : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.14)] hover:bg-[rgba(255,255,255,0.06)]"
                }`}
            >
              <div>
                <p className="font-medium text-sm text-white">
                  {cat.name}
                </p>
                {cat.description && (
                  <p className="text-xs text-[rgba(255,255,255,0.4)] mt-0.5">{cat.description}</p>
                )}
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-250 ${selected === cat.id ? "border-[#FF6A00]" : "border-[rgba(255,255,255,0.15)]"
                }`}>
                {selected === cat.id && <div className="w-2.5 h-2.5 rounded-full bg-[#FF6A00]" />}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0E0F14] border-t border-[rgba(255,255,255,0.06)] px-5 py-4 md:py-5">
        <div className="max-w-xl mx-auto">
          <Button onClick={handleNext} disabled={!selected} loading={saving} fullWidth size="lg">
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
