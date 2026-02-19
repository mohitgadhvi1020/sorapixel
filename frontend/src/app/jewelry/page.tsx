"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import UploadZone from "@/components/upload/UploadZone";
import BottomNav from "@/components/shared/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import {
  JEWELRY_TYPES,
  JEWELRY_BACKGROUNDS,
  type JewelryTypeOption,
  type JewelryBackground,
} from "@/lib/jewelry-styles";

type Step =
  | "idle"
  | "generating-hero"
  | "hero-done"
  | "generating-rest"
  | "all-done";

interface ResultImage {
  label: string;
  base64: string;
  mimeType: string;
  dataUri: string;
}

interface CreditsData {
  token_balance: number;
  pricing: {
    photoPack: number;
    recolorSingle: number;
    recolorAll: number;
    hdUpscale: number;
    listing: number;
  };
}

interface ListingData {
  title: string;
  description: string;
  metaDescription?: string;
  altText?: string;
  attributes?: Record<string, string>;
}

interface Toast {
  id: number;
  message: string;
  type: "error" | "warning" | "info" | "success";
}

function toRawBase64(dataUri: string): string {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  return match ? match[2] : dataUri;
}

function cropToSquare(base64: string, maxDim = 2048, quality = 0.92): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const size = Math.min(img.naturalWidth, img.naturalHeight);
      const x = (img.naturalWidth - size) / 2;
      const y = (img.naturalHeight - size) / 2;
      const outSize = Math.min(size, maxDim);
      const canvas = document.createElement("canvas");
      canvas.width = outSize;
      canvas.height = outSize;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, x, y, size, size, 0, 0, outSize, outSize);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = base64;
  });
}

