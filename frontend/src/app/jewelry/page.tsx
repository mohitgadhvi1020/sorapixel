"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { JEWELRY_TYPES, JEWELRY_BACKGROUNDS } from "@/lib/jewelry-styles";
import { JEWELRY_PRICING } from "@/lib/token-pricing";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
type Step = "idle" | "generating" | "done";

interface ResultImage {
  label: string;
  base64: string;
  url?: string;
}

interface GenerateResponse {
  success: boolean;
  images: ResultImage[];
  locked?: boolean;
  token_balance?: number;
}

interface Toast {
  id: number;
  message: string;
  type: "error" | "success" | "info";
}

interface UploadedImage {
  base64: string;
  preview: string;
}

const ASPECT_RATIOS = [
  { id: "square", label: "1:1", w: 1, h: 1 },
  { id: "portrait", label: "3:4", w: 3, h: 4 },
  { id: "story", label: "9:16", w: 9, h: 16 },
  { id: "landscape", label: "4:3", w: 4, h: 3 },
  { id: "widescreen", label: "16:9", w: 16, h: 9 },
];

const UGC_GENDERS = [
  { id: "woman", label: "Woman" },
  { id: "man", label: "Man" },
  { id: "boy", label: "Boy" },
  { id: "girl", label: "Girl" },
];

const UGC_SKIN_TONES = [
  { id: "fair", label: "Fair", color: "#F5D6B8" },
  { id: "light", label: "Light", color: "#E8B88A" },
  { id: "medium", label: "Medium", color: "#C68642" },
  { id: "tan", label: "Tan", color: "#A0622E" },
  { id: "brown", label: "Brown", color: "#7B4B2A" },
  { id: "dark", label: "Dark", color: "#4A2912" },
];

const UGC_NATIONALITIES = [
  "Indian", "East Asian", "Southeast Asian", "Japanese", "Korean", "Chinese",
  "Middle Eastern", "Arab", "Persian", "Turkish", "African", "Nigerian",
  "Ethiopian", "European", "British", "French", "Italian", "Spanish",
  "German", "Scandinavian", "Russian", "Latin American", "Brazilian",
  "Mexican", "Colombian", "American", "Canadian", "Australian",
  "Filipino", "Thai", "Vietnamese", "Indonesian", "Malaysian",
  "Pakistani", "Bangladeshi", "Sri Lankan", "Nepali",
];

const UGC_ALL_POSES = [
  { id: "standing", label: "Standing" },
  { id: "side_view", label: "Side View" },
  { id: "close_up", label: "Close Up" },
  { id: "sitting", label: "Sitting" },
  { id: "walking", label: "Walking" },
  { id: "back_view", label: "Back View" },
  { id: "hand_closeup", label: "Hand Close-up" },
  { id: "feet_closeup", label: "Feet Close-up" },
];

