"use client";

import { useState, useCallback } from "react";
import UploadZone from "@/components/upload-zone";
import BeforeAfterSlider from "@/components/before-after-slider";
import PasswordGate from "@/components/password-gate";
import { safeFetch } from "@/lib/safe-fetch";
import {
  JEWELRY_TYPES,
  JEWELRY_BACKGROUNDS,
  JewelryTypeOption,
  JewelryBackground,
} from "@/lib/jewelry-styles";

type Step =
  | "idle"
  | "generating-hero"
  | "hero-done"
  | "generating-rest"
  | "all-done";

interface ResultImage {
  label: string;
  dataUri: string;
  previewUri: string;
}

export default function JewelryPage() {
  // Upload — single image
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // Selection
  const [jewelryType, setJewelryType] = useState<string | null>(null);
  const [backgroundId, setBackgroundId] = useState<string | null>(null);
  // Custom background disabled — only presets

  // Generation
  const [step, setStep] = useState<Step>("idle");
  const [heroImage, setHeroImage] = useState<ResultImage | null>(null);
  const [restImages, setRestImages] = useState<ResultImage[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Regenerate single
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // Recolor
  const [recolorTarget, setRecolorTarget] = useState("");
  const [recoloringIndex, setRecoloringIndex] = useState<number | null>(null);
  const [recoloringAll, setRecoloringAll] = useState(false);

  // Listing rewriter
  const [rawTitle, setRawTitle] = useState("");
  const [rawDescription, setRawDescription] = useState("");
  const [listingLoading, setListingLoading] = useState(false);
  const [listing, setListing] = useState<{
    title: string;
    description: string;
    metaDescription: string;
    altText: string;
    attributes: {
      material: string;
      stone: string;
      color: string;
      collection: string;
      occasion: string;
      style: string;
      productType: string;
    };
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Convenience
  const allImages: ResultImage[] = heroImage
    ? [heroImage, ...restImages]
    : [];

  // ─── Handlers ────────────────────────────────────────────────

  const handleImageSelected = useCallback(
    (base64: string, _preview: string) => {
      setImageBase64(base64);
      setHeroImage(null);
      setRestImages([]);
      setError(null);
      setStep("idle");
      setExpandedIndex(null);
    },
    []
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
    setRawTitle("");
    setRawDescription("");
  }, []);

  const buildPayload = useCallback((): Record<string, unknown> => ({
    imageBase64: imageBase64!,
    aspectRatioId: "square",
    backgroundId: backgroundId!,
  }), [imageBase64, backgroundId]);

  // Step 1: Generate ONLY the hero shot
  const handleGenerateHero = useCallback(async () => {
    if (!imageBase64) return;
    if (!backgroundId) return;

    setStep("generating-hero");
    setError(null);
    setHeroImage(null);
    setRestImages([]);
    setExpandedIndex(null);

    try {
      const payload = buildPayload();
      payload.onlyHero = true;

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
      const images = (data.images ?? []).map((img: { label: string; base64: string; watermarkedBase64?: string; mimeType: string }) => ({
        label: img.label,
        dataUri: `data:${img.mimeType};base64,${img.base64}`,
        previewUri: img.watermarkedBase64
          ? `data:${img.mimeType};base64,${img.watermarkedBase64}`
          : `data:${img.mimeType};base64,${img.base64}`,
      }));
      if (images.length > 0) {
        setHeroImage(images[0]);
        setStep("hero-done");
      } else {
        throw new Error("No image generated");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("idle");
    }
  }, [imageBase64, backgroundId, buildPayload]);

  // Step 2: Generate remaining images (Close-up crop + Alternate Angle)
  const handleGenerateRest = useCallback(async () => {
    if (!imageBase64) return;

    setStep("generating-rest");
    setError(null);

    try {
      const payload = buildPayload();
      payload.onlyRest = true;
      // Send hero image so the close-up is cropped from the studio-lit hero
      if (heroImage) {
        payload.heroBase64 = heroImage.dataUri;
      }

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
      const images = (data.images ?? []).map((img: { label: string; base64: string; watermarkedBase64?: string; mimeType: string }) => ({
        label: img.label,
        dataUri: `data:${img.mimeType};base64,${img.base64}`,
        previewUri: img.watermarkedBase64
          ? `data:${img.mimeType};base64,${img.watermarkedBase64}`
          : `data:${img.mimeType};base64,${img.base64}`,
      }));
      setRestImages(images);
      setStep("all-done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("hero-done");
    }
  }, [imageBase64, heroImage, buildPayload]);

  const downloadImage = useCallback((dataUri: string, label: string) => {
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = `sorapixel-jewelry-${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleDownloadAll = useCallback(() => {
    allImages.forEach((img, i) => {
      setTimeout(() => downloadImage(img.dataUri, img.label), i * 300);
    });
  }, [allImages, downloadImage]);

  // Regenerate a single image
  const handleRegenerateSingle = useCallback(async (index: number) => {
    if (!imageBase64 || !backgroundId || regeneratingIndex !== null) return;

    // Map index to regenerateSingle key
    const labelMap: Record<number, string> = {};
    allImages.forEach((img, i) => {
      if (img.label.startsWith("Hero")) labelMap[i] = "hero";
      else if (img.label.startsWith("Close")) labelMap[i] = "closeup";
      else if (img.label.startsWith("Alternate")) labelMap[i] = "angle";
    });

    const singleKey = labelMap[index];
    if (!singleKey) return;

    setRegeneratingIndex(index);
    setError(null);

    try {
      const payload = buildPayload();
      payload.regenerateSingle = singleKey;
      if (heroImage) {
        payload.heroBase64 = heroImage.dataUri;
      }

      const data = await safeFetch<{
        success: boolean;
        images?: { label: string; base64: string; watermarkedBase64?: string; mimeType: string }[];
        error?: string;
      }>("/api/generate-jewelry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!data.success || !data.images?.length) throw new Error(data.error || "Regeneration failed");

      const newImg = data.images[0];
      const updated: ResultImage = {
        label: newImg.label,
        dataUri: `data:${newImg.mimeType};base64,${newImg.base64}`,
        previewUri: newImg.watermarkedBase64
          ? `data:${newImg.mimeType};base64,${newImg.watermarkedBase64}`
          : `data:${newImg.mimeType};base64,${newImg.base64}`,
      };

      if (index === 0) {
        setHeroImage(updated);
      } else {
        setRestImages((prev) =>
          prev.map((r, i) => (i === index - 1 ? updated : r))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegeneratingIndex(null);
    }
  }, [imageBase64, backgroundId, heroImage, allImages, regeneratingIndex, buildPayload]);

  // Recolor a single image
  const handleRecolor = useCallback(
    async (index: number) => {
      if (!recolorTarget.trim() || recoloringIndex !== null || recoloringAll) return;
      const img = allImages[index];
      if (!img) return;

      setRecoloringIndex(index);
      setError(null);

      try {
        const data = await safeFetch<{
          success: boolean;
          image?: { base64: string; watermarkedBase64?: string; mimeType: string };
          error?: string;
        }>("/api/recolor-jewelry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: img.dataUri,
            targetColor: recolorTarget.trim(),
            aspectRatioId: "square",
          }),
        });

        if (!data.success || !data.image)
          throw new Error(data.error || "Recolor failed");

        const newUri = `data:${data.image.mimeType};base64,${data.image.base64}`;
        const newPreview = data.image.watermarkedBase64
          ? `data:${data.image.mimeType};base64,${data.image.watermarkedBase64}`
          : newUri;
        const newLabel = `${img.label} (${recolorTarget.trim()})`;
        if (index === 0) {
          setHeroImage({ label: newLabel, dataUri: newUri, previewUri: newPreview });
        } else {
          setRestImages((prev) =>
            prev.map((r, i) => (i === index - 1 ? { label: newLabel, dataUri: newUri, previewUri: newPreview } : r))
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Recolor failed");
      } finally {
        setRecoloringIndex(null);
      }
    },
    [allImages, recolorTarget, recoloringIndex, recoloringAll]
  );

  // Recolor ALL images at once
  const handleRecolorAll = useCallback(async () => {
    if (!recolorTarget.trim() || recoloringAll || recoloringIndex !== null) return;
    if (allImages.length === 0) return;

    setRecoloringAll(true);
    setError(null);

    try {
      const results = await Promise.all(
        allImages.map((img) =>
          safeFetch<{
            success: boolean;
            image?: { base64: string; watermarkedBase64?: string; mimeType: string };
            error?: string;
          }>("/api/recolor-jewelry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: img.dataUri,
              targetColor: recolorTarget.trim(),
              aspectRatioId: "square",
            }),
          })
        )
      );

      const colorLabel = recolorTarget.trim();
      results.forEach((data, i) => {
        if (data.success && data.image) {
          const newUri = `data:${data.image.mimeType};base64,${data.image.base64}`;
          const newPreview = data.image.watermarkedBase64
            ? `data:${data.image.mimeType};base64,${data.image.watermarkedBase64}`
            : newUri;
          const newLabel = `${allImages[i].label.replace(/ \(.*\)$/, "")} (${colorLabel})`;
          if (i === 0) {
            setHeroImage({ label: newLabel, dataUri: newUri, previewUri: newPreview });
          } else {
            setRestImages((prev) =>
              prev.map((r, idx) => (idx === i - 1 ? { label: newLabel, dataUri: newUri, previewUri: newPreview } : r))
            );
          }
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recolor failed");
    } finally {
      setRecoloringAll(false);
    }
  }, [allImages, recolorTarget, recoloringAll, recoloringIndex]);

  // Listing rewriter — supports "auto", "refine", and default "rewrite" modes
  const handleGenerateListing = useCallback(async (mode: "auto" | "refine" | "rewrite" = "rewrite") => {
    if (mode === "rewrite" && !rawTitle.trim() && !rawDescription.trim()) return;
    setListingLoading(true);
    setError(null);
    if (mode !== "refine") setListing(null);

    try {
      const jType = jewelryType
        ? JEWELRY_TYPES.find((t) => t.id === jewelryType)?.label || jewelryType
        : "jewelry";

      const payload: Record<string, string> = {
        jewelryType: jType,
        mode,
      };

      // Send the product image for image-aware listing generation
      if (imageBase64) payload.imageBase64 = imageBase64;

      if (mode === "refine" && listing) {
        payload.rawTitle = listing.title;
        payload.rawDescription = listing.description;
      } else {
        payload.rawTitle = rawTitle.trim();
        payload.rawDescription = rawDescription.trim();
      }

      const data = await safeFetch<{
        success: boolean;
        listing?: {
          title: string;
          description: string;
          metaDescription: string;
          altText: string;
          attributes: {
            material: string;
            stone: string;
            color: string;
            collection: string;
            occasion: string;
            style: string;
            productType: string;
          };
        };
        error?: string;
      }>("/api/rewrite-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!data.success || !data.listing) throw new Error(data.error || "Listing generation failed");
      setListing(data.listing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Listing generation failed");
    } finally {
      setListingLoading(false);
    }
  }, [rawTitle, rawDescription, jewelryType, imageBase64, listing]);

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }, []);

  const expandedImage =
    expandedIndex !== null ? allImages[expandedIndex] : null;

  const isGenerating = step === "generating-hero" || step === "generating-rest";
  const hasResults = allImages.length > 0;

  const canGenerate =
    !!imageBase64 &&
    !!jewelryType &&
    !!backgroundId;

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
              {/* Studio disabled for now */}
              {(imageBase64 || hasResults) && (
                <button onClick={handleReset} className="text-sm text-[#8c8c8c] hover:text-[#1b1b1f] transition-colors duration-300">
                  Start over
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

          {/* ── Results View ── */}
          {hasResults && !isGenerating ? (
            <div className="space-y-6 sm:space-y-8">
              {/* Title */}
              <div className="text-center animate-fade-in">
                <h1 className="text-xl sm:text-3xl font-bold text-[#1b1b1f] tracking-tight">
                  {step === "hero-done" ? "Hero Shot Preview" : "Your Jewelry Collection"}
                </h1>
                <p className="text-sm sm:text-base text-[#8c8c8c] mt-1">
                  {step === "hero-done"
                    ? "Review the hero shot — if it looks good, generate close-up and alternate angle"
                    : `${allImages.length} images generated — tap any image to compare`}
                </p>
              </div>

              {/* Image Grid */}
              <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
                <h3 className="text-xs font-bold text-[#8b7355] uppercase tracking-widest mb-3 sm:mb-4">
                  Jewelry Photos
                </h3>
                <div className={`grid gap-4 sm:gap-5 stagger-children ${
                  allImages.length === 1 ? "grid-cols-1 max-w-sm mx-auto" : "grid-cols-2 sm:grid-cols-4"
                }`}>
                  {allImages.map((img, index) => (
                    <ImageCard
                      key={index}
                      img={img}
                      onExpand={() => setExpandedIndex(expandedIndex === index ? null : index)}
                      onDownload={() => downloadImage(img.dataUri, img.label)}
                      onRegenerate={() => handleRegenerateSingle(index)}
                      isRegenerating={regeneratingIndex === index}
                    />
                  ))}
                </div>
              </div>

              {/* Hero comparison — always visible in hero-done state */}
              {step === "hero-done" && heroImage && imageBase64 && expandedIndex === null && (
                <div className="animate-slide-up">
                  <button
                    onClick={() => setExpandedIndex(0)}
                    className="w-full sm:w-auto mx-auto flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-[#8b7355] bg-[#f5f0e8] border border-[#e0d5c3] rounded-xl hover:bg-[#ece3d3] transition-all duration-300 active:scale-[0.98]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" /></svg>
                    Compare with Original
                  </button>
                </div>
              )}

              {/* Expanded slider */}
              {expandedImage && imageBase64 && (
                <div className="space-y-3 animate-scale-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm sm:text-base font-semibold text-[#1b1b1f]">
                      Comparing: {expandedImage.label}
                    </h3>
                    <button onClick={() => setExpandedIndex(null)} className="text-sm text-[#8c8c8c] hover:text-[#1b1b1f] transition-colors duration-300">
                      Close
                    </button>
                  </div>
                  <div className="w-full max-w-2xl mx-auto">
                    <BeforeAfterSlider beforeSrc={imageBase64} afterSrc={expandedImage.previewUri} />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 animate-slide-up" style={{ animationDelay: "200ms" }}>
                {/* Hero-only: approve & generate rest */}
                {step === "hero-done" && (
                  <button
                    onClick={handleGenerateRest}
                    className="px-6 py-3 bg-gradient-to-r from-[#8b7355] to-[#6b5740] text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-[#8b7355]/20 active:scale-[0.98] text-center"
                  >
                    Looks Good — Generate Close-up & Angle
                  </button>
                )}

                {step === "hero-done" && (
                  <button
                    onClick={() => { setHeroImage(null); setStep("idle"); setExpandedIndex(null); }}
                    className="px-6 py-3 bg-white border border-[#e8e5df] text-[#8c8c8c] rounded-xl font-medium hover:bg-[#f5f0e8] hover:text-[#1b1b1f] transition-all duration-300 active:scale-[0.97] text-center"
                  >
                    Not Happy — Regenerate
                  </button>
                )}

                {step === "all-done" && (
                  <>
                    <button
                      onClick={handleDownloadAll}
                      className="px-6 py-3 bg-[#1b1b1f] text-white rounded-xl font-medium hover:bg-[#2d2d33] transition-all duration-300 active:scale-[0.97] text-center"
                    >
                      Download All ({allImages.length})
                    </button>
                    <button
                      onClick={() => { setHeroImage(null); setRestImages([]); setStep("idle"); setExpandedIndex(null); }}
                      className="px-6 py-3 bg-white border border-[#e8e5df] text-[#8c8c8c] rounded-xl font-medium hover:bg-[#f5f0e8] hover:text-[#1b1b1f] transition-all duration-300 active:scale-[0.97] text-center"
                    >
                      Try Another Background
                    </button>
                  </>
                )}

                <button onClick={handleReset} className="px-6 py-3 text-[#8c8c8c] text-sm hover:text-[#1b1b1f] transition-colors duration-300 text-center">
                  Start over
                </button>
              </div>

              {/* ── Recolor Section ── */}
              {step === "all-done" && (
                <div className="space-y-4 border-t border-[#e8e5df] pt-6">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#1b1b1f]">Recolor Metal</h2>
                    <p className="text-xs sm:text-sm text-[#8c8c8c] mt-1">
                      Change the metal color — enter a hex code (e.g. #FFD700) or describe the color (e.g. &quot;rose gold&quot;)
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
                    {recolorTarget.trim() && /^#[0-9a-fA-F]{3,8}$/.test(recolorTarget.trim()) && (
                      <div className="w-9 h-9 rounded-lg border border-[#e8e5df] flex-shrink-0" style={{ backgroundColor: recolorTarget.trim() }} />
                    )}
                  </div>
                  {recolorTarget.trim() && (
                    <div className="space-y-3">
                      {/* Recolor All button */}
                      <button
                        onClick={handleRecolorAll}
                        disabled={recoloringAll || recoloringIndex !== null}
                        className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 active:scale-[0.97] ${
                          recoloringAll
                            ? "bg-[#f5f0e8] text-[#8b7355] border border-[#8b7355]"
                            : "bg-gradient-to-r from-[#8b7355] to-[#6b5740] text-white shadow-lg shadow-[#8b7355]/20"
                        } disabled:opacity-50`}
                      >
                        {recoloringAll ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-[#8b7355] border-t-transparent rounded-full animate-spin" />
                            Recoloring all images...
                          </span>
                        ) : (
                          `Recolor All ${allImages.length} Images`
                        )}
                      </button>

                      {/* Individual recolor buttons */}
                      <div className={`grid gap-3 grid-cols-2 sm:grid-cols-4`}>
                        {allImages.map((img, index) => (
                          <button
                            key={`recolor-${index}`}
                            onClick={() => handleRecolor(index)}
                            disabled={recoloringIndex !== null || recoloringAll}
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
                              img.label.replace(/ \(.*\)$/, "")
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Product Listing Section ── */}
              {step === "all-done" && (
                <div className="space-y-5 border-t border-[#e8e5df] pt-6 animate-slide-up">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-[#1b1b1f]">Product Listing</h2>
                      <p className="text-xs sm:text-sm text-[#8c8c8c] mt-1">
                        {listing
                          ? "Edit the fields below and refine, or regenerate from scratch"
                          : "Auto-generate from product details, or enter your own title & description"}
                      </p>
                    </div>
                    {!listing && (
                      <button
                        onClick={() => handleGenerateListing("auto")}
                        disabled={listingLoading}
                        className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-[#8b7355] to-[#6b5740] text-white rounded-lg font-semibold text-xs sm:text-sm transition-all duration-300 shadow-lg shadow-[#8b7355]/20 active:scale-[0.98] disabled:opacity-50"
                      >
                        {listingLoading ? (
                          <span className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Generating...
                          </span>
                        ) : (
                          "Auto-Generate"
                        )}
                      </button>
                    )}
                  </div>

                  {/* Input fields — shown when no listing yet */}
                  {!listing && (
                    <div className="space-y-3">
                      <p className="text-xs text-[#b0b0b0]">Or provide your own details:</p>
                      <div>
                        <label className="block text-xs font-medium text-[#8c8c8c] uppercase tracking-wider mb-1.5">
                          Product Title
                        </label>
                        <input
                          type="text"
                          value={rawTitle}
                          onChange={(e) => setRawTitle(e.target.value)}
                          placeholder='e.g. "gold bracelet with diamonds" or "silver pendant necklace"'
                          className="w-full rounded-xl border border-[#e8e5df] bg-white px-4 py-3 text-sm text-[#1b1b1f] placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#8b7355] transition-colors duration-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#8c8c8c] uppercase tracking-wider mb-1.5">
                          Product Description
                        </label>
                        <textarea
                          value={rawDescription}
                          onChange={(e) => setRawDescription(e.target.value)}
                          placeholder='e.g. "handmade 22k gold bracelet, 15 grams, 7 inch, with natural diamonds, perfect for gifting"'
                          rows={3}
                          className="w-full rounded-xl border border-[#e8e5df] bg-white px-4 py-3 text-sm text-[#1b1b1f] placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#8b7355] transition-colors duration-300 resize-none"
                        />
                      </div>
                      <button
                        onClick={() => handleGenerateListing("rewrite")}
                        disabled={listingLoading || (!rawTitle.trim() && !rawDescription.trim())}
                        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-[#8b7355] to-[#6b5740] text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg shadow-[#8b7355]/20 active:scale-[0.98] disabled:opacity-50"
                      >
                        {listingLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Generating...
                          </span>
                        ) : (
                          "Generate Listing"
                        )}
                      </button>
                    </div>
                  )}

                  {/* Editable listing output */}
                  {listing && (
                    <div className="space-y-4 animate-scale-in">
                      {/* Editable Title */}
                      <div className="bg-white rounded-xl border border-[#e8e5df] p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#8b7355] uppercase tracking-wider">Product Title</span>
                          <button
                            onClick={() => copyToClipboard(listing.title, "title")}
                            className={`text-xs font-medium px-2.5 py-1 rounded-md transition-all duration-200 ${
                              copiedField === "title"
                                ? "bg-green-50 text-green-600"
                                : "text-[#8c8c8c] hover:text-[#8b7355] hover:bg-[#f5f0e8]"
                            }`}
                          >
                            {copiedField === "title" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <input
                          type="text"
                          value={listing.title}
                          onChange={(e) => setListing({ ...listing, title: e.target.value })}
                          className="w-full rounded-lg border border-[#e8e5df] bg-[#fafaf8] px-3 py-2.5 text-sm sm:text-base font-medium text-[#1b1b1f] focus:outline-none focus:border-[#8b7355] transition-colors duration-300"
                        />
                        <p className="text-[10px] text-[#b0b0b0] mt-1">{listing.title.length} / 65 characters</p>
                      </div>

                      {/* HTML Description (editable source + live preview) */}
                      <div className="bg-white rounded-xl border border-[#e8e5df] p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#8b7355] uppercase tracking-wider">Product Description (HTML)</span>
                          <button
                            onClick={() => copyToClipboard(listing.description, "description")}
                            className={`text-xs font-medium px-2.5 py-1 rounded-md transition-all duration-200 ${
                              copiedField === "description"
                                ? "bg-green-50 text-green-600"
                                : "text-[#8c8c8c] hover:text-[#8b7355] hover:bg-[#f5f0e8]"
                            }`}
                          >
                            {copiedField === "description" ? "Copied!" : "Copy HTML"}
                          </button>
                        </div>
                        {/* Live preview */}
                        <div
                          className="rounded-lg border border-[#e8e5df] bg-[#fafaf8] px-4 py-3 text-sm text-[#1b1b1f] leading-relaxed mb-2 prose prose-sm max-w-none prose-li:text-[#1b1b1f] prose-p:text-[#1b1b1f]"
                          dangerouslySetInnerHTML={{ __html: listing.description }}
                        />
                        {/* Raw HTML editor (collapsed by default) */}
                        <details className="group">
                          <summary className="text-xs text-[#8c8c8c] cursor-pointer hover:text-[#8b7355] transition-colors">
                            Edit HTML source
                          </summary>
                          <textarea
                            value={listing.description}
                            onChange={(e) => setListing({ ...listing, description: e.target.value })}
                            rows={8}
                            className="w-full mt-2 rounded-lg border border-[#e8e5df] bg-[#fafaf8] px-3 py-2.5 text-xs font-mono text-[#1b1b1f] leading-relaxed focus:outline-none focus:border-[#8b7355] transition-colors duration-300 resize-y"
                          />
                        </details>
                      </div>

                      {/* Meta Description */}
                      <div className="bg-white rounded-xl border border-[#e8e5df] p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#8b7355] uppercase tracking-wider">Meta Description</span>
                          <button
                            onClick={() => copyToClipboard(listing.metaDescription, "meta")}
                            className={`text-xs font-medium px-2.5 py-1 rounded-md transition-all duration-200 ${
                              copiedField === "meta"
                                ? "bg-green-50 text-green-600"
                                : "text-[#8c8c8c] hover:text-[#8b7355] hover:bg-[#f5f0e8]"
                            }`}
                          >
                            {copiedField === "meta" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <textarea
                          value={listing.metaDescription}
                          onChange={(e) => setListing({ ...listing, metaDescription: e.target.value })}
                          rows={2}
                          className="w-full rounded-lg border border-[#e8e5df] bg-[#fafaf8] px-3 py-2.5 text-sm text-[#1b1b1f] leading-relaxed focus:outline-none focus:border-[#8b7355] transition-colors duration-300 resize-none"
                        />
                        <p className="text-[10px] text-[#b0b0b0] mt-1">{listing.metaDescription.length} / 155 characters</p>
                      </div>

                      {/* Alt Text */}
                      <div className="bg-white rounded-xl border border-[#e8e5df] p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#8b7355] uppercase tracking-wider">Image Alt Text</span>
                          <button
                            onClick={() => copyToClipboard(listing.altText, "alt")}
                            className={`text-xs font-medium px-2.5 py-1 rounded-md transition-all duration-200 ${
                              copiedField === "alt"
                                ? "bg-green-50 text-green-600"
                                : "text-[#8c8c8c] hover:text-[#8b7355] hover:bg-[#f5f0e8]"
                            }`}
                          >
                            {copiedField === "alt" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <input
                          type="text"
                          value={listing.altText}
                          onChange={(e) => setListing({ ...listing, altText: e.target.value })}
                          className="w-full rounded-lg border border-[#e8e5df] bg-[#fafaf8] px-3 py-2.5 text-sm text-[#1b1b1f] focus:outline-none focus:border-[#8b7355] transition-colors duration-300"
                        />
                        <p className="text-[10px] text-[#b0b0b0] mt-1">{listing.altText.length} / 125 characters</p>
                      </div>

                      {/* Product Attributes */}
                      <div className="bg-white rounded-xl border border-[#e8e5df] p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-[#8b7355] uppercase tracking-wider">Product Attributes</span>
                          <button
                            onClick={() => {
                              const a = listing.attributes;
                              const text = Object.entries(a).map(([k, v]) => `${k}: ${v}`).join("\n");
                              copyToClipboard(text, "attrs");
                            }}
                            className={`text-xs font-medium px-2.5 py-1 rounded-md transition-all duration-200 ${
                              copiedField === "attrs"
                                ? "bg-green-50 text-green-600"
                                : "text-[#8c8c8c] hover:text-[#8b7355] hover:bg-[#f5f0e8]"
                            }`}
                          >
                            {copiedField === "attrs" ? "Copied!" : "Copy All"}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {([
                            ["material", "Material"],
                            ["stone", "Stones"],
                            ["color", "Finish Color"],
                            ["collection", "Collection"],
                            ["occasion", "Occasion"],
                            ["style", "Style"],
                            ["productType", "Product Type"],
                          ] as [keyof typeof listing.attributes, string][]).map(([key, label]) => (
                            <div key={key}>
                              <label className="block text-[10px] font-medium text-[#8c8c8c] uppercase tracking-wider mb-1">{label}</label>
                              <input
                                type="text"
                                value={listing.attributes[key]}
                                onChange={(e) => setListing({
                                  ...listing,
                                  attributes: { ...listing.attributes, [key]: e.target.value },
                                })}
                                className="w-full rounded-lg border border-[#e8e5df] bg-[#fafaf8] px-3 py-2 text-sm text-[#1b1b1f] focus:outline-none focus:border-[#8b7355] transition-colors duration-300"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons: Refine, Regenerate, Copy All */}
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <button
                          onClick={() => handleGenerateListing("refine")}
                          disabled={listingLoading}
                          className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-300 active:scale-[0.98] bg-gradient-to-r from-[#8b7355] to-[#6b5740] text-white shadow-lg shadow-[#8b7355]/20 disabled:opacity-50"
                        >
                          {listingLoading ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Refining...
                            </span>
                          ) : (
                            "Refine with AI"
                          )}
                        </button>
                        <button
                          onClick={() => { setListing(null); handleGenerateListing("auto"); }}
                          disabled={listingLoading}
                          className="flex-1 py-3 rounded-xl font-medium text-sm transition-all duration-300 active:scale-[0.98] bg-white border border-[#e8e5df] text-[#8c8c8c] hover:bg-[#f5f0e8] hover:text-[#1b1b1f] disabled:opacity-50"
                        >
                          Regenerate from Scratch
                        </button>
                      </div>

                      {/* Copy All */}
                      <button
                        onClick={() => {
                          const a = listing.attributes;
                          const full = [
                            `Title: ${listing.title}`,
                            "",
                            `Description (HTML):`,
                            listing.description,
                            "",
                            `Meta Description: ${listing.metaDescription}`,
                            "",
                            `Alt Text: ${listing.altText}`,
                            "",
                            `Attributes:`,
                            `  Material: ${a.material}`,
                            `  Stones: ${a.stone}`,
                            `  Finish Color: ${a.color}`,
                            `  Collection: ${a.collection}`,
                            `  Occasion: ${a.occasion}`,
                            `  Style: ${a.style}`,
                            `  Product Type: ${a.productType}`,
                          ].join("\n");
                          copyToClipboard(full, "all");
                        }}
                        className={`w-full py-3 rounded-xl font-medium text-sm transition-all duration-300 active:scale-[0.98] ${
                          copiedField === "all"
                            ? "bg-green-50 text-green-600 border border-green-200"
                            : "bg-[#1b1b1f] text-white hover:bg-[#2d2d33]"
                        }`}
                      >
                        {copiedField === "all" ? "All Copied to Clipboard!" : "Copy Entire Listing"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) :

          /* ── Generating State ── */
          isGenerating ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 sm:py-32 animate-fade-in">
              <div className="w-12 h-12 border-3 border-[#8b7355] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm sm:text-base text-[#8c8c8c]">
                {step === "generating-hero"
                  ? "Generating hero shot..."
                  : "Generating additional angles..."}
              </p>
              <p className="text-xs text-[#b0b0b0]">
                {step === "generating-hero"
                  ? "This takes about 15–30 seconds"
                  : "Generating close-up crop + alternate angle..."}
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
                <h3 className="text-sm font-semibold text-[#1b1b1f]">1. Upload Jewelry Photo</h3>
                <p className="text-xs text-[#8c8c8c]">
                  Upload a clear, well-lit photo of your jewelry piece
                </p>

                {imageBase64 ? (
                  <div className="flex items-start gap-3 animate-scale-in">
                    <div className="relative group">
                      <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden border border-[#e8e5df] bg-white shadow-sm">
                        <img src={imageBase64} alt="Jewelry reference" className="w-full h-full object-contain" />
                      </div>
                      <button
                        onClick={() => { setImageBase64(null); setHeroImage(null); setRestImages([]); setStep("idle"); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <UploadZone onImageSelected={handleImageSelected} />
                )}
              </section>

              {/* Step 2: Jewelry Type */}
              {imageBase64 && (
                <section className="space-y-3 animate-slide-up" style={{ animationDelay: "50ms" }}>
                  <h3 className="text-sm font-semibold text-[#1b1b1f]">2. Jewelry Type</h3>
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
              {imageBase64 && jewelryType && (
                <section className="space-y-3 animate-slide-up" style={{ animationDelay: "100ms" }}>
                  <h3 className="text-sm font-semibold text-[#1b1b1f]">3. Background</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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
                        <div className="w-5 h-5 rounded-full border border-[#e8e5df] flex-shrink-0" style={{ backgroundColor: bg.swatch }} />
                        <span className="text-left leading-tight text-xs sm:text-sm">{bg.label}</span>
                      </button>
                    ))}
                  </div>
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
                <div className="flex justify-center pt-2 sm:pt-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
                  <button
                    onClick={handleGenerateHero}
                    disabled={isGenerating}
                    className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-gradient-to-r from-[#8b7355] to-[#6b5740] text-white rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 shadow-lg shadow-[#8b7355]/20 active:scale-[0.98] disabled:opacity-50 text-center"
                  >
                    Generate Hero Shot
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

/* ─── Image Card (always square) ──────────────────────────────── */
function ImageCard({
  img,
  onExpand,
  onDownload,
  onRegenerate,
  isRegenerating,
}: {
  img: ResultImage;
  onExpand: () => void;
  onDownload: () => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}) {
  return (
    <div className="group">
      <div className="text-xs sm:text-sm font-medium text-[#8c8c8c] mb-1.5 sm:mb-2 text-center">
        {img.label}
      </div>
      <div
        className={`relative overflow-hidden bg-white cursor-pointer card-hover shadow-sm rounded-xl border border-[#e8e5df] ${isRegenerating ? "opacity-50 pointer-events-none" : ""}`}
        onClick={onExpand}
      >
        <div style={{ paddingBottom: "100%" }} className="relative w-full">
          {isRegenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#fafaf8]">
              <span className="w-6 h-6 border-2 border-[#8b7355] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#8c8c8c]">Regenerating...</span>
            </div>
          ) : (
            <img src={img.previewUri} alt={img.label} className="absolute inset-0 w-full h-full object-cover" />
          )}
        </div>
        {!isRegenerating && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300 flex items-end sm:items-center justify-center pb-3 sm:pb-0">
            <span className="sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-all duration-300 bg-white/90 text-[#1b1b1f] text-xs font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-sm backdrop-blur-sm">
              Tap to compare
            </span>
          </div>
        )}
      </div>
      <div className="mt-2 sm:mt-2.5 flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          className="flex-1 py-2.5 sm:py-2 text-sm font-medium text-[#8c8c8c] bg-white border border-[#e8e5df] rounded-lg hover:bg-[#f5f0e8] hover:text-[#8b7355] transition-all duration-300 active:scale-[0.98]"
        >
          Download
        </button>
        {onRegenerate && (
          <button
            onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
            disabled={isRegenerating}
            className="px-3 py-2.5 sm:py-2 text-sm font-medium text-[#8c8c8c] bg-white border border-[#e8e5df] rounded-lg hover:bg-[#f5f0e8] hover:text-[#8b7355] transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
            title="Regenerate this image"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}

