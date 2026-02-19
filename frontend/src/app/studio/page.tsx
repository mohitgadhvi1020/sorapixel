"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import BottomNav from "@/components/shared/BottomNav";

// ─── Types ───

interface StudioCredits {
  token_balance: number;
  studio_free_used: number;
  free_remaining: number;
  is_free_tier: boolean;
  free_limit: number;
  tokens_per_image: number;
}

interface ResultImage {
  label: string;
  base64: string;
  mime_type: string;
}

const STYLE_PRESETS = [
  { id: "clean_white", label: "Clean White" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "luxury", label: "Luxury" },
  { id: "nature", label: "Nature" },
  { id: "minimal", label: "Minimal" },
  { id: "festive", label: "Festive" },
];

const ASPECT_RATIOS = [
  { id: "square", label: "Square" },
  { id: "portrait", label: "Portrait" },
  { id: "story", label: "Story" },
  { id: "landscape", label: "Landscape" },
  { id: "wide", label: "Wide" },
];

function extractBase64(dataUrl: string): string {
  const match = dataUrl.match(/^data:[\w/]+;base64,(.+)$/);
  return match ? match[1] : dataUrl;
}

export default function StudioPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [styleMode, setStyleMode] = useState<"preset" | "custom">("preset");
  const [customRawPrompt, setCustomRawPrompt] = useState("");
  const [customRefinedPrompt, setCustomRefinedPrompt] = useState<string | null>(null);
  const [customIsolate, setCustomIsolate] = useState(true);
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);
  const [isGeneratingInfo, setIsGeneratingInfo] = useState<string | null>(null);
  const [packImages, setPackImages] = useState<ResultImage[]>([]);
  const [infoImages, setInfoImages] = useState<ResultImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("square");
  const [credits, setCredits] = useState<StudioCredits | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.get<StudioCredits>("/studio/credits");
      setCredits(data);
    } catch {
      setCredits(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const canGenerate =
    credits &&
    credits.free_remaining + Math.floor(credits.token_balance / credits.tokens_per_image) >= 3;

  const handleImageSelected = useCallback((base64: string, preview: string) => {
    setImageBase64(base64);
    setImagePreview(preview);
    setPackImages([]);
    setInfoImages([]);
    setError(null);
  }, []);

  const handleRefinePrompt = useCallback(async () => {
    if (!customRawPrompt.trim() || isRefining) return;
    setIsRefining(true);
    setError(null);
    try {
      const data = await api.post<{
        success: boolean;
        refined?: string;
        isolate?: boolean;
      }>("/studio/refine-prompt", { raw_prompt: customRawPrompt.trim() });
      if (!data.success) throw new Error("Failed to refine prompt");
      setCustomRefinedPrompt(data.refined ?? null);
      setCustomIsolate(data.isolate !== false);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Failed to refine prompt");
    } finally {
      setIsRefining(false);
    }
  }, [customRawPrompt, isRefining]);

  const handleGeneratePack = useCallback(async () => {
    if (!imageBase64) return;
    const isCustom = styleMode === "custom";
    if (isCustom && !customRefinedPrompt) return;
    if (!isCustom && !selectedStyle) return;

    setIsGeneratingPack(true);
    setError(null);
    setPackImages([]);
    setInfoImages([]);

    try {
      const payload: Record<string, unknown> = {
        image_base64: extractBase64(imageBase64),
        aspect_ratio_id: aspectRatio,
        isolate_product: customIsolate,
      };
      if (isCustom) {
        payload.custom_prompt = customRefinedPrompt!;
      } else {
        payload.style = selectedStyle!;
      }

      const data = await api.post<{
        success: boolean;
        images?: ResultImage[];
        error?: string;
      }>("/studio/generate-pack", payload);

      if (!data.success) throw new Error(data.error || "Generation failed");
      setPackImages(data.images ?? []);
      fetchCredits();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : "Something went wrong");
    } finally {
      setIsGeneratingPack(false);
    }
  }, [
    imageBase64,
    selectedStyle,
    styleMode,
    customRefinedPrompt,
    aspectRatio,
    customIsolate,
    fetchCredits,
  ]);

  const handleGenerateInfo = useCallback(
    async (infoType: "features" | "dimensions") => {
      if (!imageBase64) return;
      setIsGeneratingInfo(infoType);
      setError(null);

      try {
        const data = await api.post<{
          success: boolean;
          images?: ResultImage[];
          error?: string;
        }>("/studio/generate-info", {
          image_base64: extractBase64(imageBase64),
          info_type: infoType,
          aspect_ratio_id: aspectRatio,
        });

        if (!data.success) throw new Error(data.error || "Generation failed");
        setInfoImages((prev) => [...prev, ...(data.images ?? [])]);
        fetchCredits();
      } catch (err) {
        setError(err instanceof ApiError ? String(err.message) : "Something went wrong");
      } finally {
        setIsGeneratingInfo(null);
      }
    },
    [imageBase64, aspectRatio, fetchCredits]
  );

  const handleReset = useCallback(() => {
    setImageBase64(null);
    setImagePreview(null);
    setSelectedStyle(null);
    setPackImages([]);
    setInfoImages([]);
    setError(null);
  }, []);

  const downloadImage = useCallback((base64: string, mimeType: string, label: string) => {
    const dataUri = `data:${mimeType};base64,${base64}`;
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = `sorapixel-${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const allImages = [...packImages, ...infoImages];

  const handleDownloadAll = useCallback(() => {
    allImages.forEach((img, i) => {
      setTimeout(
        () => downloadImage(img.base64, img.mime_type || "image/png", img.label),
        i * 300
      );
    });
  }, [allImages, downloadImage]);

  const hasResults = packImages.length > 0 || infoImages.length > 0;
  const isGenerating = isGeneratingPack || !!isGeneratingInfo;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-lg text-[var(--foreground)]">Studio</h1>
          <div className="flex items-center gap-2">
            {credits && (
              <div className="px-3 py-1.5 rounded-lg bg-pink-50 border border-pink-200">
                <span className="text-xs font-medium text-pink-600">
                  {credits.is_free_tier
                    ? `${credits.free_remaining} free left`
                    : `${credits.token_balance} tokens`}
                </span>
              </div>
            )}
            {(imageBase64 || hasResults) && (
              <button
                onClick={handleReset}
                className="text-sm text-[var(--muted)] hover:text-pink-500 transition-colors"
              >
                Start over
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Credits exhausted banner */}
      {credits && !canGenerate && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <p className="text-sm text-amber-800 font-medium">
              {credits.free_remaining === 0
                ? `You've used all ${credits.free_limit} free generations.`
                : "Need more credits for a pack of 3."}
            </p>
            <a
              href="/pricing"
              className="text-xs font-semibold text-white bg-pink-500 hover:bg-pink-600 px-4 py-1.5 rounded-full transition-colors"
            >
              View Plans
            </a>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Mobile credits badge */}
        {credits && (
          <div className="sm:hidden mb-4 flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-50 border border-pink-200">
              <span className="text-xs font-medium text-pink-600">
                {credits.is_free_tier
                  ? `${credits.free_remaining}/${credits.free_limit} free left`
                  : `${credits.token_balance} tokens`}
              </span>
            </div>
          </div>
        )}

        {/* RESULTS VIEW */}
        {hasResults && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center">
              <h2 className="text-xl font-bold text-[var(--foreground)]">Your Marketplace Pack</h2>
              <p className="text-[var(--muted)] text-sm mt-1">
                {allImages.length} image{allImages.length !== 1 ? "s" : ""} generated
              </p>
            </div>

            {/* Pack photos */}
            {packImages.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-pink-500 uppercase tracking-widest mb-3">
                  Product Photos
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {packImages.map((img, index) => (
                    <ImageCard
                      key={`pack-${index}`}
                      img={img}
                      onDownload={() => downloadImage(img.base64, img.mime_type || "image/png", img.label)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Info images */}
            {infoImages.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-pink-500 uppercase tracking-widest mb-3">
                  Product Info
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {infoImages.map((img, index) => (
                    <ImageCard
                      key={`info-${index}`}
                      img={img}
                      onDownload={() => downloadImage(img.base64, img.mime_type || "image/png", img.label)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Info generation buttons */}
            <div className="border border-[var(--border)] rounded-xl p-4 sm:p-6 bg-white space-y-4">
              <h3 className="text-xs font-bold text-pink-500 uppercase tracking-widest">
                Generate Info Images
              </h3>
              <p className="text-xs sm:text-sm text-[var(--muted)]">
                Create feature infographics or dimension diagrams from your product image.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleGenerateInfo("features")}
                  disabled={isGenerating || !canGenerate}
                  className="py-3 px-4 rounded-xl border-2 border-[var(--border)] bg-white hover:border-pink-300 hover:bg-pink-50 disabled:opacity-50 disabled:pointer-events-none font-medium text-sm transition-all"
                >
                  {isGeneratingInfo === "features" ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    "Features Infographic"
                  )}
                </button>
                <button
                  onClick={() => handleGenerateInfo("dimensions")}
                  disabled={isGenerating || !canGenerate}
                  className="py-3 px-4 rounded-xl border-2 border-[var(--border)] bg-white hover:border-pink-300 hover:bg-pink-50 disabled:opacity-50 disabled:pointer-events-none font-medium text-sm transition-all"
                >
                  {isGeneratingInfo === "dimensions" ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    "Dimensions Diagram"
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleDownloadAll}
                className="px-6 py-3 bg-pink-500 text-white rounded-xl font-medium hover:bg-pink-600 transition-all"
              >
                Download All ({allImages.length})
              </button>
              <button
                onClick={() => {
                  setPackImages([]);
                  setInfoImages([]);
                  setError(null);
                }}
                className="px-6 py-3 bg-white text-[var(--foreground)] rounded-xl font-medium border border-[var(--border)] hover:bg-pink-50 transition-all"
              >
                Try Another Style
              </button>
            </div>
          </div>
        )}

        {/* GENERATING */}
        {isGeneratingPack && !hasResults && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-pink-100 mb-5">
              <div className="w-7 h-7 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Creating your Marketplace Pack
            </h2>
            <p className="text-[var(--muted)] text-sm mt-2">
              Generating 3 images — hero, alternate angle, and close-up
            </p>
            <p className="text-[var(--muted)] text-xs mt-4">This takes 15–30 seconds</p>
          </div>
        )}

        {/* UPLOAD / IDLE */}
        {!isGeneratingPack && !hasResults && (
          <div className="space-y-8">
            {/* Step 1: Image Upload */}
            <section className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-pink-500 tracking-widest uppercase mb-1">
                <span className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center text-[10px]">
                  1
                </span>
                Product Image
              </div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">
                {imagePreview ? "Image uploaded" : "Upload your product image"}
              </h2>
              <p className="text-xs text-[var(--muted)]">Upload a photo of your product</p>

              {imagePreview ? (
                <div className="flex items-start gap-3">
                  <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-xl overflow-hidden border border-[var(--border)] bg-white flex-shrink-0">
                    <img src={imagePreview} alt="Uploaded product" className="w-full h-full object-contain" />
                  </div>
                  <button
                    onClick={() => {
                      setImageBase64(null);
                      setImagePreview(null);
                    }}
                    className="text-sm text-[var(--muted)] hover:text-pink-500 transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <UploadZone onImageSelected={handleImageSelected} />
              )}
            </section>

            {/* Step 2: Style */}
            {imagePreview && (
              <section className="space-y-3">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-pink-500 tracking-widest uppercase mb-1">
                  <span className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center text-[10px]">
                    2
                  </span>
                  Style
                </div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">Choose a style</h2>
                <p className="text-xs text-[var(--muted)]">Select a preset or describe your own scene</p>

                <div className="flex bg-pink-50 rounded-lg p-1 w-fit">
                  <button
                    onClick={() => {
                      setStyleMode("preset");
                      setCustomRefinedPrompt(null);
                    }}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      styleMode === "preset"
                        ? "bg-white text-pink-600 shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    Presets
                  </button>
                  <button
                    onClick={() => {
                      setStyleMode("custom");
                      setSelectedStyle(null);
                    }}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      styleMode === "custom"
                        ? "bg-white text-pink-600 shadow-sm"
                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {styleMode === "preset" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {STYLE_PRESETS.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          selectedStyle === style.id
                            ? "border-pink-500 bg-pink-50 shadow-sm"
                            : "border-[var(--border)] bg-white hover:border-pink-200"
                        }`}
                      >
                        <span className="text-sm font-semibold text-[var(--foreground)]">
                          {style.label}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={customRawPrompt}
                      onChange={(e) => {
                        setCustomRawPrompt(e.target.value);
                        setCustomRefinedPrompt(null);
                      }}
                      placeholder='Describe your scene... e.g. "on a beach at sunset" or "make it look premium"'
                      rows={3}
                      disabled={isRefining}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white text-[var(--foreground)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-500 resize-none disabled:opacity-50"
                    />
                    <button
                      onClick={handleRefinePrompt}
                      disabled={!customRawPrompt.trim() || isRefining}
                      className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                        customRawPrompt.trim() && !isRefining
                          ? "bg-pink-100 text-pink-600 hover:bg-pink-200"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isRefining ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                          Refining...
                        </span>
                      ) : (
                        "Refine with AI"
                      )}
                    </button>
                    {customRefinedPrompt && (
                      <div className="p-4 rounded-xl bg-pink-50/50 border border-pink-200">
                        <p className="text-xs font-bold text-pink-600 uppercase tracking-wider mb-1">
                          AI-Refined Scene
                        </p>
                        <p className="text-sm text-[var(--foreground)]">{customRefinedPrompt}</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Aspect Ratio */}
            {imagePreview &&
              ((styleMode === "preset" && selectedStyle) || (styleMode === "custom" && customRefinedPrompt)) && (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Aspect Ratio</h3>
                  <p className="text-xs text-[var(--muted)]">Choose a format for your target platform</p>
                  <div className="flex flex-wrap gap-2">
                    {ASPECT_RATIOS.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setAspectRatio(r.id)}
                        className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          aspectRatio === r.id
                            ? "border-pink-500 bg-pink-50 text-pink-600"
                            : "border-[var(--border)] bg-white text-[var(--muted)] hover:border-pink-200"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

            {/* Generate */}
            {imagePreview &&
              ((styleMode === "preset" && selectedStyle) || (styleMode === "custom" && customRefinedPrompt)) && (
                <div className="flex justify-center pt-4">
                  {credits && !canGenerate ? (
                    <a
                      href="/pricing"
                      className="w-full sm:w-auto px-8 py-4 bg-pink-500 text-white rounded-xl font-semibold text-center hover:bg-pink-600 transition-colors"
                    >
                      Buy Tokens to Generate
                    </a>
                  ) : (
                    <button
                      onClick={handleGeneratePack}
                      disabled={isGenerating}
                      className="w-full sm:w-auto px-8 py-4 bg-pink-500 text-white rounded-xl font-semibold hover:bg-pink-600 disabled:opacity-50 transition-all"
                    >
                      Generate Marketplace Pack
                    </button>
                  )}
                </div>
              )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

// ─── Upload Zone ───

function UploadZone({ onImageSelected }: { onImageSelected: (base64: string, preview: string) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onImageSelected(dataUrl, dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [onImageSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => fileRef.current?.click()}
      className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
        isDragging ? "border-pink-500 bg-pink-50 scale-[1.01]" : "border-[var(--border)] hover:border-pink-300 hover:bg-pink-50/30"
      }`}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-3">
        <div
          className={`w-14 h-14 rounded-xl flex items-center justify-center ${
            isDragging ? "bg-pink-500 text-white" : "bg-pink-100 text-pink-500"
          }`}
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Drop your product image here</p>
          <p className="text-xs text-[var(--muted)] mt-1">or tap to browse — PNG, JPG</p>
        </div>
      </div>
    </div>
  );
}

// ─── Image Card ───

function ImageCard({ img, onDownload }: { img: ResultImage; onDownload: () => void }) {
  const dataUri = `data:${img.mime_type || "image/png"};base64,${img.base64}`;
  return (
    <div className="group">
      <div className="text-xs font-medium text-[var(--muted)] mb-1.5 text-center">{img.label}</div>
      <div className="relative overflow-hidden bg-white rounded-xl border border-[var(--border)] shadow-sm">
        <div style={{ paddingBottom: "100%" }} className="relative w-full">
          <img
            src={dataUri}
            alt={img.label}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </div>
      <button
        onClick={onDownload}
        className="mt-2 w-full py-2.5 text-sm font-medium text-[var(--muted)] bg-white border border-[var(--border)] rounded-lg hover:bg-pink-50 hover:text-pink-600 transition-all"
      >
        Download
      </button>
    </div>
  );
}