const UGC_BACKGROUNDS = [
  { id: "best_match", label: "Best Match", swatch: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { id: "studio", label: "Studio", swatch: "#e0e0e0" },
  { id: "flora", label: "Flora", swatch: "#4caf50" },
  { id: "wooden", label: "Wooden", swatch: "#8d6e63" },
  { id: "indoor", label: "Indoor", swatch: "#bcaaa4" },
  { id: "livingroom", label: "Living Room", swatch: "#d7ccc8" },
];

const JEWELRY_POSE_MAP: Record<string, string[]> = {
  ring: ["hand_closeup", "standing", "side_view"],
  necklace: ["standing", "close_up", "side_view", "sitting"],
  earring: ["close_up", "side_view", "standing"],
  bracelet: ["hand_closeup", "standing", "sitting"],
  bangle: ["hand_closeup", "standing", "side_view"],
  pendant: ["close_up", "standing", "sitting"],
  brooch: ["close_up", "standing", "side_view"],
  anklet: ["feet_closeup", "sitting", "standing"],
  chain: ["standing", "close_up", "side_view"],
  set: ["standing", "close_up", "side_view", "sitting"],
};

const METAL_PRESETS = [
  { id: "yellow-gold", label: "Yellow Gold", swatch: "#D4A843", metal: "yellow gold with warm lustrous finish" },
  { id: "rose-gold", label: "Rose Gold", swatch: "#B76E79", metal: "rose gold with warm pink copper tones" },
  { id: "white-gold", label: "White Gold", swatch: "#E8E4DF", metal: "white gold with bright rhodium-plated finish" },
  { id: "silver", label: "Silver", swatch: "#C0C0C0", metal: "polished sterling silver" },
  { id: "platinum", label: "Platinum", swatch: "#E5E4E2", metal: "platinum with cool bright white sheen" },
  { id: "antique-gold", label: "Antique Gold", swatch: "#996515", metal: "antique oxidized gold with aged patina" },
  { id: "copper", label: "Copper", swatch: "#B87333", metal: "polished copper with warm reddish-brown tones" },
  { id: "gunmetal", label: "Gunmetal", swatch: "#4A4A4A", metal: "dark gunmetal grey with matte finish" },
  { id: "custom", label: "Custom", swatch: "conic-gradient(#D4A843, #C0C0C0, #B76E79, #B87333)" },
];

export default function JewelryPageWrapper() {
  return (
    <Suspense fallback={null}>
      <JewelryPage />
    </Suspense>
  );
}

function JewelryPage() {
  const { user } = useAuth();
  const { credits, refreshCredits } = useCredits();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [sessionRestoring, setSessionRestoring] = useState(!!searchParams.get("session"));

  // Upload state
  const [mainImage, setMainImage] = useState<UploadedImage | null>(null);
  const [altImages, setAltImages] = useState<UploadedImage[]>([]);

  // Config state
  const [jewelryType, setJewelryType] = useState<string>("ring");
  const [backgroundId, setBackgroundId] = useState<string>("black-velvet");
  const [aspectRatioId, setAspectRatioId] = useState<string>("square");
  const selectedRatio = ASPECT_RATIOS.find((r) => r.id === aspectRatioId) ?? ASPECT_RATIOS[0];
  const cssAspectRatio = `${selectedRatio.w}/${selectedRatio.h}`;
  const [specialInstructions, setSpecialInstructions] = useState<string>("");
  const [quality, setQuality] = useState<"standard" | "pro">("standard");

  // Generation state
  const [step, setStep] = useState<Step>("idle");
  const [genStatus, setGenStatus] = useState<string | null>(null);
  const [resultImages, setResultImages] = useState<ResultImage[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);
  const [regenIndex, setRegenIndex] = useState<number | null>(null);
  const [justUpdatedIndex, setJustUpdatedIndex] = useState<number | null>(null);
  const resultRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  // Feature states
  const [ugcLoading, setUgcLoading] = useState(false);
  const [ugcImages, setUgcImages] = useState<ResultImage[]>([]);
  const [ugcLightbox, setUgcLightbox] = useState<number | null>(null);
  const [ugcGenCount, setUgcGenCount] = useState(0);
  const [ugcModalOpen, setUgcModalOpen] = useState(false);
  const [ugcGender, setUgcGender] = useState("woman");
  const [ugcNationality, setUgcNationality] = useState("Indian");
  const [ugcNatSearch, setUgcNatSearch] = useState("");
  const [ugcNatOpen, setUgcNatOpen] = useState(false);
  const [ugcSkinTone, setUgcSkinTone] = useState("medium");
  const [ugcPoses, setUgcPoses] = useState<string[]>([]);
  const [ugcBackground, setUgcBackground] = useState("best_match");
  const [ugcQuality, setUgcQuality] = useState("standard");
  const [ugcSourceIndex, setUgcSourceIndex] = useState(0);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueData, setCatalogueData] = useState<Record<string, unknown> | null>(null);
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editMeta, setEditMeta] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAltText, setEditAltText] = useState("");
  const [editAttributes, setEditAttributes] = useState<Record<string, string>>({});
  const [hasBrandConfig, setHasBrandConfig] = useState<boolean | null>(null);
  const [recolorMetal, setRecolorMetal] = useState<string | null>(null);
  const [recolorCustom, setRecolorCustom] = useState("");
  const [recolorImageIdx, setRecolorImageIdx] = useState(0);
  const [recolorQuality, setRecolorQuality] = useState<"standard" | "pro">("standard");
  const [recolorLoading, setRecolorLoading] = useState(false);
  const [recolorResults, setRecolorResults] = useState<ResultImage[]>([]);
  const [recolorLightbox, setRecolorLightbox] = useState<number | null>(null);
  const [brandName, setBrandName] = useState(user?.company_name || "");
  const [brandPhone, setBrandPhone] = useState(user?.phone || "");
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [brandedImages, setBrandedImages] = useState<ResultImage[]>([]);
  const [brandedLightbox, setBrandedLightbox] = useState<number | null>(null);
  const [brandingModalOpen, setBrandingModalOpen] = useState(false);
  const [brandingSelectedIdxs, setBrandingSelectedIdxs] = useState<number[]>([]);

  // Toast
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const altInputRef = useRef<HTMLInputElement>(null);

  function imgSrc(img: ResultImage): string {
    if (img.url) return img.url;
    if (img.base64) return `data:image/png;base64,${img.base64}`;
    return "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  }

  function getSourceImage(resultIndex: number): UploadedImage {
    if (resultIndex === 0) return mainImage!;
    return altImages[resultIndex - 1] ?? mainImage!;
  }

  async function resolveBase64(img: { base64?: string; url?: string; preview?: string }): Promise<string> {
    if (img.base64) return img.base64;
    const fallbackUrl = img.url || img.preview;
    if (fallbackUrl) {
      const resp = await fetch(fallbackUrl);
      const blob = await resp.blob();
      const dataUrl: string = await new Promise((res) => {
        const r = new FileReader();
        r.onloadend = () => res(r.result as string);
        r.readAsDataURL(blob);
      });
      return dataUrl.replace(/^data:image\/\w+;base64,/, "");
    }
    return "";
  }

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

  function requireAuth(): boolean {
    if (user) return true;
    router.push("/login?redirect=/jewelry");
    return false;
  }

  useEffect(() => {
    const sid = searchParams.get("session");
    if (!sid || sessionLoaded) return;
    setSessionLoaded(true);
    setSessionRestoring(true);

    const timeout = setTimeout(() => setSessionRestoring(false), 15000);

    (async () => {
      try {
        const session = await api.get<{
          id: string;
          jewelry_type: string;
          background: string;
          aspect_ratio_id: string | null;
          quality: string;
          original_image_url: string;
          actions: Array<{
            action_type: string;
            quality: string;
            output_images: Array<{ label: string; url: string }>;
            output_text: Record<string, unknown> | null;
          }>;
        }>(`/sessions/${sid}`);

        setSessionId(session.id);
        if (session.jewelry_type) setJewelryType(session.jewelry_type);
        if (session.background) setBackgroundId(session.background);
        if (session.aspect_ratio_id) setAspectRatioId(session.aspect_ratio_id);
        if (session.quality) setQuality(session.quality as "standard" | "pro");

        if (session.original_image_url) {
          setMainImage({ base64: "", preview: session.original_image_url });
        }

        const restoredImages: ResultImage[] = [];
        const restoredUgc: ResultImage[] = [];
        const restoredBranded: ResultImage[] = [];
        const restoredRecolor: ResultImage[] = [];
        let restoredListing: Record<string, unknown> | null = null;

        for (const action of session.actions) {
          const imgs = (action.output_images || []).filter((i) => i.url);
          if (action.action_type === "ugc") {
            for (const img of imgs) {
              restoredUgc.push({ base64: "", label: img.label, url: img.url } as ResultImage & { url: string });
            }
          } else if (action.action_type === "listing" && action.output_text) {
            restoredListing = action.output_text;
          } else if (action.action_type === "branding") {
            for (const img of imgs) {
              restoredBranded.push({ base64: "", label: img.label, url: img.url } as ResultImage & { url: string });
            }
          } else if (action.action_type === "recolor") {
            for (const img of imgs) {
              restoredRecolor.push({ base64: "", label: img.label, url: img.url } as ResultImage & { url: string });
            }
          } else {
            for (const img of imgs) {
              restoredImages.push({ base64: "", label: img.label, url: img.url } as ResultImage & { url: string });
            }
          }
        }

        if (restoredImages.length > 0) {
          setResultImages(restoredImages);
          setStep("done");
        }
        if (restoredUgc.length > 0) setUgcImages(restoredUgc);
        if (restoredBranded.length > 0) setBrandedImages(restoredBranded);
        if (restoredRecolor.length > 0) setRecolorResults(restoredRecolor);
        if (restoredListing) setCatalogueData(restoredListing);
      } catch {
        // Session not found or expired — start fresh
      } finally {
        clearTimeout(timeout);
        setSessionRestoring(false);
      }
    })();
  }, [searchParams, sessionLoaded]);

  function readFile(file: File): Promise<UploadedImage> {
    return new Promise((resolve, reject) => {
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error("File too large. Max 10MB."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve({ preview: result, base64: result.split(",")[1] });
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function handleMainUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const img = await readFile(file);
      setMainImage(img);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed");
    }
  }

  function handleMainDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleMainUpload(fakeEvent);
  }

  async function handleAltUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      try {
        const img = await readFile(files[i]);
        setAltImages((prev) => [...prev, img]);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Upload failed");
      }
    }
    if (altInputRef.current) altInputRef.current.value = "";
  }

  function removeAltImage(index: number) {
    setAltImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function basePayload() {
    const b64 = await resolveBase64(mainImage!);
    return {
      image_base64: b64,
      jewelry_type: jewelryType,
      background: backgroundId,
      aspect_ratio_id: aspectRatioId,
      quality,
      ...(specialInstructions.trim() ? { special_instructions: specialInstructions.trim() } : {}),
    };
  }

  async function generateAll() {
    if (!mainImage) return;
    if (!requireAuth()) return;
    setStep("generating");
    const totalCount = 1 + altImages.length;
    setGenStatus(`Generating ${totalCount} photo${totalCount > 1 ? "s" : ""}...`);
    setResultImages([]);

    let activeSessionId = sessionId;
    if (!activeSessionId) {
      try {
        const sessB64 = await resolveBase64(mainImage);
        const sess = await api.post<{ id: string }>("/sessions", {
          image_base64: sessB64,
          jewelry_type: jewelryType,
          background: backgroundId,
          aspect_ratio_id: aspectRatioId,
          quality,
        });
        activeSessionId = sess.id;
        setSessionId(sess.id);
        window.history.replaceState(null, "", `/jewelry?session=${sess.id}`);
      } catch {
        // Non-blocking — continue without session
      }
    }

    try {
      const data = await api.post<GenerateResponse>("/jewelry/generate", {
        ...(await basePayload()),
        step: "all",
        session_id: activeSessionId,
        alt_images_base64: altImages.length > 0 ? altImages.map((a) => a.base64) : undefined,
      });
      if (data.success && data.images.length > 0) {
        setResultImages(data.images);
        setStep("done");
        setGenStatus(null);
        setIsLocked(!!data.locked);
        refreshCredits();
        scrollToResults();
        showToast(`${data.images.length} photo${data.images.length > 1 ? "s" : ""} generated!`, "success");
      } else {
        throw new Error("No images returned");
      }
    } catch (err) {
      setStep("idle");
      setGenStatus(null);
      showToast(err instanceof Error ? err.message : "Generation failed");
    }
  }

  async function regenerateShot(index: number) {
    if (!mainImage) return;
    setRegenIndex(index);

    const hasTweak = specialInstructions.trim().length > 0;
    const currentImage = resultImages[index];

    try {
      const regenB64 = hasTweak ? await resolveBase64(currentImage) : "";
      const data = await api.post<GenerateResponse>("/jewelry/generate", {
        ...(await basePayload()),
        step: "regen_hero",
        session_id: sessionId,
        ...(hasTweak && regenB64 ? { image_base64: regenB64 } : {}),
      });
      if (data.success && data.images.length > 0) {
        const tryNum = resultImages.length + 1;
        const newImage = {
          ...data.images[0],
          label: `Hero Shot — Try ${tryNum}`,
        };

        setResultImages((prev) => [newImage, ...prev]);
        refreshCredits();

        setJustUpdatedIndex(0);
        setTimeout(() => {
          resultRefs.current[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        setTimeout(() => setJustUpdatedIndex(null), 2000);

        showToast(
          hasTweak
            ? `Applied changes — new version added!`
            : `New version generated!`,
          "success",
        );
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setRegenIndex(null);
    }
  }

  function openUgcModal() {
    const jType = jewelryType?.toLowerCase().replace(/\s+/g, "") || "";
    const recommended = JEWELRY_POSE_MAP[jType] || JEWELRY_POSE_MAP["necklace"];
    setUgcPoses(recommended.slice(0, 2));
    setUgcSourceIndex(0);
    setUgcModalOpen(true);
  }

  async function generateUGC() {
    if (resultImages.length === 0 || ugcPoses.length === 0) return;
    const sourceIdx = Math.min(ugcSourceIndex, resultImages.length - 1);
    setUgcModalOpen(false);
    setUgcLoading(true);
    try {
      const imgB64 = await resolveBase64(resultImages[sourceIdx]);
      const data = await api.post<GenerateResponse>("/catalogue/generate", {
        image_base64: imgB64,
        gender: ugcGender,
        nationality: ugcNationality,
        skin_tone: ugcSkinTone,
        jewelry_type: jewelryType?.toLowerCase().replace(/\s+/g, "") || undefined,
        poses: ugcPoses,
        quality: ugcQuality,
        background: ugcBackground,
        session_id: sessionId,
        special_instructions: `This is ${jewelryType} jewelry. Show the model wearing/displaying it elegantly.`,
      });
      if (data.success && data.images.length > 0) {
        const batch = ugcGenCount + 1;
        setUgcGenCount(batch);
        const newImages = data.images.map((img: { base64: string; label?: string }, i: number) => ({
          base64: typeof img === "string" ? img : img.base64,
          label: `Set ${batch} — ${(img as ResultImage).label || `Photo ${i + 1}`}`,
        }));
        setUgcImages((prev) => [...newImages, ...prev]);
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
    if (resultImages.length === 0) return;
    setCatalogueLoading(true);
    try {
      const listingB64 = await resolveBase64(resultImages[0]);
      const data = await api.post<{ success: boolean; listing: Record<string, unknown> }>("/jewelry/listing", {
        image_base64: listingB64,
        jewelry_type: jewelryType,
        session_id: sessionId,
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

  function openListingModal() {
    if (!catalogueData) return;
    setEditTitle(String(catalogueData.title || ""));
    setEditMeta(String(catalogueData.metaDescription || ""));
    setEditDescription(String(catalogueData.description || catalogueData.raw_text || ""));
    setEditAltText(String(catalogueData.altText || ""));
    const attrs = (catalogueData.attributes || {}) as Record<string, string>;
    setEditAttributes({ ...attrs });
    setListingModalOpen(true);
  }

  function saveListingEdits() {
    const updated: Record<string, unknown> = {
      ...catalogueData,
      title: editTitle,
      metaDescription: editMeta,
      description: editDescription,
      altText: editAltText,
      attributes: editAttributes,
    };
    setCatalogueData(updated);
    setListingModalOpen(false);
    showToast("Listing saved!", "success");
  }

  async function regenerateFromEdits() {
    setCatalogueLoading(true);
    setListingModalOpen(false);
    try {
      const listingB64 = await resolveBase64(resultImages[0]);
      const data = await api.post<{ success: boolean; listing: Record<string, unknown> }>("/jewelry/listing", {
        image_base64: listingB64,
        jewelry_type: jewelryType,
        session_id: sessionId,
      });
      if (data.success && data.listing) {
        setCatalogueData(data.listing);
        refreshCredits();
        showToast("Listing regenerated!", "success");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setCatalogueLoading(false);
    }
  }

  function copyListingText() {
    const parts = [editTitle, editMeta, editDescription, editAltText].filter(Boolean);
    navigator.clipboard.writeText(parts.join("\n\n"));
    showToast("Copied to clipboard!", "success");
  }

  async function recolorImage() {
    if (!recolorMetal || resultImages.length === 0) return;
    if (!requireAuth()) return;
    const preset = METAL_PRESETS.find((p) => p.id === recolorMetal);
    const metalDesc = recolorMetal === "custom" ? recolorCustom.trim() : (preset?.metal || recolorMetal);
    if (!metalDesc) {
      showToast("Enter a custom color or hex code");
      return;
    }
    setRecolorLoading(true);
    try {
      const srcImg = resultImages[recolorImageIdx] || resultImages[0];
      const imgB64 = await resolveBase64(srcImg);
      const data = await api.post<GenerateResponse>("/jewelry/recolor", {
        image_base64: imgB64,
        target_metal: metalDesc,
        jewelry_type: jewelryType,
        quality: recolorQuality,
        session_id: sessionId,
      });
      if (data.success && data.images.length > 0) {
        const label = recolorMetal === "custom" ? recolorCustom.trim() : (preset?.label || recolorMetal);
        const newImgs = data.images.map((img) => ({ ...img, label: `Recolored — ${label}` }));
        setRecolorResults((prev) => [...newImgs, ...prev]);
        refreshCredits();
        showToast("Metal recolored!", "success");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Recolor failed");
    } finally {
      setRecolorLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      if (!brandName && user.company_name) setBrandName(user.company_name);
      if (!brandPhone && user.phone) setBrandPhone(user.phone);
    }
  }, [user]);

  useEffect(() => {
    if (hasBrandConfig !== null) return;
    api.get<{ brand?: { id: string } }>("/brands/me")
      .then((d) => setHasBrandConfig(!!d.brand))
      .catch(() => setHasBrandConfig(false));
  }, [hasBrandConfig]);

  function getAllBrandableImages(): ResultImage[] {
    return [...resultImages, ...recolorResults];
  }

  function openBrandingModal() {
    const all = getAllBrandableImages();
    if (all.length === 0) {
      showToast("Generate photos first to add branding");
      return;
    }
    setBrandingSelectedIdxs(all.map((_, i) => i));
    setBrandingModalOpen(true);
  }

  async function applyBranding() {
    const all = getAllBrandableImages();
    const selectedImages = brandingSelectedIdxs.map((i) => all[i]).filter(Boolean);
    if (selectedImages.length === 0) {
      showToast("Select at least one photo");
      return;
    }
    if (!brandName.trim() && !brandPhone.trim()) {
      showToast("Enter a brand name or phone number");
      return;
    }
    setBrandingLoading(true);
    try {
      const newBranded: ResultImage[] = [];
      for (const img of selectedImages) {
        const brandB64 = await resolveBase64(img);
        const data = await api.post<{ success: boolean; image: ResultImage }>("/jewelry/branding", {
          image_base64: brandB64,
          business_name: brandName.trim(),
          phone: brandPhone.trim(),
          background: backgroundId,
          session_id: sessionId,
        });
        if (data.success && data.image) {
          newBranded.push({ ...data.image, label: `${img.label} (Branded)` });
        }
      }
      setBrandedImages((prev) => [...prev, ...newBranded]);
      setBrandingModalOpen(false);
      showToast(`Branding applied to ${newBranded.length} image${newBranded.length !== 1 ? "s" : ""}!`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Branding failed");
    } finally {
      setBrandingLoading(false);
    }
  }

  async function downloadImage(img: ResultImage) {
    if (isLocked) {
      router.push("/pricing");
      return;
    }
    const src = imgSrc(img);
    const filename = `soraipixel-${img.label.toLowerCase().replace(/\s+/g, "-")}.png`;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch {
      const link = document.createElement("a");
      link.href = src;
      link.download = filename;
      link.target = "_blank";
      link.click();
    }
  }

  function downloadAll() {
    if (isLocked) {
      router.push("/pricing");
      return;
    }
    resultImages.forEach((img) => downloadImage(img));
  }

  function startOver() {
    setMainImage(null);
    setAltImages([]);
    setResultImages([]);
    setStep("idle");
    setGenStatus(null);
    setExpandedIndex(null);
    setCompareIndex(null);
    setRegenIndex(null);
    setUgcImages([]);
    setCatalogueData(null);
    setIsLocked(false);
    setBrandedImages([]);
    setBrandingModalOpen(false);
    setBrandingSelectedIdxs([]);
    setRecolorMetal(null);
    setRecolorCustom("");
    setRecolorResults([]);
    setQuality("standard");
    setSessionId(null);
    setSessionLoaded(false);
    window.history.replaceState(null, "", "/jewelry");
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
          Your free tokens are used up. Purchase tokens to continue.
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

  return (
    <ResponsiveLayout title="Jewelry Studio">
      {sessionRestoring && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-12 h-12 border-2 border-[#c4a67d] border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm text-neutral-300">Restoring your session...</p>
        </div>
      )}
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
            {credits && (
              <span className="text-[11px] text-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 rounded-full">
                {credits.token_balance} tokens
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white font-display">
            Jewelry Studio
          </h1>
          <p className="text-sm text-[rgba(255,255,255,0.55)] mt-1">
            Upload your jewelry photos and generate studio-quality hero and angle shots.
          </p>
        </div>

        {/* ===== UPLOAD + CONFIG ===== */}
        {step === "idle" && (
          <div className="space-y-6">
            {/* Main image upload */}
            <div>
              <label className="text-xs font-semibold text-[rgba(255,255,255,0.6)] uppercase tracking-wider mb-3 block">
                Main Product Photo
              </label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleMainDrop}
                className="relative border-2 border-dashed border-[rgba(196,166,125,0.3)] rounded-2xl p-8 md:p-12 text-center hover:border-[rgba(196,166,125,0.5)] transition-colors cursor-pointer bg-[rgba(196,166,125,0.03)]"
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleMainUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {mainImage ? (
                  <div className="flex flex-col items-center gap-4">
                    <img
                      src={mainImage.preview}
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
                      <p className="text-[rgba(255,255,255,0.4)] text-sm mt-0.5">This will be used for your hero shot</p>
                    </div>
                    <p className="text-[rgba(255,255,255,0.4)] text-xs">PNG, JPG up to 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional photo uploads */}
            <div>
              <label className="text-xs font-semibold text-[rgba(255,255,255,0.6)] uppercase tracking-wider mb-3 block">
                Additional Photos <span className="text-[rgba(255,255,255,0.4)] font-normal">(optional)</span>
              </label>
              <p className="text-xs text-[rgba(255,255,255,0.35)] mb-3">
                Upload more photos. Each gets its own studio-quality enhancement.
              </p>
              <div className="flex flex-wrap gap-3">
                {altImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={img.preview}
                      alt={`Alt ${i + 1}`}
                      className="w-24 h-24 object-cover rounded-xl border border-[rgba(255,255,255,0.1)]"
                    />
                    <button
                      onClick={() => removeAltImage(i)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                    <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white/70 px-1.5 py-0.5 rounded-md font-semibold">
                      Photo {i + 2}
                    </span>
                  </div>
                ))}
                <button
                  onClick={() => altInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-[rgba(255,255,255,0.1)] hover:border-[rgba(196,166,125,0.3)] transition-colors flex flex-col items-center justify-center gap-1 text-[rgba(255,255,255,0.3)] hover:text-[#c4a67d]"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span className="text-[10px] font-semibold">Add</span>
                </button>
                <input
                  ref={altInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  onChange={handleAltUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Jewelry type */}
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

            {/* Background */}
            <div>
              <label className="text-xs font-semibold text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-3 block">
                Background
              </label>
              <div className="flex flex-wrap gap-3">
                {JEWELRY_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setBackgroundId(bg.id)}
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      backgroundId === bg.id
                        ? "bg-[rgba(196,166,125,0.15)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]"
                        : "bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        backgroundId === bg.id
                          ? "border-[#c4a67d]"
                          : "border-[rgba(255,255,255,0.12)]"
                      }`}
                      style={{ backgroundColor: bg.swatch }}
                    />
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced settings toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.35)] hover:text-[rgba(255,255,255,0.6)] transition-colors"
            >
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-200 ${showAdvanced ? "rotate-90" : ""}`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Advanced Settings
              {(aspectRatioId !== "square" || quality !== "standard" || specialInstructions.trim()) && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#c4a67d]" />
              )}
            </button>

            <div
              className={`space-y-5 overflow-hidden transition-all duration-300 ease-in-out ${
                showAdvanced ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {/* Aspect Ratio */}
              <div>
                <label className="text-xs font-semibold text-[rgba(255,255,255,0.6)] uppercase tracking-wider mb-3 block">
                  Aspect Ratio
                </label>
                <div className="flex flex-wrap gap-3">
                  {ASPECT_RATIOS.map((ar) => (
                    <button
                      key={ar.id}
                      onClick={() => setAspectRatioId(ar.id)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        aspectRatioId === ar.id
                          ? "bg-[rgba(196,166,125,0.15)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]"
                          : "bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"
                      }`}
                    >
                      <div
                        className="border border-current rounded-sm"
                        style={{
                          width: `${Math.round(20 * (ar.w / Math.max(ar.w, ar.h)))}px`,
                          height: `${Math.round(20 * (ar.h / Math.max(ar.w, ar.h)))}px`,
                        }}
                      />
                      {ar.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special instructions */}
              <div>
                <label className="text-xs font-semibold text-[rgba(255,255,255,0.6)] uppercase tracking-wider mb-2 block">
                  Special Instructions <span className="text-[rgba(255,255,255,0.4)] font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 120))}
                    placeholder="e.g. Add sparkle effects, warm golden tone, dramatic shadows..."
                    className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(196,166,125,0.4)] focus:bg-[rgba(196,166,125,0.03)] transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[rgba(255,255,255,0.35)]">
                    {specialInstructions.length}/120
                  </span>
                </div>
              </div>

              {/* Quality toggle */}
              <div>
                <label className="text-xs font-semibold text-[rgba(255,255,255,0.6)] uppercase tracking-wider mb-3 block">
                  Quality
                </label>
                <div className="inline-flex rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] p-1">
                  <button
                    onClick={() => setQuality("standard")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      quality === "standard"
                        ? "bg-[rgba(255,255,255,0.1)] text-white shadow-sm"
                        : "text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.7)]"
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setQuality("pro")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                      quality === "pro"
                        ? "bg-gradient-to-r from-[rgba(196,166,125,0.2)] to-[rgba(196,166,125,0.1)] text-[#c4a67d] shadow-sm border border-[rgba(196,166,125,0.2)]"
                        : "text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.7)]"
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    Pro
                  </button>
                </div>
                <p className="text-[11px] text-[rgba(255,255,255,0.45)] mt-2">
                  {quality === "pro"
                    ? "Studio-quality output — sharper textures, precise lighting (3x token cost)"
                    : "Fast, high-quality output — great for most uses"}
                </p>
              </div>
            </div>

            {/* Generate button */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={generateAll}
                disabled={!mainImage}
                className="px-6 py-3 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-sm font-semibold rounded-full shadow-[0_4px_20px_rgba(196,166,125,0.3)] hover:shadow-[0_6px_30px_rgba(196,166,125,0.45)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                Generate Photos
                {altImages.length > 0 && (
                  <span className="ml-1.5 opacity-75">({1 + altImages.length} images)</span>
                )}
              </button>
              <span className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.45)]">
                {quality === "pro" ? (
                  <span className="text-[#c4a67d] font-semibold">
                    ~{(1 + altImages.length) * JEWELRY_PRICING.pro.imageGen} tokens (Pro)
                  </span>
                ) : (
                  <span>~{(1 + altImages.length) * JEWELRY_PRICING.standard.imageGen} tokens</span>
                )}
                {credits && <span>/ {credits.token_balance} available</span>}
              </span>
            </div>
          </div>
        )}

        {/* ===== GENERATING STATE ===== */}
        {step === "generating" && (
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
              Creating studio-quality photos with consistent lighting and background...
            </p>
          </div>
        )}

        {/* ===== RESULTS ===== */}
        {step === "done" && resultImages.length > 0 && (
          <div ref={resultsRef} className="space-y-6 scroll-mt-6">
            {/* Results header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-bold text-white">Your Photos</h2>
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

            {/* Side-by-side comparison */}
            {compareIndex !== null && resultImages[compareIndex] && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#c4a67d]">
                    Comparing: {resultImages[compareIndex].label}
                  </span>
                  <button
                    onClick={() => setCompareIndex(null)}
                    className="text-xs text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
                  >
                    Close
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 max-w-3xl mx-auto">
                  <div className="rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.4)] flex flex-col">
                    <div className="px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.55)]">Original</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-2">
                      <img
                        src={getSourceImage(compareIndex).preview}
                        alt="Original"
                        className="max-w-full max-h-[60vh] rounded-lg object-contain"
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-[rgba(196,166,125,0.2)] bg-[rgba(0,0,0,0.4)] flex flex-col">
                    <div className="px-3 py-2 border-b border-[rgba(196,166,125,0.15)]">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#c4a67d]">{resultImages[compareIndex].label}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-2">
                      <img
                        src={imgSrc(resultImages[compareIndex])}
                        alt={resultImages[compareIndex].label}
                        className="max-w-full max-h-[60vh] rounded-lg object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results grid */}
            <div className={`grid gap-4 ${resultImages.length === 1 ? "grid-cols-1 max-w-lg mx-auto" : resultImages.length <= 3 ? "grid-cols-1 md:grid-cols-" + resultImages.length : "grid-cols-2 md:grid-cols-3"}`}>
              {resultImages.map((img, i) => (
                <div
                  key={`result-${i}-${img.label}`}
                  ref={(el) => { resultRefs.current[i] = el; }}
                  className={`rounded-2xl overflow-hidden border bg-[rgba(255,255,255,0.02)] transition-all duration-500 group ${
                    justUpdatedIndex === i
                      ? "border-[#c4a67d] ring-2 ring-[rgba(196,166,125,0.3)]"
                      : "border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"
                  }`}
                >
                  <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {i === 0 && resultImages.length > 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-[rgba(196,166,125,0.2)] text-[#c4a67d]">Latest</span>
                      )}
                      <span className="text-xs font-semibold text-white uppercase tracking-wider">{img.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isLocked && (
                        <>
                          <button
                            onClick={() => regenerateShot(i)}
                            disabled={regenIndex === i}
                            className="text-[11px] text-[rgba(255,255,255,0.45)] hover:text-[#c4a67d] transition-colors uppercase tracking-wider font-semibold disabled:opacity-50 flex items-center gap-1"
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
                            className={`text-[11px] uppercase tracking-wider font-semibold transition-colors ${
                              compareIndex === i ? "text-[#c4a67d]" : "text-[rgba(255,255,255,0.45)] hover:text-[#c4a67d]"
                            }`}
                          >
                            Compare
                          </button>
                          <button
                            onClick={() => downloadImage(img)}
                            className="text-[11px] text-[rgba(255,255,255,0.45)] hover:text-[#c4a67d] transition-colors uppercase tracking-wider font-semibold"
                          >
                            Save
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <img
                      src={imgSrc(img)}
                      alt={img.label}
                      className={`w-full object-cover ${isLocked ? "blur-lg" : "cursor-pointer"}`}
                      style={{ aspectRatio: cssAspectRatio }}
                      onClick={() => !isLocked && setExpandedIndex(i)}
                    />
                    {isLocked && <LockedOverlay />}
                  </div>
                </div>
              ))}
            </div>

            {/* Original upload -- opens in modal */}
            <button
              onClick={() => setShowOriginal(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition-all cursor-pointer"
            >
              <img
                src={mainImage!.preview}
                alt="Original"
                className="w-7 h-7 rounded object-cover border border-[rgba(255,255,255,0.1)]"
              />
              <span className="text-[11px] text-[rgba(255,255,255,0.55)]">Original</span>
            </button>
            {showOriginal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                onClick={() => setShowOriginal(false)}
              >
                <div className="relative max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setShowOriginal(false)}
                    className="absolute -top-10 right-0 text-xs text-[rgba(255,255,255,0.6)] hover:text-white transition-colors"
                  >
                    Close
                  </button>
                  <img
                    src={mainImage!.preview}
                    alt="Original Upload"
                    className="w-full max-h-[80vh] object-contain rounded-2xl"
                  />
                </div>
              </div>
            )}

            {/* Tweak + regenerate bar */}
            {!isLocked && (
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && specialInstructions.trim()) regenerateShot(0);
                    }}
                    placeholder="Describe changes, e.g. 'add softer lighting', 'brighter background'..."
                    className="w-full px-4 py-2.5 pr-20 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(196,166,125,0.3)] focus:ring-1 focus:ring-[rgba(196,166,125,0.15)] transition-all"
                  />
                  <button
                    onClick={() => regenerateShot(0)}
                    disabled={regenIndex !== null}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all disabled:opacity-40 bg-[rgba(196,166,125,0.15)] text-[#c4a67d] hover:bg-[rgba(196,166,125,0.25)]"
                  >
                    {regenIndex !== null ? (
                      <div className="w-3.5 h-3.5 border-2 border-[rgba(196,166,125,0.3)] border-t-[#c4a67d] rounded-full animate-spin" />
                    ) : (
                      "Redo"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ===== UGC / MODEL PHOTOS — Featured Section ===== */}
            <div className="pt-5 border-t border-[rgba(255,255,255,0.06)]">
              <div className="rounded-2xl border border-[rgba(196,166,125,0.12)] bg-gradient-to-br from-[rgba(196,166,125,0.04)] to-[rgba(255,255,255,0.02)] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[rgba(196,166,125,0.12)] flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Model / UGC Photos</h3>
                      <p className="text-[11px] text-white/50">Generate AI model photos wearing your jewelry</p>
                    </div>
                  </div>
                  {ugcImages.length > 0 && (
                    <button
                      onClick={openUgcModal}
                      disabled={ugcLoading}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[#c4a67d] border border-[rgba(196,166,125,0.2)] hover:bg-[rgba(196,166,125,0.08)] transition-all disabled:opacity-50"
                    >
                      {ugcLoading ? "Generating..." : "+ Generate More"}
                    </button>
                  )}
                </div>

                {ugcImages.length > 0 ? (
                  <div className="space-y-4">
                    {(() => {
                      const batches: { title: string; images: { img: ResultImage; globalIdx: number }[] }[] = [];
                      let currentBatch: typeof batches[0] | null = null;
                      ugcImages.forEach((img, i) => {
                        const setMatch = img.label.match(/^Set (\d+)/);
                        const batchTitle = setMatch ? `Set ${setMatch[1]}` : "Set 1";
                        if (!currentBatch || currentBatch.title !== batchTitle) {
                          currentBatch = { title: batchTitle, images: [] };
                          batches.push(currentBatch);
                        }
                        currentBatch.images.push({ img, globalIdx: i });
                      });
                      return batches.map((batch, bIdx) => (
                        <div key={batch.title}>
                          {batches.length > 1 && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">{batch.title}</span>
                              {bIdx === 0 && <span className="text-[10px] font-medium text-[#c4a67d]/60 bg-[rgba(196,166,125,0.08)] px-1.5 py-0.5 rounded">Latest</span>}
                              <div className="flex-1 h-px bg-white/5" />
                            </div>
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {batch.images.map(({ img, globalIdx }) => (
                              <div
                                key={globalIdx}
                                className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)] hover:border-[rgba(196,166,125,0.3)] relative group/ugc cursor-pointer transition-all duration-200"
                                onClick={() => setUgcLightbox(globalIdx)}
                              >
                                <img
                                  src={imgSrc(img)}
                                  alt={img.label}
                                  className="w-full aspect-[3/4] object-cover"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                                  <span className="text-[10px] font-semibold text-white/80 leading-tight line-clamp-1">
                                    {img.label.replace(/^Set \d+ — /, "")}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); downloadImage(img); }}
                                  className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] text-white/70 hover:text-white font-semibold uppercase tracking-wider opacity-0 group-hover/ugc:opacity-100 transition-opacity"
                                >
                                  Save
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <button
                    onClick={openUgcModal}
                    disabled={ugcLoading}
                    className="w-full py-3 rounded-xl text-sm font-semibold bg-[rgba(196,166,125,0.08)] text-[#c4a67d] border border-dashed border-[rgba(196,166,125,0.2)] hover:bg-[rgba(196,166,125,0.12)] hover:border-[rgba(196,166,125,0.35)] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {ugcLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-[rgba(196,166,125,0.3)] border-t-[#c4a67d] rounded-full animate-spin" />
                        Generating UGC Photos...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Generate Model Photos
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* ===== FEATURE CARDS ===== */}
            <div className="pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <h3 className="text-base font-bold text-white mb-1">Do more with your photos</h3>
              <p className="text-[13px] text-[rgba(255,255,255,0.5)] mb-4">
                Enhance your generated images with branding, listings, or recoloring.
              </p>

              <div className="space-y-4">

                {/* ── Branding Card ── */}
                <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Left: header + action */}
                    <div className="md:w-[200px] flex-shrink-0 flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-[rgba(196,166,125,0.1)] flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">Add Branding</h4>
                          <p className="text-[11px] text-[rgba(255,255,255,0.5)]">Brand strip below images</p>
                        </div>
                      </div>
                      <button
                        onClick={openBrandingModal}
                        className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[rgba(196,166,125,0.08)] text-[#c4a67d] border border-[rgba(196,166,125,0.15)] hover:bg-[rgba(196,166,125,0.15)] hover:border-[rgba(196,166,125,0.25)] active:scale-[0.98] transition-all"
                      >
                        {brandedImages.length > 0 ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            Brand More Photos
                          </span>
                        ) : "Add Branding Strip"}
                      </button>
                      {brandedImages.length > 0 && (
                        <p className="text-[11px] text-[rgba(255,255,255,0.4)] mt-2 text-center">{brandedImages.length} branded photo{brandedImages.length !== 1 ? "s" : ""}</p>
                      )}
                    </div>
                    {/* Right: branded image gallery — horizontal scroll */}
                    {brandedImages.length > 0 && (
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                          {brandedImages.map((img, i) => (
                            <div
                              key={i}
                              className="flex-shrink-0 w-[140px] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)] relative group/brand cursor-pointer"
                              onClick={() => setBrandedLightbox(i)}
                            >
                              <img src={imgSrc(img)} alt={img.label} className="w-full aspect-[4/5] object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover/brand:bg-black/30 transition-colors flex items-center justify-center">
                                <svg className="w-5 h-5 text-white opacity-0 group-hover/brand:opacity-80 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                </svg>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Product Listing Card ── */}
                <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Left: header + actions */}
                    <div className="md:w-[200px] flex-shrink-0 flex flex-col">
                      <div className="flex items-center gap-2 mb-3">
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
                          <p className="text-[11px] text-[rgba(255,255,255,0.5)]">E-commerce listing</p>
                        </div>
                      </div>
                      {catalogueData && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(150,191,72,0.1)] border border-[rgba(150,191,72,0.25)] rounded-full w-fit mb-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#96bf48]" />
                          <span className="text-[11px] font-semibold text-[#96bf48]">Shopify Ready</span>
                        </span>
                      )}
                      {catalogueData ? (
                        <div className="space-y-2">
                          <button
                            onClick={openListingModal}
                            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[rgba(196,166,125,0.08)] text-[#c4a67d] border border-[rgba(196,166,125,0.15)] hover:bg-[rgba(196,166,125,0.15)] active:scale-[0.98] transition-all"
                          >
                            View &amp; Edit
                          </button>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(catalogueData, null, 2));
                                showToast("Copied to clipboard!", "success");
                              }}
                              className="flex-1 py-2 rounded-xl text-[11px] font-semibold text-[rgba(255,255,255,0.55)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] hover:text-white transition-all"
                            >
                              Copy
                            </button>
                            <button
                              onClick={generateCatalogue}
                              disabled={catalogueLoading}
                              className="flex-1 py-2 rounded-xl text-[11px] font-semibold text-[rgba(255,255,255,0.55)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] hover:text-white transition-all disabled:opacity-50"
                            >
                              {catalogueLoading ? "..." : "Redo"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {hasBrandConfig === false && (
                            <p className="text-[11px] text-[rgba(255,255,255,0.45)] leading-relaxed mb-3">
                              <button onClick={() => router.push("/brand-settings")} className="text-[#c4a67d] font-semibold hover:underline">Set up brand voice</button> for personalized listings.
                            </p>
                          )}
                          <button
                            onClick={generateCatalogue}
                            disabled={catalogueLoading}
                            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[rgba(196,166,125,0.08)] text-[#c4a67d] border border-[rgba(196,166,125,0.15)] hover:bg-[rgba(196,166,125,0.15)] hover:border-[rgba(196,166,125,0.25)] active:scale-[0.98] transition-all disabled:opacity-50"
                          >
                            {catalogueLoading ? (
                              <span className="flex items-center justify-center gap-2">
                                <div className="w-3 h-3 border-2 border-[rgba(196,166,125,0.3)] border-t-[#c4a67d] rounded-full animate-spin" />
                                Generating...
                              </span>
                            ) : "Generate Listing"}
                          </button>
                        </>
                      )}
                    </div>
                    {/* Right: listing preview */}
                    {catalogueData && (
                      <div className="flex-1 min-w-0">
                        <div className="rounded-xl bg-[rgba(0,0,0,0.25)] border border-[rgba(255,255,255,0.08)] max-h-[200px] overflow-y-auto scrollbar-thin cursor-pointer group/listing" onClick={openListingModal}>
                          {catalogueData.title ? (
                            <div className="px-4 pt-3 pb-2 border-b border-[rgba(255,255,255,0.05)]">
                              <h5 className="text-[14px] font-bold text-white leading-snug">{String(catalogueData.title)}</h5>
                            </div>
                          ) : null}
                          {catalogueData.metaDescription ? (
                            <div className="px-4 py-2 border-b border-[rgba(255,255,255,0.05)]">
                              <p className="text-[10px] uppercase tracking-widest text-[#c4a67d] font-semibold mb-1">Meta</p>
                              <p className="text-[12px] text-[rgba(255,255,255,0.65)] leading-relaxed line-clamp-2">{String(catalogueData.metaDescription)}</p>
                            </div>
                          ) : null}
                          {catalogueData.description ? (
                            <div className="px-4 py-2 border-b border-[rgba(255,255,255,0.05)]">
                              <p className="text-[10px] uppercase tracking-widest text-[#c4a67d] font-semibold mb-1">Description</p>
                              <div className="text-[12px] text-[rgba(255,255,255,0.65)] leading-[1.7] listing-content line-clamp-3" dangerouslySetInnerHTML={{ __html: String(catalogueData.description) }} />
                            </div>
                          ) : null}
                          {catalogueData.attributes && typeof catalogueData.attributes === "object" ? (
                            <div className="px-4 py-2">
                              <div className="flex flex-wrap gap-1.5">
                                {Object.entries(catalogueData.attributes as Record<string, string>)
                                  .filter(([, v]) => v && v !== "N/A" && v !== "None")
                                  .slice(0, 6)
                                  .map(([key, value]) => (
                                    <span key={key} className="px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[11px] text-[rgba(255,255,255,0.6)]">
                                      {String(value)}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          ) : null}
                          {!catalogueData.title && catalogueData.raw_text ? (
                            <div className="px-4 py-3">
                              <p className="text-[12px] text-[rgba(255,255,255,0.65)] line-clamp-4 leading-[1.7]">{String(catalogueData.raw_text)}</p>
                            </div>
                          ) : null}
                          <div className="px-4 py-2 bg-[rgba(196,166,125,0.04)] text-center group-hover/listing:bg-[rgba(196,166,125,0.08)] transition-colors">
                            <span className="text-[12px] font-semibold text-[#c4a67d]">Tap to edit full listing</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Recolor Card ── */}
                <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-5">
                  {/* Header + controls row */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(196,166,125,0.1)] flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="13.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="10.5" r="2.5" /><circle cx="8.5" cy="7.5" r="2.5" />
                        <circle cx="6.5" cy="12.5" r="2.5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Recolor Metal</h4>
                      <p className="text-[11px] text-[rgba(255,255,255,0.5)]">Only metal changes — stones &amp; gems stay intact</p>
                    </div>
                  </div>

                  {/* Controls in a responsive row */}
                  <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:items-end">
                    {/* Source image selector */}
                    {resultImages.length > 1 && (
                      <div className="flex-shrink-0">
                        <p className="text-[11px] text-[rgba(255,255,255,0.55)] mb-1.5 font-medium">Source photo</p>
                        <div className="flex gap-2">
                          {resultImages.map((img, i) => (
                            <button
                              key={i}
                              onClick={() => setRecolorImageIdx(i)}
                              className={`relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${recolorImageIdx === i ? "border-[#c4a67d] ring-1 ring-[#c4a67d]/30" : "border-[rgba(255,255,255,0.06)] opacity-60 hover:opacity-90"}`}
                            >
                              <img src={imgSrc(img)} alt={img.label} className="w-full h-full object-cover" />
                              {recolorImageIdx === i && (
                                <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#c4a67d] flex items-center justify-center">
                                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="4" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metal presets */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-[rgba(255,255,255,0.55)] mb-1.5 font-medium">Target metal</p>
                      <div className="flex flex-wrap gap-1.5">
                        {METAL_PRESETS.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => { setRecolorMetal(m.id); if (m.id !== "custom") setRecolorCustom(""); }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${recolorMetal === m.id ? "border-[#c4a67d] bg-[rgba(196,166,125,0.1)] text-white" : "border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)] hover:border-[rgba(255,255,255,0.12)]"}`}
                          >
                            <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-[rgba(255,255,255,0.1)]" style={{ background: m.swatch }} />
                            {m.label}
                          </button>
                        ))}
                      </div>
                      {recolorMetal === "custom" && (
                        <div className="mt-2">
                          <input
                            type="text"
                            value={recolorCustom}
                            onChange={(e) => setRecolorCustom(e.target.value)}
                            placeholder="e.g. brushed brass, #FF69B4"
                            className="w-full max-w-xs px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[13px] text-white placeholder:text-[rgba(255,255,255,0.3)] focus:outline-none focus:border-[rgba(196,166,125,0.3)] transition-all"
                          />
                        </div>
                      )}
                    </div>

                    {/* Quality + generate */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden">
                        <button
                          onClick={() => setRecolorQuality("standard")}
                          className={`px-3 py-1.5 text-[11px] font-semibold transition-all ${recolorQuality === "standard" ? "bg-[rgba(196,166,125,0.15)] text-[#c4a67d]" : "text-[rgba(255,255,255,0.5)] hover:text-white"}`}
                        >
                          Standard
                        </button>
                        <button
                          onClick={() => setRecolorQuality("pro")}
                          className={`px-3 py-1.5 text-[11px] font-semibold transition-all ${recolorQuality === "pro" ? "bg-[rgba(196,166,125,0.15)] text-[#c4a67d]" : "text-[rgba(255,255,255,0.5)] hover:text-white"}`}
                        >
                          Pro
                        </button>
                      </div>
                      <button
                        onClick={recolorImage}
                        disabled={!recolorMetal || recolorLoading || (recolorMetal === "custom" && !recolorCustom.trim())}
                        className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[rgba(196,166,125,0.08)] text-[#c4a67d] border border-[rgba(196,166,125,0.15)] hover:bg-[rgba(196,166,125,0.15)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {recolorLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-3 h-3 border-2 border-[rgba(196,166,125,0.3)] border-t-[#c4a67d] rounded-full animate-spin" />
                            Recoloring...
                          </span>
                        ) : (
                          `Recolor (${recolorQuality === "pro" ? JEWELRY_PRICING.pro.recolorSingle : JEWELRY_PRICING.standard.recolorSingle} tokens)`
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Results — full-width horizontal scroll below */}
                  {recolorResults.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-[11px] text-[rgba(255,255,255,0.55)] font-medium">Results</p>
                        <span className="text-[11px] font-semibold text-[rgba(255,255,255,0.4)] bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-full">{recolorResults.length}</span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                        {recolorResults.map((img, i) => (
                          <div key={i} className="flex-shrink-0 w-[150px] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)] relative group/rc cursor-pointer" onClick={() => setRecolorLightbox(i)}>
                            <img src={imgSrc(img)} alt={img.label} className="w-full aspect-square object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover/rc:bg-black/30 transition-colors flex items-center justify-center">
                              <svg className="w-5 h-5 text-white opacity-0 group-hover/rc:opacity-80 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                              </svg>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
                              <p className="text-[10px] text-white/80 font-medium truncate">{img.label}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== LIGHTBOX ===== */}
        {expandedIndex !== null && (expandedIndex === -1 || resultImages[expandedIndex]) && (
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
                  {expandedIndex === -1 ? (
                    <span className="text-sm font-semibold text-white uppercase tracking-wider">Original Upload</span>
                  ) : (
                    <>
                      <span className="text-xs font-bold text-[#c4a67d]">
                        {String(expandedIndex + 1).padStart(2, "0")}
                      </span>
                      <span className="text-sm font-semibold text-white uppercase tracking-wider">
                        {resultImages[expandedIndex].label}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {expandedIndex >= 0 && (
                    <>
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
                        onClick={() => downloadImage(resultImages[expandedIndex])}
                        className="px-3.5 py-1.5 text-xs font-semibold text-[#c4a67d] bg-[rgba(196,166,125,0.1)] border border-[rgba(196,166,125,0.2)] rounded-full hover:bg-[rgba(196,166,125,0.2)] transition-colors"
                      >
                        Download
                      </button>
                    </>
                  )}
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
                  src={expandedIndex === -1 ? mainImage!.preview : imgSrc(resultImages[expandedIndex])}
                  alt={expandedIndex === -1 ? "Original Upload" : resultImages[expandedIndex].label}
                  className="w-full object-contain max-h-[75vh] bg-black"
                />
              </div>

              <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                {mainImage && (
                  <button
                    onClick={() => setExpandedIndex(-1)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 ${
                      expandedIndex === -1
                        ? "bg-white/15 text-white border border-white/20"
                        : "bg-white/5 text-white/40 border border-white/10 hover:text-white/70 hover:border-white/20"
                    }`}
                  >
                    <img src={mainImage.preview} alt="Original" className="w-4 h-4 rounded-sm object-cover" />
                    Original
                  </button>
                )}
                {resultImages.map((img, i) => (
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

      {/* ===== UGC CONFIG MODAL ===== */}
      {ugcModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setUgcModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md mx-4 bg-[#141414] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 animate-scale-in shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">Generate UGC Photos</h3>
              <button
                onClick={() => setUgcModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Source Image Selection */}
            {resultImages.length > 1 && (
              <div className="mb-5">
                <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">Select Source Image</label>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {resultImages.map((img, i) => (
                    <button
                      key={`ugc-src-${i}`}
                      onClick={() => setUgcSourceIndex(i)}
                      className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        ugcSourceIndex === i
                          ? "border-[#c4a67d] ring-1 ring-[rgba(196,166,125,0.3)]"
                          : "border-transparent hover:border-white/20"
                      }`}
                    >
                      <img src={imgSrc(img)} alt={img.label} className="w-full h-full object-cover" />
                      {ugcSourceIndex === i && (
                        <div className="absolute inset-0 bg-[rgba(196,166,125,0.15)] flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-white/80 text-center py-0.5 font-semibold truncate px-0.5">
                        {img.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Gender */}
            <div className="mb-5">
              <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">Gender</label>
              <div className="flex gap-2">
                {UGC_GENDERS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setUgcGender(g.id)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      ugcGender === g.id
                        ? "bg-[rgba(196,166,125,0.15)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]"
                        : "bg-white/5 text-white/50 border border-white/10 hover:text-white/70"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nationality */}
            <div className="mb-5 relative">
              <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">Nationality / Ethnicity</label>
              <button
                onClick={() => setUgcNatOpen(!ugcNatOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-white/80 hover:border-white/20 transition-colors"
              >
                {ugcNationality}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform ${ugcNatOpen ? "rotate-180" : ""}`}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {ugcNatOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-10 max-h-48 overflow-hidden flex flex-col">
                  <div className="p-2 border-b border-white/5">
                    <input
                      type="text"
                      value={ugcNatSearch}
                      onChange={(e) => setUgcNatSearch(e.target.value)}
                      placeholder="Search..."
                      className="w-full px-2.5 py-1.5 rounded-md text-xs bg-white/5 border border-white/10 text-white placeholder-white/30 outline-none focus:border-[rgba(196,166,125,0.3)]"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto max-h-36">
                    {UGC_NATIONALITIES.filter((n) =>
                      n.toLowerCase().includes(ugcNatSearch.toLowerCase())
                    ).map((n) => (
                      <button
                        key={n}
                        onClick={() => { setUgcNationality(n); setUgcNatOpen(false); setUgcNatSearch(""); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 transition-colors ${
                          ugcNationality === n ? "text-[#c4a67d] font-semibold" : "text-white/60"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Skin Tone */}
            <div className="mb-5">
              <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">Skin Tone</label>
              <div className="flex items-center gap-3">
                {UGC_SKIN_TONES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setUgcSkinTone(t.id)}
                    className="flex flex-col items-center gap-1 group"
                    title={t.label}
                  >
                    <div
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        ugcSkinTone === t.id
                          ? "border-[#c4a67d] scale-110 shadow-[0_0_8px_rgba(196,166,125,0.3)]"
                          : "border-transparent hover:border-white/20"
                      }`}
                      style={{ backgroundColor: t.color }}
                    />
                    <span className={`text-[10px] font-medium ${ugcSkinTone === t.id ? "text-[#c4a67d]" : "text-white/40 group-hover:text-white/55"}`}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Background */}
            <div className="mb-5">
              <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">Background</label>
              <div className="flex flex-wrap gap-2">
                {UGC_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setUgcBackground(bg.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                      ugcBackground === bg.id
                        ? "bg-[rgba(196,166,125,0.15)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]"
                        : "bg-white/5 text-white/50 border border-white/10 hover:text-white/70"
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 border border-white/10"
                      style={{ background: bg.swatch }}
                    />
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Poses */}
            <div className="mb-6">
              <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1">
                Poses
                {jewelryType && (
                  <span className="ml-1 text-[#c4a67d]/60 normal-case">
                    — recommended for {jewelryType}
                  </span>
                )}
              </label>
              <p className="text-[11px] text-white/45 mb-2">Select 1-4 poses. Each pose generates one image.</p>
              <div className="grid grid-cols-2 gap-2">
                {(() => {
                  const jType = jewelryType?.toLowerCase().replace(/\s+/g, "") || "";
                  const recommended = JEWELRY_POSE_MAP[jType] || [];
                  const sorted = [...UGC_ALL_POSES].sort((a, b) => {
                    const aR = recommended.includes(a.id) ? 0 : 1;
                    const bR = recommended.includes(b.id) ? 0 : 1;
                    return aR - bR;
                  });
                  return sorted.map((p) => {
                    const isRec = recommended.includes(p.id);
                    const isSelected = ugcPoses.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setUgcPoses((prev) =>
                            prev.includes(p.id)
                              ? prev.filter((x) => x !== p.id)
                              : prev.length < 4
                              ? [...prev, p.id]
                              : prev
                          );
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-all text-left flex items-center gap-2 ${
                          isSelected
                            ? "bg-[rgba(196,166,125,0.15)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]"
                            : "bg-white/5 text-white/50 border border-white/10 hover:text-white/70 hover:border-white/15"
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "border-[#c4a67d] bg-[#c4a67d]" : "border-white/20"
                        }`}>
                          {isSelected && (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </span>
                        {p.label}
                        {isRec && (
                          <span className="ml-auto text-[9px] font-bold text-[#c4a67d]/60 uppercase">rec</span>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Quality Toggle */}
            <div className="mb-5">
              <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2">Quality</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setUgcQuality("standard")}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    ugcQuality === "standard"
                      ? "bg-[rgba(196,166,125,0.15)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]"
                      : "bg-white/5 text-white/50 border border-white/10 hover:text-white/70"
                  }`}
                >
                  Standard — {JEWELRY_PRICING.standard.ugcPerPose * ugcPoses.length} tokens
                </button>
                <button
                  onClick={() => setUgcQuality("pro")}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    ugcQuality === "pro"
                      ? "bg-[rgba(196,166,125,0.15)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]"
                      : "bg-white/5 text-white/50 border border-white/10 hover:text-white/70"
                  }`}
                >
                  Pro — {JEWELRY_PRICING.pro.ugcPerPose * ugcPoses.length} tokens
                </button>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateUGC}
              disabled={ugcPoses.length === 0}
              className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-[#c4a67d] to-[#a8895c] text-black hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Generate {ugcPoses.length} Photo{ugcPoses.length !== 1 ? "s" : ""} ({(ugcQuality === "pro" ? JEWELRY_PRICING.pro.ugcPerPose : JEWELRY_PRICING.standard.ugcPerPose) * ugcPoses.length} tokens)
            </button>
          </div>
        </div>
      )}

      {/* ===== BRANDING MODAL ===== */}
      {brandingModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => !brandingLoading && setBrandingModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg mx-4 bg-[#141414] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 animate-scale-in shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">Add Branding</h3>
              <button
                onClick={() => !brandingLoading && setBrandingModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Photo selector */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-semibold text-white/55 uppercase tracking-wider">
                  Select Photos to Brand
                </label>
                <button
                  onClick={() => {
                    const all = getAllBrandableImages();
                    setBrandingSelectedIdxs(
                      brandingSelectedIdxs.length === all.length ? [] : all.map((_, i) => i)
                    );
                  }}
                  className="text-[11px] text-[#c4a67d] font-medium hover:underline"
                >
                  {brandingSelectedIdxs.length === getAllBrandableImages().length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {getAllBrandableImages().map((img, i) => {
                  const isSelected = brandingSelectedIdxs.includes(i);
                  const isRecolor = i >= resultImages.length;
                  return (
                    <button
                      key={i}
                      onClick={() =>
                        setBrandingSelectedIdxs((prev) =>
                          prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
                        )
                      }
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        isSelected
                          ? "border-[#c4a67d] ring-1 ring-[#c4a67d]/30"
                          : "border-[rgba(255,255,255,0.06)] opacity-50 hover:opacity-80"
                      }`}
                    >
                      <img src={imgSrc(img)} alt={img.label} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#c4a67d] flex items-center justify-center">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="4" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                      )}
                      {isRecolor && (
                        <span className="absolute bottom-1 left-1 text-[8px] bg-black/70 text-[#c4a67d] px-1 py-0.5 rounded font-bold uppercase">Recolored</span>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                        <p className="text-[9px] text-white/80 font-medium truncate">{img.label}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-[rgba(255,255,255,0.45)] mt-2">
                {brandingSelectedIdxs.length} of {getAllBrandableImages().length} photos selected
              </p>
            </div>

            {/* Brand info */}
            <div className="mb-5">
              <label className="block text-[11px] font-semibold text-white/55 uppercase tracking-wider mb-2">Brand Details</label>
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Brand / Store Name"
                  className="w-full px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(196,166,125,0.3)] transition-all"
                />
                <input
                  type="text"
                  value={brandPhone}
                  onChange={(e) => setBrandPhone(e.target.value)}
                  placeholder="Phone Number or Website"
                  className="w-full px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(196,166,125,0.3)] transition-all"
                />
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={applyBranding}
              disabled={brandingLoading || brandingSelectedIdxs.length === 0 || (!brandName.trim() && !brandPhone.trim())}
              className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-[#c4a67d] to-[#a8895c] text-black hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {brandingLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Applying Branding...
                </span>
              ) : (
                `Brand ${brandingSelectedIdxs.length} Photo${brandingSelectedIdxs.length !== 1 ? "s" : ""}`
              )}
            </button>
          </div>
        </div>
      )}

      {/* ===== RECOLOR LIGHTBOX ===== */}
      {recolorLightbox !== null && recolorResults[recolorLightbox] && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in" onClick={() => setRecolorLightbox(null)}>
          <div className="relative max-w-lg w-full mx-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">{recolorResults[recolorLightbox].label}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => downloadImage(recolorResults[recolorLightbox])} className="px-3.5 py-1.5 text-xs font-semibold text-[#c4a67d] bg-[rgba(196,166,125,0.1)] border border-[rgba(196,166,125,0.2)] rounded-full hover:bg-[rgba(196,166,125,0.2)] transition-colors">Download</button>
                <button onClick={() => setRecolorLightbox(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.1)] shadow-2xl">
              <img src={imgSrc(recolorResults[recolorLightbox])} alt={recolorResults[recolorLightbox].label} className="w-full object-contain max-h-[80vh] bg-black" />
            </div>
            {recolorResults.length > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                {recolorResults.map((_, i) => (
                  <button key={i} onClick={() => setRecolorLightbox(i)} className={`w-8 h-8 rounded-full text-[11px] font-bold transition-all duration-200 ${recolorLightbox === i ? "bg-[rgba(196,166,125,0.2)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]" : "bg-white/5 text-white/40 border border-white/10 hover:text-white/70"}`}>{i + 1}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== UGC LIGHTBOX ===== */}
      {brandedLightbox !== null && brandedImages[brandedLightbox] && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in"
          onClick={() => setBrandedLightbox(null)}
        >
          <div
            className="relative max-w-lg w-full mx-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white">
                Branded Photo {brandedLightbox + 1}/{brandedImages.length}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => downloadImage(brandedImages[brandedLightbox])}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#c4a67d] bg-[rgba(196,166,125,0.1)] border border-[rgba(196,166,125,0.2)] rounded-full hover:bg-[rgba(196,166,125,0.2)] transition-colors"
                >
                  Download
                </button>
                <button
                  onClick={() => setBrandedLightbox(null)}
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
                src={imgSrc(brandedImages[brandedLightbox])}
                alt={brandedImages[brandedLightbox].label}
                className="w-full object-contain max-h-[80vh] bg-black"
              />
            </div>

            {brandedImages.length > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                {brandedImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setBrandedLightbox(i)}
                    className={`w-8 h-8 rounded-full text-[11px] font-bold transition-all duration-200 ${
                      brandedLightbox === i
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
                src={imgSrc(ugcImages[ugcLightbox])}
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
      {/* ===== LISTING EDIT MODAL ===== */}
      {listingModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 min-h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 sticky top-0 z-10 bg-black/80 backdrop-blur-md py-3 -mx-4 px-4 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">Edit Product Listing</h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(150,191,72,0.1)] border border-[rgba(150,191,72,0.25)] rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#96bf48]" />
                  <span className="text-[11px] font-semibold text-[#96bf48]">Shopify Ready</span>
                </span>
              </div>
              <button
                onClick={() => setListingModalOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Title */}
            <div className="mb-5">
              <label className="block text-[11px] uppercase tracking-widest text-[#c4a67d] font-semibold mb-2">Product Title</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-[15px] font-semibold text-white placeholder:text-[rgba(255,255,255,0.2)] focus:outline-none focus:border-[rgba(196,166,125,0.4)] transition-all"
                placeholder="Product title..."
              />
            </div>

            {/* Meta Description */}
            <div className="mb-5">
              <label className="block text-[11px] uppercase tracking-widest text-[#c4a67d] font-semibold mb-2">SEO Meta Description</label>
              <textarea
                value={editMeta}
                onChange={(e) => setEditMeta(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-[13px] text-[rgba(255,255,255,0.8)] leading-relaxed placeholder:text-[rgba(255,255,255,0.2)] focus:outline-none focus:border-[rgba(196,166,125,0.4)] transition-all resize-none"
                placeholder="Meta description for SEO..."
              />
              <p className="text-[11px] text-[rgba(255,255,255,0.4)] mt-1">{editMeta.length}/160 characters</p>
            </div>

            {/* Description */}
            <div className="mb-5">
              <label className="block text-[11px] uppercase tracking-widest text-[#c4a67d] font-semibold mb-2">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-[13px] text-[rgba(255,255,255,0.8)] leading-[1.8] placeholder:text-[rgba(255,255,255,0.2)] focus:outline-none focus:border-[rgba(196,166,125,0.4)] transition-all resize-y"
                placeholder="Product description (supports HTML)..."
              />
              <p className="text-[11px] text-[rgba(255,255,255,0.4)] mt-1">Supports HTML formatting</p>
            </div>

            {/* Attributes */}
            {Object.keys(editAttributes).length > 0 && (
              <div className="mb-5">
                <label className="block text-[11px] uppercase tracking-widest text-[#c4a67d] font-semibold mb-3">Attributes</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(editAttributes).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-[11px] text-[rgba(255,255,255,0.5)] capitalize mb-1 font-medium">{key.replace(/([A-Z])/g, " $1").trim()}</label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setEditAttributes((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[13px] text-[rgba(255,255,255,0.85)] focus:outline-none focus:border-[rgba(196,166,125,0.3)] transition-all"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alt Text */}
            <div className="mb-6">
              <label className="block text-[11px] uppercase tracking-widest text-[#c4a67d] font-semibold mb-2">Image Alt Text</label>
              <input
                type="text"
                value={editAltText}
                onChange={(e) => setEditAltText(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-[13px] text-[rgba(255,255,255,0.75)] italic placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(196,166,125,0.4)] transition-all"
                placeholder="Descriptive alt text..."
              />
              <p className="text-[11px] text-[rgba(255,255,255,0.4)] mt-1">{editAltText.length}/125 characters</p>
            </div>

            {/* Brand info hint */}
            {hasBrandConfig === false && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-[rgba(196,166,125,0.06)] border border-[rgba(196,166,125,0.12)]">
                <p className="text-[12px] text-[rgba(255,255,255,0.6)] leading-relaxed">
                  <span className="text-[#c4a67d] font-semibold">Tip:</span> Set up your{" "}
                  <button onClick={() => router.push("/brand-settings")} className="text-[#c4a67d] font-semibold hover:underline">
                    Brand Settings
                  </button>{" "}
                  to auto-generate listings in your brand voice — including tone, terminology, and formatting rules.
                </p>
              </div>
            )}
            {hasBrandConfig && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.12)]">
                <p className="text-[12px] text-[rgba(255,255,255,0.6)] leading-relaxed flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <span>Using your brand settings for listing generation.{" "}
                    <button onClick={() => router.push("/brand-settings")} className="text-[#c4a67d] hover:underline">Edit</button>
                  </span>
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-black/80 backdrop-blur-md py-4 -mx-4 px-4 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap gap-3">
              <button
                onClick={saveListingEdits}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[rgba(196,166,125,0.12)] text-[#c4a67d] border border-[rgba(196,166,125,0.2)] hover:bg-[rgba(196,166,125,0.2)] active:scale-[0.98] transition-all"
              >
                Save Edits
              </button>
              <button
                onClick={regenerateFromEdits}
                disabled={catalogueLoading}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {catalogueLoading ? "Regenerating..." : "Regenerate New"}
              </button>
              <button
                onClick={copyListingText}
                className="px-5 py-3 rounded-xl text-sm font-semibold text-[rgba(255,255,255,0.6)] border border-[rgba(255,255,255,0.1)] hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-all"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </ResponsiveLayout>
  );
}
