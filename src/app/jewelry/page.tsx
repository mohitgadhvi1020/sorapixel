"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import UploadZone from "@/components/upload-zone";
import BeforeAfterSlider from "@/components/before-after-slider";
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
  imageId?: string;
  hasHD?: boolean;
  hdWidth?: number;
  hdHeight?: number;
}

interface Toast {
  id: number;
  message: string;
  type: "error" | "warning" | "info" | "success";
}

function isRetryableError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("429") ||
    lower.includes("rate limit") ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    lower.includes("overloaded") ||
    lower.includes("unavailable") ||
    lower.includes("timed out") ||
    lower.includes("504") ||
    lower.includes("502") ||
    lower.includes("503")
  );
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  onRetry?: (attempt: number, maxRetries: number, delayMs: number) => void,
  maxRetries = 2,
  baseDelayMs = 5000,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await safeFetch<T>(url, options);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (!isRetryableError(lastError.message) || attempt === maxRetries) {
        throw lastError;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      onRetry?.(attempt + 1, maxRetries, delay);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError!;
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
  const [genStatus, setGenStatus] = useState<string | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const showToast = useCallback((message: string, type: Toast["type"] = "error") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), type === "error" ? 8000 : 5000);
  }, []);

  // Regenerate single
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // Custom angle upload
  const [customAngleUploading, setCustomAngleUploading] = useState(false);
  const [customAngleOriginal, setCustomAngleOriginal] = useState<string | null>(null);

  // HD on-demand
  const [hdGeneratingIndex, setHdGeneratingIndex] = useState<number | null>(null);

  // Recolor
  const [recolorTarget, setRecolorTarget] = useState("");
  const [recoloringIndex, setRecoloringIndex] = useState<number | null>(null);
  const [recoloringAll, setRecoloringAll] = useState(false);

  // Credits
  interface JCredits { tokenBalance: number; canGeneratePack: boolean; canRecolorAll: boolean; canRecolorSingle: boolean; canGenerateListing: boolean; canHdUpscale: boolean; pricing: { packGeneration: number; recolorAll: number; recolorSingle: number; listing: number; hdUpscale: number } }
  const [jCredits, setJCredits] = useState<JCredits | null>(null);
  const [showPricing, setShowPricing] = useState(false);

  const fetchJCredits = useCallback(async () => {
    try {
      const data = await safeFetch<JCredits & { error?: string }>("/api/jewelry-credits");
      if (!data.error) setJCredits(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchJCredits(); }, [fetchJCredits]);

  // Admin check
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    safeFetch<{ authenticated: boolean; user?: { isAdmin: boolean } }>("/api/auth/me")
      .then((d) => { if (d.user?.isAdmin) setIsAdmin(true); })
      .catch(() => {});
  }, []);

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

  const cropToSquare = useCallback((base64: string, maxDim = 2048, quality = 0.92): Promise<string> => {
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
  }, []);

  const handleImageSelected = useCallback(
    async (base64: string, _preview: string) => {
      const squared = await cropToSquare(base64);
      setImageBase64(squared);
      setHeroImage(null);
      setRestImages([]);
      setError(null);
      setStep("idle");
      setExpandedIndex(null);
    },
    [cropToSquare]
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
    setCustomAngleOriginal(null);
    setRecolorTarget("");
    setListing(null);
    setRawTitle("");
    setRawDescription("");
  }, []);

  const buildPayload = useCallback((): Record<string, unknown> => ({
    imageBase64: imageBase64!,
    aspectRatioId: "square",
    backgroundId: backgroundId!,
    jewelryType: jewelryType || "ring",
  }), [imageBase64, backgroundId, jewelryType]);

  // Step 1: Generate ONLY the hero shot
  const handleGenerateHero = useCallback(async () => {
    if (!imageBase64) return;
    if (!backgroundId) return;

    setStep("generating-hero");
    setError(null);
    setGenStatus(null);
    setHeroImage(null);
    setRestImages([]);
    setExpandedIndex(null);

    try {
      const payload = buildPayload();
      payload.onlyHero = true;

      const data = await fetchWithRetry<{
        success: boolean;
        images?: { label: string; base64: string; mimeType: string; imageId?: string; watermarkedBase64?: string }[];
        error?: string;
      }>(
        "/api/generate-jewelry",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        (attempt, maxRetries, delayMs) => {
          const secs = Math.round(delayMs / 1000);
          setGenStatus(`Rate limited — retrying in ${secs}s (attempt ${attempt}/${maxRetries})...`);
          showToast(`Rate limited by AI service. Retrying automatically in ${secs}s...`, "warning");
        },
      );

      if (!data.success) throw new Error(data.error || "Generation failed");
      const images = (data.images ?? []).map((img) => ({
        label: img.label,
        dataUri: `data:${img.mimeType};base64,${img.base64}`,
        previewUri: img.watermarkedBase64
          ? `data:${img.mimeType};base64,${img.watermarkedBase64}`
          : `data:${img.mimeType};base64,${img.base64}`,
        imageId: img.imageId,
      }));
      if (images.length > 0) {
        setHeroImage(images[0]);
        setStep("hero-done");
        setGenStatus(null);
        showToast("Hero shot ready! Generate remaining images to complete the pack (40 tokens for the full pack).", "success");
        fetchJCredits();
      } else {
        throw new Error("No image generated");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      showToast(msg, "error");
      setStep("idle");
      setGenStatus(null);
    }
  }, [imageBase64, backgroundId, buildPayload, showToast, fetchJCredits]);

  // Step 2: Generate remaining images (Close-up crop + Alternate Angle)
  const handleGenerateRest = useCallback(async () => {
    if (!imageBase64) return;

    setStep("generating-rest");
    setError(null);
    setGenStatus(null);

    try {
      const payload = buildPayload();
      payload.onlyRest = true;
      if (heroImage) {
        payload.heroBase64 = heroImage.dataUri;
      }

      const data = await fetchWithRetry<{
        success: boolean;
        images?: { label: string; base64: string; mimeType: string; imageId?: string; watermarkedBase64?: string }[];
        error?: string;
        tokensUsed?: number;
      }>(
        "/api/generate-jewelry",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        (attempt, maxRetries, delayMs) => {
          const secs = Math.round(delayMs / 1000);
          setGenStatus(`Rate limited — retrying in ${secs}s (attempt ${attempt}/${maxRetries})...`);
          showToast(`Rate limited by AI service. Retrying automatically in ${secs}s...`, "warning");
        },
      );

      if (!data.success) throw new Error(data.error || "Generation failed");
      const images = (data.images ?? []).map((img) => ({
        label: img.label,
        dataUri: `data:${img.mimeType};base64,${img.base64}`,
        previewUri: img.watermarkedBase64
          ? `data:${img.mimeType};base64,${img.watermarkedBase64}`
          : `data:${img.mimeType};base64,${img.base64}`,
        imageId: img.imageId,
      }));
      setRestImages(images);
      setStep("all-done");
      setGenStatus(null);
      showToast(`Pack complete! ${data.tokensUsed ? `${data.tokensUsed} tokens used.` : ""}`, "success");
      fetchJCredits();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      showToast(msg, "error");
      setStep("hero-done");
      setGenStatus(null);
    }
  }, [imageBase64, heroImage, buildPayload, showToast, fetchJCredits]);

  const downloadImage = useCallback((dataUri: string, label: string, imageId?: string) => {
    if (imageId) {
      const a = document.createElement("a");
      a.href = `/api/download?imageId=${imageId}`;
      a.download = `sorapixel-jewelry-${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const a = document.createElement("a");
      a.href = dataUri;
      a.download = `sorapixel-jewelry-${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, []);

  const downloadHDImage = useCallback((label: string) => {
    const cleanLabel = label.replace(/ \(.*\)$/, "");
    const a = document.createElement("a");
    a.href = `/api/download-hd?label=${encodeURIComponent(cleanLabel)}`;
    a.download = `sorapixel-jewelry-${cleanLabel.toLowerCase().replace(/\s+/g, "-")}-hd-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleGenerateHD = useCallback(async (index: number) => {
    const img = allImages[index];
    if (!img || hdGeneratingIndex !== null) return;

    setHdGeneratingIndex(index);
    try {
      const data = await safeFetch<{
        success: boolean;
        hdWidth?: number;
        hdHeight?: number;
        tokensUsed?: number;
        error?: string;
      }>("/api/generate-hd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: img.dataUri,
          label: img.label.replace(/ \(.*\)$/, ""),
        }),
      });

      if (!data.success) throw new Error(data.error || "HD generation failed");

      const updated: ResultImage = {
        ...img,
        hasHD: true,
        hdWidth: data.hdWidth,
        hdHeight: data.hdHeight,
      };

      if (index === 0) {
        setHeroImage(updated);
      } else {
        setRestImages((prev) =>
          prev.map((r, i) => (i === index - 1 ? updated : r))
        );
      }

      showToast(`HD ready! ${data.hdWidth}×${data.hdHeight} — ${data.tokensUsed} tokens used.`, "success");
      fetchJCredits();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "HD generation failed";
      showToast(msg, "error");
    } finally {
      setHdGeneratingIndex(null);
    }
  }, [allImages, hdGeneratingIndex, showToast, fetchJCredits]);

  const handleDownloadAll = useCallback(() => {
    allImages.forEach((img, i) => {
      setTimeout(() => downloadImage(img.dataUri, img.label, img.imageId), i * 300);
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

      const data = await fetchWithRetry<{
        success: boolean;
        images?: { label: string; base64: string; watermarkedBase64?: string; mimeType: string }[];
        error?: string;
      }>(
        "/api/generate-jewelry",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        (_attempt, _maxRetries, delayMs) => {
          const secs = Math.round(delayMs / 1000);
          showToast(`Rate limited — retrying in ${secs}s...`, "warning");
        },
      );

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
      const msg = err instanceof Error ? err.message : "Regeneration failed";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setRegeneratingIndex(null);
    }
  }, [imageBase64, backgroundId, heroImage, allImages, regeneratingIndex, buildPayload, showToast]);

  // Custom angle upload — user provides their own angle photo
  const handleCustomAngleUpload = useCallback(async (file: File) => {
    if (!file || customAngleUploading) return;

    setCustomAngleUploading(true);
    setError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Compress and square-crop for both comparison display and API payload
      const squaredOriginal = await cropToSquare(base64);
      setCustomAngleOriginal(squaredOriginal);

      const payload = buildPayload();
      payload.customAngleBase64 = squaredOriginal;

      const data = await safeFetch<{
        success: boolean;
        images?: { label: string; base64: string; mimeType: string; imageId?: string; watermarkedBase64?: string }[];
        error?: string;
      }>("/api/generate-jewelry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!data.success || !data.images?.length) {
        throw new Error(data.error || "Custom angle generation failed");
      }

      const img = data.images[0];
      const dataUri = `data:${img.mimeType};base64,${img.base64}`;
      const previewUri = img.watermarkedBase64
        ? `data:${img.mimeType};base64,${img.watermarkedBase64}`
        : dataUri;

      const updated: ResultImage = {
        label: "Alternate Angle",
        dataUri,
        previewUri,
        imageId: img.imageId,
      };

      // Replace the angle image in restImages (index 1 = angle)
      setRestImages((prev) => {
        const newArr = [...prev];
        const angleIdx = newArr.findIndex((r) => r.label.startsWith("Alternate"));
        if (angleIdx >= 0) newArr[angleIdx] = updated;
        else newArr.push(updated);
        return newArr;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Custom angle generation failed";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setCustomAngleUploading(false);
    }
  }, [buildPayload, customAngleUploading, cropToSquare, showToast]);

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
          tokensUsed?: number;
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

        if (data.tokensUsed) showToast(`Recolor done! ${data.tokensUsed} tokens used.`, "success");

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
        const msg = err instanceof Error ? err.message : "Recolor failed";
        setError(msg);
        showToast(msg, "error");
      } finally {
        setRecoloringIndex(null);
        fetchJCredits();
      }
    },
    [allImages, recolorTarget, recoloringIndex, recoloringAll, showToast, fetchJCredits]
  );

  // Recolor ALL images at once
  const handleRecolorAll = useCallback(async () => {
    if (!recolorTarget.trim() || recoloringAll || recoloringIndex !== null) return;
    if (allImages.length === 0) return;

    setRecoloringAll(true);
    setError(null);

    try {
      // Pre-deduct batch recolor tokens (20 total instead of 7×3=21)
      const deductData = await safeFetch<{ success?: boolean; error?: string; tokensUsed?: number }>("/api/deduct-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "recolorAll" }),
      });

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
              skipTokenCheck: true,
            }),
          })
        )
      );

      const colorLabel = recolorTarget.trim();
      let recoloredCount = 0;
      results.forEach((data, i) => {
        if (data.success && data.image) {
          recoloredCount++;
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
      if (recoloredCount > 0) {
        showToast(`All ${recoloredCount} images recolored! ${deductData.tokensUsed || 20} tokens used.`, "success");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Recolor failed";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setRecoloringAll(false);
      fetchJCredits();
    }
  }, [allImages, recolorTarget, recoloringAll, recoloringIndex, showToast, fetchJCredits]);

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

      // Send the recolored hero image if available, otherwise the original upload
      if (heroImage) {
        payload.imageBase64 = heroImage.dataUri;
      } else if (imageBase64) {
        payload.imageBase64 = imageBase64;
      }

      // Include recolor info so the listing reflects the current metal color
      if (recolorTarget.trim()) {
        payload.recolorColor = recolorTarget.trim();
      }

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
        tokensUsed?: number;
      }>("/api/rewrite-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!data.success || !data.listing) throw new Error(data.error || "Listing generation failed");
      setListing(data.listing);
      if (data.tokensUsed) showToast(`Listing generated! ${data.tokensUsed} tokens used.`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Listing generation failed";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setListingLoading(false);
      fetchJCredits();
    }
  }, [rawTitle, rawDescription, jewelryType, imageBase64, heroImage, recolorTarget, listing, showToast, fetchJCredits]);

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

  const router = useRouter();

  const handleLogout = useCallback(async () => {
    try {
      await safeFetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    sessionStorage.removeItem("sorapixel_auth");
    router.replace("/login");
  }, [router]);

  // ─── Render ──────────────────────────────────────────────────

  return (
      <div className="min-h-screen bg-[#f7f7f5]">
        {/* Toast Notifications */}
        {toasts.length > 0 && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90vw] max-w-md pointer-events-none">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg border text-[13px] font-medium animate-slide-up-sm flex items-start gap-3 ${
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
                  {toast.type === "error" ? "✕" : toast.type === "warning" ? "⚠" : toast.type === "success" ? "✓" : "ℹ"}
                </span>
                <span className="flex-1">{toast.message}</span>
                <button
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="flex-shrink-0 ml-1 text-current opacity-50 hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <header className="glass border-b border-[#e8e5df] sticky top-0 z-50">
          <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-3 md:py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-full bg-[#0a0a0a] flex items-center justify-center">
                <span className="text-white text-xs font-bold">SP</span>
              </div>
              <span className="font-display font-bold text-[15px] tracking-tight text-[#0a0a0a] hidden sm:block">
                SoraPixel
              </span>
            </a>
            <div className="flex items-center gap-2 sm:gap-3">
              {(imageBase64 || hasResults) && (
                <button onClick={handleReset} className="px-3 py-2 text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200">
                  Start over
                </button>
              )}
              {isAdmin && (
                <a href="/admin" className="px-3 py-2 text-[13px] font-medium text-[#8b7355] bg-[#f5f0e8] rounded-lg hover:bg-[#ece3d3] transition-all duration-200">
                  Admin
                </a>
              )}
              {jCredits && (
                <button
                  onClick={() => setShowPricing(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5f0e8] border border-[#e8e5df] hover:bg-[#ece3d3] transition-colors"
                >
                  <span className="text-xs font-bold text-[#8b7355]">{jCredits.tokenBalance}</span>
                  <span className="text-[10px] text-[#8b7355]">tokens</span>
                </button>
              )}
              <button onClick={handleLogout} className="px-3 py-2 text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200">
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Pricing Modal */}
        {showPricing && <JewelryPricingModal onClose={() => setShowPricing(false)} />}

        {/* Main */}
        <main className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-6 sm:py-10">

          {/* ── Results View ── */}
          {hasResults && !isGenerating ? (
            <div className="space-y-8 sm:space-y-10">
              {/* Title */}
              <div className="text-center animate-fade-in">
                <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
                  {step === "hero-done" ? "Preview" : "Results"}
                </span>
                <h1 className="font-display font-bold text-[#0a0a0a] text-2xl sm:text-[2.5rem] uppercase tracking-[-0.02em] leading-[0.95]">
                  {step === "hero-done" ? "Hero Shot Preview" : "Your Jewelry Collection"}
                </h1>
                <p className="text-[14px] sm:text-base text-[#8c8c8c] mt-2 max-w-md mx-auto">
                  {step === "hero-done"
                    ? "Review the hero shot — if it looks good, generate close-up and alternate angle"
                    : `${allImages.length} images generated — tap any image to compare`}
                </p>
              </div>

              {/* Image Grid */}
              <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
                <div className={`grid gap-3 sm:gap-6 stagger-children ${
                  allImages.length === 1
                    ? "grid-cols-1 max-w-sm sm:max-w-md mx-auto"
                    : allImages.length <= 3
                      ? "grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 max-w-4xl mx-auto"
                      : "grid-cols-2 sm:grid-cols-4"
                }`}>
                  {allImages.map((img, index) => {
                    const isAngle = img.label.startsWith("Alternate");
                    const isHeroOrAngle = img.label.startsWith("Hero") || isAngle;
                    return (
                      <ImageCard
                        key={index}
                        img={img}
                        onExpand={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        onDownload={() => downloadImage(img.dataUri, img.label, img.imageId)}
                        onDownloadHD={img.hasHD ? () => downloadHDImage(img.label) : undefined}
                        onGenerateHD={isHeroOrAngle && !img.hasHD ? () => handleGenerateHD(index) : undefined}
                        isGeneratingHD={hdGeneratingIndex === index}
                        onRegenerate={() => handleRegenerateSingle(index)}
                        isRegenerating={regeneratingIndex === index}
                        onCustomUpload={isAngle && step === "all-done" ? handleCustomAngleUpload : undefined}
                        isCustomUploading={isAngle ? customAngleUploading : false}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Hero comparison */}
              {step === "hero-done" && heroImage && imageBase64 && expandedIndex === null && (
                <div className="animate-slide-up flex justify-center">
                  <button
                    onClick={() => setExpandedIndex(0)}
                    className="inline-flex items-center gap-2.5 px-6 py-3 text-[13px] font-semibold text-[#0a0a0a] bg-white border border-[#e8e5df] rounded-full hover:bg-[#f5f0e8] hover:border-[#c4a67d] transition-all duration-200 active:scale-[0.98]"
                  >
                    <svg className="w-4 h-4 text-[#8b7355]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" /></svg>
                    Compare with Original
                  </button>
                </div>
              )}

              {/* Expanded slider */}
              {expandedImage && imageBase64 && (
                <div className="bg-white rounded-xl border border-[#e8e5df] p-5 sm:p-8 animate-scale-in">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[11px] font-semibold text-[#8b7355] tracking-[0.12em] uppercase block mb-1">Comparison</span>
                      <h3 className="font-display font-bold text-[#0a0a0a] text-sm sm:text-base uppercase tracking-tight">
                        {expandedImage.label}
                      </h3>
                    </div>
                    <button onClick={() => setExpandedIndex(null)} className="px-3 py-1.5 text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:bg-black/[0.04] transition-all duration-200">
                      Close
                    </button>
                  </div>
                  <div className="w-full max-w-2xl mx-auto">
                    <BeforeAfterSlider
                      beforeSrc={
                        expandedImage.label.startsWith("Alternate") && customAngleOriginal
                          ? customAngleOriginal
                          : imageBase64
                      }
                      afterSrc={expandedImage.previewUri}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 animate-slide-up" style={{ animationDelay: "200ms" }}>
                {step === "hero-done" && (
                  <button
                    onClick={handleGenerateRest}
                    className="w-full sm:w-auto px-7 py-3.5 bg-[#0a0a0a] text-white text-[13px] sm:text-[14px] rounded-full font-semibold hover:bg-[#1a1a1a] transition-all duration-200 active:scale-[0.98] text-center"
                  >
                    Looks Good — Generate More
                    <span className="ml-1.5 text-[11px] opacity-70">(40 tokens)</span>
                  </button>
                )}

                {step === "hero-done" && (
                  <button
                    onClick={() => { setHeroImage(null); setStep("idle"); setExpandedIndex(null); }}
                    className="w-full sm:w-auto px-7 py-3.5 bg-white border border-[#e8e5df] text-[#4a4a4a] text-[13px] sm:text-[14px] rounded-full font-medium hover:bg-[#f5f0e8] hover:border-[#c4a67d] transition-all duration-200 active:scale-[0.97] text-center"
                  >
                    Not Happy — Regenerate
                  </button>
                )}

                {step === "all-done" && (
                  <>
                    <button
                      onClick={handleDownloadAll}
                      className="w-full sm:w-auto px-7 py-3.5 bg-[#0a0a0a] text-white text-[13px] sm:text-[14px] rounded-full font-semibold hover:bg-[#1a1a1a] transition-all duration-200 active:scale-[0.97] text-center"
                    >
                      Download All ({allImages.length})
                    </button>
                    <button
                      onClick={() => { setHeroImage(null); setRestImages([]); setStep("idle"); setExpandedIndex(null); }}
                      className="w-full sm:w-auto px-7 py-3.5 bg-white border border-[#e8e5df] text-[#4a4a4a] text-[13px] sm:text-[14px] rounded-full font-medium hover:bg-[#f5f0e8] hover:border-[#c4a67d] transition-all duration-200 active:scale-[0.97] text-center"
                    >
                      Try Another Background
                    </button>
                  </>
                )}

                <button onClick={handleReset} className="px-5 py-3 text-[#8c8c8c] text-[13px] font-medium hover:text-[#0a0a0a] transition-colors duration-200 text-center">
                  Start over
                </button>
              </div>

              {/* ── Recolor Section ── */}
              {step === "all-done" && (
                <div className="bg-white rounded-xl border border-[#e8e5df] p-6 sm:p-8 space-y-5">
                  <div>
                    <span className="text-[11px] font-semibold text-[#8b7355] tracking-[0.12em] uppercase block mb-2">Color Tools</span>
                    <h2 className="font-display font-bold text-[#0a0a0a] text-lg sm:text-xl uppercase tracking-[-0.01em]">Recolor Metal</h2>
                    <p className="text-[13px] text-[#8c8c8c] mt-1.5">
                      Change the metal color — enter a hex code (e.g. #FFD700) or describe the color (e.g. &quot;rose gold&quot;)
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        value={recolorTarget}
                        onChange={(e) => setRecolorTarget(e.target.value)}
                        placeholder="#FFD700 or rose gold, matte black, antique silver..."
                        className="w-full rounded-lg border border-[#e8e5df] bg-[#f7f7f5] px-4 py-3 text-sm text-[#0a0a0a] placeholder:text-[#b0b0b0] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/20 focus:border-[#8b7355] transition-all duration-200"
                      />
                    </div>
                    {recolorTarget.trim() && /^#[0-9a-fA-F]{3,8}$/.test(recolorTarget.trim()) && (
                      <div className="w-10 h-10 rounded-lg border border-[#e8e5df] flex-shrink-0 shadow-sm" style={{ backgroundColor: recolorTarget.trim() }} />
                    )}
                  </div>
                  {recolorTarget.trim() && (
                    <div className="space-y-3 pt-2">
                      <button
                        onClick={handleRecolorAll}
                        disabled={recoloringAll || recoloringIndex !== null}
                        className={`w-full sm:w-auto px-6 py-3 rounded-full font-semibold text-[13px] transition-all duration-200 active:scale-[0.97] ${
                          recoloringAll
                            ? "bg-[#f5f0e8] text-[#8b7355] border border-[#8b7355]"
                            : "bg-[#0a0a0a] text-white hover:bg-[#1a1a1a]"
                        } disabled:opacity-50`}
                      >
                        {recoloringAll ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-[#8b7355] border-t-transparent rounded-full animate-spin" />
                            Recoloring all images...
                          </span>
                        ) : (
                          <>Recolor All {allImages.length} Images <span className="ml-1 text-[11px] opacity-70">(20 tokens)</span></>
                        )}
                      </button>

                      <div className="grid gap-2 grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4">
                        {allImages.map((img, index) => (
                          <button
                            key={`recolor-${index}`}
                            onClick={() => handleRecolor(index)}
                            disabled={recoloringIndex !== null || recoloringAll}
                            className={`px-3 py-3 sm:py-2.5 rounded-lg border text-[12px] sm:text-[13px] font-medium transition-all duration-200 active:scale-[0.97] text-center ${
                              recoloringIndex === index
                                ? "border-[#8b7355] bg-[#f5f0e8] text-[#8b7355]"
                                : "border-[#e8e5df] bg-[#f7f7f5] text-[#4a4a4a] hover:border-[#c4a67d] hover:text-[#0a0a0a]"
                            } disabled:opacity-50`}
                          >
                            {recoloringIndex === index ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="w-3 h-3 border-2 border-[#8b7355] border-t-transparent rounded-full animate-spin" />
                                Recoloring...
                              </span>
                            ) : (
                              <>{img.label.replace(/ \(.*\)$/, "")} <span className="text-[10px] opacity-60">(7)</span></>
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
                <div className="bg-white rounded-xl border border-[#e8e5df] p-6 sm:p-8 space-y-6 animate-slide-up">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-semibold text-[#8b7355] tracking-[0.12em] uppercase block mb-2">Shopify Ready</span>
                      <h2 className="font-display font-bold text-[#0a0a0a] text-lg sm:text-xl uppercase tracking-[-0.01em]">Product Listing</h2>
                      <p className="text-[13px] text-[#8c8c8c] mt-1.5">
                        {listing
                          ? "Edit the fields below and refine, or regenerate from scratch"
                          : "Auto-generate from product details, or enter your own title & description"}
                      </p>
                    </div>
                    {!listing && (
                      <button
                        onClick={() => handleGenerateListing("auto")}
                        disabled={listingLoading}
                        className="flex-shrink-0 px-5 py-2.5 bg-[#0a0a0a] text-white rounded-full font-semibold text-[13px] hover:bg-[#1a1a1a] transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                      >
                        {listingLoading ? (
                          <span className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Generating...
                          </span>
                        ) : (
                          <>Auto-Generate <span className="ml-1 text-[11px] opacity-70">(5 tokens)</span></>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Input fields — shown when no listing yet */}
                  {!listing && (
                    <div className="space-y-4 border-t border-[#e8e5df] pt-5">
                      <p className="text-[12px] text-[#8c8c8c] uppercase tracking-[0.08em] font-medium">Or provide your own details</p>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#4a4a4a] uppercase tracking-[0.1em] mb-2">
                          Product Title
                        </label>
                        <input
                          type="text"
                          value={rawTitle}
                          onChange={(e) => setRawTitle(e.target.value)}
                          placeholder='e.g. "gold bracelet with diamonds" or "silver pendant necklace"'
                          className="w-full rounded-lg border border-[#e8e5df] bg-[#f7f7f5] px-4 py-3 text-sm text-[#0a0a0a] placeholder:text-[#b0b0b0] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/20 focus:border-[#8b7355] transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#4a4a4a] uppercase tracking-[0.1em] mb-2">
                          Product Description
                        </label>
                        <textarea
                          value={rawDescription}
                          onChange={(e) => setRawDescription(e.target.value)}
                          placeholder='e.g. "handmade 22k gold bracelet, 15 grams, 7 inch, with natural diamonds, perfect for gifting"'
                          rows={3}
                          className="w-full rounded-lg border border-[#e8e5df] bg-[#f7f7f5] px-4 py-3 text-sm text-[#0a0a0a] placeholder:text-[#b0b0b0] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/20 focus:border-[#8b7355] transition-all duration-200 resize-none"
                        />
                      </div>
                      <button
                        onClick={() => handleGenerateListing("rewrite")}
                        disabled={listingLoading || (!rawTitle.trim() && !rawDescription.trim())}
                        className="w-full sm:w-auto px-6 py-3 bg-[#0a0a0a] text-white rounded-full font-semibold text-[13px] hover:bg-[#1a1a1a] transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                      >
                        {listingLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Generating...
                          </span>
                        ) : (
                          <>Generate Listing <span className="ml-1 text-[11px] opacity-70">(5 tokens)</span></>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Editable listing output */}
                  {listing && (
                    <div className="space-y-4 border-t border-[#e8e5df] pt-5 animate-scale-in">
                      {/* Editable Title */}
                      <div className="rounded-lg border border-[#e8e5df] bg-[#f7f7f5] p-4">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[11px] font-semibold text-[#8b7355] uppercase tracking-[0.1em]">Product Title</span>
                          <button
                            onClick={() => copyToClipboard(listing.title, "title")}
                            className={`text-[11px] font-semibold px-3 py-1 rounded-full transition-all duration-200 ${
                              copiedField === "title"
                                ? "bg-green-50 text-green-600"
                                : "text-[#8c8c8c] hover:text-[#0a0a0a] hover:bg-white"
                            }`}
                          >
                            {copiedField === "title" ? "Copied!" : "Copy"}
                          </button>
                        </div>
                        <input
                          type="text"
                          value={listing.title}
                          onChange={(e) => setListing({ ...listing, title: e.target.value })}
                          className="w-full rounded-lg border border-[#e8e5df] bg-white px-3 py-2.5 text-sm sm:text-base font-medium text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/20 focus:border-[#8b7355] transition-all duration-200"
                        />
                        <p className="text-[10px] text-[#b0b0b0] mt-1.5 tracking-wide">{listing.title.length} / 65 characters</p>
                      </div>

                      {/* HTML Description */}
                      <div className="rounded-lg border border-[#e8e5df] bg-[#f7f7f5] p-4">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-[11px] font-semibold text-[#8b7355] uppercase tracking-[0.1em]">Description (HTML)</span>
                          <button
                            onClick={() => copyToClipboard(listing.description, "description")}
                            className={`text-[11px] font-semibold px-3 py-1 rounded-full transition-all duration-200 ${
                              copiedField === "description"
                                ? "bg-green-50 text-green-600"
                                : "text-[#8c8c8c] hover:text-[#0a0a0a] hover:bg-white"
                            }`}
                          >
                            {copiedField === "description" ? "Copied!" : "Copy HTML"}
                          </button>
                        </div>
                        <div
                          className="rounded-lg border border-[#e8e5df] bg-white px-4 py-3 text-sm text-[#0a0a0a] leading-relaxed mb-2.5 prose prose-sm max-w-none prose-li:text-[#0a0a0a] prose-p:text-[#0a0a0a]"
                          dangerouslySetInnerHTML={{ __html: listing.description }}
                        />
                        <details className="group">
                          <summary className="text-[11px] text-[#8c8c8c] cursor-pointer font-medium hover:text-[#8b7355] transition-colors uppercase tracking-[0.06em]">
                            Edit HTML source
                          </summary>
                          <textarea
                            value={listing.description}
                            onChange={(e) => setListing({ ...listing, description: e.target.value })}
                            rows={8}
                            className="w-full mt-2 rounded-lg border border-[#e8e5df] bg-white px-3 py-2.5 text-xs font-mono text-[#0a0a0a] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#8b7355]/20 focus:border-[#8b7355] transition-all duration-200 resize-y"
                          />
                        </details>
                      </div>

                      {/* Meta Description + Alt Text grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-lg border border-[#e8e5df] bg-[#f7f7f5] p-4">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[11px] font-semibold text-[#8b7355] uppercase tracking-[0.1em]">Meta Description</span>
                            <button
                              onClick={() => copyToClipboard(listing.metaDescription, "meta")}
                              className={`text-[11px] font-semibold px-3 py-1 rounded-full transition-all duration-200 ${
                                copiedField === "meta" ? "bg-green-50 text-green-600" : "text-[#8c8c8c] hover:text-[#0a0a0a] hover:bg-white"
                              }`}
                            >
                              {copiedField === "meta" ? "Copied!" : "Copy"}
                            </button>
                          </div>
                          <textarea
                            value={listing.metaDescription}
                            onChange={(e) => setListing({ ...listing, metaDescription: e.target.value })}
                            rows={3}
                            className="w-full rounded-lg border border-[#e8e5df] bg-white px-3 py-2.5 text-sm text-[#0a0a0a] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#8b7355]/20 focus:border-[#8b7355] transition-all duration-200 resize-none"
                          />
                          <p className="text-[10px] text-[#b0b0b0] mt-1.5 tracking-wide">{listing.metaDescription.length} / 155 characters</p>
                        </div>

                        <div className="rounded-lg border border-[#e8e5df] bg-[#f7f7f5] p-4">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[11px] font-semibold text-[#8b7355] uppercase tracking-[0.1em]">Image Alt Text</span>
                            <button
                              onClick={() => copyToClipboard(listing.altText, "alt")}
                              className={`text-[11px] font-semibold px-3 py-1 rounded-full transition-all duration-200 ${
                                copiedField === "alt" ? "bg-green-50 text-green-600" : "text-[#8c8c8c] hover:text-[#0a0a0a] hover:bg-white"
                              }`}
                            >
                              {copiedField === "alt" ? "Copied!" : "Copy"}
                            </button>
                          </div>
                          <input
                            type="text"
                            value={listing.altText}
                            onChange={(e) => setListing({ ...listing, altText: e.target.value })}
                            className="w-full rounded-lg border border-[#e8e5df] bg-white px-3 py-2.5 text-sm text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/20 focus:border-[#8b7355] transition-all duration-200"
                          />
                          <p className="text-[10px] text-[#b0b0b0] mt-1.5 tracking-wide">{listing.altText.length} / 125 characters</p>
                        </div>
                      </div>

                      {/* Product Attributes */}
                      <div className="rounded-lg border border-[#e8e5df] bg-[#f7f7f5] p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-semibold text-[#8b7355] uppercase tracking-[0.1em]">Product Attributes</span>
                          <button
                            onClick={() => {
                              const a = listing.attributes;
                              const text = Object.entries(a).map(([k, v]) => `${k}: ${v}`).join("\n");
                              copyToClipboard(text, "attrs");
                            }}
                            className={`text-[11px] font-semibold px-3 py-1 rounded-full transition-all duration-200 ${
                              copiedField === "attrs" ? "bg-green-50 text-green-600" : "text-[#8c8c8c] hover:text-[#0a0a0a] hover:bg-white"
                            }`}
                          >
                            {copiedField === "attrs" ? "Copied!" : "Copy All"}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
                              <label className="block text-[10px] font-semibold text-[#8c8c8c] uppercase tracking-[0.08em] mb-1.5">{label}</label>
                              <input
                                type="text"
                                value={listing.attributes[key]}
                                onChange={(e) => setListing({
                                  ...listing,
                                  attributes: { ...listing.attributes, [key]: e.target.value },
                                })}
                                className="w-full rounded-lg border border-[#e8e5df] bg-white px-3 py-2 text-sm text-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/20 focus:border-[#8b7355] transition-all duration-200"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          onClick={() => handleGenerateListing("refine")}
                          disabled={listingLoading}
                          className="flex-1 py-3 rounded-full font-semibold text-[13px] transition-all duration-200 active:scale-[0.98] bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] disabled:opacity-50"
                        >
                          {listingLoading ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Refining...
                            </span>
                          ) : (
                            <>Refine with AI <span className="ml-1 text-[11px] opacity-70">(5 tokens)</span></>
                          )}
                        </button>
                        <button
                          onClick={() => { setListing(null); handleGenerateListing("auto"); }}
                          disabled={listingLoading}
                          className="flex-1 py-3 rounded-full font-medium text-[13px] transition-all duration-200 active:scale-[0.98] bg-white border border-[#e8e5df] text-[#4a4a4a] hover:bg-[#f5f0e8] hover:border-[#c4a67d] disabled:opacity-50"
                        >
                          Regenerate from Scratch <span className="ml-1 text-[11px] opacity-60">(5 tokens)</span>
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
                        className={`w-full py-3.5 rounded-full font-semibold text-[13px] transition-all duration-200 active:scale-[0.98] ${
                          copiedField === "all"
                            ? "bg-green-50 text-green-600 border border-green-200"
                            : "bg-[#0a0a0a] text-white hover:bg-[#1a1a1a]"
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
            <div className="flex flex-col items-center justify-center gap-6 py-24 sm:py-36 animate-fade-in">
              {/* Animated rings */}
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-2 border-[#e8e5df] rounded-full" />
                <div className="absolute inset-0 border-2 border-transparent border-t-[#8b7355] rounded-full animate-spin" />
                <div className="absolute inset-2 border-2 border-transparent border-t-[#c4a67d] rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                <div className="absolute inset-4 border-2 border-transparent border-t-[#e8e5df] rounded-full animate-spin" style={{ animationDuration: "2s" }} />
              </div>
              <div className="text-center">
                <h2 className="font-display font-bold text-[#0a0a0a] text-lg sm:text-xl uppercase tracking-tight">
                  {step === "generating-hero"
                    ? "Generating Hero Shot"
                    : "Generating Additional Angles"}
                </h2>
                <p className="text-[13px] text-[#8c8c8c] mt-2">
                  {genStatus
                    ? genStatus
                    : step === "generating-hero"
                      ? "Creating your studio-quality product photo..."
                      : "Generating close-up crop + alternate angle..."}
                </p>
              </div>
              <div className="w-48 h-1 rounded-full overflow-hidden bg-[#e8e5df]">
                <div className="h-full rounded-full animate-shimmer" />
              </div>
              {genStatus ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  <p className="text-[12px] text-amber-700 font-medium">Auto-retrying — please wait</p>
                </div>
              ) : (
                <p className="text-[12px] text-[#b0b0b0] tracking-wide">This takes 15–30 seconds</p>
              )}
            </div>
          ) : (

            /* ── Setup Flow ── */
            <div className="max-w-2xl mx-auto space-y-8 sm:space-y-10">
              {/* Title */}
              <div className="text-center animate-fade-in">
                <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
                  AI Photography Studio
                </span>
                <h1 className="font-display font-bold text-[#0a0a0a] text-[1.75rem] sm:text-[2.5rem] uppercase tracking-[-0.02em] leading-[0.95]">
                  Jewelry Photography
                </h1>
                <p className="text-[14px] sm:text-base text-[#8c8c8c] mt-3 max-w-sm mx-auto">
                  Ultra-high fidelity — every stone, every detail preserved
                </p>
              </div>

              {/* Step 1: Upload */}
              <section className="animate-slide-up">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-full bg-[#0a0a0a] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[11px] font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-[#0a0a0a] text-[14px] uppercase tracking-[0.02em]">Upload Jewelry Photo</h3>
                    <p className="text-[12px] text-[#8c8c8c] mt-0.5">Upload a clear, well-lit photo of your jewelry piece</p>
                  </div>
                </div>

                {imageBase64 ? (
                  <div className="flex items-start gap-4 animate-scale-in pl-0 sm:pl-10">
                    <div className="relative group">
                      <div className="w-28 h-28 sm:w-40 sm:h-40 rounded-xl overflow-hidden border border-[#e8e5df] bg-white shadow-sm">
                        <img src={imageBase64} alt="Jewelry reference" className="w-full h-full object-contain" />
                      </div>
                      <button
                        onClick={() => { setImageBase64(null); setHeroImage(null); setRestImages([]); setStep("idle"); }}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-[#0a0a0a] text-white rounded-full text-xs flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 shadow-md hover:bg-red-500"
                      >
                        ×
                      </button>
                    </div>
                    <div className="mt-2">
                      <p className="text-[12px] font-semibold text-[#0a0a0a]">Image uploaded</p>
                      <button
                        onClick={() => { setImageBase64(null); setHeroImage(null); setRestImages([]); setStep("idle"); }}
                        className="text-[12px] text-[#8b7355] hover:underline mt-0.5"
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
                <section className="animate-slide-up" style={{ animationDelay: "50ms" }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-7 h-7 rounded-full bg-[#0a0a0a] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[11px] font-bold">2</span>
                    </div>
                    <h3 className="font-display font-bold text-[#0a0a0a] text-[14px] uppercase tracking-[0.02em]">Jewelry Type</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-0 sm:pl-10">
                    {JEWELRY_TYPES.map((t: JewelryTypeOption) => (
                      <button
                        key={t.id}
                        onClick={() => setJewelryType(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium transition-all duration-200 active:scale-[0.97] ${
                          jewelryType === t.id
                            ? "bg-[#0a0a0a] text-white shadow-sm"
                            : "bg-white border border-[#e8e5df] text-[#4a4a4a] hover:border-[#c4a67d] hover:text-[#0a0a0a]"
                        }`}
                      >
                        <span className="text-base">{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Step 3: Background */}
              {imageBase64 && jewelryType && (
                <section className="animate-slide-up" style={{ animationDelay: "100ms" }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-7 h-7 rounded-full bg-[#0a0a0a] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[11px] font-bold">3</span>
                    </div>
                    <h3 className="font-display font-bold text-[#0a0a0a] text-[14px] uppercase tracking-[0.02em]">Background</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pl-0 sm:pl-10">
                    {JEWELRY_BACKGROUNDS.map((bg: JewelryBackground) => (
                      <button
                        key={bg.id}
                        onClick={() => setBackgroundId(bg.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-all duration-200 active:scale-[0.97] ${
                          backgroundId === bg.id
                            ? "bg-[#0a0a0a] text-white shadow-sm"
                            : "bg-white border border-[#e8e5df] text-[#4a4a4a] hover:border-[#c4a67d] hover:text-[#0a0a0a]"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full flex-shrink-0 ${backgroundId === bg.id ? "border-2 border-white/40" : "border border-[#e8e5df]"}`}
                          style={{ backgroundColor: bg.swatch }}
                        />
                        <span className="text-left leading-tight">{bg.label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[13px] animate-slide-up-sm pl-0 sm:pl-10">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* Generate Button */}
              {canGenerate && (
                <div className="flex justify-center pt-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
                  <button
                    onClick={handleGenerateHero}
                    disabled={isGenerating}
                    className="w-full sm:w-auto px-10 py-4 bg-[#0a0a0a] text-white rounded-full font-semibold text-[15px] hover:bg-[#1a1a1a] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 text-center"
                  >
                    Generate Hero Shot
                    <span className="block text-[11px] opacity-60 mt-0.5">No tokens charged until full pack is generated</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
  );
}

/* ─── Image Card ──────────────────────────────────────────────── */
function ImageCard({
  img,
  onExpand,
  onDownload,
  onDownloadHD,
  onGenerateHD,
  isGeneratingHD,
  onRegenerate,
  isRegenerating,
  onCustomUpload,
  isCustomUploading,
}: {
  img: ResultImage;
  onExpand: () => void;
  onDownload: () => void;
  onDownloadHD?: () => void;
  onGenerateHD?: () => void;
  isGeneratingHD?: boolean;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  onCustomUpload?: (file: File) => void;
  isCustomUploading?: boolean;
}) {
  const isBusy = isRegenerating || isCustomUploading || isGeneratingHD;
  const busyLabel = isGeneratingHD ? "Generating HD..." : isCustomUploading ? "Processing your angle..." : "Regenerating...";

  return (
    <div className="group">
      {/* Label */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <p className="text-[11px] sm:text-[12px] font-semibold text-[#8b7355] uppercase tracking-[0.08em] text-center">
          {img.label}
        </p>
        {img.hasHD && (
          <span className="px-1.5 py-0.5 bg-[#8b7355] text-white text-[9px] font-bold rounded uppercase tracking-wider">
            HD
          </span>
        )}
      </div>
      {/* Image */}
      <div
        className={`relative overflow-hidden bg-white cursor-pointer rounded-xl border border-[#e8e5df] transition-all duration-300 ${isBusy ? "opacity-50 pointer-events-none" : "hover:shadow-lg hover:shadow-black/8 hover:-translate-y-1"}`}
        onClick={onExpand}
      >
        <div style={{ paddingBottom: "100%" }} className="relative w-full">
          {isBusy ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#f7f7f5]">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 border-2 border-transparent border-t-[#8b7355] rounded-full animate-spin" />
              </div>
              <span className="text-[11px] font-medium text-[#8c8c8c] uppercase tracking-wide">{busyLabel}</span>
            </div>
          ) : (
            <img src={img.previewUri} alt={img.label} className="absolute inset-0 w-full h-full object-cover" />
          )}
        </div>
        {!isBusy && (
          <div className="absolute inset-0 bg-black/0 sm:group-hover:bg-black/10 transition-all duration-300 flex items-end sm:items-center justify-center">
            <span className="sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 bg-white/90 sm:bg-white text-[#0a0a0a] text-[10px] sm:text-[11px] font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-md uppercase tracking-wide mb-2 sm:mb-0 backdrop-blur-sm sm:backdrop-blur-none">
              Tap to Compare
            </span>
          </div>
        )}
        {img.hasHD && !isBusy && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-1 bg-[#8b7355]/90 text-white text-[9px] font-bold rounded-lg backdrop-blur-sm uppercase tracking-wider">
              {img.hdWidth}×{img.hdHeight}
            </span>
          </div>
        )}
      </div>
      {/* Actions */}
      <div className="mt-2 sm:mt-2.5 flex gap-1.5 sm:gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          className="flex-1 py-2.5 sm:py-2.5 text-[11px] sm:text-[12px] font-semibold text-[#4a4a4a] bg-white border border-[#e8e5df] rounded-lg hover:bg-[#0a0a0a] hover:text-white hover:border-[#0a0a0a] transition-all duration-200 active:scale-[0.98] uppercase tracking-wide"
        >
          Download
        </button>
        {onRegenerate && (
          <button
            onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
            disabled={isBusy}
            className="px-2.5 sm:px-3 py-2.5 text-[#8c8c8c] bg-white border border-[#e8e5df] rounded-lg hover:bg-[#f5f0e8] hover:text-[#8b7355] hover:border-[#c4a67d] transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
            title="Regenerate this image"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        )}
      </div>
      {/* HD actions */}
      {onDownloadHD && img.hasHD ? (
        <button
          onClick={(e) => { e.stopPropagation(); onDownloadHD(); }}
          className="mt-1.5 w-full py-2.5 text-[11px] sm:text-[12px] font-bold text-white bg-[#8b7355] border border-[#8b7355] rounded-lg hover:bg-[#7a6448] transition-all duration-200 active:scale-[0.98] uppercase tracking-wide flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Download HD ({img.hdWidth}×{img.hdHeight})
        </button>
      ) : onGenerateHD && !img.hasHD ? (
        <button
          onClick={(e) => { e.stopPropagation(); onGenerateHD(); }}
          disabled={isBusy}
          className="mt-1.5 w-full py-2.5 text-[11px] sm:text-[12px] font-semibold text-[#8b7355] bg-[#f5f0e8] border border-[#e8e5df] rounded-lg hover:bg-[#ede5d8] hover:border-[#c4a67d] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 uppercase tracking-wide flex items-center justify-center gap-1.5"
        >
          {isGeneratingHD ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-[#8b7355] border-t-transparent rounded-full animate-spin" />
              Generating HD...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Generate HD <span className="text-[10px] opacity-60 ml-0.5">(10 tokens)</span>
            </>
          )}
        </button>
      ) : null}
      {/* Custom angle upload option */}
      {onCustomUpload && !isBusy && (
        <label className="mt-2 flex items-center justify-center gap-1.5 py-2 text-[10px] sm:text-[11px] font-medium text-[#8b7355] bg-[#f5f0e8] border border-[#e8e5df] rounded-lg cursor-pointer hover:bg-[#ede5d8] hover:border-[#c4a67d] transition-all duration-200 active:scale-[0.98]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Upload your own angle
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onCustomUpload(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

/* ─── Jewelry Pricing Modal ─── */
const JEWELRY_BUNDLES = [
  { tokens: 50, price: 500, perToken: 10, label: "Starter" },
  { tokens: 100, price: 800, perToken: 8, label: "Popular", popular: true },
  { tokens: 200, price: 1500, perToken: 7.5, label: "Pro" },
  { tokens: 500, price: 3000, perToken: 6, label: "Business", best: true },
];

function JewelryPricingModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="p-6 sm:p-8">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#f5f0e8] text-[#8b7355] hover:bg-[#e8e0d0] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5f0e8] text-[#8b7355] text-xs font-semibold uppercase tracking-wider mb-3">Token Packs</div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1b1b1f] tracking-tight">Jewelry Studio Tokens</h2>
          </div>

          <div className="mb-5 p-3 rounded-xl bg-[#fafaf8] border border-[#e8e5df]">
            <p className="text-[10px] font-bold text-[#8b7355] uppercase tracking-wider mb-2">Token costs</p>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
              <span className="text-[#8c8c8c]">Photo Pack (3 images)</span><span className="text-right font-semibold text-[#1b1b1f]">40 tokens</span>
              <span className="text-[#8c8c8c]">Recolor All (3 images)</span><span className="text-right font-semibold text-[#1b1b1f]">20 tokens</span>
              <span className="text-[#8c8c8c]">Recolor Single</span><span className="text-right font-semibold text-[#1b1b1f]">7 tokens</span>
              <span className="text-[#8c8c8c]">HD Upscale (Print-Ready)</span><span className="text-right font-semibold text-[#1b1b1f]">10 tokens</span>
              <span className="text-[#8c8c8c]">Listing Generation</span><span className="text-right font-semibold text-[#1b1b1f]">5 tokens</span>
            </div>
          </div>

          <div className="space-y-3">
            {JEWELRY_BUNDLES.map((b) => (
              <div key={b.tokens} className={`relative rounded-xl border-2 p-4 transition-all duration-200 ${b.popular ? "border-[#8b7355] bg-[#fdfbf7] shadow-md" : "border-[#e8e5df] bg-white hover:border-[#d4c5a9]"}`}>
                {b.popular && <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-[#8b7355] text-white text-[10px] font-bold uppercase tracking-wider rounded-full">Most Popular</span>}
                {b.best && <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-[#0a0a0a] text-white text-[10px] font-bold uppercase tracking-wider rounded-full">Best Value</span>}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-[#1b1b1f]">{b.tokens} Tokens</span>
                    <span className="text-xs text-[#8c8c8c] ml-2">{b.label}</span>
                    <p className="text-xs text-[#8c8c8c] mt-0.5">₹{b.perToken}/token &middot; ~{Math.floor(b.tokens / 40)} full packs</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-[#1b1b1f]">₹{b.price.toLocaleString()}</div>
                    {b.perToken < 10 && <div className="text-[10px] font-medium text-green-600">Save {Math.round((1 - b.perToken / 10) * 100)}%</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center space-y-3">
            <a href="https://wa.me/916351068776?text=Hi%2C%20I%27d%20like%20to%20purchase%20tokens%20for%20SoraPixel%20Jewelry%20Studio." target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#25D366] text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg shadow-[#25D366]/20 hover:bg-[#1fb855] hover:shadow-xl active:scale-[0.98]">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Chat on WhatsApp to Purchase
            </a>
            <p className="text-[11px] text-[#b0b0b0]">Tokens are added to your account instantly after payment confirmation.</p>
          </div>
        </div>
      </div>
    </div>
  );
}