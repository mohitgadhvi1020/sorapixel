"use client";

import { useState, useCallback } from "react";
import UploadZone from "@/components/upload-zone";
import StylePresetGrid from "@/components/style-preset-grid";
import BeforeAfterSlider from "@/components/before-after-slider";
import InfoInputs from "@/components/info-inputs";
import LogoUpload from "@/components/logo-upload";
import PasswordGate from "@/components/password-gate";

type Step = "idle" | "generating-pack" | "pack-done" | "generating-info";

interface ResultImage {
  label: string;
  dataUri: string;
}

export default function StudioPage() {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [styleMode, setStyleMode] = useState<"preset" | "custom">("preset");
  const [customRawPrompt, setCustomRawPrompt] = useState("");
  const [customRefinedPrompt, setCustomRefinedPrompt] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [packImages, setPackImages] = useState<ResultImage[]>([]);
  const [infoImages, setInfoImages] = useState<ResultImage[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [expandedSource, setExpandedSource] = useState<"pack" | "info">("pack");
  const [error, setError] = useState<string | null>(null);

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
      const res = await fetch("/api/refine-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawPrompt: customRawPrompt }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to refine prompt");
      setCustomRefinedPrompt(data.refined);
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
      const payload: Record<string, string> = { imageBase64 };
      if (isCustom) {
        payload.customPrompt = customRefinedPrompt!;
      } else {
        payload.styleId = selectedStyle!;
      }
      if (logoBase64) payload.logoBase64 = logoBase64;

      const response = await fetch("/api/generate-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Generation failed");
      const images: ResultImage[] = data.images.map(
        (img: { label: string; base64: string; mimeType: string }) => ({
          label: img.label,
          dataUri: `data:${img.mimeType};base64,${img.base64}`,
        })
      );
      setPackImages(images);
      setStep("pack-done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("idle");
    }
  }, [imageBase64, selectedStyle, logoBase64, styleMode, customRefinedPrompt]);

  const handleGenerateInfo = useCallback(
    async (properties: string, dimensions: string) => {
      if (!imageBase64) return;
      setStep("generating-info");
      setError(null);
      try {
        const payload: Record<string, string> = { imageBase64, properties, dimensions };
        if (logoBase64) payload.logoBase64 = logoBase64;
        const response = await fetch("/api/generate-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error || "Generation failed");
        const images: ResultImage[] = data.images.map(
          (img: { label: string; base64: string; mimeType: string }) => ({
            label: img.label,
            dataUri: `data:${img.mimeType};base64,${img.base64}`,
          })
        );
        setInfoImages(images);
        setStep("pack-done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setStep("pack-done");
      }
    },
    [imageBase64, logoBase64]
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

  return (
    <PasswordGate>
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
          {(imageBase64 || hasResults) && (
            <button
              onClick={handleReset}
              className="text-sm text-[#8c8c8c] hover:text-[#1b1b1f] transition-colors duration-300"
            >
              Start over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* ---- RESULTS VIEW ---- */}
        {hasResults && (
          <div className="space-y-6 sm:space-y-10 animate-fade-in">
            <div className="text-center animate-slide-up">
              <h2 className="text-xl sm:text-2xl font-bold text-[#1b1b1f] tracking-tight">
                Your Marketplace Pack
              </h2>
              <p className="text-[#8c8c8c] text-sm sm:text-base mt-1">
                {allImages.length} image{allImages.length !== 1 ? "s" : ""}{" "}
                generated{logoBase64 ? " with brand logo" : ""} — tap any image to compare
              </p>
            </div>

            {/* Pack photos */}
            <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
              <h3 className="text-xs font-bold text-[#8b7355] uppercase tracking-widest mb-3 sm:mb-4">
                Product Photos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 stagger-children">
                {packImages.map((img, index) => (
                  <ImageCard
                    key={`pack-${index}`}
                    img={img}
                    onExpand={() => handleExpandImage(index, "pack")}
                    onDownload={() => downloadImage(img.dataUri, img.label)}
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

            {/* Brand Logo */}
            {imagePreview && (
              <section className="space-y-2 sm:space-y-3 animate-slide-up" style={{ animationDelay: "50ms" }}>
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-[#8b7355] tracking-widest uppercase mb-1.5 sm:mb-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    Brand Logo
                  </div>
                </div>
                <LogoUpload
                  logoPreview={logoBase64}
                  onLogoSelected={setLogoBase64}
                  onRemove={() => setLogoBase64(null)}
                />
              </section>
            )}

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

            {/* Generate */}
            {imagePreview && (
              (styleMode === "preset" && selectedStyle) ||
              (styleMode === "custom" && customRefinedPrompt)
            ) && (
              <div className="flex justify-center pt-2 sm:pt-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
                <button
                  onClick={handleGeneratePack}
                  disabled={isGenerating}
                  className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-gradient-to-r from-[#8b7355] to-[#6b5740] text-white rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 shadow-lg shadow-[#8b7355]/20 active:scale-[0.98] disabled:opacity-50 text-center"
                >
                  Generate Marketplace Pack
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
    </PasswordGate>
  );
}

/* Image card — touch-friendly on mobile */
function ImageCard({
  img,
  onExpand,
  onDownload,
}: {
  img: ResultImage;
  onExpand: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="group">
      <div className="text-xs sm:text-sm font-medium text-[#8c8c8c] mb-1.5 sm:mb-2 text-center">
        {img.label}
      </div>
      <div
        className="relative rounded-xl overflow-hidden border border-[#e8e5df] bg-white cursor-pointer card-hover shadow-sm"
        onClick={onExpand}
      >
        <img src={img.dataUri} alt={img.label} className="w-full aspect-square object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 flex items-end sm:items-center justify-center pb-3 sm:pb-0">
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
