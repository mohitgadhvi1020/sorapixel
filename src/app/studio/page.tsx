"use client";

import { useState, useCallback, useEffect } from "react";
import UploadZone from "@/components/upload-zone";
import StylePresetGrid from "@/components/style-preset-grid";
import BeforeAfterSlider from "@/components/before-after-slider";
import InfoInputs from "@/components/info-inputs";
import AspectRatioSelector from "@/components/aspect-ratio-selector";
import { getRatioById, DEFAULT_RATIO } from "@/lib/aspect-ratios";
import { safeFetch } from "@/lib/safe-fetch";

interface StudioCredits {
  freeUsed: number;
  freeRemaining: number;
  tokenBalance: number;
  canGenerate: boolean;
  usingFree: boolean;
  freeLimit: number;
  tokensPerImage: number;
}

type Step = "idle" | "generating-pack" | "pack-done" | "generating-info";

interface ResultImage {
  label: string;
  dataUri: string;
  previewUri: string;
}

export default function StudioPage() {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [styleMode, setStyleMode] = useState<"preset" | "custom">("preset");
  const [customRawPrompt, setCustomRawPrompt] = useState("");
  const [customRefinedPrompt, setCustomRefinedPrompt] = useState<string | null>(null);
  const [customIsolate, setCustomIsolate] = useState(true);
  const [isRefining, setIsRefining] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [packImages, setPackImages] = useState<ResultImage[]>([]);
  const [infoImages, setInfoImages] = useState<ResultImage[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [expandedSource, setExpandedSource] = useState<"pack" | "info">("pack");
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("square");
  const [credits, setCredits] = useState<StudioCredits | null>(null);
  const [showPricing, setShowPricing] = useState(false);

  const currentRatio = getRatioById(aspectRatio) || DEFAULT_RATIO;

  const fetchCredits = useCallback(async () => {
    try {
      const data = await safeFetch<StudioCredits & { error?: string }>("/api/studio-credits");
      if (!data.error) setCredits(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCredits(); }, [fetchCredits]);
  const allImages = [...packImages, ...infoImages];

  const handleImageSelected = useCallback(
    (base64: string, preview: string) => {
      setImageBase64(base64);
      setImagePreview(preview);
      setPackImages([]);
      setInfoImages([]);
      setError(null);
      setStep("idle");
      setExpandedIndex(null);
    },
    []
  );

  const handleRefinePrompt = useCallback(async () => {
    if (!customRawPrompt.trim() || isRefining) return;
    setIsRefining(true);
    setError(null);
    try {
      const data = await safeFetch<{ success: boolean; refined?: string; isolate?: boolean; error?: string }>("/api/refine-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawPrompt: customRawPrompt }),
      });
      if (!data.success) throw new Error(data.error || "Failed to refine prompt");
      setCustomRefinedPrompt(data.refined ?? null);
      setCustomIsolate(data.isolate !== false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refine prompt");
    } finally {
      setIsRefining(false);
    }
  }, [customRawPrompt, isRefining]);

  const handleGeneratePack = useCallback(async () => {
    if (!imageBase64) return;

    // Determine what to send
    const isCustom = styleMode === "custom";
    if (isCustom && !customRefinedPrompt) return;
    if (!isCustom && !selectedStyle) return;

    setStep("generating-pack");
    setError(null);
    setPackImages([]);
    setInfoImages([]);
    setExpandedIndex(null);
    try {
      const payload: Record<string, unknown> = { imageBase64 };
      if (isCustom) {
        payload.customPrompt = customRefinedPrompt!;
        payload.customIsolate = customIsolate;
      } else {
        payload.styleId = selectedStyle!;
      }
      payload.aspectRatioId = aspectRatio;

      const data = await safeFetch<{ success: boolean; images?: { label: string; base64: string; watermarkedBase64?: string; mimeType: string }[]; error?: string }>("/api/generate-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!data.success) throw new Error(data.error || "Generation failed");
      const images: ResultImage[] = (data.images ?? []).map(
        (img) => ({
          label: img.label,
          dataUri: `data:${img.mimeType};base64,${img.base64}`,
          previewUri: img.watermarkedBase64
            ? `data:image/png;base64,${img.watermarkedBase64}`
            : `data:${img.mimeType};base64,${img.base64}`,
        })
      );
      setPackImages(images);
      setStep("pack-done");
      fetchCredits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("idle");
    }
  }, [imageBase64, selectedStyle, styleMode, customRefinedPrompt, aspectRatio, fetchCredits]);

  const handleGenerateInfo = useCallback(
    async (properties: string, dimensions: string) => {
      if (!imageBase64) return;
      setStep("generating-info");
      setError(null);
      try {
        const payload: Record<string, string> = { imageBase64, properties, dimensions };
        payload.aspectRatioId = aspectRatio;
        const data = await safeFetch<{ success: boolean; images?: { label: string; base64: string; watermarkedBase64?: string; mimeType: string }[]; error?: string }>("/api/generate-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!data.success) throw new Error(data.error || "Generation failed");
        const images: ResultImage[] = (data.images ?? []).map(
          (img) => ({
            label: img.label,
            dataUri: `data:${img.mimeType};base64,${img.base64}`,
            previewUri: img.watermarkedBase64
              ? `data:image/png;base64,${img.watermarkedBase64}`
              : `data:${img.mimeType};base64,${img.base64}`,
          })
        );
        setInfoImages(images);
        setStep("pack-done");
        fetchCredits();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStep("pack-done");
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
    setStep("idle");
    setExpandedIndex(null);
  }, []);

  const downloadImage = useCallback((dataUri: string, label: string) => {
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = `sorapixel-${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleDownloadAll = useCallback(() => {
    allImages.forEach((img, i) => {
      setTimeout(() => downloadImage(img.dataUri, img.label), i * 300);
    });
  }, [allImages, downloadImage]);

  const handleExpandImage = useCallback(
    (index: number, source: "pack" | "info") => {
      if (expandedIndex === index && expandedSource === source) {
        setExpandedIndex(null);
      } else {
        setExpandedIndex(index);
        setExpandedSource(source);
      }
    },
    [expandedIndex, expandedSource]
  );

  const expandedImage =
    expandedIndex !== null
      ? expandedSource === "pack"
        ? packImages[expandedIndex]
        : infoImages[expandedIndex]
      : null;

  const isGenerating = step === "generating-pack" || step === "generating-info";
  const hasResults = packImages.length > 0;

  const handleLogout = useCallback(async () => {
    document.cookie = "sb-session=; path=/; max-age=0";
    window.location.href = "/login?redirect=/studio";
  }, []);

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* Header */}
      <header className="glass border-b border-[#e8e5df] sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 group">
            <img src="/logo.png" alt="SoraPixel" className="w-7 h-7 sm:w-8 sm:h-8 object-contain transition-transform duration-300 group-hover:scale-105" />
            <span className="font-semibold text-base sm:text-lg tracking-tight text-[#1b1b1f]">
              SoraPixel
            </span>
          </a>
          <div className="flex items-center gap-3 sm:gap-4">
            <a
              href="/jewelry"
              className="text-sm text-[#8c8c8c] hover:text-[#1b1b1f] transition-colors duration-300"
            >
              Jewelry
            </a>
            <a
              href="/tryon"
              className="text-sm text-[#8c8c8c] hover:text-[#1b1b1f] transition-colors duration-300"
            >
              Try-On
            </a>
            {(imageBase64 || hasResults) && (
              <button
                onClick={handleReset}
                className="text-sm text-[#8c8c8c] hover:text-[#1b1b1f] transition-colors duration-300"
              >
                Start over
              </button>
            )}
            {credits && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5f0e8] border border-[#e8e5df]">
                {credits.usingFree ? (
                  <span className="text-xs font-medium text-[#8b7355]">
                    {credits.freeRemaining} free left
                  </span>
                ) : (
                  <span className="text-xs font-medium text-[#8b7355]">
                    {credits.tokenBalance} tokens
                  </span>
                )}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-[#8c8c8c] hover:text-red-500 transition-colors duration-300"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Credits exhausted banner */}
      {credits && !credits.canGenerate && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm text-amber-800 font-medium text-center sm:text-left">
              You&apos;ve used all {credits.freeLimit} free image generations. Purchase tokens to continue.
            </p>
            <button
              onClick={() => setShowPricing(true)}
              className="text-xs font-semibold text-white bg-[#8b7355] hover:bg-[#6b5740] px-4 py-1.5 rounded-full transition-colors whitespace-nowrap"
            >
              View Plans
            </button>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Mobile credits badge */}
        {credits && (
          <div className="sm:hidden mb-4 flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5f0e8] border border-[#e8e5df]">
              {credits.usingFree ? (
                <span className="text-xs font-medium text-[#8b7355]">
                  {credits.freeRemaining}/{credits.freeLimit} free generations left
                </span>
              ) : credits.tokenBalance > 0 ? (
                <span className="text-xs font-medium text-[#8b7355]">
                  {credits.tokenBalance} tokens remaining
                </span>
              ) : (
                <span className="text-xs font-medium text-red-600">
                  No credits remaining
                </span>
              )}
            </div>
          </div>
        )}

        {/* ---- RESULTS VIEW ---- */}
        {hasResults && (
          <div className="space-y-6 sm:space-y-10 animate-fade-in">
            <div className="text-center animate-slide-up">
              <h2 className="text-xl sm:text-2xl font-bold text-[#1b1b1f] tracking-tight">
                Your Marketplace Pack
              </h2>
              <p className="text-[#8c8c8c] text-sm sm:text-base mt-1">
                {allImages.length} image{allImages.length !== 1 ? "s" : ""}{" "}
                generated — tap any image to compare
              </p>
            </div>

            {/* Pack photos */}
            <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
              <h3 className="text-xs font-bold text-[#8b7355] uppercase tracking-widest mb-3 sm:mb-4">
                Product Photos
              </h3>
              <div className={`grid gap-4 sm:gap-5 stagger-children ${currentRatio.ratio[1] > currentRatio.ratio[0] ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
                {packImages.map((img, index) => (
                  <ImageCard
                    key={`pack-${index}`}
                    img={img}
                    onExpand={() => handleExpandImage(index, "pack")}
                    onDownload={() => downloadImage(img.dataUri, img.label)}
                    ratioW={currentRatio.ratio[0]}
                    ratioH={currentRatio.ratio[1]}
                    circular={currentRatio.circular}
                  />
                ))}
              </div>
            </div>

            {/* Info images */}
            {infoImages.length > 0 && (
              <div className="animate-slide-up">
                <h3 className="text-xs font-bold text-[#8b7355] uppercase tracking-widest mb-3 sm:mb-4">
                  Product Info
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 stagger-children">
                  {infoImages.map((img, index) => (
                    <ImageCard
                      key={`info-${index}`}
                      img={img}
                      onExpand={() => handleExpandImage(index, "info")}
                      onDownload={() => downloadImage(img.dataUri, img.label)}
                      ratioW={currentRatio.ratio[0]}
                      ratioH={currentRatio.ratio[1]}
                      circular={currentRatio.circular}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Expanded slider */}
            {expandedImage && imagePreview && (
              <div className="space-y-3 animate-scale-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-semibold text-[#1b1b1f]">
                    Comparing: {expandedImage.label}
                  </h3>
                  <button
                    onClick={() => setExpandedIndex(null)}
                    className="text-sm text-[#8c8c8c] hover:text-[#1b1b1f] transition-colors duration-300"
                  >
                    Close
                  </button>
                </div>
                <div className="w-full max-w-2xl mx-auto">
                  <BeforeAfterSlider
                    beforeSrc={imagePreview}
                    afterSrc={expandedImage.dataUri}
                    ratio={`${currentRatio.ratio[0]} / ${currentRatio.ratio[1]}`}
                  />
                </div>
              </div>
            )}

            {/* Info inputs */}
            {step === "pack-done" && (
              <div className="animate-slide-up">
                <InfoInputs onGenerate={handleGenerateInfo} isGenerating={false} />
              </div>
            )}
            {step === "generating-info" && (
              <div className="animate-slide-up">
                <InfoInputs onGenerate={() => {}} isGenerating={true} />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-slide-up-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 animate-slide-up" style={{ animationDelay: "200ms" }}>
              <button
                onClick={handleDownloadAll}
                className="px-6 py-3 bg-[#1b1b1f] text-white rounded-xl font-medium hover:bg-[#2d2d33] transition-all duration-300 active:scale-[0.97] text-center"
              >
                Download All ({allImages.length})
              </button>
              <button
                onClick={() => {
                  setPackImages([]);
                  setInfoImages([]);
                  setStep("idle");
                  setError(null);
                  setExpandedIndex(null);
                }}
                className="px-6 py-3 bg-white text-[#1b1b1f] rounded-xl font-medium border border-[#e8e5df] hover:bg-[#f5f0e8] transition-all duration-300 active:scale-[0.97] text-center"
              >
                Try Another Style
              </button>
            </div>
          </div>
        )}

        {/* ---- GENERATING PACK ---- */}
        {step === "generating-pack" && (
          <div className="text-center py-16 sm:py-24 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#f5f0e8] mb-5 sm:mb-6">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#8b7355] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b1b1f] tracking-tight">
              Creating your Marketplace Pack
            </h2>
            <p className="text-[#8c8c8c] text-sm sm:text-base mt-2">
              Generating 3 images — hero, alternate angle, and close-up
            </p>
            <div className="mt-5 sm:mt-6 w-40 sm:w-48 h-1.5 mx-auto rounded-full overflow-hidden bg-[#e8e5df]">
              <div className="h-full rounded-full animate-shimmer" />
            </div>
            <p className="text-[#b0b0b0] text-xs sm:text-sm mt-3 sm:mt-4">This takes 15-30 seconds</p>
          </div>
        )}

        {/* ---- IDLE / UPLOAD ---- */}
        {step === "idle" && !hasResults && (
          <div className="space-y-8 sm:space-y-10">
            {/* Step 1: Product Image */}
            <section className="space-y-3 sm:space-y-4 animate-slide-up">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold text-[#8b7355] tracking-widest uppercase mb-1.5 sm:mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#f5f0e8] flex items-center justify-center text-[10px] font-bold">1</span>
                  Product Image
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-[#1b1b1f]">
                  {imagePreview ? "Image uploaded" : "Upload your product image"}
                </h2>
                <p className="text-xs sm:text-sm text-[#8c8c8c] mt-0.5 sm:mt-1">
                  Upload a photo of your kitchenware product
                </p>
              </div>

              {imagePreview ? (
                <div className="flex items-start gap-3 sm:gap-4 animate-scale-in">
                  <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-xl overflow-hidden border border-[#e8e5df] bg-white shadow-sm flex-shrink-0">
                    <img src={imagePreview} alt="Uploaded product" className="w-full h-full object-contain" />
                  </div>
                  <button
                    onClick={() => { setImageBase64(null); setImagePreview(null); }}
                    className="text-xs sm:text-sm text-[#8c8c8c] hover:text-[#1b1b1f] mt-1 sm:mt-2 transition-colors duration-300"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <UploadZone onImageSelected={handleImageSelected} />
              )}
            </section>


            {/* Step 2: Style Selection */}
            {imagePreview && (
              <section className="space-y-3 sm:space-y-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-[#8b7355] tracking-widest uppercase mb-1.5 sm:mb-2">
                    <span className="w-5 h-5 rounded-full bg-[#f5f0e8] flex items-center justify-center text-[10px] font-bold">2</span>
                    Style
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#1b1b1f]">Choose a style</h2>
                  <p className="text-xs sm:text-sm text-[#8c8c8c] mt-0.5 sm:mt-1">
                    Select a preset or describe your own scene
                  </p>
                </div>

                {/* Preset / Custom toggle */}
                <div className="flex bg-[#f5f0e8] rounded-lg p-1 w-fit">
                  <button
                    onClick={() => { setStyleMode("preset"); setCustomRefinedPrompt(null); }}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      styleMode === "preset"
                        ? "bg-white text-[#1b1b1f] shadow-sm"
                        : "text-[#8c8c8c] hover:text-[#1b1b1f]"
                    }`}
                  >
                    Presets
                  </button>
                  <button
                    onClick={() => { setStyleMode("custom"); setSelectedStyle(null); }}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      styleMode === "custom"
                        ? "bg-white text-[#1b1b1f] shadow-sm"
                        : "text-[#8c8c8c] hover:text-[#1b1b1f]"
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {styleMode === "preset" ? (
                  <StylePresetGrid selectedId={selectedStyle} onSelect={setSelectedStyle} />
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <textarea
                        value={customRawPrompt}
                        onChange={(e) => {
                          setCustomRawPrompt(e.target.value);
                          setCustomRefinedPrompt(null);
                        }}
                        placeholder="Describe your scene... e.g. &quot;on a beach at sunset&quot; or &quot;make it look premium and luxurious&quot;"
                        rows={3}
                        disabled={isRefining}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-[#e8e5df] bg-white text-[#1b1b1f] text-sm placeholder:text-[#c0bdb7] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/30 focus:border-[#8b7355] resize-none disabled:opacity-50 transition-all duration-300"
                      />
                    </div>
                    <button
                      onClick={handleRefinePrompt}
                      disabled={!customRawPrompt.trim() || isRefining}
                      className={`
                        px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300
                        ${customRawPrompt.trim() && !isRefining
                          ? "bg-[#f5f0e8] text-[#8b7355] hover:bg-[#ede8df] active:scale-[0.98]"
                          : "bg-[#f0f0ee] text-[#b0b0b0] cursor-not-allowed"
                        }
                      `}
                    >
                      {isRefining ? (
                        <span className="inline-flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Refining...
                        </span>
                      ) : (
                        "Refine with AI"
                      )}
                    </button>

                    {/* Show refined result */}
                    {customRefinedPrompt && (
                      <div className="p-3 sm:p-4 rounded-xl bg-[#f5f0e8]/50 border border-[#e8e5df] animate-slide-up-sm">
                        <p className="text-[10px] sm:text-xs font-bold text-[#8b7355] uppercase tracking-widest mb-1.5">
                          AI-Refined Scene
                        </p>
                        <p className="text-sm text-[#1b1b1f] leading-relaxed">
                          {customRefinedPrompt}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-slide-up-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Aspect Ratio */}
            {imagePreview && (
              (styleMode === "preset" && selectedStyle) ||
              (styleMode === "custom" && customRefinedPrompt)
            ) && (
              <section className="space-y-3 animate-slide-up" style={{ animationDelay: "150ms" }}>
                <div>
                  <h3 className="text-sm font-semibold text-[#1b1b1f] mb-1">Aspect Ratio</h3>
                  <p className="text-xs text-[#8c8c8c]">Choose a format for your target platform</p>
                </div>
                <AspectRatioSelector selectedId={aspectRatio} onSelect={setAspectRatio} />
              </section>
            )}

            {/* Generate */}
            {imagePreview && (
              (styleMode === "preset" && selectedStyle) ||
              (styleMode === "custom" && customRefinedPrompt)
            ) && (
              <div className="flex justify-center pt-2 sm:pt-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
                {credits && !credits.canGenerate ? (
                  <button
                    onClick={() => setShowPricing(true)}
                    className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 shadow-lg shadow-amber-500/20 active:scale-[0.98] text-center"
                  >
                    Buy Tokens to Generate
                  </button>
                ) : (
                  <button
                    onClick={handleGeneratePack}
                    disabled={isGenerating}
                    className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-gradient-to-r from-[#8b7355] to-[#6b5740] text-white rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 shadow-lg shadow-[#8b7355]/20 active:scale-[0.98] disabled:opacity-50 text-center"
                  >
                    Generate Marketplace Pack
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Pricing Modal ─── */
const TOKEN_BUNDLES = [
  { tokens: 50, price: 500, perToken: 10, label: "Starter" },
  { tokens: 100, price: 800, perToken: 8, label: "Popular", popular: true },
  { tokens: 200, price: 1500, perToken: 7.5, label: "Pro" },
  { tokens: 500, price: 3000, perToken: 6, label: "Business", best: true },
];

function PricingModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="p-6 sm:p-8">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#f5f0e8] text-[#8b7355] hover:bg-[#e8e0d0] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5f0e8] text-[#8b7355] text-xs font-semibold uppercase tracking-wider mb-3">
              Token Packs
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b1b1f] tracking-tight">
              Continue Creating
            </h2>
            <p className="text-sm text-[#8c8c8c] mt-1.5">
              1 token = 1 image &middot; Buy more, save more
            </p>
          </div>

          {/* Bundles */}
          <div className="space-y-3">
            {TOKEN_BUNDLES.map((bundle) => (
              <div
                key={bundle.tokens}
                className={`relative rounded-xl border-2 p-4 transition-all duration-200 ${
                  bundle.popular
                    ? "border-[#8b7355] bg-[#fdfbf7] shadow-md"
                    : "border-[#e8e5df] bg-white hover:border-[#d4c5a9]"
                }`}
              >
                {bundle.popular && (
                  <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-[#8b7355] text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                    Most Popular
                  </span>
                )}
                {bundle.best && (
                  <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-[#0a0a0a] text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                    Best Value
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-[#1b1b1f]">{bundle.tokens} Tokens</span>
                      <span className="text-xs text-[#8c8c8c]">{bundle.label}</span>
                    </div>
                    <p className="text-xs text-[#8c8c8c] mt-0.5">
                      ₹{bundle.perToken}/token &middot; ~{Math.floor(bundle.tokens / 3)} packs of 3
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-[#1b1b1f]">₹{bundle.price.toLocaleString()}</div>
                    {bundle.perToken < 10 && (
                      <div className="text-[10px] font-medium text-green-600">
                        Save {Math.round((1 - bundle.perToken / 10) * 100)}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-6 text-center space-y-3">
            <a
              href="https://wa.me/916351068776?text=Hi%2C%20I%27d%20like%20to%20purchase%20tokens%20for%20SoraPixel%20Studio."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#25D366] text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg shadow-[#25D366]/20 hover:bg-[#1fb855] hover:shadow-xl active:scale-[0.98]"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Chat on WhatsApp to Purchase
            </a>
            <p className="text-[11px] text-[#b0b0b0]">
              Tokens are added to your account instantly after payment confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Image card — touch-friendly on mobile, respects aspect ratio */
function ImageCard({
  img,
  onExpand,
  onDownload,
  ratioW,
  ratioH,
  circular,
}: {
  img: ResultImage;
  onExpand: () => void;
  onDownload: () => void;
  ratioW: number;
  ratioH: number;
  circular?: boolean;
}) {
  return (
    <div className="group">
      <div className="text-xs sm:text-sm font-medium text-[#8c8c8c] mb-1.5 sm:mb-2 text-center">
        {img.label}
      </div>
      <div
        className={`relative overflow-hidden bg-white cursor-pointer card-hover shadow-sm ${circular ? "rounded-full border-2 border-[#e8e5df] mx-auto" : "rounded-xl border border-[#e8e5df]"}`}
        style={circular ? { width: "100%", maxWidth: 280 } : undefined}
        onClick={onExpand}
      >
        <div style={{ paddingBottom: `${(ratioH / ratioW) * 100}%` }} className="relative w-full">
          <img
            src={img.previewUri || img.dataUri}
            alt={img.label}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 flex items-end sm:items-center justify-center pb-3 sm:pb-0 ${circular ? "rounded-full" : ""}`}>
          <span className="sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-all duration-300 bg-white/90 text-[#1b1b1f] text-xs font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-sm backdrop-blur-sm">
            Tap to compare
          </span>
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDownload(); }}
        className="mt-2 sm:mt-2.5 w-full py-2.5 sm:py-2 text-sm font-medium text-[#8c8c8c] bg-white border border-[#e8e5df] rounded-lg hover:bg-[#f5f0e8] hover:text-[#8b7355] transition-all duration-300 active:scale-[0.98]"
      >
        Download
      </button>
    </div>
  );
}
