"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { JEWELRY_TYPES, JEWELRY_BACKGROUNDS } from "@/lib/jewelry-styles";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import CompareSlider from "@/components/ui/CompareSlider";

type Step = "idle" | "generating-hero" | "hero-done" | "generating-rest" | "all-done";

interface ResultImage {
  label: string;
  base64: string;
}

interface GenerateResponse {
  success: boolean;
  images: ResultImage[];
  locked?: boolean;
  free_hero_remaining?: number;
  free_pack_remaining?: number;
  token_balance?: number;
}

interface Toast {
  id: number;
  message: string;
  type: "error" | "success" | "info";
}

const SHOT_LABELS = ["Hero Shot", "Alternate Angle", "Close-up Detail"] as const;

export default function JewelryPage() {
  const { user, loading: authLoading } = useAuth();
  const { credits, refreshCredits } = useCredits();
  const router = useRouter();

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [jewelryType, setJewelryType] = useState<string>("ring");
  const [backgroundId, setBackgroundId] = useState<string>("black-velvet");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  const [step, setStep] = useState<Step>("idle");
  const [heroImage, setHeroImage] = useState<ResultImage | null>(null);
  const [restImages, setRestImages] = useState<ResultImage[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [genStatus, setGenStatus] = useState<string | null>(null);

  const [compareMode, setCompareMode] = useState(false);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);
  const [regenIndex, setRegenIndex] = useState<number | null>(null);

  const [isLocked, setIsLocked] = useState(false);
  const [freeHeroRemaining, setFreeHeroRemaining] = useState<number | null>(null);
  const [freePackRemaining, setFreePackRemaining] = useState<number | null>(null);

  const [ugcLoading, setUgcLoading] = useState(false);
  const [ugcImages, setUgcImages] = useState<ResultImage[]>([]);
  const [ugcLightbox, setUgcLightbox] = useState<number | null>(null);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueData, setCatalogueData] = useState<Record<string, unknown> | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  const scrollToResults = useCallback(() => {
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }, []);

  const showToast = useCallback((message: string, type: Toast["type"] = "error") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), type === "error" ? 8000 : 5000);
  }, []);

  const allImages: ResultImage[] = heroImage ? [heroImage, ...restImages] : [];

  function requireAuth(): boolean {
    if (user) return true;
    router.push("/login?redirect=/jewelry");
    return false;
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast("File too large. Max 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      const b64 = result.split(",")[1];
      setImageBase64(b64);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleFileUpload(fakeEvent);
  }

  function basePayload() {
    return {
      image_base64: imageBase64!,
      jewelry_type: jewelryType,
      background: backgroundId,
      aspect_ratio_id: "square",
      ...(specialInstructions.trim() ? { special_instructions: specialInstructions.trim() } : {}),
    };
  }

  function updateFreeTier(data: GenerateResponse) {
    if (data.free_hero_remaining !== undefined) setFreeHeroRemaining(data.free_hero_remaining);
    if (data.free_pack_remaining !== undefined) setFreePackRemaining(data.free_pack_remaining);
    setIsLocked(!!data.locked);
  }

  async function generateHero() {
    if (!imageBase64) return;
    if (!requireAuth()) return;
    setStep("generating-hero");
    setGenStatus("Generating hero shot...");
    setHeroImage(null);
    setRestImages([]);

    try {
      const data = await api.post<GenerateResponse>("/jewelry/generate", {
        ...basePayload(),
        step: "hero",
      });
      if (data.success && data.images.length > 0) {
        setHeroImage(data.images[0]);
        setStep("hero-done");
        setGenStatus(null);
        updateFreeTier(data);
        scrollToResults();
        showToast(data.locked ? "Hero generated — upgrade to download" : "Hero shot ready! Scroll down if needed.", data.locked ? "info" : "success");
      } else {
        throw new Error("No image returned");
      }
    } catch (err) {
      setStep("idle");
      setGenStatus(null);
      showToast(err instanceof Error ? err.message : "Generation failed");
    }
  }

  async function generateFullPack() {
    if (!imageBase64) return;
    if (!requireAuth()) return;
    setStep("generating-rest");
    setGenStatus("Generating angle shot & close-up...");

    try {
      const data = await api.post<GenerateResponse>("/jewelry/generate", {
        ...basePayload(),
        step: "full_pack",
      });
      if (data.success && data.images.length > 1) {
        setHeroImage(data.images[0]);
        setRestImages(data.images.slice(1));
        setStep("all-done");
        setGenStatus(null);
        updateFreeTier(data);
        refreshCredits();
        scrollToResults();
        showToast(data.locked ? "Pack generated — upgrade to download" : "Your 3-angle pack is ready!", data.locked ? "info" : "success");
      } else {
        throw new Error("Incomplete pack returned");
      }
    } catch (err) {
      setStep("hero-done");
      setGenStatus(null);
      showToast(err instanceof Error ? err.message : "Pack generation failed");
    }
  }

  async function regenerateShot(index: number) {
    if (!imageBase64) return;
    const stepMap = ["regen_hero", "regen_angle", "regen_closeup"];
    const regenStep = stepMap[index];
    if (!regenStep) return;

    setRegenIndex(index);
    try {
      const data = await api.post<GenerateResponse>("/jewelry/generate", {
        ...basePayload(),
        step: regenStep,
      });
      if (data.success && data.images.length > 0) {
        const newImg = data.images[0];
        if (index === 0) {
          setHeroImage(newImg);
        } else {
          setRestImages((prev) => {
            const copy = [...prev];
            copy[index - 1] = newImg;
            return copy;
          });
        }
        refreshCredits();
        showToast(`${SHOT_LABELS[index]} regenerated!`, "success");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenIndex(null);
    }
  }

  async function generateUGC() {
    if (!heroImage) return;
    setUgcLoading(true);
    try {
      const data = await api.post<GenerateResponse>("/catalogue/generate", {
        image_base64: heroImage.base64,
        model_type: "indian_woman",
        poses: ["standing", "side_view"],
        background: "best_match",
        special_instructions: `This is ${jewelryType} jewelry. Show the model wearing/displaying it elegantly.`,
      });
      if (data.success && data.images.length > 0) {
        setUgcImages(data.images.map((img: { base64: string; label?: string }) => ({
          base64: typeof img === "string" ? img : img.base64,
          label: (img as ResultImage).label || "UGC",
        })));
        refreshCredits();
        showToast("UGC photos generated!", "success");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "UGC generation failed");
    } finally {
      setUgcLoading(false);
    }
  }

  async function generateCatalogue() {
    if (!heroImage) return;
    setCatalogueLoading(true);
    try {
      const data = await api.post<{ success: boolean; listing: Record<string, unknown> }>("/jewelry/listing", {
        image_base64: heroImage.base64,
        jewelry_type: jewelryType,
      });
      if (data.success && data.listing) {
        setCatalogueData(data.listing);
        refreshCredits();
        showToast("Product listing generated!", "success");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Listing generation failed");
    } finally {
      setCatalogueLoading(false);
    }
  }

  function downloadImage(img: ResultImage) {
    if (isLocked) {
      router.push("/pricing");
      return;
    }
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${img.base64}`;
    link.download = `sorapixel-${img.label.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.click();
  }

  function downloadAll() {
    if (isLocked) {
      router.push("/pricing");
      return;
    }
    allImages.forEach((img) => downloadImage(img));
  }

  function startOver() {
    setImageBase64(null);
    setImagePreview(null);
    setHeroImage(null);
    setRestImages([]);
    setStep("idle");
    setGenStatus(null);
    setExpandedIndex(null);
    setCompareMode(false);
    setCompareIndex(null);
    setRegenIndex(null);
    setUgcImages([]);
    setCatalogueData(null);
    setIsLocked(false);
  }

  const selectedBg = JEWELRY_BACKGROUNDS.find((b) => b.id === backgroundId);
  const selectedType = JEWELRY_TYPES.find((t) => t.id === jewelryType);

  function LockedOverlay() {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[rgba(0,0,0,0.3)]">
        <div className="w-14 h-14 rounded-full bg-[rgba(0,0,0,0.6)] backdrop-blur-sm flex items-center justify-center mb-3 border border-[rgba(255,255,255,0.1)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <p className="text-white text-sm font-semibold mb-1">Upgrade to Unlock</p>
        <p className="text-[rgba(255,255,255,0.5)] text-xs mb-3 text-center px-6">
          Your free credits are used up. Purchase tokens to download.
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); router.push("/pricing"); }}
          className="px-5 py-2 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-xs font-semibold rounded-full shadow-[0_4px_16px_rgba(196,166,125,0.3)] hover:shadow-[0_6px_24px_rgba(196,166,125,0.45)] active:scale-[0.97] transition-all"
        >
          View Plans
        </button>
      </div>
    );
  }

  const freeCounterText = freeHeroRemaining !== null
    ? `${freeHeroRemaining} free preview${freeHeroRemaining !== 1 ? "s" : ""} left`
    : null;

  return (
    <ResponsiveLayout title="Jewelry Studio">
      {/* Toasts */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl text-sm font-medium shadow-lg animate-fade-in-up ${
              t.type === "error"
                ? "bg-red-500/90 text-white"
                : t.type === "success"
                  ? "bg-emerald-500/90 text-white"
                  : "bg-white/10 text-white backdrop-blur-sm"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-[#c4a67d] tracking-[0.12em] uppercase bg-[rgba(196,166,125,0.1)] px-2.5 py-1 rounded-full">
              Jewelry
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-display">
            3-Angle Photo Pack
          </h1>
          <p className="text-sm text-[rgba(255,255,255,0.5)] mt-1">
            Upload a jewelry photo and get a hero shot, close-up detail, and alternate angle — all pixel-perfect.
          </p>
          {freeCounterText && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-[rgba(196,166,125,0.08)] border border-[rgba(196,166,125,0.15)]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-medium text-[rgba(255,255,255,0.6)]">{freeCounterText}</span>
            </div>
          )}
        </div>

        {/* ===== UPLOAD + CONFIG ===== */}
        {step === "idle" && (
          <div className="space-y-6">
            {/* Upload zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="relative border-2 border-dashed border-[rgba(196,166,125,0.3)] rounded-2xl p-8 md:p-12 text-center hover:border-[rgba(196,166,125,0.5)] transition-colors cursor-pointer bg-[rgba(196,166,125,0.03)]"
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {imagePreview ? (
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-40 h-40 object-cover rounded-xl border border-[rgba(255,255,255,0.1)]"
                  />
                  <p className="text-sm text-[#c4a67d]">Image ready. Configure below or tap to change.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[rgba(196,166,125,0.1)] flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Upload your jewelry photo</p>
                    <p className="text-[rgba(255,255,255,0.4)] text-sm mt-0.5">Drag and drop or click to browse</p>
                  </div>
                  <p className="text-[rgba(255,255,255,0.25)] text-xs">PNG, JPG up to 10MB</p>
                </div>
              )}
            </div>

            {/* Jewelry type selection */}
            <div>
              <label className="text-xs font-semibold text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-3 block">
                Jewelry Type
              </label>
              <div className="flex flex-wrap gap-2">
                {JEWELRY_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setJewelryType(type.id)}
                    className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      jewelryType === type.id
                        ? "bg-[rgba(196,166,125,0.15)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]"
                        : "bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"
                    }`}
                  >
                    <span className="mr-1.5">{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Background selection */}
            <div>
              <label className="text-xs font-semibold text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-3 block">
                Background
              </label>
              <div className="flex flex-wrap gap-3">
                {JEWELRY_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setBackgroundId(bg.id)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      backgroundId === bg.id
                        ? "bg-[rgba(196,166,125,0.15)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]"
                        : "bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full border border-[rgba(255,255,255,0.15)]"
                      style={{ backgroundColor: bg.swatch }}
                    />
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Special instructions */}
            <div>
              <label className="text-xs font-semibold text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-2 block">
                Special Instructions <span className="text-[rgba(255,255,255,0.25)] font-normal">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 120))}
                  placeholder="e.g. Add sparkle effects, warm golden tone, dramatic shadows..."
                  className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(196,166,125,0.4)] focus:bg-[rgba(196,166,125,0.03)] transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[rgba(255,255,255,0.2)]">
                  {specialInstructions.length}/120
                </span>
              </div>
            </div>

            {/* Generate buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={generateHero}
                disabled={!imageBase64}
                className="px-6 py-3 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-sm font-semibold rounded-full shadow-[0_4px_20px_rgba(196,166,125,0.3)] hover:shadow-[0_6px_30px_rgba(196,166,125,0.45)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                Generate Hero Shot (Free Preview)
              </button>
              <button
                onClick={generateFullPack}
                disabled={!imageBase64}
                className="px-6 py-3 bg-[rgba(255,255,255,0.06)] text-white text-sm font-semibold rounded-full border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Generate Full 3-Angle Pack
                {credits && <span className="ml-1.5 text-[#c4a67d]">({credits.token_balance} tokens)</span>}
              </button>
            </div>
          </div>
        )}

        {/* ===== GENERATING STATE ===== */}
        {(step === "generating-hero" || step === "generating-rest") && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-[#c4a67d] border-r-[#8b7355] animate-spin" style={{ borderWidth: "3px" }} />
              <div className="absolute inset-3 rounded-full bg-[rgba(196,166,125,0.08)] flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
              </div>
            </div>
            <p className="text-white font-semibold text-lg">{genStatus}</p>
            <p className="text-[rgba(255,255,255,0.4)] text-sm mt-2">
              {step === "generating-hero" ? "Creating your hero shot..." : "Generating alternate angle & close-up..."}
            </p>
          </div>
        )}

        {/* ===== HERO DONE — preview + option to get full pack ===== */}
        {step === "hero-done" && heroImage && (
          <div ref={resultsRef} className="space-y-6 scroll-mt-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-bold text-white">Hero Shot Preview</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={startOver}
                  className="text-sm text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
                >
                  ← Start Over
                </button>
                <button
                  onClick={() => setCompareMode(!compareMode)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                    compareMode
                      ? "bg-[rgba(196,166,125,0.2)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]"
                      : "bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="2" x2="12" y2="22" />
                    <path d="M7 8l-4 4 4 4" /><path d="M17 8l4 4-4 4" />
                  </svg>
                  {compareMode ? "Side by Side" : "Compare"}
                </button>
              </div>
            </div>

            {/* Tweak instructions + regenerate */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="Add instructions, e.g. 'warmer lighting' or 'top-down angle'..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(196,166,125,0.3)] focus:ring-1 focus:ring-[rgba(196,166,125,0.15)] transition-all"
                />
              </div>
              <button
                onClick={() => regenerateShot(0)}
                disabled={regenIndex === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(196,166,125,0.3)] hover:text-[#c4a67d] transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {regenIndex === 0 ? (
                  <div className="w-3 h-3 border-2 border-[rgba(196,166,125,0.3)] border-t-[#c4a67d] rounded-full animate-spin" />
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                )}
                Regenerate
              </button>
            </div>

            {compareMode ? (
              <div className="max-w-2xl mx-auto">
                <CompareSlider
                  beforeSrc={imagePreview!}
                  afterSrc={`data:image/png;base64,${heroImage.base64}`}
                  beforeLabel="Original"
                  afterLabel="Hero Shot"
                  className="border border-[rgba(196,166,125,0.2)]"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => downloadImage(heroImage)}
                    className="text-xs text-[rgba(255,255,255,0.4)] hover:text-[#c4a67d] transition-colors"
                  >
                    Download Hero
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                  <div className="px-4 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
                    <span className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider">Original</span>
                  </div>
                  <img src={imagePreview!} alt="Original" className="w-full aspect-square object-cover" />
                </div>
                <div className="rounded-2xl overflow-hidden border border-[rgba(196,166,125,0.2)] bg-[rgba(196,166,125,0.03)]">
                  <div className="px-4 py-2.5 border-b border-[rgba(196,166,125,0.15)] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#c4a67d] uppercase tracking-wider">Hero Shot</span>
                    {!isLocked && (
                      <button
                        onClick={() => downloadImage(heroImage)}
                        className="text-xs text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
                      >
                        Download
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <img src={`data:image/png;base64,${heroImage.base64}`} alt="Hero" className={`w-full aspect-square object-cover ${isLocked ? "blur-lg" : ""}`} />
                    {isLocked && <LockedOverlay />}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-[rgba(196,166,125,0.06)] border border-[rgba(196,166,125,0.15)] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-1">Like the hero? Get the full pack.</h3>
              <p className="text-xs text-[rgba(255,255,255,0.5)] mb-4">
                Generate the alternate angle and close-up detail to complete your 3-angle jewelry photo pack.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={generateFullPack}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-sm font-semibold rounded-full shadow-[0_4px_20px_rgba(196,166,125,0.3)] hover:shadow-[0_6px_30px_rgba(196,166,125,0.45)] active:scale-[0.97] transition-all duration-200"
                >
                  Generate Full Pack
                </button>
                <button
                  onClick={startOver}
                  className="px-5 py-2.5 text-sm text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
                >
                  Try Different Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== ALL DONE — 3 images grid ===== */}
        {step === "all-done" && allImages.length > 0 && (
          <div ref={resultsRef} className="space-y-6 scroll-mt-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-bold text-white">Your 3-Angle Pack</h2>
                <p className="text-xs text-[rgba(255,255,255,0.4)] mt-0.5">
                  {selectedType?.icon} {selectedType?.label} on {selectedBg?.label}
                </p>
              </div>
              <div className="flex gap-2">
                {!isLocked && (
                  <button
                    onClick={downloadAll}
                    className="px-4 py-2 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-xs font-semibold rounded-full hover:shadow-[0_4px_16px_rgba(196,166,125,0.3)] transition-all"
                  >
                    Download All
                  </button>
                )}
                <button
                  onClick={startOver}
                  className="px-4 py-2 text-xs text-[rgba(255,255,255,0.4)] hover:text-white border border-[rgba(255,255,255,0.08)] rounded-full transition-colors"
                >
                  New Photo
                </button>
              </div>
            </div>

            {/* Compare slider overlay */}
            {compareIndex !== null && allImages[compareIndex] && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#c4a67d]">
                    Comparing: {allImages[compareIndex].label}
                  </span>
                  <button
                    onClick={() => setCompareIndex(null)}
                    className="text-xs text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
                  >
                    ✕ Close
                  </button>
                </div>
                <div className="max-w-2xl mx-auto">
                  <CompareSlider
                    beforeSrc={imagePreview!}
                    afterSrc={`data:image/png;base64,${allImages[compareIndex].base64}`}
                    beforeLabel="Original"
                    afterLabel={allImages[compareIndex].label}
                    className="border border-[rgba(196,166,125,0.2)]"
                  />
                </div>
              </div>
            )}

            {/* 3-image grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {allImages.map((img, i) => (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.12)] transition-all duration-300 group"
                >
                  <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${i === 0 ? "text-[#c4a67d]" : "text-[rgba(255,255,255,0.4)]"}`}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-xs font-semibold text-white uppercase tracking-wider">{img.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isLocked && (
                        <>
                          <button
                            onClick={() => regenerateShot(i)}
                            disabled={regenIndex === i}
                            className="text-[10px] text-[rgba(255,255,255,0.3)] hover:text-[#c4a67d] transition-colors uppercase tracking-wider font-semibold disabled:opacity-50 flex items-center gap-1"
                            title="Regenerate this shot (5 tokens)"
                          >
                            {regenIndex === i ? (
                              <div className="w-2.5 h-2.5 border border-[rgba(196,166,125,0.3)] border-t-[#c4a67d] rounded-full animate-spin" />
                            ) : (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                              </svg>
                            )}
                            Redo
                          </button>
                          <button
                            onClick={() => setCompareIndex(compareIndex === i ? null : i)}
                            className={`text-[10px] uppercase tracking-wider font-semibold transition-colors ${
                              compareIndex === i ? "text-[#c4a67d]" : "text-[rgba(255,255,255,0.3)] hover:text-[#c4a67d]"
                            }`}
                          >
                            Compare
                          </button>
                          <button
                            onClick={() => downloadImage(img)}
                            className="text-[10px] text-[rgba(255,255,255,0.3)] hover:text-[#c4a67d] transition-colors uppercase tracking-wider font-semibold"
                          >
                            Save
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <img
                      src={`data:image/png;base64,${img.base64}`}
                      alt={img.label}
                      className={`w-full aspect-square object-cover ${isLocked ? "blur-lg" : "cursor-pointer"}`}
                      onClick={() => !isLocked && setExpandedIndex(i)}
                    />
                    {isLocked && <LockedOverlay />}
                  </div>
                </div>
              ))}
            </div>

            {/* Original comparison */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
              <img
                src={imagePreview!}
                alt="Original"
                className="w-16 h-16 rounded-lg object-cover border border-[rgba(255,255,255,0.1)]"
              />
              <div>
                <p className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider">Original Upload</p>
                <p className="text-xs text-[rgba(255,255,255,0.25)] mt-0.5">
                  All details preserved pixel-perfect across all 3 angles.
                </p>
              </div>
            </div>

            {/* Tweak instructions for regeneration */}
            {!isLocked && (
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Tweak instructions before regenerating, e.g. 'softer shadows'..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(196,166,125,0.3)] focus:ring-1 focus:ring-[rgba(196,166,125,0.15)] transition-all"
                  />
                </div>
                <span className="text-[10px] text-[rgba(255,255,255,0.25)] whitespace-nowrap">applies on Redo</span>
              </div>
            )}

            {/* ===== DO MORE — UGC + Catalogue ===== */}
            <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <h3 className="text-sm font-bold text-white mb-1">Do more with your jewelry</h3>
              <p className="text-xs text-[rgba(255,255,255,0.35)] mb-4">
                Use your hero shot to generate UGC model photos or a product catalogue listing.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* UGC Card */}
                <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(196,166,125,0.1)] flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">UGC / Model Photos</h4>
                      <p className="text-[10px] text-[rgba(255,255,255,0.35)]">AI model wearing your jewelry</p>
                    </div>
                  </div>
                  {ugcImages.length > 0 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {ugcImages.map((img, i) => (
                          <div
                            key={i}
                            className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)] hover:border-[rgba(196,166,125,0.3)] relative group/ugc cursor-pointer transition-all duration-200"
                            onClick={() => setUgcLightbox(i)}
                          >
                            <img
                              src={`data:image/png;base64,${img.base64}`}
                              alt={img.label}
                              className="w-full aspect-[3/4] object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover/ugc:bg-black/20 transition-all duration-300 flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/ugc:opacity-100 transition-opacity duration-300">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" />
                                </svg>
                              </div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); downloadImage(img); }}
                              className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[9px] text-white/70 hover:text-white font-semibold uppercase tracking-wider opacity-0 group-hover/ugc:opacity-100 transition-opacity"
                            >
                              Save
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={generateUGC}
                        disabled={ugcLoading}
                        className="w-full py-2 rounded-xl text-xs font-semibold text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] hover:text-white transition-all disabled:opacity-50"
                      >
                        {ugcLoading ? "Generating..." : "Generate More"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={generateUGC}
                      disabled={ugcLoading}
                      className="w-full mt-2 py-2.5 rounded-xl text-xs font-semibold bg-[rgba(196,166,125,0.08)] text-[#c4a67d] border border-[rgba(196,166,125,0.15)] hover:bg-[rgba(196,166,125,0.15)] hover:border-[rgba(196,166,125,0.25)] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {ugcLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-3 h-3 border-2 border-[rgba(196,166,125,0.3)] border-t-[#c4a67d] rounded-full animate-spin" />
                          Generating UGC...
                        </span>
                      ) : (
                        "Generate UGC Photos"
                      )}
                    </button>
                  )}
                </div>

                {/* Catalogue Listing Card */}
                <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(196,166,125,0.1)] flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <line x1="10" y1="9" x2="8" y2="9" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Product Listing</h4>
                      <p className="text-[10px] text-[rgba(255,255,255,0.35)]">AI-generated Shopify-ready listing</p>
                    </div>
                  </div>
                  {catalogueData ? (
                    <div className="space-y-3">
                      <div className="rounded-xl bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.06)] p-3 max-h-48 overflow-y-auto">
                        {catalogueData.title ? (
                          <h5 className="text-sm font-semibold text-white mb-1">{String(catalogueData.title)}</h5>
                        ) : null}
                        {catalogueData.metaDescription ? (
                          <p className="text-[11px] text-[rgba(255,255,255,0.5)] mb-2">{String(catalogueData.metaDescription)}</p>
                        ) : null}
                        {catalogueData.description ? (
                          <div
                            className="text-[11px] text-[rgba(255,255,255,0.4)] leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: String(catalogueData.description) }}
                          />
                        ) : null}
                        {catalogueData.raw_text ? (
                          <p className="text-[11px] text-[rgba(255,255,255,0.4)] whitespace-pre-wrap">{String(catalogueData.raw_text)}</p>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(catalogueData, null, 2));
                            showToast("Copied to clipboard!", "success");
                          }}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold text-[#c4a67d] border border-[rgba(196,166,125,0.15)] hover:bg-[rgba(196,166,125,0.08)] transition-all"
                        >
                          Copy JSON
                        </button>
                        <button
                          onClick={generateCatalogue}
                          disabled={catalogueLoading}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] hover:text-white transition-all disabled:opacity-50"
                        >
                          {catalogueLoading ? "Generating..." : "Regenerate"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={generateCatalogue}
                      disabled={catalogueLoading}
                      className="w-full mt-2 py-2.5 rounded-xl text-xs font-semibold bg-[rgba(196,166,125,0.08)] text-[#c4a67d] border border-[rgba(196,166,125,0.15)] hover:bg-[rgba(196,166,125,0.15)] hover:border-[rgba(196,166,125,0.25)] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {catalogueLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-3 h-3 border-2 border-[rgba(196,166,125,0.3)] border-t-[#c4a67d] rounded-full animate-spin" />
                          Generating Listing...
                        </span>
                      ) : (
                        "Generate Product Listing"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== LIGHTBOX OVERLAY ===== */}
        {expandedIndex !== null && allImages[expandedIndex] && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in"
            onClick={() => setExpandedIndex(null)}
          >
            <div
              className="relative max-w-3xl w-full mx-4 animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#c4a67d]">
                    {String(expandedIndex + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-semibold text-white uppercase tracking-wider">
                    {allImages[expandedIndex].label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => regenerateShot(expandedIndex)}
                    disabled={regenIndex === expandedIndex}
                    className="px-3.5 py-1.5 text-xs font-semibold text-[rgba(255,255,255,0.5)] bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {regenIndex === expandedIndex ? (
                      <div className="w-3 h-3 border-2 border-[rgba(196,166,125,0.3)] border-t-[#c4a67d] rounded-full animate-spin" />
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                    )}
                    Regenerate
                  </button>
                  <button
                    onClick={() => downloadImage(allImages[expandedIndex])}
                    className="px-3.5 py-1.5 text-xs font-semibold text-[#c4a67d] bg-[rgba(196,166,125,0.1)] border border-[rgba(196,166,125,0.2)] rounded-full hover:bg-[rgba(196,166,125,0.2)] transition-colors"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => setExpandedIndex(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.1)] shadow-2xl">
                <img
                  src={`data:image/png;base64,${allImages[expandedIndex].base64}`}
                  alt={allImages[expandedIndex].label}
                  className="w-full object-contain max-h-[75vh] bg-black"
                />
              </div>

              <div className="flex items-center justify-center gap-3 mt-4">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setExpandedIndex(i)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 ${
                      expandedIndex === i
                        ? "bg-[rgba(196,166,125,0.2)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]"
                        : "bg-white/5 text-white/40 border border-white/10 hover:text-white/70 hover:border-white/20"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")} {img.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== UGC LIGHTBOX ===== */}
      {ugcLightbox !== null && ugcImages[ugcLightbox] && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in"
          onClick={() => setUgcLightbox(null)}
        >
          <div
            className="relative max-w-lg w-full mx-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">
                UGC Model Photo {ugcLightbox + 1}/{ugcImages.length}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => downloadImage(ugcImages[ugcLightbox])}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#c4a67d] bg-[rgba(196,166,125,0.1)] border border-[rgba(196,166,125,0.2)] rounded-full hover:bg-[rgba(196,166,125,0.2)] transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={() => setUgcLightbox(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.1)] shadow-2xl">
              <img
                src={`data:image/png;base64,${ugcImages[ugcLightbox].base64}`}
                alt={ugcImages[ugcLightbox].label}
                className="w-full object-contain max-h-[80vh] bg-black"
              />
            </div>

            {ugcImages.length > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                {ugcImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setUgcLightbox(i)}
                    className={`w-8 h-8 rounded-full text-[11px] font-bold transition-all duration-200 ${
                      ugcLightbox === i
                        ? "bg-[rgba(196,166,125,0.2)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]"
                        : "bg-white/5 text-white/40 border border-white/10 hover:text-white/70"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </ResponsiveLayout>
  );
}
