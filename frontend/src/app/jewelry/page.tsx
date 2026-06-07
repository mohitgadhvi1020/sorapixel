"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, API_BASE_URL } from "@/lib/api-client";
import { useAuth, useCredits } from "@/providers/AppProvider";
import { cacheGet, cacheSet } from "@/lib/cache";
import { JEWELRY_TYPES, JEWELRY_BACKGROUNDS } from "@/lib/jewelry-styles";
import { JEWELRY_PRICING } from "@/lib/token-pricing";
import { trackEvent } from "@/lib/gtag";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import { useTheme } from "@/hooks/useTheme";
import { useGeoCountry } from "@/hooks/useGeoCountry";
import ThemeGallery, { type Theme, type ThemeCategory } from "@/components/jewelry/ThemeGallery";
import ShotConfigurator, { type ShotConfig } from "@/components/jewelry/ShotConfigurator";
import InsufficientCreditsModal from "@/components/jewelry/InsufficientCreditsModal";
import FeedbackWidget from "@/components/jewelry/FeedbackWidget";
import EmailGateModal from "@/components/ui/EmailGateModal";
import TokenIcon from "@/components/ui/TokenIcon";
// Quality is now fixed to "pro" for all generations — no user-facing picker
type Step = "upload" | "select_type" | "theme_browse" | "shot_config" | "generating" | "done";

interface ResultImage {
  label: string;
  base64: string;
  url?: string;
  shot_id?: string;
  theme_id?: string;
}

interface GenerateResponse {
  success: boolean;
  images: ResultImage[];
  locked?: boolean;
  token_balance?: number;
  generation_ids?: string[];
  anonymous?: boolean;
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
  { id: "finger_macro", label: "Ring Macro" },
  { id: "ear_macro", label: "Earring Macro" },
  { id: "neck_macro", label: "Neck Macro" },
  { id: "wrist_macro", label: "Wrist Macro" },
  { id: "ankle_macro", label: "Anklet Macro" },
  { id: "lapel_macro", label: "Brooch Macro" },
];

