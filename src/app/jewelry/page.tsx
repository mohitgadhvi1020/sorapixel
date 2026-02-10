"use client";

import { useState, useCallback, useRef } from "react";
import UploadZone from "@/components/upload-zone";
import BeforeAfterSlider from "@/components/before-after-slider";
import LogoUpload from "@/components/logo-upload";
import PasswordGate from "@/components/password-gate";
import AspectRatioSelector from "@/components/aspect-ratio-selector";
import { getRatioById, DEFAULT_RATIO } from "@/lib/aspect-ratios";
import { safeFetch } from "@/lib/safe-fetch";
import {
  JEWELRY_TYPES,
  JEWELRY_BACKGROUNDS,
  JewelryTypeOption,
  JewelryBackground,
} from "@/lib/jewelry-styles";

type Step =
  | "idle"
  | "generating-pack"
  | "pack-done"
  | "tryon-upload"
  | "generating-tryon"
  | "tryon-done";

interface ResultImage {
  label: string;
  dataUri: string;
}

export default function JewelryPage() {
  // Upload
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  // Selection
  const [jewelryType, setJewelryType] = useState<string | null>(null);
  const [backgroundId, setBackgroundId] = useState<string | null>(null);
  const [customBackground, setCustomBackground] = useState("");
  const [bgMode, setBgMode] = useState<"preset" | "custom">("preset");
  const [aspectRatio, setAspectRatio] = useState("square");

  // Generation
  const [step, setStep] = useState<Step>("idle");
  const [packImages, setPackImages] = useState<ResultImage[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Try-on
  const [personBase64, setPersonBase64] = useState<string | null>(null);
  const [tryonResult, setTryonResult] = useState<string | null>(null);

  // Recolor
  const [recolorTarget, setRecolorTarget] = useState("");
  const [recoloringIndex, setRecoloringIndex] = useState<number | null>(null);

  const currentRatio = getRatioById(aspectRatio) || DEFAULT_RATIO;
  const personInputRef = useRef<HTMLInputElement>(null);

  // ─── Handlers ────────────────────────────────────────────────

  const handleImageSelected = useCallback(
    (base64: string, preview: string) => {
      setImageBase64(base64);
      setImagePreview(preview);
      setPackImages([]);
      setError(null);
      setStep("idle");
      setExpandedIndex(null);
      setTryonResult(null);
      setPersonBase64(null);
    },
    []
  );

  const handleReset = useCallback(() => {
    setImageBase64(null);
    setImagePreview(null);
    setJewelryType(null);
    setBackgroundId(null);
    setCustomBackground("");
    setPackImages([]);
    setError(null);
    setStep("idle");
    setExpandedIndex(null);
    setTryonResult(null);
    setPersonBase64(null);
  }, []);

  const handleGeneratePack = useCallback(async () => {
    if (!imageBase64) return;

    const hasBg =
      bgMode === "custom"
        ? customBackground.trim().length > 0
        : !!backgroundId;
    if (!hasBg) return;

    setStep("generating-pack");
    setError(null);
    setPackImages([]);
    setExpandedIndex(null);
    setTryonResult(null);
    setPersonBase64(null);

    try {
      const payload: Record<string, unknown> = {
        imageBase64,
        aspectRatioId: aspectRatio,
      };
      if (bgMode === "custom") {
        payload.customBackground = customBackground.trim();
      } else {
        payload.backgroundId = backgroundId!;
      }
      if (logoBase64) payload.logoBase64 = logoBase64;

      const data = await safeFetch<{
        success: boolean;
        images?: { label: string; base64: string; mimeType: string }[];
        error?: string;
      }>("/api/generate-jewelry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!data.success) throw new Error(data.error || "Generation failed");
      const images: ResultImage[] = (data.images ?? []).map((img) => ({
        label: img.label,
        dataUri: `data:${img.mimeType};base64,${img.base64}`,
      }));
      setPackImages(images);
      setStep("pack-done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("idle");
    }
  }, [imageBase64, backgroundId, customBackground, bgMode, logoBase64, aspectRatio]);

  const handlePersonUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setPersonBase64(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleGenerateTryon = useCallback(async () => {
    if (!imageBase64 || !personBase64 || !jewelryType) return;
    setStep("generating-tryon");
    setError(null);
    setTryonResult(null);

    try {
      const data = await safeFetch<{
        success: boolean;
        image?: { base64: string; mimeType: string };
        error?: string;
      }>("/api/generate-jewelry-tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jewelryBase64: imageBase64,
          personBase64,
          jewelryType,
          aspectRatioId: aspectRatio,
        }),
      });

      if (!data.success || !data.image)
        throw new Error(data.error || "Try-on failed");
      setTryonResult(
        `data:${data.image.mimeType};base64,${data.image.base64}`
      );
      setStep("tryon-done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Try-on failed");
      setStep("pack-done");
    }
  }, [imageBase64, personBase64, jewelryType, aspectRatio]);

  const downloadImage = useCallback((dataUri: string, label: string) => {
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = `sorapixel-jewelry-${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleDownloadAll = useCallback(() => {
    packImages.forEach((img, i) => {
      setTimeout(() => downloadImage(img.dataUri, img.label), i * 300);
    });
  }, [packImages, downloadImage]);

  const handleRecolor = useCallback(
    async (index: number) => {
      if (!recolorTarget.trim() || recoloringIndex !== null) return;
      const img = packImages[index];
      if (!img) return;

      setRecoloringIndex(index);
      setError(null);

      try {
        const data = await safeFetch<{
          success: boolean;
          image?: { base64: string; mimeType: string };
          error?: string;
        }>("/api/recolor-jewelry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: img.dataUri,
            targetColor: recolorTarget.trim(),
            aspectRatioId: aspectRatio,
          }),
        });

        if (!data.success || !data.image)
          throw new Error(data.error || "Recolor failed");

        const newImages = [...packImages];
        newImages[index] = {
          label: `${img.label} (${recolorTarget.trim()})`,
          dataUri: `data:${data.image.mimeType};base64,${data.image.base64}`,
        };
        setPackImages(newImages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Recolor failed");
      } finally {
        setRecoloringIndex(null);
      }
    },
    [packImages, recolorTarget, recoloringIndex, aspectRatio]
  );

  const expandedImage =
    expandedIndex !== null ? packImages[expandedIndex] : null;

  const isGenerating =
    step === "generating-pack" || step === "generating-tryon";
  const hasResults = packImages.length > 0;

  const canGenerate =
    !!imageBase64 &&
    !!jewelryType &&
    (bgMode === "custom"
      ? customBackground.trim().length > 0
      : !!backgroundId);

  // ─── Render ──────────────────────────────────────────────────

  return (
    <PasswordGate>
      <div className="min-h-screen bg-[#fafaf8]">
        {/* Header */}
        <header className="glass border-b border-[#e8e5df] sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 group">
              <img
                src="/logo.png"
                alt="SoraPixel"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain transition-transform duration-300 group-hover:scale-105"
              />
              <span className="font-semibold text-base sm:text-lg tracking-tight text-[#1b1b1f]">
                SoraPixel
              </span>
            </a>
            <div className="flex items-center gap-3 sm:gap-4">
              <a
                href="/studio"
                className="text-sm text-[#8c8c8c] hover:text-[#1b1b1f] transition-colors duration-300"
              >
                Studio
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
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {/* ── Results View ── */}
          {hasResults && step !== "generating-pack" ? (
            <div className="space-y-6 sm:space-y-8">
              {/* Title */}
              <div className="text-center animate-fade-in">
                <h1 className="text-xl sm:text-3xl font-bold text-[#1b1b1f] tracking-tight">
                  Your Jewelry Collection
                </h1>
                <p className="text-sm sm:text-base text-[#8c8c8c] mt-1">
                  {packImages.length} images generated — tap any image to
                  compare
                </p>
              </div>

              {/* Image Grid */}
              <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
                <h3 className="text-xs font-bold text-[#8b7355] uppercase tracking-widest mb-3 sm:mb-4">
                  Jewelry Photos
                </h3>
                <div
                  className={`grid gap-4 sm:gap-5 stagger-children ${
                    currentRatio.ratio[1] > currentRatio.ratio[0]
                      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
                      : "grid-cols-1 sm:grid-cols-3 lg:grid-cols-5"
                  }`}
                >
                  {packImages.map((img, index) => (
                    <ImageCard
                      key={index}
                      img={img}
                      onExpand={() =>
                        setExpandedIndex(
                          expandedIndex === index ? null : index
                        )
                      }
                      onDownload={() =>
                        downloadImage(img.dataUri, img.label)
                      }
                      ratioW={currentRatio.ratio[0]}
                      ratioH={currentRatio.ratio[1]}
                      circular={currentRatio.circular}
                    />
                  ))}
                </div>
              </div>

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

              {/* Actions */}
              <div
                className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 animate-slide-up"
                style={{ animationDelay: "200ms" }}
              >
                <button
                  onClick={handleDownloadAll}
                  className="px-6 py-3 bg-[#1b1b1f] text-white rounded-xl font-medium hover:bg-[#2d2d33] transition-all duration-300 active:scale-[0.97] text-center"
                >
                  Download All ({packImages.length})
                </button>
                <button
                  onClick={() => {
                    setStep("tryon-upload");
                    setTryonResult(null);
                    setPersonBase64(null);
                  }}
                  className="px-6 py-3 bg-white border border-[#e8e5df] text-[#1b1b1f] rounded-xl font-medium hover:bg-[#f5f0e8] transition-all duration-300 active:scale-[0.97] text-center"
                >
                  Virtual Try-On
                </button>
                <button
                  onClick={() => {
                    setPackImages([]);
                    setStep("idle");
                    setExpandedIndex(null);
                  }}
                  className="px-6 py-3 bg-white border border-[#e8e5df] text-[#8c8c8c] rounded-xl font-medium hover:bg-[#f5f0e8] hover:text-[#1b1b1f] transition-all duration-300 active:scale-[0.97] text-center"
                >
                  Try Another Background
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 text-[#8c8c8c] text-sm hover:text-[#1b1b1f] transition-colors duration-300 text-center"
                >
                  Start over
                </button>
              </div>

              {/* ── Recolor Section ── */}
              <div className="space-y-4 border-t border-[#e8e5df] pt-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#1b1b1f]">
                    Recolor Metal
                  </h2>
                  <p className="text-xs sm:text-sm text-[#8c8c8c] mt-1">
                    Change the metal color of any image — enter a hex code (e.g. #FFD700) or describe the color (e.g. &quot;rose gold&quot;, &quot;antique bronze&quot;)
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      value={recolorTarget}
                      onChange={(e) => setRecolorTarget(e.target.value)}
                      placeholder="#FFD700 or rose gold, matte black, antique silver..."
                      className="w-full rounded-xl border border-[#e8e5df] bg-white px-4 py-3 text-sm text-[#1b1b1f] placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#8b7355] transition-colors duration-300"
                    />
                  </div>
                  {recolorTarget.trim() && (
                    <div className="flex items-center gap-2">
                      {/* Color preview if hex */}
                      {/^#[0-9a-fA-F]{3,8}$/.test(recolorTarget.trim()) && (
                        <div
                          className="w-9 h-9 rounded-lg border border-[#e8e5df] flex-shrink-0"
                          style={{ backgroundColor: recolorTarget.trim() }}
                        />
                      )}
                    </div>
                  )}
                </div>
                {recolorTarget.trim() && (
                  <div className={`grid gap-3 ${packImages.length > 3 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-1 sm:grid-cols-3"}`}>
                    {packImages.map((img, index) => (
                      <button
                        key={`recolor-${index}`}
                        onClick={() => handleRecolor(index)}
                        disabled={recoloringIndex !== null}
                        className={`px-3 py-2.5 rounded-lg border text-xs sm:text-sm font-medium transition-all duration-200 active:scale-[0.97] text-center ${
                          recoloringIndex === index
                            ? "border-[#8b7355] bg-[#f5f0e8] text-[#8b7355]"
                            : "border-[#e8e5df] bg-white text-[#8c8c8c] hover:border-[#c4a67d] hover:text-[#1b1b1f]"
                        } disabled:opacity-50`}
                      >
                        {recoloringIndex === index ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-[#8b7355] border-t-transparent rounded-full animate-spin" />
                            Recoloring...
                          </span>
                        ) : (
                          `Recolor: ${img.label}`
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Try-On Section ── */}
              {(step === "tryon-upload" ||
                step === "generating-tryon" ||
                step === "tryon-done") && (
                <div className="space-y-5 border-t border-[#e8e5df] pt-6">
                  <h2 className="text-lg sm:text-xl font-bold text-[#1b1b1f]">
                    Virtual Try-On
                  </h2>

                  {/* Try-on result */}
                  {tryonResult && (
                    <div className="space-y-4 animate-scale-in">
                      <div className="max-w-md mx-auto rounded-xl overflow-hidden border border-[#e8e5df] shadow-sm">
                        <img
                          src={tryonResult}
                          alt="Try-on result"
                          className="w-full"
                        />
                      </div>
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() =>
                            downloadImage(tryonResult, "jewelry-tryon")
                          }
                          className="px-6 py-2.5 bg-[#1b1b1f] text-white rounded-xl font-medium hover:bg-[#2d2d33] transition-all duration-300 active:scale-[0.97]"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => {
                            setTryonResult(null);
                            setPersonBase64(null);
                            setStep("tryon-upload");
                          }}
                          className="px-6 py-2.5 bg-white border border-[#e8e5df] text-[#8c8c8c] rounded-xl font-medium hover:bg-[#f5f0e8] hover:text-[#1b1b1f] transition-all duration-300 active:scale-[0.97]"
                        >
                          Try Another
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Generating spinner */}
                  {step === "generating-tryon" && (
                    <div className="flex flex-col items-center gap-3 py-10 animate-fade-in">
                      <div className="w-10 h-10 border-3 border-[#8b7355] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-[#8c8c8c]">
                        Generating try-on...
                      </p>
                    </div>
                  )}

                  {/* Person upload */}
                  {step === "tryon-upload" && (
                    <div className="space-y-4">
                      <p className="text-sm text-[#8c8c8c]">
                        Upload a photo of the person to try on the jewelry
                      </p>
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        <div className="flex-1">
                          {personBase64 ? (
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-24 rounded-xl overflow-hidden border border-[#e8e5df]">
                                <img
                                  src={personBase64}
                                  alt="Person"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <button
                                onClick={() => setPersonBase64(null)}
                                className="text-sm text-[#8c8c8c] hover:text-red-500 transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <input
                                ref={personInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handlePersonUpload(f);
                                }}
                              />
                              <button
                                onClick={() => personInputRef.current?.click()}
                                className="px-5 py-3 bg-white border-2 border-dashed border-[#e8e5df] rounded-xl text-sm text-[#8c8c8c] hover:border-[#8b7355] hover:text-[#8b7355] transition-all duration-300 w-full sm:w-auto"
                              >
                                Upload Person Photo
                              </button>
                              <input
                                type="file"
                                accept="image/*"
                                capture="user"
                                className="hidden"
                                id="jewelry-selfie"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handlePersonUpload(f);
                                }}
                              />
                              <label
                                htmlFor="jewelry-selfie"
                                className="block sm:inline-block px-5 py-3 bg-white border-2 border-dashed border-[#e8e5df] rounded-xl text-sm text-[#8c8c8c] hover:border-[#8b7355] hover:text-[#8b7355] transition-all duration-300 cursor-pointer text-center sm:ml-2"
                              >
                                Take Selfie
                              </label>
                            </div>
                          )}
                        </div>
                        {personBase64 && (
                          <button
                            onClick={handleGenerateTryon}
                            className="px-8 py-3.5 bg-gradient-to-r from-[#8b7355] to-[#6b5740] text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-[#8b7355]/20 active:scale-[0.98]"
                          >
                            Generate Try-On
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : /* ── Generating State (pack only) ── */
          step === "generating-pack" ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 sm:py-32 animate-fade-in">
              <div className="w-12 h-12 border-3 border-[#8b7355] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm sm:text-base text-[#8c8c8c]">
                Generating 5 jewelry images...
              </p>
              <p className="text-xs text-[#b0b0b0]">
                This may take up to 2 minutes
              </p>
            </div>
          ) : (
            /* ── Setup Flow ── */
            <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8">
              {/* Title */}
              <div className="text-center animate-fade-in">
                <h1 className="text-2xl sm:text-4xl font-bold text-[#1b1b1f] tracking-tight">
                  Jewelry Photography
                </h1>
                <p className="text-sm sm:text-base text-[#8c8c8c] mt-2">
                  Ultra-high fidelity — every stone, every detail preserved
                </p>
              </div>

              {/* Step 1: Upload */}
              <section className="space-y-3 animate-slide-up">
                <h3 className="text-sm font-semibold text-[#1b1b1f]">
                  1. Upload Jewelry Photo
                </h3>
                {imagePreview ? (
                  <div className="flex items-start gap-3 sm:gap-4 animate-scale-in">
                    <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-xl overflow-hidden border border-[#e8e5df] bg-white shadow-sm flex-shrink-0">
                      <img
                        src={imagePreview}
                        alt="Uploaded jewelry"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setImageBase64(null);
                        setImagePreview(null);
                      }}
                      className="text-sm text-[#8c8c8c] hover:text-red-500 transition-colors duration-300 mt-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <UploadZone onImageSelected={handleImageSelected} />
                )}
              </section>

              {/* Step 2: Jewelry Type */}
              {imagePreview && (
                <section
                  className="space-y-3 animate-slide-up"
                  style={{ animationDelay: "50ms" }}
                >
                  <h3 className="text-sm font-semibold text-[#1b1b1f]">
                    2. Jewelry Type
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {JEWELRY_TYPES.map((t: JewelryTypeOption) => (
                      <button
                        key={t.id}
                        onClick={() => setJewelryType(t.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
                          jewelryType === t.id
                            ? "border-[#8b7355] bg-[#f5f0e8] text-[#1b1b1f] shadow-sm shadow-[#8b7355]/10"
                            : "border-[#e8e5df] bg-white text-[#8c8c8c] hover:border-[#c4a67d]"
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
              {imagePreview && jewelryType && (
                <section
                  className="space-y-3 animate-slide-up"
                  style={{ animationDelay: "100ms" }}
                >
                  <h3 className="text-sm font-semibold text-[#1b1b1f]">
                    3. Background
                  </h3>

                  {/* Preset / Custom toggle */}
                  <div className="flex bg-[#f5f0e8] rounded-lg p-1 w-fit">
                    <button
                      onClick={() => {
                        setBgMode("preset");
                        setCustomBackground("");
                      }}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                        bgMode === "preset"
                          ? "bg-white text-[#1b1b1f] shadow-sm"
                          : "text-[#8c8c8c]"
                      }`}
                    >
                      Presets
                    </button>
                    <button
                      onClick={() => {
                        setBgMode("custom");
                        setBackgroundId(null);
                      }}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                        bgMode === "custom"
                          ? "bg-white text-[#1b1b1f] shadow-sm"
                          : "text-[#8c8c8c]"
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {bgMode === "preset" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {JEWELRY_BACKGROUNDS.map((bg: JewelryBackground) => (
                        <button
                          key={bg.id}
                          onClick={() => setBackgroundId(bg.id)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all duration-200 active:scale-[0.97] ${
                            backgroundId === bg.id
                              ? "border-[#8b7355] bg-[#f5f0e8] text-[#1b1b1f] shadow-sm shadow-[#8b7355]/10"
                              : "border-[#e8e5df] bg-white text-[#8c8c8c] hover:border-[#c4a67d]"
                          }`}
                        >
                          <div
                            className="w-5 h-5 rounded-full border border-[#e8e5df] flex-shrink-0"
                            style={{ backgroundColor: bg.swatch }}
                          />
                          <span className="text-left leading-tight text-xs sm:text-sm">
                            {bg.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <textarea
                        value={customBackground}
                        onChange={(e) => setCustomBackground(e.target.value)}
                        placeholder='Describe your background... e.g. "on a bed of pink rose petals with soft golden light"'
                        rows={3}
                        className="w-full rounded-xl border border-[#e8e5df] bg-white px-4 py-3 text-sm text-[#1b1b1f] placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#8b7355] transition-colors duration-300 resize-none"
                      />
                    </div>
                  )}
                </section>
              )}

              {/* Step 4: Logo (optional) */}
              {imagePreview && jewelryType && (
                <section
                  className="animate-slide-up"
                  style={{ animationDelay: "120ms" }}
                >
                  <LogoUpload
                    logoPreview={logoBase64}
                    onLogoSelected={setLogoBase64}
                    onRemove={() => setLogoBase64(null)}
                  />
                </section>
              )}

              {/* Step 5: Aspect Ratio */}
              {canGenerate && (
                <section
                  className="space-y-3 animate-slide-up"
                  style={{ animationDelay: "150ms" }}
                >
                  <div>
                    <h3 className="text-sm font-semibold text-[#1b1b1f] mb-1">
                      4. Aspect Ratio
                    </h3>
                    <p className="text-xs text-[#8c8c8c]">
                      Choose a format for your target platform
                    </p>
                  </div>
                  <AspectRatioSelector
                    selectedId={aspectRatio}
                    onSelect={setAspectRatio}
                  />
                </section>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-slide-up-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* Generate Button */}
              {canGenerate && (
                <div
                  className="flex justify-center pt-2 sm:pt-4 animate-slide-up"
                  style={{ animationDelay: "200ms" }}
                >
                  <button
                    onClick={handleGeneratePack}
                    disabled={isGenerating}
                    className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-gradient-to-r from-[#8b7355] to-[#6b5740] text-white rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 shadow-lg shadow-[#8b7355]/20 active:scale-[0.98] disabled:opacity-50 text-center"
                  >
                    Generate Jewelry Collection
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

/* ─── Image Card ─────────────────────────────────────────────── */
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
        className={`relative overflow-hidden bg-white cursor-pointer card-hover shadow-sm ${
          circular
            ? "rounded-full border-2 border-[#e8e5df] mx-auto"
            : "rounded-xl border border-[#e8e5df]"
        }`}
        style={circular ? { width: "100%", maxWidth: 280 } : undefined}
        onClick={onExpand}
      >
        <div
          style={{ paddingBottom: `${(ratioH / ratioW) * 100}%` }}
          className="relative w-full"
        >
          <img
            src={img.dataUri}
            alt={img.label}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <div
          className={`absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 flex items-end sm:items-center justify-center pb-3 sm:pb-0 ${
            circular ? "rounded-full" : ""
          }`}
        >
          <span className="sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-all duration-300 bg-white/90 text-[#1b1b1f] text-xs font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-sm backdrop-blur-sm">
            Tap to compare
          </span>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDownload();
        }}
        className="mt-2 sm:mt-2.5 w-full py-2.5 sm:py-2 text-sm font-medium text-[#8c8c8c] bg-white border border-[#e8e5df] rounded-lg hover:bg-[#f5f0e8] hover:text-[#8b7355] transition-all duration-300 active:scale-[0.98]"
      >
        Download
      </button>
    </div>
  );
}