export default function JewelryPage() {
  const { user, loading: authLoading } = useAuth();

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [jewelryType, setJewelryType] = useState<string | null>(null);
  const [backgroundId, setBackgroundId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [heroImage, setHeroImage] = useState<ResultImage | null>(null);
  const [restImages, setRestImages] = useState<ResultImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [genStatus, setGenStatus] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const showToast = useCallback((message: string, type: Toast["type"] = "error") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      type === "error" ? 8000 : 5000,
    );
  }, []);

  const [hdGeneratingIndex, setHdGeneratingIndex] = useState<number | null>(null);
  const [recoloringIndex, setRecoloringIndex] = useState<number | null>(null);
  const [recoloringAll, setRecoloringAll] = useState(false);
  const [listingLoading, setListingLoading] = useState(false);
  const [listing, setListing] = useState<ListingData | null>(null);
  const [showPricing, setShowPricing] = useState(false);

  const [credits, setCredits] = useState<CreditsData | null>(null);
  const fetchCredits = useCallback(async () => {
    try {
      const data = await api.get<CreditsData>("/jewelry/credits");
      setCredits(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const allImages: ResultImage[] = heroImage ? [heroImage, ...restImages] : [];

  const handleImageSelected = useCallback(
    async (base64: string, _preview: string) => {
      const squared = await cropToSquare(base64);
      setImageBase64(squared);
      setHeroImage(null);
      setRestImages([]);
      setError(null);
      setStep("idle");
      setExpandedIndex(null);
      setListing(null);
    },
    [],
  );

  const handleReset = useCallback(() => {
    setImageBase64(null);
    setJewelryType(null);
    setBackgroundId(null);
    setHeroImage(null);
    setRestImages([]);
    setError(null);
    setStep("idle");
    setExpandedIndex(null);
    setListing(null);
  }, []);

  const canGenerate =
    !!imageBase64 && !!jewelryType && !!backgroundId;

  // Step 1: Generate hero shot (free preview)
  const handleGenerateHero = useCallback(async () => {
    if (!imageBase64 || !backgroundId || !jewelryType) return;

    setStep("generating-hero");
    setError(null);
    setGenStatus(null);
    setHeroImage(null);
    setRestImages([]);
    setExpandedIndex(null);

    try {
      const rawBase64 = toRawBase64(imageBase64);
      const data = await api.post<{
        success: boolean;
        images?: { base64: string; mime_type: string; label: string }[];
        error?: string;
      }>("/jewelry/generate", {
        image_base64: rawBase64,
        jewelry_type: jewelryType,
        background: backgroundId,
        aspect_ratio_id: "square",
        step: "hero",
      });

      if (!data.success) throw new Error(data.error || "Generation failed");
      const images = (data.images ?? []).map((img) => ({
        label: img.label,
        base64: img.base64,
        mimeType: img.mime_type,
        dataUri: `data:${img.mime_type};base64,${img.base64}`,
      }));
      if (images.length > 0) {
        setHeroImage(images[0]);
        setStep("hero-done");
        setGenStatus(null);
        showToast(
          "Hero shot ready! Generate full pack to complete (40 tokens).",
          "success",
        );
        fetchCredits();
      } else {
        throw new Error("No image generated");
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      showToast(msg, "error");
      setStep("idle");
      setGenStatus(null);
    }
  }, [
    imageBase64,
    backgroundId,
    jewelryType,
    showToast,
    fetchCredits,
  ]);

  // Step 2: Generate full pack (40 tokens)
  const handleGenerateFullPack = useCallback(async () => {
    if (!imageBase64 || !backgroundId || !jewelryType) return;

    setStep("generating-rest");
    setError(null);
    setGenStatus(null);

    try {
      const rawBase64 = toRawBase64(imageBase64);
      const data = await api.post<{
        success: boolean;
        images?: { base64: string; mime_type: string; label: string }[];
        error?: string;
      }>("/jewelry/generate", {
        image_base64: rawBase64,
        jewelry_type: jewelryType,
        background: backgroundId,
        aspect_ratio_id: "square",
        step: "full_pack",
      });

      if (!data.success) throw new Error(data.error || "Generation failed");
      const images = (data.images ?? []).map((img) => ({
        label: img.label,
        base64: img.base64,
        mimeType: img.mime_type,
        dataUri: `data:${img.mime_type};base64,${img.base64}`,
      }));
      setHeroImage(images[0] ?? null);
      setRestImages(images.slice(1));
      setStep("all-done");
      setGenStatus(null);
      showToast("Pack complete!", "success");
      fetchCredits();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Generation failed";
      setError(msg);
      showToast(msg, "error");
      setStep("hero-done");
      setGenStatus(null);
    }
  }, [imageBase64, backgroundId, jewelryType, showToast, fetchCredits]);

  const handleRecolor = useCallback(
    async (index: number, targetMetal: string) => {
      const img = allImages[index];
      if (!img || recoloringIndex !== null || recoloringAll) return;

      setRecoloringIndex(index);
      setError(null);

      try {
        const data = await api.post<{
          success: boolean;
          images?: { base64: string; mime_type: string }[];
          image?: { base64: string; mime_type: string };
          error?: string;
        }>("/jewelry/recolor", {
          image_base64: toRawBase64(img.dataUri),
          target_metal: targetMetal,
          jewelry_type: jewelryType || "ring",
        });

        if (!data.success) throw new Error(data.error || "Recolor failed");

        const resultImg = data.images?.[0] ?? data.image;
        if (!resultImg) throw new Error("No image returned");

        const newUri = `data:${resultImg.mime_type};base64,${resultImg.base64}`;
        const updated: ResultImage = {
          ...img,
          base64: resultImg.base64,
          mimeType: resultImg.mime_type,
          dataUri: newUri,
          label: `${img.label.replace(/ \(.*\)$/, "")} (${targetMetal})`,
        };

        if (index === 0) {
          setHeroImage(updated);
        } else {
          setRestImages((prev) =>
            prev.map((r, i) => (i === index - 1 ? updated : r)),
          );
        }
        showToast("Recolor done!", "success");
        fetchCredits();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Recolor failed";
        setError(msg);
        showToast(msg, "error");
      } finally {
        setRecoloringIndex(null);
      }
    },
    [allImages, jewelryType, recoloringIndex, recoloringAll, showToast, fetchCredits],
  );

  const handleHdUpscale = useCallback(
    async (index: number) => {
      const img = allImages[index];
      if (!img || hdGeneratingIndex !== null) return;

      setHdGeneratingIndex(index);
      try {
        const data = await api.post<{
          success: boolean;
          images?: { base64: string; mime_type: string }[];
          error?: string;
        }>("/jewelry/hd-upscale", {
          image_base64: toRawBase64(img.dataUri),
        });

        if (!data.success) throw new Error(data.error || "HD upscale failed");
        const hdImg = data.images?.[0];
        if (!hdImg) throw new Error("No HD image returned");

        const newUri = `data:${hdImg.mime_type};base64,${hdImg.base64}`;
        const updated: ResultImage = {
          ...img,
          base64: hdImg.base64,
          mimeType: hdImg.mime_type,
          dataUri: newUri,
          label: `${img.label} (HD)`,
        };

        if (index === 0) {
          setHeroImage(updated);
        } else {
          setRestImages((prev) =>
            prev.map((r, i) => (i === index - 1 ? updated : r)),
          );
        }
        showToast("HD upscale complete!", "success");
        fetchCredits();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "HD upscale failed";
        showToast(msg, "error");
      } finally {
        setHdGeneratingIndex(null);
      }
    },
    [allImages, hdGeneratingIndex, showToast, fetchCredits],
  );

  const handleGenerateListing = useCallback(async () => {
    const img = heroImage ?? allImages[0];
    if (!img || listingLoading) return;

    setListingLoading(true);
    setError(null);
    setListing(null);

    try {
      const data = await api.post<{
        success: boolean;
        listing?: ListingData;
        error?: string;
      }>("/jewelry/listing", {
        image_base64: toRawBase64(img.dataUri),
        jewelry_type: jewelryType || "ring",
      });

      if (!data.success || !data.listing)
        throw new Error(data.error || "Listing generation failed");
      setListing(data.listing);
      showToast("Listing generated!", "success");
      fetchCredits();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Listing generation failed";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setListingLoading(false);
    }
  }, [heroImage, allImages, jewelryType, listingLoading, showToast, fetchCredits]);

  const downloadImage = useCallback((dataUri: string, label: string) => {
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = `jewelry-${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleDownloadAll = useCallback(() => {
    allImages.forEach((img, i) => {
      setTimeout(
        () => downloadImage(img.dataUri, img.label),
        i * 300,
      );
    });
  }, [allImages, downloadImage]);

  const isGenerating = step === "generating-hero" || step === "generating-rest";
  const hasResults = allImages.length > 0;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-gray-600">Please log in to use Jewelry Studio.</p>
        <a
          href="/login"
          className="px-6 py-3 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 transition-colors"
        >
          Log in
        </a>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90vw] max-w-md pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg border text-[13px] font-medium flex items-start gap-3 ${
                toast.type === "error"
                  ? "bg-red-50 border-red-200 text-red-700"
                  : toast.type === "warning"
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : toast.type === "success"
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-blue-50 border-blue-200 text-blue-700"
              }`}
            >
              <span className="flex-shrink-0 mt-0.5">
                {toast.type === "error"
                  ? "✕"
                  : toast.type === "warning"
                    ? "⚠"
                    : toast.type === "success"
                      ? "✓"
                      : "ℹ"}
              </span>
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() =>
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id))
                }
                className="flex-shrink-0 ml-1 text-current opacity-50 hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-lg text-gray-900">Jewelry Studio</h1>
          <div className="flex items-center gap-2">
            {(imageBase64 || hasResults) && (
              <button
                onClick={handleReset}
                className="px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Start over
              </button>
            )}
            {credits && (
              <button
                onClick={() => setShowPricing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-50 border border-pink-100 hover:bg-pink-100 transition-colors"
              >
                <span className="text-sm font-bold text-pink-600">
                  {credits.token_balance}
                </span>
                <span className="text-xs text-pink-500">tokens</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Pricing Modal */}
      {showPricing && credits && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPricing(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <button
              onClick={() => setShowPricing(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              ×
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Token Pricing
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Photo Pack (3 images)</span>
                <span className="font-semibold">{credits.pricing.photoPack} tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Recolor Single</span>
                <span className="font-semibold">{credits.pricing.recolorSingle} tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Recolor All</span>
                <span className="font-semibold">{credits.pricing.recolorAll} tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">HD Upscale</span>
                <span className="font-semibold">{credits.pricing.hdUpscale} tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Listing</span>
                <span className="font-semibold">{credits.pricing.listing} tokens</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Balance: <strong>{credits.token_balance} tokens</strong>
            </p>
          </div>
        </div>
      )}

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {hasResults && !isGenerating ? (
          /* Results View */
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-xs font-semibold text-pink-500 tracking-wider uppercase block mb-2">
                {step === "hero-done" ? "Preview" : "Results"}
              </span>
              <h2 className="font-bold text-xl sm:text-2xl text-gray-900 uppercase tracking-tight">
                {step === "hero-done"
                  ? "Hero Shot Preview"
                  : "Your Jewelry Collection"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {step === "hero-done"
                  ? "Review the hero shot, then generate the full pack"
                  : `${allImages.length} images — Hero, Alternate Angle, Close-up`}
              </p>
            </div>

            {/* Image Grid */}
            <div
              className={`grid gap-4 ${
                allImages.length === 1
                  ? "grid-cols-1 max-w-sm mx-auto"
                  : "grid-cols-1 sm:grid-cols-3"
              }`}
            >
              {allImages.map((img, idx) => (
                <ResultCard
                  key={idx}
                  img={img}
                  onDownload={() => downloadImage(img.dataUri, img.label)}
                  onRecolor={(metal) => handleRecolor(idx, metal)}
                  onHdUpscale={() => handleHdUpscale(idx)}
                  isRecoloring={recoloringIndex === idx}
                  isHdGenerating={hdGeneratingIndex === idx}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {step === "hero-done" && (
                <>
                  <button
                    onClick={handleGenerateFullPack}
                    className="w-full sm:w-auto px-6 py-3.5 bg-pink-500 text-white rounded-full font-semibold text-sm hover:bg-pink-600 transition-colors active:scale-[0.98]"
                  >
                    Generate Full Pack
                    <span className="ml-1.5 text-xs opacity-80">
                      ({credits?.pricing.photoPack ?? 40} tokens)
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setHeroImage(null);
                      setStep("idle");
                      setExpandedIndex(null);
                    }}
                    className="w-full sm:w-auto px-6 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-full font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Regenerate Hero
                  </button>
                </>
              )}
              {step === "all-done" && (
                <>
                  <button
                    onClick={handleDownloadAll}
                    className="w-full sm:w-auto px-6 py-3.5 bg-pink-500 text-white rounded-full font-semibold text-sm hover:bg-pink-600 transition-colors"
                  >
                    Download All ({allImages.length})
                  </button>
                  <button
                    onClick={() => {
                      setHeroImage(null);
                      setRestImages([]);
                      setStep("idle");
                      setExpandedIndex(null);
                    }}
                    className="w-full sm:w-auto px-6 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-full font-medium text-sm hover:bg-gray-50 transition-colors"
                  >
                    Try Another Background
                  </button>
                </>
              )}
            </div>

            {/* Recolor Section (all-done only) */}
            {step === "all-done" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <h3 className="font-bold text-gray-900">Recolor Metal</h3>
                <div className="flex flex-wrap gap-2">
                  {["Gold", "Silver", "Rose Gold"].map((metal) => (
                    <button
                      key={metal}
                      onClick={() => handleRecolor(0, metal)}
                      disabled={recoloringIndex !== null || recoloringAll}
                      className="px-4 py-2 rounded-full border border-gray-200 text-sm font-medium hover:bg-pink-50 hover:border-pink-200 transition-colors disabled:opacity-50"
                    >
                      {metal}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Recolor buttons apply to each image individually. Gold / Silver / Rose Gold — {credits?.pricing.recolorSingle ?? 7} tokens each.
                </p>
              </div>
            )}

            {/* HD Upscale */}
            {step === "all-done" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-3">HD Upscale</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Generate print-ready HD versions of any image ({credits?.pricing.hdUpscale ?? 10} tokens each).
                </p>
                <p className="text-xs text-gray-400">
                  Use the HD button on each image card above.
                </p>
              </div>
            )}

            {/* Generate Listing */}
            {step === "all-done" && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <h3 className="font-bold text-gray-900">Product Listing</h3>
                <p className="text-sm text-gray-500">
                  Generate SEO-friendly title, description, and attributes for your jewelry ({credits?.pricing.listing ?? 5} tokens).
                </p>
                <button
                  onClick={handleGenerateListing}
                  disabled={listingLoading}
                  className="px-6 py-3 bg-pink-500 text-white rounded-full font-semibold text-sm hover:bg-pink-600 transition-colors disabled:opacity-50"
                >
                  {listingLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    "Generate Listing"
                  )}
                </button>
                {listing && (
                  <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={listing.title}
                        onChange={(e) =>
                          setListing({ ...listing, title: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">
                        Description
                      </label>
                      <textarea
                        value={listing.description}
                        onChange={(e) =>
                          setListing({ ...listing, description: e.target.value })
                        }
                        rows={4}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : isGenerating ? (
          /* Generating State */
          <div className="flex flex-col items-center justify-center gap-6 py-24">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-2 border-gray-200 rounded-full" />
              <div className="absolute inset-0 border-2 border-transparent border-t-pink-500 rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <h2 className="font-bold text-lg text-gray-900">
                {step === "generating-hero"
                  ? "Generating Hero Shot"
                  : "Generating Full Pack"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {genStatus ?? "Creating your studio-quality photos..."}
              </p>
            </div>
          </div>
        ) : (
          /* Setup Flow */
          <div className="max-w-xl mx-auto space-y-8">
            <div className="text-center">
              <span className="text-xs font-semibold text-pink-500 tracking-wider uppercase block mb-2">
                AI Photography Studio
              </span>
              <h1 className="font-bold text-2xl sm:text-3xl text-gray-900 uppercase tracking-tight">
                Jewelry Photography
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                Ultra-high fidelity — every stone, every detail preserved
              </p>
            </div>

            {/* Step 1: Upload */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">
                    Upload Jewelry Photo
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Upload a clear, well-lit photo of your jewelry
                  </p>
                </div>
              </div>
              {imageBase64 ? (
                <div className="flex items-start gap-4 pl-0 sm:pl-10">
                  <div className="relative group">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-gray-200 bg-white">
                      <img
                        src={imageBase64}
                        alt="Jewelry"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setImageBase64(null);
                        setHeroImage(null);
                        setRestImages([]);
                        setStep("idle");
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-semibold text-gray-900">
                      Image uploaded
                    </p>
                    <button
                      onClick={() => {
                        setImageBase64(null);
                        setHeroImage(null);
                        setRestImages([]);
                        setStep("idle");
                      }}
                      className="text-sm text-pink-500 hover:underline"
                    >
                      Change photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pl-0 sm:pl-10">
                  <UploadZone onImageSelected={handleImageSelected} />
                </div>
              )}
            </section>

            {/* Step 2: Jewelry Type */}
            {imageBase64 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">
                    Jewelry Type
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 pl-0 sm:pl-10">
                  {JEWELRY_TYPES.map((t: JewelryTypeOption) => (
                    <button
                      key={t.id}
                      onClick={() => setJewelryType(t.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                        jewelryType === t.id
                          ? "bg-pink-500 text-white shadow-sm"
                          : "bg-white border border-gray-200 text-gray-600 hover:border-pink-300 hover:text-gray-900"
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Step 3: Background */}
            {imageBase64 && jewelryType && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">
                    Background
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pl-0 sm:pl-10">
                  {JEWELRY_BACKGROUNDS.map((bg: JewelryBackground) => (
                    <button
                      key={bg.id}
                      onClick={() => setBackgroundId(bg.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        backgroundId === bg.id
                          ? "bg-pink-500 text-white shadow-sm"
                          : "bg-white border border-gray-200 text-gray-600 hover:border-pink-300 hover:text-gray-900"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex-shrink-0 ${
                          backgroundId === bg.id
                            ? "border-2 border-white/40"
                            : "border border-gray-200"
                        }`}
                        style={{ backgroundColor: bg.swatch }}
                      />
                      <span className="text-left leading-tight">
                        {bg.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            {canGenerate && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleGenerateHero}
                  disabled={isGenerating}
                  className="w-full sm:w-auto px-10 py-4 bg-pink-500 text-white rounded-full font-semibold text-base hover:bg-pink-600 transition-colors disabled:opacity-50"
                >
                  Generate Hero Shot
                  <span className="block text-xs opacity-80 mt-0.5">
                    Free preview — no tokens charged
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function ResultCard({
  img,
  onDownload,
  onRecolor,
  onHdUpscale,
  isRecoloring,
  isHdGenerating,
}: {
  img: ResultImage;
  onDownload: () => void;
  onRecolor: (metal: string) => void;
  onHdUpscale: () => void;
  isRecoloring: boolean;
  isHdGenerating: boolean;
}) {
  const isBusy = isRecoloring || isHdGenerating;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <p className="text-xs font-semibold text-pink-500 uppercase tracking-wider text-center py-2 px-2">
        {img.label}
      </p>
      <div className="relative aspect-square bg-gray-50">
        {isBusy ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-gray-500">
              {isHdGenerating ? "HD upscaling..." : "Recoloring..."}
            </span>
          </div>
        ) : (
          <img
            src={img.dataUri}
            alt={img.label}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="p-3 space-y-2">
        <button
          onClick={onDownload}
          disabled={isBusy}
          className="w-full py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Download
        </button>
        <div className="flex gap-1">
          {["Gold", "Silver", "Rose Gold"].map((metal) => (
            <button
              key={metal}
              onClick={() => onRecolor(metal)}
              disabled={isBusy}
              className="flex-1 py-1.5 text-[10px] font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-pink-50 hover:border-pink-200 transition-colors disabled:opacity-50"
            >
              {metal}
            </button>
          ))}
        </div>
        <button
          onClick={onHdUpscale}
          disabled={isBusy}
          className="w-full py-2 text-xs font-semibold text-pink-500 bg-pink-50 border border-pink-100 rounded-lg hover:bg-pink-100 transition-colors disabled:opacity-50"
        >
          {isHdGenerating ? (
            <span className="flex items-center justify-center gap-1">
              <span className="w-3 h-3 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
              HD...
            </span>
          ) : (
            "HD Upscale"
          )}
        </button>
      </div>
    </div>
  );
}