const UGC_BACKGROUNDS = [
  { id: "best_match", label: "Best Match", swatch: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", image: "/images/backgrounds/best_match.png" },
  { id: "studio", label: "Studio", swatch: "#e0e0e0", image: "/images/backgrounds/studio.png" },
  { id: "flora", label: "Flora", swatch: "#4caf50", image: "/images/backgrounds/flora.png" },
  { id: "wooden", label: "Wooden", swatch: "#8d6e63", image: "/images/backgrounds/wooden.png" },
  { id: "indoor", label: "Indoor", swatch: "#bcaaa4", image: "/images/backgrounds/indoor.png" },
  { id: "livingroom", label: "Living Room", swatch: "#d7ccc8", image: "/images/backgrounds/livingroom.png" },
];

const JEWELRY_POSE_MAP: Record<string, string[]> = {
  ring: ["finger_macro", "hand_closeup", "standing", "side_view"],
  necklace: ["neck_macro", "standing", "close_up", "side_view", "sitting"],
  earring: ["ear_macro", "close_up", "side_view", "standing"],
  bracelet: ["wrist_macro", "hand_closeup", "standing", "sitting"],
  bangle: ["wrist_macro", "hand_closeup", "standing", "side_view"],
  pendant: ["neck_macro", "close_up", "standing", "sitting"],
  brooch: ["lapel_macro", "close_up", "standing", "side_view"],
  anklet: ["ankle_macro", "feet_closeup", "sitting", "standing"],
  chain: ["neck_macro", "standing", "close_up", "side_view"],
  set: ["standing", "close_up", "side_view", "sitting"],
};


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
  const { theme } = useTheme();
  const { country, isIndia } = useGeoCountry();
  const isLight = theme === "light";
  const router = useRouter();
  const searchParams = useSearchParams();

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null);
  const [sessionRestoring, setSessionRestoring] = useState(!!searchParams.get("session"));
  // Theme id from restore payload, matched once themes load.
  const pendingThemeIdRef = useRef<string | null>(null);

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
  const quality = "pro" as const;

  // Theme state
  const [themes, setThemes] = useState<Theme[]>([]);
  const [themeCategories, setThemeCategories] = useState<ThemeCategory[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [shotConfigs, setShotConfigs] = useState<ShotConfig[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [requiredCreditsForModal, setRequiredCreditsForModal] = useState(0);

  // Generation state
  const [step, setStep] = useState<Step>("upload");
  const [genStatus, setGenStatus] = useState<string | null>(null);
  const [resultImages, setResultImages] = useState<ResultImage[]>([]);
  const [generationIds, setGenerationIds] = useState<string[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);
  const [regenIndex, setRegenIndex] = useState<number | null>(null);
  const [autoFixIndex, setAutoFixIndex] = useState<number | null>(null);
  const [justUpdatedIndex, setJustUpdatedIndex] = useState<number | null>(null);
  const resultRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [anonGeneration, setAnonGeneration] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [emailGateOpen, setEmailGateOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState<ResultImage | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  // Feature states
  const [ugcLoading, setUgcLoading] = useState(false);
  const [ugcImages, setUgcImages] = useState<ResultImage[]>([]);
  const [ugcGenerationIds, setUgcGenerationIds] = useState<string[]>([]);
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
  const [ugcOutfitStyle, setUgcOutfitStyle] = useState("modern");
  const [ugcOutfitCustom, setUgcOutfitCustom] = useState("");
  const ugcQuality = "pro" as const;
  const [ugcSourceIndex, setUgcSourceIndex] = useState(0);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [catalogueData, setCatalogueData] = useState<Record<string, unknown> | null>(null);

  // Video generation
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoMode, setVideoMode] = useState("360_spin");
  const [videoQuality, setVideoQuality] = useState<"standard" | "pro">("standard");
  const [videoCustomPrompt, setVideoCustomPrompt] = useState("");
  const [videoAspect, setVideoAspect] = useState("landscape");
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoResult, setVideoResult] = useState<{ video_url: string; duration: number; mode: string; tokens_used: number } | null>(null);
  const [videoSourceIndex, setVideoSourceIndex] = useState(0);
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editMeta, setEditMeta] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAltText, setEditAltText] = useState("");
  const [editAttributes, setEditAttributes] = useState<Record<string, string>>({});
  const [hasBrandConfig, setHasBrandConfig] = useState<boolean | null>(null);
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
  // Persistent generation error (toasts auto-dismiss; this stays until retry so a
  // user who stepped away during the multi-minute render still sees what happened)
  const [genError, setGenError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const altInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  // --- Resume persistence ---
  // Eagerly creates a session so we can PATCH progress as the user moves
  // through steps. Safe to call multiple times — becomes a no-op once a
  // session exists.
  const ensureJewelrySession = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    if (!user || !mainImage) return null;
    try {
      const b64 = await resolveBase64(mainImage);
      const sess = await api.post<{ id: string }>("/sessions", {
        image_base64: b64,
        jewelry_type: jewelryType,
        background: backgroundId,
        aspect_ratio_id: aspectRatioId,
        quality,
      });
      setSessionId(sess.id);
      setLoadedSessionId(sess.id);
      window.history.replaceState(null, "", `/jewelry?session=${sess.id}`);
      return sess.id;
    } catch {
      return null;
    }
    // resolveBase64 is module-local and doesn't depend on hooks; mainImage ref
    // captured via closure. Including it in deps causes re-creation on every
    // keystroke — intentionally narrow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, user, mainImage, jewelryType, backgroundId, aspectRatioId, quality]);

  const saveProgress = useCallback(
    async (fields: {
      current_step?: string;
      pending_inputs?: Record<string, unknown>;
      jewelry_type?: string;
      background?: string;
      aspect_ratio_id?: string;
      quality?: string;
    }) => {
      if (!sessionId) return;
      try {
        await api.patch(`/sessions/${sessionId}/progress`, fields);
      } catch {
        /* best-effort */
      }
    },
    [sessionId]
  );
  // Save step + core config whenever the user moves between steps.
  useEffect(() => {
    if (!sessionId) return;
    if (step === "upload" || step === "generating") return;
    saveProgress({
      current_step: step,
      jewelry_type: jewelryType,
      background: backgroundId,
      aspect_ratio_id: aspectRatioId,
      quality,
    });
  }, [sessionId, step, jewelryType, backgroundId, aspectRatioId, quality, saveProgress]);

  // Save pending inputs (theme / shots / instructions). Debounced so
  // keystrokes in the special-instructions field don't spam PATCHes.
  useEffect(() => {
    if (!sessionId) return;
    const t = setTimeout(() => {
      saveProgress({
        pending_inputs: {
          selected_theme_id: selectedTheme?.id || null,
          shot_configs: shotConfigs,
          special_instructions: specialInstructions,
        },
      });
    }, 600);
    return () => clearTimeout(t);
  }, [sessionId, selectedTheme?.id, shotConfigs, specialInstructions, saveProgress]);

  // Create a session as soon as the user moves past upload with an image,
  // so subsequent progress saves have something to patch against.
  useEffect(() => {
    if (!user || !mainImage) return;
    if (sessionId || sessionRestoring) return;
    if (step === "upload" || step === "generating") return;
    ensureJewelrySession();
  }, [user, mainImage, sessionId, sessionRestoring, step, ensureJewelrySession]);

  // Once themes have loaded after a restore, match the pending theme id.
  useEffect(() => {
    const targetId = pendingThemeIdRef.current;
    if (!targetId || selectedTheme || themes.length === 0) return;
    const match = themes.find((t) => t.id === targetId);
    if (match) {
      setSelectedTheme(match);
      pendingThemeIdRef.current = null;
    }
  }, [themes, selectedTheme]);
  // --- end resume persistence ---

  function getAnonId(): string {
    const match = document.cookie.match(/(?:^|;\s*)anon_id=([^;]+)/);
    return match?.[1] ?? "";
  }

  function hasUsedFreeGen(): boolean {
    try { return localStorage.getItem("sp_anon_free_used") === "1"; } catch { return false; }
  }

  function markFreeGenUsed(): void {
    try { localStorage.setItem("sp_anon_free_used", "1"); } catch { /* noop */ }
  }

  async function callGenerateFree(body: Record<string, unknown>): Promise<GenerateResponse> {
    if (hasUsedFreeGen()) {
      throw Object.assign(new Error("Free generation already used. Sign up to continue."), { status: 403 });
    }
    const anonId = getAnonId();
    const result = await api.postNoAuth<GenerateResponse>("/jewelry/generate-free", body, {
      "X-Anonymous-Id": anonId,
    });
    markFreeGenUsed();
    return result;
  }

  const lastThemeTypeRef = useRef<string>("");

  const THEME_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  async function fetchThemesNoAuth(jewelryTypeParam?: string): Promise<{ themes: Theme[]; categories: ThemeCategory[] }> {
    const url = jewelryTypeParam
      ? `${API_BASE_URL}/themes?jewelry_type=${jewelryTypeParam}`
      : `${API_BASE_URL}/themes`;
    const resp = await fetch(url, { headers: { "Content-Type": "application/json" } });
    if (!resp.ok) throw new Error(`themes fetch ${resp.status}`);
    return resp.json();
  }

  async function loadThemes(typeOverride?: string) {
    const jType = typeOverride || jewelryType;
    const cacheKey = `themes_v3_${jType || "__all__"}`;

    if (themes.length > 0 && lastThemeTypeRef.current === jType) return;

    const cached = cacheGet<{ themes: Theme[]; categories: ThemeCategory[] }>(cacheKey, THEME_CACHE_TTL);
    if (cached) {
      setThemes(cached.themes);
      setThemeCategories(cached.categories);
      lastThemeTypeRef.current = jType;
      return;
    }

    setThemesLoading(true);
    try {
      const data = await fetchThemesNoAuth(jType || undefined);
      cacheSet(cacheKey, data);
      setThemes(data.themes);
      setThemeCategories(data.categories);
      lastThemeTypeRef.current = jType;
    } catch {
      showToast("Failed to load themes");
    } finally {
      setThemesLoading(false);
    }
  }

  // Preload all themes in background (skip if already cached)
  useEffect(() => {
    const allKey = "themes_v3___all__";
    if (cacheGet(allKey, THEME_CACHE_TTL)) return;
    fetchThemesNoAuth()
      .then((data) => cacheSet(allKey, data))
      .catch(() => {});
  }, []);

  function handleSelectTheme(theme: Theme) {
    setSelectedTheme(theme);
    const configs: ShotConfig[] = theme.shots.map((shot) => ({
      shot_id: shot.id,
      label: shot.short_name || shot.name,
      additional_details: "",
      theme_color: theme.default_color,
      selected: theme.default_shots.includes(shot.id),
    }));
    setShotConfigs(configs);
    setStep("shot_config");
  }

  function getThemeTokenCost(): number {
    const selectedCount = shotConfigs.filter((s) => s.selected).length;
    const altCount = altImages.length;
    return (selectedCount + altCount) * JEWELRY_PRICING[quality].imageGen;
  }

  async function generateWithTheme() {
    if (!mainImage || !selectedTheme) return;

    const selectedShots = shotConfigs.filter((s) => s.selected);
    if (selectedShots.length === 0) {
      showToast("Select at least one shot to generate");
      return;
    }

    const isAnon = !user;

    if (!isAnon) {
      const cost = getThemeTokenCost();
      const balance = credits?.token_balance || 0;
      const isFree = credits?.is_free_tier ?? false;

      if (!isFree && balance < cost) {
        setRequiredCreditsForModal(cost);
        setShowCreditsModal(true);
        return;
      }
    }

    setStep("generating");
    const totalCount = isAnon ? 1 : selectedShots.length + altImages.length;
    setGenStatus(`Generating ${totalCount} shot${totalCount > 1 ? "s" : ""} with ${selectedTheme.name}...`);
    setResultImages([]);
    setGenError(null);
    setAnonGeneration(false);

    let activeSessionId = sessionId;
    if (!isAnon && !activeSessionId) {
      try {
        const sessB64 = await resolveBase64(mainImage);
        const sess = await api.post<{ id: string }>("/sessions", {
          image_base64: sessB64,
          jewelry_type: jewelryType,
          background: selectedTheme.id,
          aspect_ratio_id: aspectRatioId,
          quality,
        });
        activeSessionId = sess.id;
        setSessionId(sess.id);
        window.history.replaceState(null, "", `/jewelry?session=${sess.id}`);
      } catch {
        // Non-blocking
      }
    }

    try {
      const mainB64 = await resolveBase64(mainImage);
      const body = {
        image_base64: mainB64,
        jewelry_type: jewelryType,
        theme_id: selectedTheme.id,
        aspect_ratio_id: aspectRatioId,
        quality: quality,
        step: "all",
        session_id: activeSessionId,
        shots: selectedShots.slice(0, isAnon ? 1 : selectedShots.length).map((s) => ({
          shot_id: s.shot_id,
          label: s.label,
          additional_details: s.additional_details || undefined,
          theme_color: s.theme_color !== selectedTheme.default_color ? s.theme_color : undefined,
        })),
        alt_images_base64: (!isAnon && altImages.length > 0) ? altImages.map((a) => a.base64) : undefined,
        special_instructions: specialInstructions.trim() || undefined,
      };

      const data = isAnon
        ? await callGenerateFree(body)
        : await api.post<GenerateResponse>("/jewelry/generate", body);

      if (data.success && data.images.length > 0) {
        const taggedImages = data.images.map((img, idx) => ({
          ...img,
          theme_id: selectedTheme.id,
          shot_id: selectedShots[idx]?.shot_id ?? "hero",
        }));
        setResultImages(taggedImages);
        trackEvent("image_generated", {
          type: "jewelry",
          flow: "main",
          theme_id: selectedTheme.id,
          jewelry_type: jewelryType,
          quality: quality,
          aspect_ratio: aspectRatioId,
          image_count: taggedImages.length,
          anonymous: isAnon,
        });
        setGenerationIds(data.generation_ids || []);
        setStep("done");
        setGenStatus(null);
        setIsLocked(!!data.locked);
        if (data.anonymous) {
          setAnonGeneration(true);
        } else {
          refreshCredits();
        }
        scrollToResults();
        showToast(`${data.images.length} photo${data.images.length > 1 ? "s" : ""} generated!`, "success");
      } else {
        throw new Error("No images returned");
      }
    } catch (err: unknown) {
      setStep("shot_config");
      setGenStatus(null);
      const apiErr = err as { status?: number; message?: string };
      if (apiErr.status === 403) {
        if (isAnon) {
          setShowSignupPrompt(true);
        } else {
          setRequiredCreditsForModal(getThemeTokenCost());
          setShowCreditsModal(true);
        }
      } else {
        const msg = err instanceof Error && err.message ? err.message : "Generation failed. No tokens were deducted.";
        showToast(msg);
        setGenError(msg);
      }
    }
  }

  function goToThemeBrowse() {
    if (!mainImage) {
      showToast("Upload an image first");
      return;
    }
    loadThemes();
    setStep("theme_browse");
  }

  const sidParam = searchParams.get("session");
  useEffect(() => {
    const sid = sidParam;
    if (!sid) {
      setSessionRestoring(false);
      return;
    }
    if (loadedSessionId === sid) return;
    if (!user) return;

    setLoadedSessionId(sid);
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
          current_step: Step | null;
          pending_inputs: Record<string, unknown> | null;
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
        // Quality is now fixed to "pro" — no need to restore from session

        // Hydrate pending inputs (theme/shots/instructions). Theme object is
        // resolved later when the themes list loads (see effect below) — for
        // now store the saved id so that effect can match it.
        const pending = session.pending_inputs || {};
        if (typeof pending.special_instructions === "string") {
          setSpecialInstructions(pending.special_instructions);
        }
        if (Array.isArray(pending.shot_configs)) {
          setShotConfigs(pending.shot_configs as ShotConfig[]);
        }
        if (typeof pending.selected_theme_id === "string") {
          pendingThemeIdRef.current = pending.selected_theme_id;
        }

        if (session.original_image_url) {
          setMainImage({ base64: "", preview: session.original_image_url });
          fetch(session.original_image_url)
            .then((r) => r.blob())
            .then(
              (blob) =>
                new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(reader.result as string);
                  reader.onerror = () => reject(reader.error);
                  reader.readAsDataURL(blob);
                })
            )
            .then((dataUrl) => {
              const b64 = dataUrl.split(",")[1] || "";
              if (b64) setMainImage({ base64: b64, preview: session.original_image_url });
            })
            .catch(() => {
              /* best-effort; generation call sites will fall back or re-prompt */
            });
        }

        const restoredImages: ResultImage[] = [];
        const restoredUgc: ResultImage[] = [];
        const restoredBranded: ResultImage[] = [];
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
          } else {
            for (const img of imgs) {
              restoredImages.push({ base64: "", label: img.label, url: img.url } as ResultImage & { url: string });
            }
          }
        }

        if (restoredImages.length > 0) {
          setResultImages(restoredImages);
          setStep("done");
        } else if (session.current_step && session.current_step !== "generating") {
          // Prefer the explicit saved step over inference.
          setStep(session.current_step);
        } else if (session.jewelry_type && session.background) {
          setStep("theme_browse");
        } else if (session.jewelry_type) {
          setStep("select_type");
        }
        if (restoredUgc.length > 0) setUgcImages(restoredUgc);
        if (restoredBranded.length > 0) setBrandedImages(restoredBranded);
        if (restoredListing) setCatalogueData(restoredListing);
      } catch {
        showToast("Couldn't load that creation. It may have been deleted.");
        router.replace("/projects");
      } finally {
        clearTimeout(timeout);
        setSessionRestoring(false);
      }
    })();
  }, [sidParam, loadedSessionId, user, router, showToast]);

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

    const isAnon = !user;

    if (!isAnon) {
      const cost = (1 + altImages.length) * JEWELRY_PRICING[quality].imageGen;
      const balance = credits?.token_balance || 0;
      const isFree = credits?.is_free_tier ?? false;
      if (!isFree && balance < cost) {
        setRequiredCreditsForModal(cost);
        setShowCreditsModal(true);
        return;
      }
    }

    setStep("generating");
    const totalCount = isAnon ? 1 : 1 + altImages.length;
    setGenStatus(`Generating ${totalCount} photo${totalCount > 1 ? "s" : ""}...`);
    setResultImages([]);
    setAnonGeneration(false);

    let activeSessionId = sessionId;
    if (!isAnon && !activeSessionId) {
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
      const payload = {
        ...(await basePayload()),
        quality: quality,
        step: "all",
        session_id: activeSessionId,
        alt_images_base64: (!isAnon && altImages.length > 0) ? altImages.map((a) => a.base64) : undefined,
      };

      const data = isAnon
        ? await callGenerateFree(payload)
        : await api.post<GenerateResponse>("/jewelry/generate", payload);

      if (data.success && data.images.length > 0) {
        setResultImages(data.images);
        trackEvent("image_generated", { type: "jewelry", flow: "resumed", jewelry_type: jewelryType, quality: quality, image_count: data.images.length, anonymous: isAnon });
        setGenerationIds(data.generation_ids || []);
        setStep("done");
        setGenStatus(null);
        setIsLocked(!!data.locked);
        if (data.anonymous) {
          setAnonGeneration(true);
        } else {
          refreshCredits();
        }
        scrollToResults();
        showToast(`${data.images.length} photo${data.images.length > 1 ? "s" : ""} generated!`, "success");
      } else {
        throw new Error("No images returned");
      }
    } catch (err: unknown) {
      setStep("select_type");
      setGenStatus(null);
      const apiErr = err as { status?: number; message?: string };
      if (apiErr.status === 403) {
        if (isAnon) {
          setShowSignupPrompt(true);
        } else {
          const cost = (1 + altImages.length) * JEWELRY_PRICING[quality].imageGen;
          setRequiredCreditsForModal(cost);
          setShowCreditsModal(true);
        }
      } else {
        showToast(err instanceof Error ? err.message : "Generation failed. No tokens were deducted.");
      }
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
        ...(currentImage.theme_id ? { theme_id: currentImage.theme_id } : {}),
        ...(currentImage.shot_id ? { shots: [{ shot_id: currentImage.shot_id }] } : {}),
        ...(hasTweak && regenB64 ? { image_base64: regenB64 } : {}),
      });
      if (data.success && data.images.length > 0) {
        const tryNum = resultImages.length + 1;
        const newImage = {
          ...data.images[0],
          label: `${currentImage.label || "Shot"} — Try ${tryNum}`,
          theme_id: currentImage.theme_id,
          shot_id: currentImage.shot_id,
        };

        setResultImages((prev) => [newImage, ...prev]);
        trackEvent("image_regenerated", { type: "jewelry", shot_id: currentImage.shot_id, theme_id: currentImage.theme_id });
        if (data.generation_ids?.length) {
          setGenerationIds((prev) => [...data.generation_ids!, ...prev]);
        }
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
      showToast(err instanceof Error ? err.message : "Regeneration failed. No tokens were deducted.");
    } finally {
      setRegenIndex(null);
    }
  }

  async function autoFixShot(index: number) {
    if (!mainImage) return;
    setAutoFixIndex(index);

    const currentImage = resultImages[index];

    try {
      const inputB64 = await resolveBase64(mainImage);
      const outputB64 = await resolveBase64(currentImage);

      const data = await api.post<GenerateResponse>("/jewelry/auto-fix", {
        image_base64: inputB64,
        output_base64: outputB64,
        jewelry_type: jewelryType,
        background: backgroundId,
        aspect_ratio_id: aspectRatioId,
        quality,
        session_id: sessionId,
        ...(specialInstructions.trim() ? { special_instructions: specialInstructions.trim() } : {}),
        ...(currentImage.theme_id ? { theme_id: currentImage.theme_id } : {}),
        ...(currentImage.shot_id ? { shot_id: currentImage.shot_id } : {}),
      });

      if (data.success && data.images.length > 0) {
        const newImage = {
          ...data.images[0],
          label: `${currentImage.label || "Shot"} — Improved`,
          theme_id: currentImage.theme_id,
          shot_id: currentImage.shot_id,
        };

        setResultImages((prev) => [newImage, ...prev]);
        trackEvent("image_auto_fixed", { type: "jewelry", shot_id: currentImage.shot_id });
        if (data.generation_ids?.length) {
          setGenerationIds((prev) => [...data.generation_ids!, ...prev]);
        }
        refreshCredits();

        setJustUpdatedIndex(0);
        setTimeout(() => {
          resultRefs.current[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        setTimeout(() => setJustUpdatedIndex(null), 2000);

        showToast("Improved version generated!", "success");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Auto-fix failed. No tokens were deducted.");
    } finally {
      setAutoFixIndex(null);
    }
  }

  function openUgcModal() {
    const jType = jewelryType?.toLowerCase().replace(/\s+/g, "") || "";
    const recommended = JEWELRY_POSE_MAP[jType] || JEWELRY_POSE_MAP["necklace"];
    setUgcPoses(recommended.slice(0, 2));
    setUgcSourceIndex(0);
    setUgcModalOpen(true);
  }

  async function generateVideo() {
    if (resultImages.length === 0) return;
    const sourceIdx = Math.min(videoSourceIndex, resultImages.length - 1);
    setVideoModalOpen(false);
    setVideoGenerating(true);
    setVideoResult(null);
    try {
      const imgB64 = resultImages[sourceIdx].base64 || (resultImages[sourceIdx] as ResultImage & { url?: string }).url || "";
      let imageData = imgB64;
      if (imgB64.startsWith("http")) {
        const resp = await fetch(imgB64);
        const blob = await resp.blob();
        imageData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(blob);
        });
      }
      const data = await api.post<{ success: boolean; video_url: string; duration: number; mode: string; tokens_used: number }>("/video/generate", {
        image_b64: imageData,
        mode: videoMode,
        jewelry_type: jewelryType?.toLowerCase().replace(/\s+/g, "") || "jewelry",
        aspect_ratio: videoAspect,
        quality: videoQuality,
        custom_prompt: videoMode === "custom" ? videoCustomPrompt : undefined,
        session_id: sessionId || undefined,
      });
      if (data.success) {
        setVideoResult(data);
        refreshCredits();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Video generation failed");
    } finally {
      setVideoGenerating(false);
    }
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
        outfit_style: ugcOutfitCustom.trim() ? undefined : ugcOutfitStyle,
        outfit_custom: ugcOutfitCustom.trim() || undefined,
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
        if (data.generation_ids?.length) {
          setUgcGenerationIds((prev) => [...data.generation_ids!, ...prev]);
        }
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


  useEffect(() => {
    if (user) {
      if (!brandName && user.company_name) setBrandName(user.company_name);
      if (!brandPhone && user.phone) setBrandPhone(user.phone);
    }
  }, [user]);

  useEffect(() => {
    if (!user || hasBrandConfig !== null) return;
    api.get<{ brand?: { id: string } }>("/brands/me")
      .then((d) => setHasBrandConfig(!!d.brand))
      .catch(() => setHasBrandConfig(false));
  }, [user, hasBrandConfig]);

  function getAllBrandableImages(): ResultImage[] {
    return [...resultImages];
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
      trackEvent("image_generated", { type: "branding", image_count: newBranded.length, brand_name: brandName.trim() ? "yes" : "no", brand_phone: brandPhone.trim() ? "yes" : "no" });
      setBrandingModalOpen(false);
      showToast(`Branding applied to ${newBranded.length} image${newBranded.length !== 1 ? "s" : ""}!`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Branding failed");
    } finally {
      setBrandingLoading(false);
    }
  }

  async function doDownload(img: ResultImage) {
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

  async function downloadImage(img: ResultImage) {
    trackEvent("image_downloaded", { type: "jewelry", shot_id: img.shot_id, theme_id: img.theme_id, anonymous: !user, locked: isLocked });
    if (isLocked) {
      router.push("/pricing");
      return;
    }
    if (!user) {
      setPendingDownload(img);
      setEmailGateOpen(true);
      return;
    }
    doDownload(img);
  }

  function downloadAll() {
    if (isLocked) {
      router.push("/pricing");
      return;
    }
    if (!user) {
      setPendingDownload(resultImages[0] || null);
      setEmailGateOpen(true);
      return;
    }
    resultImages.forEach((img) => doDownload(img));
  }

  async function handleEmailGateSubmit(email: string) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        await fetch(`${supabaseUrl}/auth/v1/magiclink`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: supabaseKey },
          body: JSON.stringify({ email }),
        });
      }
    } catch {
      // Silently continue — we still allow the download
    }
    setEmailGateOpen(false);
    if (pendingDownload) {
      doDownload(pendingDownload);
      setPendingDownload(null);
    }
    showToast("Check your email for login link + 3 free tokens!", "success");
  }

  function startOver() {
    setMainImage(null);
    setAltImages([]);
    setResultImages([]);
    setGenerationIds([]);
    setStep("upload");
    setGenStatus(null);
    setExpandedIndex(null);
    setCompareIndex(null);
    setRegenIndex(null);
    setUgcImages([]);
    setUgcGenerationIds([]);
    setCatalogueData(null);
    setIsLocked(false);
    setBrandedImages([]);
    setBrandingModalOpen(false);
    setBrandingSelectedIdxs([]);
    setSessionId(null);
    setLoadedSessionId(null);
    setSelectedTheme(null);
    setShotConfigs([]);
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
      {sessionRestoring && step !== "generating" && step !== "done" && (
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
        {/* Step indicator */}
        {(step === "upload" || step === "select_type" || step === "theme_browse" || step === "shot_config") && (
          <div className="mb-6 flex items-center gap-0">
            {[
              { key: "upload", num: 1, label: "Upload" },
              { key: "select_type", num: 2, label: "Category" },
              { key: "theme_browse", num: 3, label: "Theme" },
              { key: "shot_config", num: 4, label: "Configure" },
            ].map((s, i) => {
              const steps: Step[] = ["upload", "select_type", "theme_browse", "shot_config"];
              const current = steps.indexOf(step);
              const isActive = steps.indexOf(s.key as Step) === current;
              const isDone = steps.indexOf(s.key as Step) < current;
              return (
                <div key={s.key} className="flex items-center">
                  {i > 0 && (
                    <div className={`w-8 md:w-12 mx-1 transition-all ${isDone ? "step-connector" : isLight ? "step-connector-inactive bg-[#e0dcd6]" : "step-connector-inactive bg-[rgba(255,255,255,0.08)]"}`} />
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? "bg-[#c4a67d] text-black shadow-[0_0_16px_rgba(196,166,125,0.5)]"
                        : isDone
                          ? "bg-[rgba(196,166,125,0.2)] text-[#c4a67d]"
                          : isLight
                            ? "bg-[#e8e5df] text-[#999]"
                            : "bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)]"
                    }`}>
                      {isDone ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : s.num}
                    </div>
                    <span className={`text-[11px] font-medium hidden md:inline transition-colors ${
                      isActive ? (isLight ? "text-[#0a0a0a]" : "text-white") : isDone ? "text-[#c4a67d]" : isLight ? "text-[#999]" : "text-[rgba(255,255,255,0.45)]"
                    }`}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Page header — contextual per step */}
        {(step === "upload" || step === "select_type") && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[10px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full ${
                isLight
                  ? "text-[#8b7355] bg-[#f0ebe3] border border-[#e0d6c8]"
                  : "text-[#c4a67d] bg-[rgba(196,166,125,0.1)]"
              }`}>
                Jewelry
              </span>
              {credits && (
                <span className={`text-[11px] px-2.5 py-1 rounded-full ${
                  isLight
                    ? "text-[#6b6b6b] bg-[#f0ede8] border border-[#e0dcd6]"
                    : "text-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.04)]"
                }`}>
                  <TokenIcon size={11} className="inline-block mr-0.5 -mt-0.5" /> {credits.token_balance} tokens
                </span>
              )}
            </div>
            <h1 className={`text-3xl md:text-4xl font-extrabold font-display tracking-tight ${
              isLight ? "text-[#0a0a0a]" : "text-white"
            }`}>
              {step === "upload" ? "Jewelry Studio" : "Choose Category"}
            </h1>
            <p className={`text-[15px] mt-2 leading-relaxed ${
              isLight ? "text-[#6b6b6b]" : "text-[rgba(255,255,255,0.7)]"
            }`}>
              {step === "upload"
                ? "Upload your jewelry photos and generate studio-quality product shots."
                : "Select the type of jewelry to see matching themes and shots."}
            </p>

            {/* Upgrade banner */}
            <div className={`mt-5 flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 rounded-xl ${
              isLight
                ? "bg-gradient-to-r from-[#faf6f0] to-[#f5ede0] border border-[#e8d9c4]"
                : "bg-gradient-to-r from-[rgba(196,166,125,0.08)] to-[rgba(196,166,125,0.04)] border border-[rgba(196,166,125,0.15)]"
            }`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                  isLight ? "bg-[#c4a67d]/15" : "bg-[#c4a67d]/10"
                }`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className={`text-[13px] font-semibold ${isLight ? "text-[#5a4a36]" : "text-[#e8d5b5]"}`}>
                    Upgrade to Pro for crystal-clear, studio-grade images
                  </p>
                  <p className={`text-[11px] mt-0.5 ${isLight ? "text-[#8b7355]" : "text-[#c4a67d]/70"}`}>
                    3x sharper details · True metal shine · Plans from {isIndia ? "₹149" : "$4.99"}
                  </p>
                </div>
              </div>
              <Link
                href="/pricing"
                className="shrink-0 w-full sm:w-auto text-center px-4 py-2 rounded-lg text-[12px] font-bold text-white bg-gradient-to-r from-[#8b7355] to-[#c4a67d] hover:shadow-lg hover:shadow-[#c4a67d]/25 active:scale-[0.97] transition-all"
              >
                Upgrade →
              </Link>
            </div>
          </div>
        )}

        {/* ===== STEP 1: UPLOAD ===== */}
        {step === "upload" && (
          <div className="space-y-6 max-w-xl mx-auto">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleMainDrop}
              className={`relative border-[2.5px] border-dashed rounded-2xl p-10 md:p-16 text-center transition-all duration-300 cursor-pointer group ${
                isLight
                  ? "border-[#c4a67d]/50 bg-gradient-to-b from-[#faf6f0] to-[#f5ede2] hover:border-[#c4a67d]/80 shadow-[0_2px_20px_rgba(196,166,125,0.1)] hover:shadow-[0_8px_40px_rgba(196,166,125,0.18)]"
                  : "border-[rgba(196,166,125,0.35)] bg-[rgba(196,166,125,0.03)] hover:border-[rgba(196,166,125,0.6)] shadow-[0_2px_16px_rgba(0,0,0,0.06),0_8px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.1),0_12px_48px_rgba(0,0,0,0.06)]"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => { handleMainUpload(e); if (e.target.files?.[0]) setTimeout(() => setStep("select_type"), 300); }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-[1]"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => { handleMainUpload(e); if (e.target.files?.[0]) setTimeout(() => setStep("select_type"), 300); }}
                className="hidden"
              />
              {mainImage ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <img
                      src={mainImage.preview}
                      alt="Preview"
                      className={`w-44 h-44 object-cover rounded-2xl shadow-lg ${isLight ? "border border-[#e0dcd6]" : "border border-[rgba(255,255,255,0.1)]"}`}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMainImage(null); }}
                      className="absolute -top-2.5 -right-2.5 z-10 w-7 h-7 rounded-full bg-red-500/90 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transition-all hover:scale-110"
                      aria-label="Remove image"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-[#c4a67d]">Image uploaded</p>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStep("select_type"); }}
                    className="z-10 relative px-8 py-3 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-sm font-semibold rounded-2xl shadow-[0_4px_24px_rgba(196,166,125,0.3)] hover:shadow-[0_6px_32px_rgba(196,166,125,0.45)] hover:-translate-y-0.5 active:scale-[0.97] transition-all"
                  >
                    Continue
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline ml-2">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  {/* Radial glow behind the icon */}
                  <div className="relative">
                    <div className={`absolute inset-0 w-20 h-20 rounded-2xl blur-xl opacity-30 ${
                      isLight ? "bg-[#c4a67d]" : "bg-[#c4a67d]"
                    }`} />
                    <div className={`animate-upload-pulse relative w-20 h-20 rounded-2xl flex items-center justify-center ${
                      isLight
                        ? "bg-gradient-to-br from-[#c4a67d] to-[#8b7355] shadow-lg shadow-[#c4a67d]/25"
                        : "bg-gradient-to-br from-[#c4a67d] to-[#8b7355] shadow-lg shadow-[#c4a67d]/15"
                    }`}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className={`font-bold text-xl ${isLight ? "text-[#0a0a0a]" : "text-white"}`}>Upload your jewelry photo</p>
                    <p className={`text-sm mt-1.5 ${isLight ? "text-[#777]" : "text-[rgba(255,255,255,0.6)]"}`}>Drag and drop or click to browse</p>
                  </div>
                  <p className={`text-xs ${isLight ? "text-[#aaa]" : "text-[rgba(255,255,255,0.45)]"}`}>PNG, JPG, JPEG, HEIC, WebP — Max 10MB</p>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); cameraInputRef.current?.click(); }}
                    className={`mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all z-10 relative hover:-translate-y-0.5 active:scale-[0.97] ${
                      isLight
                        ? "text-white bg-gradient-to-r from-[#8b7355] to-[#c4a67d] shadow-md shadow-[#c4a67d]/20 hover:shadow-lg hover:shadow-[#c4a67d]/30"
                        : "text-white bg-gradient-to-r from-[#8b7355] to-[#c4a67d] shadow-md shadow-[#c4a67d]/15 hover:shadow-lg hover:shadow-[#c4a67d]/25"
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    Open Camera
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== STEP 2: SELECT CATEGORY ===== */}
        {step === "select_type" && (
          <div className="space-y-6">
            {/* Uploaded image preview strip */}
            <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
              {mainImage && (
                <img
                  src={mainImage.preview}
                  alt="Upload"
                  className="w-14 h-14 rounded-xl object-cover border border-[rgba(255,255,255,0.1)] flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Product uploaded</p>
                <p className="text-xs text-[rgba(255,255,255,0.4)]">
                  {altImages.length > 0 ? `${1 + altImages.length} photos` : "1 photo"}
                </p>
              </div>
              <button
                onClick={() => setStep("upload")}
                className="text-xs text-[rgba(255,255,255,0.4)] hover:text-white transition-colors flex-shrink-0"
              >
                Change
              </button>
            </div>

            {/* Additional photos - compact */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-[rgba(255,255,255,0.5)] uppercase tracking-wider">
                  Additional Photos <span className="text-[rgba(255,255,255,0.3)] font-normal">(optional)</span>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {altImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img.preview} alt={`Alt ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-[rgba(255,255,255,0.1)]" />
                    <button
                      onClick={() => removeAltImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => altInputRef.current?.click()}
                  className="w-16 h-16 rounded-lg border border-dashed border-[rgba(255,255,255,0.1)] hover:border-[rgba(196,166,125,0.3)] transition-colors flex items-center justify-center text-[rgba(255,255,255,0.3)] hover:text-[#c4a67d]"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <input ref={altInputRef} type="file" accept="image/*" multiple onChange={handleAltUpload} className="hidden" />
              </div>
            </div>

            {/* Category selection */}
            <div>
              <h3 className="text-base font-semibold text-white mb-1">Choose a category to continue</h3>
              <p className="text-xs text-[rgba(255,255,255,0.5)] mb-4">Select the type of jewelry in your photo</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {JEWELRY_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setJewelryType(type.id);
                      loadThemes(type.id);
                      setStep("theme_browse");
                    }}
                    className={`group relative aspect-[4/5] rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] ${
                      jewelryType === type.id
                        ? "ring-2 ring-[#c4a67d] ring-offset-2 ring-offset-[#0E0F14] shadow-[0_0_20px_rgba(196,166,125,0.2)]"
                        : "ring-1 ring-[rgba(255,255,255,0.08)] hover:ring-[rgba(255,255,255,0.2)]"
                    }`}
                  >
                    {/* Image */}
                    <img
                      src={type.image}
                      alt={type.label}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    {/* Label */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <span className="text-sm font-bold text-white uppercase tracking-wider drop-shadow-lg">{type.label}</span>
                    </div>
                    {/* Selected indicator */}
                    {jewelryType === type.id && (
                      <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-[#c4a67d] flex items-center justify-center shadow-lg">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== THEME BROWSING ===== */}
        {step === "theme_browse" && (
          <div>
            {themesLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-2 border-[#c4a67d] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-sm text-[rgba(255,255,255,0.5)]">Loading themes...</p>
              </div>
            ) : (
              <ThemeGallery
                themes={themes}
                categories={themeCategories}
                selectedThemeId={selectedTheme?.id || null}
                onSelectTheme={handleSelectTheme}
                onBack={() => setStep("select_type")}
                jewelryType={jewelryType}
              />
            )}
          </div>
        )}

        {/* ===== SHOT CONFIGURATION ===== */}
        {step === "shot_config" && selectedTheme && (
          <>
          {genError && (
            <div className="mb-4 rounded-xl bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] px-4 py-3 flex items-start gap-3">
              <span className="text-red-400 text-lg leading-none mt-0.5">⚠</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-300">Generation failed</p>
                <p className="text-xs text-[rgba(255,255,255,0.6)] mt-0.5">{genError} No tokens were deducted — you can try again.</p>
              </div>
              <button
                onClick={() => setGenError(null)}
                className="text-[rgba(255,255,255,0.4)] hover:text-white text-sm"
                aria-label="Dismiss error"
              >✕</button>
            </div>
          )}
          <ShotConfigurator
            theme={selectedTheme}
            shotConfigs={shotConfigs}
            onUpdateShots={setShotConfigs}
            onBack={() => setStep("theme_browse")}
            onGenerate={generateWithTheme}
            tokenCost={getThemeTokenCost()}
            tokenBalance={credits?.token_balance || 0}
            quality={quality}
            onQualityChange={() => {}}
            aspectRatioId={aspectRatioId}
            onAspectRatioChange={(id) => setAspectRatioId(id)}
            isGenerating={false}
            jewelryType={jewelryType}
          />
          </>
        )}

        {/* ===== GENERATING STATE ===== */}
        {step === "generating" && (
          <div className="space-y-6">
            {/* Page header — same layout as results page */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-bold text-white">Your Photos</h2>
                <p className="text-xs text-[rgba(255,255,255,0.4)] mt-0.5">
                  {selectedType?.icon} {selectedType?.label}
                  {selectedTheme ? ` · ${selectedTheme.name}` : selectedBg ? ` on ${selectedBg.label}` : ""}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[rgba(234,179,8,0.1)] border border-[rgba(234,179,8,0.2)]">
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-xs font-semibold text-yellow-500">Generating</span>
              </div>
            </div>

            {/* Status bar */}
            <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] px-4 py-3 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-[#c4a67d]/30 border-t-[#c4a67d] rounded-full animate-spin flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">{genStatus}</p>
                <p className="text-[11px] text-[rgba(255,255,255,0.35)] mt-0.5">
                  This usually takes about a minute per shot — hang tight
                </p>
              </div>
            </div>

            {/* Generation cards — look like result cards with loading state */}
            <div className={`grid gap-4 ${
              (shotConfigs.filter((s) => s.selected).length || 1) === 1
                ? "grid-cols-1 max-w-lg mx-auto"
                : (shotConfigs.filter((s) => s.selected).length || 1) <= 3
                  ? "grid-cols-1 md:grid-cols-" + (shotConfigs.filter((s) => s.selected).length || 1)
                  : "grid-cols-2 md:grid-cols-3"
            }`}>
              {(shotConfigs.filter((s) => s.selected).length > 0
                ? shotConfigs.filter((s) => s.selected)
                : [{ shot_id: "hero", label: "Studio Shot 1" }]
              ).map((shot, i) => (
                <div
                  key={shot.shot_id}
                  className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] overflow-hidden"
                >
                  {/* Card header */}
                  <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[rgba(234,179,8,0.1)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                        <span className="text-[10px] font-semibold text-yellow-500">Generating</span>
                      </div>
                      <span className="text-xs font-semibold text-white uppercase tracking-wider">{shot.label}</span>
                    </div>
                  </div>

                  {/* Image placeholder with spinner */}
                  <div
                    className="relative bg-[rgba(255,255,255,0.02)] flex items-center justify-center"
                    style={{ aspectRatio: cssAspectRatio }}
                  >
                    <div className="relative w-14 h-14">
                      <svg className="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 56 56" fill="none" style={{ animationDuration: `${1.8 + i * 0.4}s` }}>
                        <circle cx="28" cy="28" r="24" stroke="rgba(196,166,125,0.1)" strokeWidth="2.5" />
                        <path
                          d="M28 4a24 24 0 0 1 24 24"
                          stroke="#c4a67d"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(196,166,125,0.4)" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Card footer — pre-rendered but disabled */}
                  <div className="px-3 py-2.5 border-t border-[rgba(255,255,255,0.04)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button disabled className="text-[11px] text-[rgba(255,255,255,0.2)] uppercase tracking-wider font-semibold flex items-center gap-1 cursor-not-allowed">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                        Redo
                      </button>
                      <button disabled className="text-[11px] text-[rgba(255,255,255,0.2)] uppercase tracking-wider font-semibold cursor-not-allowed">
                        Compare
                      </button>
                    </div>
                    <button disabled className="text-[11px] text-[rgba(255,255,255,0.2)] uppercase tracking-wider font-semibold flex items-center gap-1 cursor-not-allowed">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
                  {selectedType?.icon} {selectedType?.label}
                  {selectedTheme ? ` · ${selectedTheme.name}` : selectedBg ? ` on ${selectedBg.label}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {!isLocked && (
                  <button
                    onClick={() => {
                      if (anonGeneration) {
                        setPendingDownload(resultImages[0] || null);
                        setEmailGateOpen(true);
                      } else {
                        downloadAll();
                      }
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-xs font-semibold rounded-full hover:shadow-[0_4px_16px_rgba(196,166,125,0.3)] transition-all"
                  >
                    {anonGeneration ? "Download HD" : "Download All"}
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
                            onClick={() => anonGeneration ? setShowSignupPrompt(true) : regenerateShot(i)}
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
                            onClick={() => {
                              if (anonGeneration) {
                                setPendingDownload(img);
                                setEmailGateOpen(true);
                              } else {
                                downloadImage(img);
                              }
                            }}
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
                  {/* "Want to improve this picture?" auto-fix strip */}
                  {!isLocked && !anonGeneration && (
                    <button
                      onClick={() => autoFixShot(i)}
                      disabled={autoFixIndex === i}
                      className="w-full px-3 py-2.5 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-center gap-2 text-[11px] text-[rgba(255,255,255,0.5)] hover:text-[#c4a67d] hover:bg-[rgba(196,166,125,0.04)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group/fix"
                    >
                      {autoFixIndex === i ? (
                        <>
                          <div className="w-3 h-3 border border-[rgba(196,166,125,0.3)] border-t-[#c4a67d] rounded-full animate-spin" />
                          <span className="font-medium tracking-wide">Improving your picture…</span>
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 group-hover/fix:opacity-100 transition-opacity">
                            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                          <span className="font-medium tracking-wide">Product doesn&apos;t look right? <span className="text-[#c4a67d] underline underline-offset-2">Improve</span></span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Feedback widget — per-image */}
            {resultImages.length > 0 && (
              <FeedbackWidget
                images={resultImages.map((img, idx) => ({
                  generationId: generationIds[idx] || `gen-${idx}`,
                  imageUrl: img.url || undefined,
                  label: img.label,
                }))}
                flowType="jewelry"
                promptUsed={specialInstructions || undefined}
              />
            )}

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

            {/* Anonymous signup nudge banner */}
            {anonGeneration && (
              <div className="rounded-2xl border border-[rgba(196,166,125,0.25)] bg-gradient-to-r from-[rgba(196,166,125,0.08)] to-[rgba(139,115,85,0.05)] p-5">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-white mb-1">Love the result?</h3>
                    <p className="text-sm text-[rgba(255,255,255,0.55)]">
                      Sign up to download in <span className="text-[#c4a67d] font-medium">full HD without watermark</span>, get <span className="text-[#c4a67d] font-medium">8 free tokens</span>, and keep creating.
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => router.push("/login?redirect=/jewelry")}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-sm font-semibold rounded-xl hover:shadow-[0_4px_20px_rgba(196,166,125,0.35)] transition-all"
                    >
                      Sign Up Free
                    </button>
                    <button
                      onClick={() => {
                        setPendingDownload(resultImages[0] || null);
                        setEmailGateOpen(true);
                      }}
                      className="px-5 py-2.5 text-sm text-[rgba(255,255,255,0.5)] hover:text-white border border-[rgba(255,255,255,0.1)] rounded-xl transition-colors"
                    >
                      Download Preview
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tweak + regenerate bar */}
            {!isLocked && !anonGeneration && (
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
                    className={`w-full px-4 py-3 pr-20 rounded-xl text-[14px] focus:outline-none focus:border-[rgba(196,166,125,0.3)] focus:ring-1 focus:ring-[rgba(196,166,125,0.15)] transition-all ${
                      isLight
                        ? "bg-white border border-[#e5e2dc] text-[#0a0a0a] placeholder:text-[#b5b5b5]"
                        : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white placeholder:text-[rgba(255,255,255,0.3)]"
                    }`}
                  />
                  <button
                    onClick={() => regenerateShot(0)}
                    disabled={regenIndex !== null}
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all disabled:opacity-40 ${
                      isLight
                        ? "bg-[#8b7355]/15 text-[#8b7355] hover:bg-[#8b7355]/25"
                        : "bg-[rgba(196,166,125,0.15)] text-[#c4a67d] hover:bg-[rgba(196,166,125,0.25)]"
                    }`}
                  >
                    {regenIndex !== null ? (
                      <div className={`w-4 h-4 border-2 rounded-full animate-spin ${isLight ? "border-[#8b7355]/30 border-t-[#8b7355]" : "border-[rgba(196,166,125,0.3)] border-t-[#c4a67d]"}`} />
                    ) : (
                      "Redo"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ===== WHAT'S NEXT? — unified outcome grid ===== */}
            <div className={`pt-6 border-t ${isLight ? "border-[#e5e2dc]" : "border-[rgba(255,255,255,0.08)]"}`}>
              <h3 className={`text-lg font-bold tracking-tight mb-1.5 ${isLight ? "text-[#0a0a0a]" : "text-white"}`}>What&apos;s next?</h3>
              <p className={`text-[14px] mb-5 leading-relaxed ${isLight ? "text-[#6b6b6b]" : "text-[rgba(255,255,255,0.6)]"}`}>
                Pick an outcome. Each one takes your generated photos one step further.
              </p>

              {(() => {
                // Routes a downstream tool with the first result image as starting point.
                const goTo = (path: string, storageKey: string) => {
                  const img = resultImages[0];
                  const src = img?.url || (img?.base64 ? `data:image/png;base64,${img.base64}` : "");
                  const params = new URLSearchParams();
                  if (src && src.startsWith("http")) {
                    params.set("image", src);
                  } else if (img?.base64) {
                    try { sessionStorage.setItem(storageKey, img.base64); } catch { /* quota */ }
                  }
                  if (jewelryType) params.set("type", jewelryType);
                  if (sessionId) params.set("session", sessionId);
                  router.push(`${path}?${params.toString()}`);
                };

                const scrollToId = (id: string) => {
                  const el = document.getElementById(id);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    el.classList.add("ring-2", "ring-[#c4a67d]/50");
                    setTimeout(() => el.classList.remove("ring-2", "ring-[#c4a67d]/50"), 1400);
                  }
                };

                const nextTiles: Array<{
                  key: string;
                  title: string;
                  tagline: string;
                  tone: string;
                  count?: number;
                  icon: React.ReactNode;
                  onClick: () => void;
                }> = [
                  {
                    key: "ugc",
                    title: "Model Shots (UGC)",
                    tagline: "AI model wearing your jewelry",
                    tone: "from-[#ec4899] to-[#f472b6]",
                    count: ugcImages.length || undefined,
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                    ),
                    onClick: () => goTo("/ugc", "ugc_image_b64"),
                  },
                  {
                    key: "flow-video",
                    title: "Flow Video",
                    tagline: "Reel: product → model reveal",
                    tone: "from-[#7c3aed] to-[#a78bfa]",
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="10 8 16 12 10 16 10 8" /><rect x="2" y="3" width="20" height="18" rx="2" />
                      </svg>
                    ),
                    onClick: () => goTo("/flow-video", "flow_video_image_b64"),
                  },
                  {
                    key: "branding",
                    title: "Add Branding",
                    tagline: "Brand strip below images",
                    tone: "from-[#8b7355] to-[#c4a67d]",
                    count: brandedImages.length || undefined,
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    ),
                    onClick: () => openBrandingModal(),
                  },
                  {
                    key: "listing",
                    title: "Product Listing",
                    tagline: "Shopify-ready title & description",
                    tone: "from-[#10b981] to-[#34d399]",
                    count: catalogueData ? 1 : undefined,
                    icon: (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    ),
                    onClick: () => (catalogueData ? openListingModal() : generateCatalogue()),
                  },
                ];

                return (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {nextTiles.map((t, i) => (
                      <button
                        key={t.key}
                        onClick={t.onClick}
                        style={{ animationDelay: `${i * 50}ms` }}
                        className={`group relative rounded-2xl p-4 border text-left transition-all duration-300 animate-fade-in-up hover:-translate-y-0.5 ${
                          isLight
                            ? "border-[#e5e2dc] bg-white hover:border-[#c4a67d]/40 hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)]"
                            : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(196,166,125,0.35)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.tone} flex items-center justify-center text-white mb-3 group-hover:scale-105 transition-transform duration-300`}>
                          {t.icon}
                        </div>
                        <div className="flex items-start justify-between gap-1.5">
                          <h4 className={`text-[13px] font-bold tracking-tight leading-tight ${isLight ? "text-[#0a0a0a]" : "text-white"}`}>{t.title}</h4>
                          {t.count !== undefined && (
                            <span className="flex-shrink-0 text-[9px] font-bold bg-[rgba(196,166,125,0.15)] text-[#c4a67d] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                              {t.count}
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] mt-1 leading-snug ${isLight ? "text-[#6b6b6b]" : "text-[rgba(255,255,255,0.45)]"}`}>
                          {t.tagline}
                        </p>
                        <span className={`mt-2 inline-flex items-center gap-1 text-[11px] font-semibold transition-all duration-200 ${isLight ? "text-[#8b7355] group-hover:gap-1.5" : "text-[#c4a67d] group-hover:gap-1.5"}`}>
                          {t.count ? "Open" : "Try it"}
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                          </svg>
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>


            {/* ===== YOUR OUTPUTS — detailed workspaces for branding/listing ===== */}
            <div className={`pt-6 border-t ${isLight ? "border-[#e5e2dc]" : "border-[rgba(255,255,255,0.08)]"}`}>
              <h3 className={`text-lg font-bold tracking-tight mb-1.5 ${isLight ? "text-[#0a0a0a]" : "text-white"}`}>Your workspace</h3>
              <p className={`text-[14px] mb-5 leading-relaxed ${isLight ? "text-[#6b6b6b]" : "text-[rgba(255,255,255,0.6)]"}`}>
                Branding · listing controls, with all outputs in one place.
              </p>

              <div className="space-y-4">

                {/* ── Branding Card ── */}
                <div className={`rounded-2xl p-5 md:p-6 ${isLight ? "border border-[#e5e2dc] bg-white" : "border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]"}`}>
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Left: header + action */}
                    <div className="md:w-[220px] flex-shrink-0 flex flex-col">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isLight ? "bg-[#8b7355]/10" : "bg-[rgba(196,166,125,0.12)]"}`}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isLight ? "#8b7355" : "#c4a67d"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                          </svg>
                        </div>
                        <div>
                          <h4 className={`text-[15px] font-bold tracking-tight ${isLight ? "text-[#0a0a0a]" : "text-white"}`}>Add Branding</h4>
                          <p className={`text-[13px] ${isLight ? "text-[#6b6b6b]" : "text-[rgba(255,255,255,0.55)]"}`}>Brand strip below images</p>
                        </div>
                      </div>
                      <button
                        onClick={openBrandingModal}
                        className={`w-full py-2.5 rounded-xl text-[13px] font-bold border active:scale-[0.98] transition-all ${
                          isLight
                            ? "bg-[#8b7355]/10 text-[#8b7355] border-[#8b7355]/20 hover:bg-[#8b7355]/15 hover:border-[#8b7355]/35"
                            : "bg-[rgba(196,166,125,0.1)] text-[#c4a67d] border-[rgba(196,166,125,0.2)] hover:bg-[rgba(196,166,125,0.18)] hover:border-[rgba(196,166,125,0.35)]"
                        }`}
                      >
                        {brandedImages.length > 0 ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            Brand More Photos
                          </span>
                        ) : "Add Branding Strip"}
                      </button>
                      {brandedImages.length > 0 && (
                        <p className={`text-[12px] mt-2 text-center ${isLight ? "text-[#8c8c8c]" : "text-[rgba(255,255,255,0.45)]"}`}>{brandedImages.length} branded photo{brandedImages.length !== 1 ? "s" : ""}</p>
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
                <div className={`rounded-2xl p-5 md:p-6 ${isLight ? "border border-[#e5e2dc] bg-white" : "border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]"}`}>
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Left: header + actions */}
                    <div className="md:w-[220px] flex-shrink-0 flex flex-col">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isLight ? "bg-[#8b7355]/10" : "bg-[rgba(196,166,125,0.12)]"}`}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isLight ? "#8b7355" : "#c4a67d"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <line x1="10" y1="9" x2="8" y2="9" />
                          </svg>
                        </div>
                        <div>
                          <h4 className={`text-[15px] font-bold tracking-tight ${isLight ? "text-[#0a0a0a]" : "text-white"}`}>Product Listing</h4>
                          <p className={`text-[13px] ${isLight ? "text-[#6b6b6b]" : "text-[rgba(255,255,255,0.55)]"}`}>E-commerce listing</p>
                        </div>
                      </div>
                      {catalogueData && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(150,191,72,0.1)] border border-[rgba(150,191,72,0.25)] rounded-full w-fit mb-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#96bf48]" />
                          <span className="text-[11px] font-semibold text-[#96bf48]">Shopify Ready</span>
                        </span>
                      )}
                      {catalogueData ? (
                        <div className="space-y-2.5">
                          <button
                            onClick={openListingModal}
                            className={`w-full py-2.5 rounded-xl text-[13px] font-bold border active:scale-[0.98] transition-all ${
                              isLight ? "bg-[#8b7355]/10 text-[#8b7355] border-[#8b7355]/20 hover:bg-[#8b7355]/15" : "bg-[rgba(196,166,125,0.1)] text-[#c4a67d] border-[rgba(196,166,125,0.2)] hover:bg-[rgba(196,166,125,0.18)]"
                            }`}
                          >
                            View &amp; Edit
                          </button>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(catalogueData, null, 2));
                                showToast("Copied to clipboard!", "success");
                              }}
                              className={`flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-all ${
                                isLight ? "text-[#4a4a4a] border-[#e5e2dc] hover:border-[#0a0a0a] hover:text-[#0a0a0a]" : "text-[rgba(255,255,255,0.65)] border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] hover:text-white"
                              }`}
                            >
                              Copy
                            </button>
                            <button
                              onClick={generateCatalogue}
                              disabled={catalogueLoading}
                              className={`flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-all disabled:opacity-50 ${
                                isLight ? "text-[#4a4a4a] border-[#e5e2dc] hover:border-[#0a0a0a] hover:text-[#0a0a0a]" : "text-[rgba(255,255,255,0.65)] border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] hover:text-white"
                              }`}
                            >
                              {catalogueLoading ? "..." : "Redo"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {hasBrandConfig === false && (
                            <p className={`text-[13px] leading-relaxed mb-3 ${isLight ? "text-[#6b6b6b]" : "text-[rgba(255,255,255,0.5)]"}`}>
                              <button onClick={() => router.push("/brand-settings")} className={`font-bold hover:underline ${isLight ? "text-[#8b7355]" : "text-[#c4a67d]"}`}>Set up brand voice</button> for personalized listings.
                            </p>
                          )}
                          <button
                            onClick={generateCatalogue}
                            disabled={catalogueLoading}
                            className={`w-full py-2.5 rounded-xl text-[13px] font-bold border active:scale-[0.98] transition-all disabled:opacity-50 ${
                              isLight ? "bg-[#8b7355]/10 text-[#8b7355] border-[#8b7355]/20 hover:bg-[#8b7355]/15 hover:border-[#8b7355]/35" : "bg-[rgba(196,166,125,0.1)] text-[#c4a67d] border-[rgba(196,166,125,0.2)] hover:bg-[rgba(196,166,125,0.18)] hover:border-[rgba(196,166,125,0.35)]"
                            }`}
                          >
                            {catalogueLoading ? (
                              <span className="flex items-center justify-center gap-2">
                                <div className="w-3.5 h-3.5 border-2 border-[rgba(196,166,125,0.3)] border-t-[#c4a67d] rounded-full animate-spin" />
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
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in"
          onClick={() => setUgcModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md mx-4 bg-[#0E0F14] border border-[rgba(196,166,125,0.15)] rounded-2xl animate-scale-in shadow-[0_24px_80px_rgba(0,0,0,0.6)] max-h-[90vh] overflow-y-auto scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[#0E0F14]/95 backdrop-blur-sm rounded-t-2xl">
              <h3 className="text-base font-bold text-white font-display">Generate UGC Photos</h3>
              <button
                onClick={() => setUgcModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Source Image Selection */}
              {resultImages.length > 1 && (
                <div>
                  <label className="block text-[10px] font-semibold text-[rgba(255,255,255,0.45)] uppercase tracking-[0.1em] mb-2.5">Select Source Image</label>
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {resultImages.map((img, i) => (
                      <button
                        key={`ugc-src-${i}`}
                        onClick={() => setUgcSourceIndex(i)}
                        className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                          ugcSourceIndex === i
                            ? "border-[#c4a67d] shadow-[0_0_12px_rgba(196,166,125,0.25)]"
                            : "border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]"
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
                        <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent text-[8px] text-white/80 text-center py-1 font-semibold truncate px-1">
                          {img.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Gender */}
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(255,255,255,0.45)] uppercase tracking-[0.1em] mb-2.5">Gender</label>
                <div className="flex gap-2">
                  {UGC_GENDERS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setUgcGender(g.id)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                        ugcGender === g.id
                          ? "bg-[rgba(196,166,125,0.12)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)] shadow-[0_0_12px_rgba(196,166,125,0.1)]"
                          : "bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] hover:text-[rgba(255,255,255,0.7)]"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nationality */}
              <div className="relative">
                <label className="block text-[10px] font-semibold text-[rgba(255,255,255,0.45)] uppercase tracking-[0.1em] mb-2.5">Nationality / Ethnicity</label>
                <button
                  onClick={() => setUgcNatOpen(!ugcNatOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.8)] hover:border-[rgba(255,255,255,0.14)] transition-all"
                >
                  {ugcNationality}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`transition-transform duration-200 ${ugcNatOpen ? "rotate-180" : ""}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {ugcNatOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#12131A] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.5)] z-10 max-h-52 overflow-hidden flex flex-col">
                    <div className="p-2.5 border-b border-[rgba(255,255,255,0.06)]">
                      <input
                        type="text"
                        value={ugcNatSearch}
                        onChange={(e) => setUgcNatSearch(e.target.value)}
                        placeholder="Search..."
                        className="w-full px-3 py-2 rounded-lg text-xs bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white placeholder:text-[rgba(255,255,255,0.25)] outline-none focus:border-[rgba(196,166,125,0.4)] transition-colors"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto max-h-40 scrollbar-thin">
                      {UGC_NATIONALITIES.filter((n) =>
                        n.toLowerCase().includes(ugcNatSearch.toLowerCase())
                      ).map((n) => (
                        <button
                          key={n}
                          onClick={() => { setUgcNationality(n); setUgcNatOpen(false); setUgcNatSearch(""); }}
                          className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                            ugcNationality === n
                              ? "text-[#c4a67d] font-semibold bg-[rgba(196,166,125,0.06)]"
                              : "text-[rgba(255,255,255,0.55)] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
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
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(255,255,255,0.45)] uppercase tracking-[0.1em] mb-2.5">Skin Tone</label>
                <div className="flex items-center gap-3">
                  {UGC_SKIN_TONES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setUgcSkinTone(t.id)}
                      className="flex flex-col items-center gap-1.5 group"
                      title={t.label}
                    >
                      <div
                        className={`w-9 h-9 rounded-full border-2 transition-all duration-200 ${
                          ugcSkinTone === t.id
                            ? "border-[#c4a67d] scale-110 shadow-[0_0_12px_rgba(196,166,125,0.3)]"
                            : "border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)]"
                        }`}
                        style={{ backgroundColor: t.color }}
                      />
                      <span className={`text-[10px] font-medium transition-colors ${ugcSkinTone === t.id ? "text-[#c4a67d]" : "text-[rgba(255,255,255,0.35)] group-hover:text-[rgba(255,255,255,0.55)]"}`}>
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Background */}
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(255,255,255,0.45)] uppercase tracking-[0.1em] mb-2.5">Background</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {UGC_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setUgcBackground(bg.id)}
                      className={`group relative aspect-square rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 ${
                        ugcBackground === bg.id
                          ? "ring-2 ring-[#c4a67d] ring-offset-1 ring-offset-[#1a1b20] shadow-[0_0_12px_rgba(196,166,125,0.25)]"
                          : "ring-1 ring-[rgba(255,255,255,0.08)] hover:ring-[rgba(255,255,255,0.2)]"
                      }`}
                    >
                      <img
                        src={bg.image}
                        alt={bg.label}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <span className="absolute bottom-1.5 left-0 right-0 text-center text-[10px] font-semibold text-white drop-shadow-lg">
                        {bg.label}
                      </span>
                      {ugcBackground === bg.id && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#c4a67d] flex items-center justify-center">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Outfit Style */}
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(255,255,255,0.45)] uppercase tracking-[0.1em] mb-2.5">Outfit</label>
                <div className="grid grid-cols-3 gap-2 mb-2.5">
                  {([
                    { id: "modern", label: "Modern", desc: "Western formal / casual", icon: "👔" },
                    { id: "traditional", label: "Traditional", desc: "Saree, lehenga, ethnic", icon: "🪷" },
                    { id: "minimal", label: "Minimal", desc: "Plain top, no distraction", icon: "◻️" },
                  ] as const).map((style) => (
                    <button
                      key={style.id}
                      onClick={() => { setUgcOutfitStyle(style.id); setUgcOutfitCustom(""); }}
                      className={`py-2.5 px-2 rounded-xl text-center transition-all duration-200 ${
                        ugcOutfitStyle === style.id && !ugcOutfitCustom
                          ? "bg-[rgba(196,166,125,0.12)] border border-[rgba(196,166,125,0.3)] shadow-[0_0_12px_rgba(196,166,125,0.1)]"
                          : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"
                      }`}
                    >
                      <span className="text-base">{style.icon}</span>
                      <p className={`text-[11px] font-semibold mt-1 ${
                        ugcOutfitStyle === style.id && !ugcOutfitCustom ? "text-[#c4a67d]" : "text-[rgba(255,255,255,0.6)]"
                      }`}>{style.label}</p>
                      <p className="text-[9px] text-[rgba(255,255,255,0.3)] mt-0.5 leading-tight">{style.desc}</p>
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={ugcOutfitCustom}
                    onChange={(e) => setUgcOutfitCustom(e.target.value)}
                    placeholder="Or describe a custom outfit, e.g. 'red silk saree with gold border'"
                    className="w-full px-3 py-2.5 rounded-xl text-xs bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white placeholder:text-[rgba(255,255,255,0.25)] outline-none focus:border-[rgba(196,166,125,0.4)] transition-colors"
                  />
                  {ugcOutfitCustom && (
                    <button
                      onClick={() => setUgcOutfitCustom("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.3)] hover:text-white transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Poses */}
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(255,255,255,0.45)] uppercase tracking-[0.1em] mb-1">
                  Poses
                  {jewelryType && (
                    <span className="ml-1.5 text-[#c4a67d]/50 normal-case font-medium">
                      — recommended for {jewelryType}
                    </span>
                  )}
                </label>
                <p className="text-[11px] text-[rgba(255,255,255,0.35)] mb-2.5">Select 1-4 poses. Each pose generates one image.</p>
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
                          className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all duration-200 text-left flex items-center gap-2.5 ${
                            isSelected
                              ? "bg-[rgba(196,166,125,0.12)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]"
                              : "bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] hover:text-[rgba(255,255,255,0.7)]"
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-[5px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected ? "border-[#c4a67d] bg-[#c4a67d]" : "border-[rgba(255,255,255,0.15)]"
                          }`}>
                            {isSelected && (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0E0F14" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </span>
                          {p.label}
                          {isRec && (
                            <span className="ml-auto text-[9px] font-bold text-[#c4a67d]/50 bg-[rgba(196,166,125,0.08)] px-1.5 py-0.5 rounded uppercase">rec</span>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Quality fixed to Pro */}
            </div>

            {/* Generate Button - sticky footer */}
            <div className="sticky bottom-0 px-6 py-4 border-t border-[rgba(255,255,255,0.06)] bg-[#0E0F14]/95 backdrop-blur-sm rounded-b-2xl">
              <button
                onClick={generateUGC}
                disabled={ugcPoses.length === 0}
                className="w-full py-3 rounded-full text-sm font-bold bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white shadow-[0_4px_20px_rgba(196,166,125,0.3)] hover:shadow-[0_6px_30px_rgba(196,166,125,0.45)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                Generate {ugcPoses.length} Photo{ugcPoses.length !== 1 ? "s" : ""} ({JEWELRY_PRICING[ugcQuality].ugcPerPose * ugcPoses.length} tokens)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== BRANDING MODAL ===== */}
      {brandingModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in"
          onClick={() => !brandingLoading && setBrandingModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg mx-4 bg-[#0E0F14] border border-[rgba(196,166,125,0.15)] rounded-2xl animate-scale-in shadow-[0_24px_80px_rgba(0,0,0,0.6)] max-h-[90vh] overflow-y-auto scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[#0E0F14]/95 backdrop-blur-sm rounded-t-2xl">
              <h3 className="text-base font-bold text-white font-display">Add Branding</h3>
              <button
                onClick={() => !brandingLoading && setBrandingModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5">
            {/* Photo selector */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-semibold text-[rgba(255,255,255,0.45)] uppercase tracking-[0.1em]">
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

            </div>

            {/* Generate button */}
            <div className="sticky bottom-0 px-6 py-4 border-t border-[rgba(255,255,255,0.06)] bg-[#0E0F14]/95 backdrop-blur-sm rounded-b-2xl">
              <button
                onClick={applyBranding}
                disabled={brandingLoading || brandingSelectedIdxs.length === 0 || (!brandName.trim() && !brandPhone.trim())}
                className="w-full py-3 rounded-full text-sm font-bold bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white shadow-[0_4px_20px_rgba(196,166,125,0.3)] hover:shadow-[0_6px_30px_rgba(196,166,125,0.45)] hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {brandingLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Applying Branding...
                  </span>
                ) : (
                  `Brand ${brandingSelectedIdxs.length} Photo${brandingSelectedIdxs.length !== 1 ? "s" : ""}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== VIDEO CONFIG MODAL ===== */}
      {videoModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in"
          onClick={() => setVideoModalOpen(false)}
        >
          <div
            className={`w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl animate-scale-in ${
              isLight ? "bg-white border border-[#e5e2dc]" : "bg-[#141414] border border-[rgba(255,255,255,0.1)]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-5 border-b ${isLight ? "border-[#e5e2dc]" : "border-[rgba(255,255,255,0.08)]"}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-bold ${isLight ? "text-[#0a0a0a]" : "text-white"}`}>Generate Video</h3>
                <button onClick={() => setVideoModalOpen(false)} className={`w-8 h-8 rounded-full flex items-center justify-center ${isLight ? "bg-[#f5f3ef] hover:bg-[#ebe8e2]" : "bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)]"}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isLight ? "#666" : "white"} strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Mode */}
              <div>
                <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${isLight ? "text-[#999]" : "text-white/40"}`}>Video Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "360_spin", label: "360° Spin", icon: "↻" },
                    { id: "hero_reveal", label: "Hero Reveal", icon: "🎬" },
                    { id: "lifestyle", label: "Lifestyle", icon: "✨" },
                    { id: "sparkle", label: "Sparkle", icon: "💎" },
                    { id: "custom", label: "Custom", icon: "✏️" },
                  ].map(({ id, label, icon }) => (
                    <button
                      key={id}
                      onClick={() => setVideoMode(id)}
                      className={`p-3 rounded-xl text-left text-sm font-medium transition-all border ${
                        videoMode === id
                          ? isLight ? "border-[#8b7355] bg-[#8b7355]/10 text-[#8b7355]" : "border-[#c4a67d] bg-[rgba(196,166,125,0.15)] text-[#c4a67d]"
                          : isLight ? "border-[#e5e2dc] text-[#666] hover:border-[#8b7355]/30" : "border-[rgba(255,255,255,0.08)] text-white/60 hover:border-[rgba(196,166,125,0.3)]"
                      }`}
                    >
                      <span className="mr-1.5">{icon}</span>{label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom prompt */}
              {videoMode === "custom" && (
                <div>
                  <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${isLight ? "text-[#999]" : "text-white/40"}`}>Custom Prompt</label>
                  <textarea
                    value={videoCustomPrompt}
                    onChange={(e) => setVideoCustomPrompt(e.target.value)}
                    placeholder="Describe the video you want..."
                    rows={3}
                    className={`w-full text-sm p-3 rounded-xl border resize-none ${
                      isLight ? "border-[#e5e2dc] bg-white text-[#0a0a0a]" : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] text-white"
                    }`}
                  />
                </div>
              )}

              {/* Aspect ratio */}
              <div>
                <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${isLight ? "text-[#999]" : "text-white/40"}`}>Aspect Ratio</label>
                <div className="flex gap-2">
                  {[
                    { id: "landscape", label: "16:9", icon: "▬" },
                    { id: "portrait", label: "9:16", icon: "▮" },
                  ].map(({ id, label, icon }) => (
                    <button
                      key={id}
                      onClick={() => setVideoAspect(id)}
                      className={`flex-1 p-2.5 rounded-xl text-sm font-medium text-center transition-all border ${
                        videoAspect === id
                          ? isLight ? "border-[#8b7355] bg-[#8b7355]/10 text-[#8b7355]" : "border-[#c4a67d] bg-[rgba(196,166,125,0.15)] text-[#c4a67d]"
                          : isLight ? "border-[#e5e2dc] text-[#666]" : "border-[rgba(255,255,255,0.08)] text-white/60"
                      }`}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality */}
              <div>
                <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${isLight ? "text-[#999]" : "text-white/40"}`}>Quality</label>
                <div className="flex gap-2">
                  {(["standard", "pro"] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setVideoQuality(q)}
                      className={`flex-1 p-2.5 rounded-xl text-sm font-medium text-center transition-all border ${
                        videoQuality === q
                          ? isLight ? "border-[#8b7355] bg-[#8b7355]/10 text-[#8b7355]" : "border-[#c4a67d] bg-[rgba(196,166,125,0.15)] text-[#c4a67d]"
                          : isLight ? "border-[#e5e2dc] text-[#666]" : "border-[rgba(255,255,255,0.08)] text-white/60"
                      }`}
                    >
                      {q === "standard" ? "Standard (25 tokens)" : "Pro (50 tokens)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source image */}
              {resultImages.length > 1 && (
                <div>
                  <label className={`text-xs font-semibold uppercase tracking-wider mb-2 block ${isLight ? "text-[#999]" : "text-white/40"}`}>Source Image</label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {resultImages.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setVideoSourceIndex(i)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          videoSourceIndex === i
                            ? isLight ? "border-[#8b7355]" : "border-[#c4a67d]"
                            : "border-transparent opacity-50"
                        }`}
                      >
                        <img src={imgSrc(img)} alt={img.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`p-5 border-t ${isLight ? "border-[#e5e2dc]" : "border-[rgba(255,255,255,0.08)]"}`}>
              <button
                onClick={generateVideo}
                disabled={videoMode === "custom" && !videoCustomPrompt.trim()}
                className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
                  isLight
                    ? "bg-gradient-to-r from-[#8b7355] to-[#a08060] text-white shadow-[0_4px_16px_rgba(139,115,85,0.3)]"
                    : "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white shadow-[0_4px_16px_rgba(196,166,125,0.3)]"
                } disabled:opacity-50`}
              >
                Generate Video · {videoQuality === "pro" ? 50 : 25} tokens
              </button>
            </div>
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
      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        requiredCredits={requiredCreditsForModal}
        currentBalance={credits?.token_balance || 0}
      />

      {/* Email Gate Modal for Downloads */}
      <EmailGateModal
        open={emailGateOpen}
        onClose={() => { setEmailGateOpen(false); setPendingDownload(null); }}
        onSubmit={handleEmailGateSubmit}
      />

      {/* Signup Prompt Modal — shown when anon user hits their limit or tries premium actions */}
      {showSignupPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowSignupPrompt(false)}>
          <div className="relative w-full max-w-md mx-4 bg-[#1a1a1a] border border-[rgba(196,166,125,0.25)] rounded-2xl p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowSignupPrompt(false)}
              className="absolute top-4 right-4 text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#8b7355] to-[#c4a67d] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Love the result?</h3>
            <p className="text-sm text-[rgba(255,255,255,0.55)] mb-6">
              Sign up to download HD images, get <span className="text-[#c4a67d] font-semibold">8 free tokens</span>, and keep creating studio-quality jewelry photos.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/login?redirect=/jewelry")}
                className="w-full py-3 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white font-semibold rounded-xl hover:shadow-[0_4px_20px_rgba(196,166,125,0.35)] transition-all"
              >
                Sign Up Free
              </button>
              <button
                onClick={() => setShowSignupPrompt(false)}
                className="w-full py-3 text-sm text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </ResponsiveLayout>
  );
}
