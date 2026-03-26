"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth, useCredits } from "@/providers/AppProvider";
import { useTheme } from "@/hooks/useTheme";
import { JEWELRY_PRICING } from "@/lib/token-pricing";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import FeedbackWidget from "@/components/jewelry/FeedbackWidget";
import QualityToggle from "@/components/ui/QualityToggle";

// ─── Constants ───

const UGC_GENDERS = ["woman", "man", "boy", "girl"] as const;

const UGC_SKIN_TONES = [
  { id: "fair", label: "Fair", hex: "#F5D6B8" },
  { id: "light", label: "Light", hex: "#E8B88A" },
  { id: "medium", label: "Medium", hex: "#C68642" },
  { id: "tan", label: "Tan", hex: "#A0622E" },
  { id: "brown", label: "Brown", hex: "#7B4B2A" },
  { id: "dark", label: "Dark", hex: "#4A2912" },
] as const;

const UGC_NATIONALITIES = [
  "Indian", "East Asian", "Southeast Asian", "Japanese", "Korean", "Chinese",
  "Middle Eastern", "Arab", "Persian", "Turkish",
  "African", "Nigerian", "Ethiopian",
  "European", "British", "French", "Italian", "Spanish", "German", "Scandinavian", "Russian",
  "Latin American", "Brazilian", "Mexican", "Colombian",
  "American", "Canadian", "Australian",
  "Filipino", "Thai", "Vietnamese", "Indonesian", "Malaysian",
  "Pakistani", "Bangladeshi", "Sri Lankan", "Nepali",
] as const;

const UGC_ALL_POSES = [
  { id: "standing", label: "Standing" },
  { id: "sitting", label: "Sitting" },
  { id: "close_up", label: "Close Up" },
  { id: "side_view", label: "Side View" },
  { id: "walking", label: "Walking" },
  { id: "neck_macro", label: "Neck Macro" },
  { id: "ear_macro", label: "Ear Macro" },
  { id: "finger_macro", label: "Finger Macro" },
  { id: "wrist_macro", label: "Wrist Macro" },
  { id: "hand_closeup", label: "Hand Closeup" },
  { id: "ankle_macro", label: "Ankle Macro" },
  { id: "feet_closeup", label: "Feet Closeup" },
  { id: "lapel_macro", label: "Lapel Macro" },
  { id: "over_shoulder", label: "Over Shoulder" },
  { id: "mirror_selfie", label: "Mirror Selfie" },
] as const;

const UGC_BACKGROUNDS = [
  { id: "best_match", label: "Best Match", swatch: "linear-gradient(135deg, #c4a67d, #8b7355)", image: "/images/backgrounds/best_match.png" },
  { id: "outdoor", label: "Outdoor", swatch: "#6B8E6B", image: "/images/backgrounds/outdoor.png" },
  { id: "studio", label: "Studio", swatch: "#2A2A2A", image: "/images/backgrounds/studio.png" },
  { id: "flora", label: "Flora", swatch: "#8FBC8F", image: "/images/backgrounds/flora.png" },
  { id: "wooden", label: "Wooden", swatch: "#8B6914", image: "/images/backgrounds/wooden.png" },
  { id: "indoor", label: "Indoor", swatch: "#D2B48C", image: "/images/backgrounds/indoor.png" },
  { id: "livingroom", label: "Living Room", swatch: "#BC8F8F", image: "/images/backgrounds/livingroom.png" },
] as const;

const JEWELRY_POSE_MAP: Record<string, string[]> = {
  necklace: ["standing", "close_up", "neck_macro", "side_view"],
  pendant: ["standing", "close_up", "neck_macro", "side_view"],
  chain: ["standing", "close_up", "neck_macro"],
  mangalsutra: ["standing", "close_up", "neck_macro"],
  earring: ["close_up", "side_view", "ear_macro"],
  // Ring UGC should be hand-only closeups (avoid full-body / portrait poses)
  ring: ["finger_macro", "hand_closeup"],
  bracelet: ["close_up", "wrist_macro", "hand_closeup"],
  bangle: ["close_up", "wrist_macro", "hand_closeup"],
  anklet: ["standing", "ankle_macro", "feet_closeup"],
  brooch: ["standing", "close_up", "lapel_macro"],
  watch: ["close_up", "wrist_macro", "hand_closeup"],
  default: ["standing", "close_up", "side_view"],
};

const OUTFIT_STYLES = [
  { id: "traditional", label: "Traditional" },
  { id: "western", label: "Western" },
  { id: "formal", label: "Formal" },
  { id: "casual", label: "Casual" },
  { id: "bridal", label: "Bridal" },
  { id: "custom", label: "Custom" },
] as const;

// ─── Types ───

interface UgcResult {
  image_url: string;
  generation_id: string;
  pose: string;
  tokens_used: number;
}

/** Catalogue `/generate` returns `images: { base64, mime_type, label }[]`, not `results`. */
function catalogueResponseToUgcResults(data: Record<string, unknown>): UgcResult[] {
  const raw = data.images as Array<{ base64?: string; mime_type?: string; label?: string }> | undefined;
  const genIds = (data.generation_ids as string[] | undefined) ?? [];
  if (!raw?.length) return [];

  let poseIdx = 0;
  return raw
    .filter((img) => img.base64)
    .map((img, i) => {
      const label = img.label || `pose_${i}`;
      const isZoom = /·\s*zoom/i.test(label) || /\bzoom\b/i.test(label);
      const gid = isZoom
        ? genIds[Math.max(0, poseIdx - 1)] ?? `ugc-${i}`
        : genIds[poseIdx++] ?? `ugc-${i}`;
      const pose = label
        .replace(/\s*·\s*zoom\s*$/i, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
      return {
        image_url: `data:${img.mime_type || "image/png"};base64,${img.base64}`,
        generation_id: String(gid),
        pose,
        tokens_used: 0,
      };
    });
}

// ─── Page ───

export default function UgcPage() {
  return (
    <Suspense fallback={null}>
      <UgcPageInner />
    </Suspense>
  );
}

function UgcPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { credits, refreshCredits } = useCredits();
  const { theme } = useTheme();
  const lt = theme === "light";

  // Source image
  const [imageB64, setImageB64] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageWasPrefilled, setImageWasPrefilled] = useState(false);
  const [jewelryType, setJewelryType] = useState("jewelry");
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Config
  const [gender, setGender] = useState<string>("woman");
  const [nationality, setNationality] = useState("Indian");
  const [natSearch, setNatSearch] = useState("");
  const [natOpen, setNatOpen] = useState(false);
  const [skinTone, setSkinTone] = useState("medium");
  const [poses, setPoses] = useState<string[]>([]);
  const [background, setBackground] = useState("best_match");
  const [outfitStyle, setOutfitStyle] = useState("traditional");
  const [outfitCustom, setOutfitCustom] = useState("");
  const [quality, setQuality] = useState<"standard" | "pro">("standard");

  // Accordion open states (model settings + scene closed by default)
  const [modelOpen, setModelOpen] = useState(false);
  const [sceneOpen, setSceneOpen] = useState(false);

  // Generation
  const [loading, setLoading] = useState(false);
  const [skeletonPoses, setSkeletonPoses] = useState<string[]>([]);
  const [results, setResults] = useState<UgcResult[]>([]);
  const [generationIds, setGenerationIds] = useState<string[]>([]);
  const [genCount, setGenCount] = useState(0);
  const [error, setError] = useState("");

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // UI
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initRef = useRef(false);
  const natRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const recommendedPoses = JEWELRY_POSE_MAP[jewelryType] || JEWELRY_POSE_MAP.default;
  const poseOptions =
    jewelryType === "ring"
      ? UGC_ALL_POSES.filter((p) => recommendedPoses.includes(p.id))
      : UGC_ALL_POSES;
  const tokenCost = poses.length * JEWELRY_PRICING[quality].ugcPerPose;

  const skinToneObj = UGC_SKIN_TONES.find((t) => t.id === skinTone);
  const bgObj = UGC_BACKGROUNDS.find((b) => b.id === background);

  // ─── Init from query params / sessionStorage ───
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const imageUrl = searchParams.get("image");
    const type = searchParams.get("type");
    const session = searchParams.get("session");

    if (type) setJewelryType(type);
    if (session) setSessionId(session);

    if (imageUrl) {
      fetchImageAsBase64(imageUrl);
      setImageWasPrefilled(true);
    } else {
      try {
        const stored = sessionStorage.getItem("ugc_image_b64");
        if (stored) {
          setImageB64(stored);
          setImagePreview(`data:image/png;base64,${stored}`);
          setImageWasPrefilled(true);
          sessionStorage.removeItem("ugc_image_b64");
        }
      } catch { /* quota or SSR */ }
    }
  }, [searchParams]);

  // Auto-select recommended poses when jewelry type changes
  useEffect(() => {
    if (poses.length === 0) {
      setPoses(recommendedPoses.slice(0, 2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jewelryType]);

  // Close nationality dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (natRef.current && !natRef.current.contains(e.target as Node)) {
        setNatOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Image handling ───
  async function fetchImageAsBase64(url: string) {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setImageB64(result.split(",")[1] || result);
        setImagePreview(url);
      };
      reader.readAsDataURL(blob);
    } catch {
      setError("Failed to load image from URL");
    }
  }

  function handleFileSelect(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageB64(result.split(",")[1] || result);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }

  function togglePose(poseId: string) {
    setPoses((prev) =>
      prev.includes(poseId) ? prev.filter((p) => p !== poseId) : [...prev, poseId]
    );
  }

  // ─── Generate ───
  const handleGenerate = useCallback(async () => {
    if (!imageB64 || loading || poses.length === 0) return;
    setLoading(true);
    setSkeletonPoses([...poses]);
    setError("");

    // Scroll to results area
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    try {
      const data = await api.post<Record<string, unknown>>("/catalogue/generate", {
        image_base64: imageB64,
        gender,
        nationality,
        skin_tone: skinTone,
        jewelry_type: jewelryType,
        poses,
        quality,
        background,
        outfit_style: outfitStyle === "custom" ? undefined : outfitStyle,
        outfit_custom: outfitStyle === "custom" ? outfitCustom : undefined,
        session_id: sessionId || undefined,
        special_instructions: undefined,
      });

      const fromCatalogue = catalogueResponseToUgcResults(data);
      const resultsArray: UgcResult[] =
        fromCatalogue.length > 0
          ? fromCatalogue
          : Array.isArray(data.results)
            ? (data.results as UgcResult[])
            : Array.isArray(data)
              ? (data as unknown as UgcResult[])
              : data.result
                ? [data.result as UgcResult]
                : [];

      if (resultsArray.length === 0) {
        const msg = (data as { error?: string; detail?: string }).error
          || (data as { error?: string; detail?: string }).detail
          || "No results returned. Please try again.";
        setError(typeof msg === "string" ? msg : "Generation failed. Please try again.");
      } else {
        setResults((prev) => [...resultsArray, ...prev]);
        setGenerationIds((prev) => [...prev, ...resultsArray.map((r) => r.generation_id)]);
        setGenCount((c) => c + 1);
      }
      await refreshCredits();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
    } finally {
      setLoading(false);
      setSkeletonPoses([]);
    }
  }, [imageB64, loading, poses, gender, nationality, skinTone, jewelryType, quality, background, outfitStyle, outfitCustom, sessionId, refreshCredits]);

  function resetFull() {
    setImageB64("");
    setImagePreview("");
    setImageWasPrefilled(false);
    setResults([]);
    setGenerationIds([]);
    setGenCount(0);
    setLoading(false);
    setSkeletonPoses([]);
    setError("");
    setPoses([]);
    setLightboxIndex(null);
  }

  async function downloadImage(url: string, filename: string) {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  }

  const filteredNationalities = UGC_NATIONALITIES.filter((n) =>
    n.toLowerCase().includes(natSearch.toLowerCase())
  );

  // ─── Auth gates ───
  if (authLoading) {
    return (
      <ResponsiveLayout title="UGC Photos">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-[#c4a67d] border-t-transparent rounded-full animate-spin" />
        </div>
      </ResponsiveLayout>
    );
  }

  if (!user) {
    return (
      <ResponsiveLayout title="UGC Photos">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className={lt ? "text-[#0a0a0a]/60" : "text-white/60"}>Please sign in to generate UGC photos.</p>
          <a
            href="/login"
            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white hover:opacity-90 transition-opacity"
          >
            Sign In
          </a>
        </div>
      </ResponsiveLayout>
    );
  }

  // ─── Render ───
  return (
    <ResponsiveLayout title="UGC Photos">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
            Model / UGC Photos
          </h1>
          <p className={`text-sm mt-1 ${lt ? "text-[#0a0a0a]/50" : "text-white/50"}`}>
            Generate AI model photos wearing your jewelry
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-3 text-red-400/60 hover:text-red-400 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* ─── Upload Area ─── */}
        {!imageB64 && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <label
              className={`block p-12 md:p-20 text-center cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 group ${
                dragOver
                  ? "border-[#c4a67d] bg-[rgba(196,166,125,0.06)]"
                  : lt
                    ? "border-[rgba(0,0,0,0.12)] hover:border-[rgba(196,166,125,0.4)] hover:bg-[rgba(196,166,125,0.02)]"
                    : "border-[rgba(196,166,125,0.2)] hover:border-[rgba(196,166,125,0.5)] hover:bg-[rgba(196,166,125,0.03)]"
              }`}
              style={{
                boxShadow: lt
                  ? "0 2px 16px rgba(0,0,0,0.04), 0 8px 40px rgba(0,0,0,0.03)"
                  : "0 2px 16px rgba(0,0,0,0.1), 0 8px 40px rgba(0,0,0,0.08)",
              }}
            >
              <div className="w-16 h-16 mx-auto mb-5 bg-[rgba(196,166,125,0.1)] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className={`text-sm font-semibold ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
                Upload your jewelry image
              </p>
              <p className={`text-xs mt-1.5 ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>
                Drag and drop or click to browse
              </p>
              <p className={`text-[10px] mt-3 ${lt ? "text-[#0a0a0a]/25" : "text-white/25"}`}>
                PNG, JPG up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* ─── Config + Skeleton/Results panel ─── */}
        {imageB64 && (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">

            {/* ── Left: sticky image + compact config ── */}
            <div className="self-start lg:sticky lg:top-24 space-y-3">

              {/* Image card */}
              <div
                className="rounded-2xl overflow-hidden relative"
                style={{
                  border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
                  background: lt ? "#fff" : "rgba(255,255,255,0.02)",
                }}
              >
                <img
                  src={imagePreview}
                  alt="Source jewelry"
                  className="w-full h-auto max-h-[320px] object-contain p-4"
                />
                {!imageWasPrefilled && !loading && (
                  <button
                    onClick={resetFull}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/60 backdrop-blur-sm text-white rounded-lg flex items-center justify-center hover:bg-black/80 transition-colors"
                    title="Remove image"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
                {jewelryType !== "jewelry" && (
                  <div className="px-4 pb-3">
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-full ${lt ? "bg-[#f0ebe3] text-[#8b7355]" : "bg-[rgba(196,166,125,0.12)] text-[#c4a67d]"}`}>
                      {jewelryType}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Accordion: Model Settings ── */}
              <AccordionSection
                title="Model"
                summary={`${nationality} ${gender}, ${skinToneObj?.label ?? skinTone}`}
                open={modelOpen}
                onToggle={() => setModelOpen((o) => !o)}
                lt={lt}
              >
                {/* Gender */}
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${lt ? "text-[#0a0a0a]/40" : "text-white/35"}`}>Gender</p>
                  <div className="flex flex-wrap gap-1.5">
                    {UGC_GENDERS.map((g) => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          gender === g
                            ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white shadow-[0_1px_6px_rgba(196,166,125,0.3)]"
                            : lt
                              ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/60 hover:bg-[rgba(0,0,0,0.08)]"
                              : "bg-[rgba(255,255,255,0.06)] text-white/60 hover:bg-[rgba(255,255,255,0.1)]"
                        }`}
                      >
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nationality */}
                <div ref={natRef} className="relative">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${lt ? "text-[#0a0a0a]/40" : "text-white/35"}`}>Nationality</p>
                  <button
                    onClick={() => setNatOpen(!natOpen)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                      lt
                        ? "bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.08)] text-[#0a0a0a] hover:border-[#c4a67d]"
                        : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white hover:border-[#c4a67d]"
                    }`}
                  >
                    <span>{nationality}</span>
                    <svg
                      width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={`transition-transform ${natOpen ? "rotate-180" : ""}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {natOpen && (
                    <div
                      className={`absolute z-50 mt-1.5 w-full rounded-xl border overflow-hidden shadow-2xl ${
                        lt ? "bg-white border-[rgba(0,0,0,0.1)]" : "bg-[#1a1a1f] border-[rgba(255,255,255,0.1)]"
                      }`}
                    >
                      <div className="p-2">
                        <input
                          type="text"
                          value={natSearch}
                          onChange={(e) => setNatSearch(e.target.value)}
                          placeholder="Search..."
                          autoFocus
                          className={`w-full px-3 py-2 rounded-lg text-sm outline-none ${
                            lt
                              ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a] placeholder:text-[#0a0a0a]/30"
                              : "bg-[rgba(255,255,255,0.06)] text-white placeholder:text-white/30"
                          }`}
                        />
                      </div>
                      <div className="max-h-44 overflow-y-auto">
                        {filteredNationalities.map((n) => (
                          <button
                            key={n}
                            onClick={() => { setNationality(n); setNatOpen(false); setNatSearch(""); }}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                              nationality === n
                                ? "bg-[rgba(196,166,125,0.15)] text-[#c4a67d] font-medium"
                                : lt
                                  ? "text-[#0a0a0a]/80 hover:bg-[rgba(0,0,0,0.04)]"
                                  : "text-white/80 hover:bg-[rgba(255,255,255,0.06)]"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                        {filteredNationalities.length === 0 && (
                          <p className={`px-4 py-3 text-sm ${lt ? "text-[#0a0a0a]/30" : "text-white/30"}`}>No matches</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Skin Tone */}
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${lt ? "text-[#0a0a0a]/40" : "text-white/35"}`}>Skin Tone</p>
                  <div className="flex gap-2">
                    {UGC_SKIN_TONES.map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => setSkinTone(tone.id)}
                        className={`flex flex-col items-center gap-1 group`}
                        title={tone.label}
                      >
                        <div
                          className={`w-7 h-7 rounded-full transition-all duration-200 ${
                            skinTone === tone.id
                              ? `ring-2 ring-[#c4a67d] ring-offset-2 scale-110 ${lt ? "ring-offset-white" : "ring-offset-[#0E0F14]"}`
                              : "hover:scale-110"
                          }`}
                          style={{ backgroundColor: tone.hex }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </AccordionSection>

              {/* ── Accordion: Scene ── */}
              <AccordionSection
                title="Scene"
                summary={`${bgObj?.label ?? background} · ${outfitStyle === "custom" ? "Custom outfit" : outfitStyle}`}
                open={sceneOpen}
                onToggle={() => setSceneOpen((o) => !o)}
                lt={lt}
              >
                {/* Background */}
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${lt ? "text-[#0a0a0a]/40" : "text-white/35"}`}>Background</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {UGC_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => setBackground(bg.id)}
                        className={`group relative aspect-square rounded-xl overflow-hidden transition-all hover:-translate-y-0.5 ${
                          background === bg.id
                            ? `ring-2 ring-[#c4a67d] ring-offset-1 ${lt ? "ring-offset-white" : "ring-offset-[#0E0F14]"}`
                            : lt
                              ? "ring-1 ring-[rgba(0,0,0,0.08)]"
                              : "ring-1 ring-[rgba(255,255,255,0.08)]"
                        }`}
                        title={bg.label}
                      >
                        <img src={bg.image} alt={bg.label} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <span className="absolute bottom-0.5 left-0 right-0 text-center text-[8px] font-semibold text-white drop-shadow-lg leading-tight px-0.5">
                          {bg.label}
                        </span>
                        {background === bg.id && (
                          <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#c4a67d] flex items-center justify-center">
                            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Outfit */}
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${lt ? "text-[#0a0a0a]/40" : "text-white/35"}`}>Outfit Style</p>
                  <div className="flex flex-wrap gap-1.5">
                    {OUTFIT_STYLES.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setOutfitStyle(o.id)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                          outfitStyle === o.id
                            ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white"
                            : lt
                              ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/60 hover:bg-[rgba(0,0,0,0.08)]"
                              : "bg-[rgba(255,255,255,0.06)] text-white/60 hover:bg-[rgba(255,255,255,0.1)]"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  {outfitStyle === "custom" && (
                    <input
                      type="text"
                      value={outfitCustom}
                      onChange={(e) => setOutfitCustom(e.target.value)}
                      placeholder="Describe the outfit..."
                      className={`w-full mt-2 px-3 py-2 rounded-xl text-sm outline-none transition-colors ${
                        lt
                          ? "bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.08)] text-[#0a0a0a] placeholder:text-[#0a0a0a]/30 focus:border-[#c4a67d]"
                          : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white placeholder:text-white/30 focus:border-[#c4a67d]"
                      }`}
                    />
                  )}
                </div>
              </AccordionSection>

              {/* ── Quality ── */}
              <div
                className="rounded-2xl p-4"
                style={{
                  border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
                  background: lt ? "#fff" : "rgba(255,255,255,0.02)",
                }}
              >
                <p className={`text-[10px] font-bold uppercase tracking-[0.08em] mb-2.5 ${lt ? "text-[#5a5a5a]" : "text-white/50"}`}>Quality</p>
                <QualityToggle
                  value={quality}
                  onChange={setQuality}
                  standardCost={JEWELRY_PRICING.standard.ugcPerPose}
                  proCost={JEWELRY_PRICING.pro.ugcPerPose}
                  costUnit="/ pose"
                  lt={lt}
                />
              </div>

            </div>

            {/* ── Right: Poses + Generate + Skeletons/Results ── */}
            <div className="space-y-4" ref={resultsRef}>

              {/* Poses selector */}
              {!loading && (
                <div
                  className="rounded-2xl p-5"
                  style={{
                    border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
                    background: lt ? "#fff" : "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className={`text-sm font-semibold ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
                        Select Poses
                      </p>
                      <p className={`text-[11px] mt-0.5 ${lt ? "text-[#0a0a0a]/40" : "text-white/35"}`}>
                        {poses.length} selected · {tokenCost} tokens
                        {recommendedPoses.length > 0 && (
                          <span> · ★ recommended for {jewelryType}</span>
                        )}
                      </p>
                    </div>
                    {poses.length > 0 && (
                      <button
                        onClick={() => setPoses([])}
                        className={`text-[11px] font-medium transition-colors ${lt ? "text-[#0a0a0a]/30 hover:text-[#0a0a0a]/60" : "text-white/25 hover:text-white/50"}`}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {poseOptions.map((pose) => {
                      const selected = poses.includes(pose.id);
                      const recommended = recommendedPoses.includes(pose.id);
                      return (
                        <button
                          key={pose.id}
                          onClick={() => togglePose(pose.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                            selected
                              ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white shadow-[0_2px_8px_rgba(196,166,125,0.3)]"
                              : recommended
                                ? lt
                                  ? "bg-[rgba(196,166,125,0.1)] border border-[rgba(196,166,125,0.3)] text-[#8b7355] hover:bg-[rgba(196,166,125,0.18)]"
                                  : "bg-[rgba(196,166,125,0.08)] border border-[rgba(196,166,125,0.2)] text-[#c4a67d] hover:bg-[rgba(196,166,125,0.15)]"
                                : lt
                                  ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/60 hover:bg-[rgba(0,0,0,0.08)]"
                                  : "bg-[rgba(255,255,255,0.06)] text-white/60 hover:bg-[rgba(255,255,255,0.1)]"
                          }`}
                        >
                          {selected && <span className="mr-1 text-[10px]">✓</span>}
                          {pose.label}
                          {recommended && !selected && <span className="ml-1 text-[9px] opacity-60">★</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Generate button */}
              {!loading && (
                <button
                  onClick={handleGenerate}
                  disabled={!imageB64 || poses.length === 0 || (outfitStyle === "custom" && !outfitCustom.trim())}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, #8b7355, #c4a67d)",
                    boxShadow: "0 4px 16px rgba(196,166,125,0.3), 0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  Generate {poses.length} Photo{poses.length !== 1 ? "s" : ""} — {tokenCost} tokens
                </button>
              )}

              {credits && !loading && (
                <p className={`text-center text-[11px] -mt-1 ${lt ? "text-[#0a0a0a]/30" : "text-white/30"}`}>
                  Balance: {credits.token_balance} tokens
                </p>
              )}

              {/* ── Skeleton cards (loading state) ── */}
              {loading && skeletonPoses.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#c4a67d]/30 border-t-[#c4a67d] rounded-full animate-spin flex-shrink-0" />
                    <p className={`text-sm font-medium ${lt ? "text-[#0a0a0a]/70" : "text-white/60"}`}>
                      Generating {skeletonPoses.length} photo{skeletonPoses.length !== 1 ? "s" : ""}…
                    </p>
                  </div>
                  <div className={`grid gap-3 ${
                    skeletonPoses.length === 1 ? "grid-cols-1 max-w-xs" :
                    skeletonPoses.length === 2 ? "grid-cols-2" :
                    skeletonPoses.length === 3 ? "grid-cols-3" :
                    "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                  }`}>
                    {skeletonPoses.map((poseId, i) => {
                      const pose = UGC_ALL_POSES.find((p) => p.id === poseId);
                      return (
                        <div
                          key={poseId + i}
                          className="rounded-2xl overflow-hidden"
                          style={{
                            border: `1px solid ${lt ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
                          }}
                        >
                          {/* Shimmer image area */}
                          <div className="aspect-[3/4] relative overflow-hidden">
                            <div
                              className={`absolute inset-0 ${lt ? "bg-[#f0ede8]" : "bg-[rgba(255,255,255,0.04)]"}`}
                            />
                            <div
                              className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_ease-in-out_infinite]"
                              style={{
                                background: lt
                                  ? "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)"
                                  : "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)",
                                animationDelay: `${i * 0.2}s`,
                              }}
                            />
                            {/* Centered icon */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${lt ? "bg-[rgba(196,166,125,0.12)]" : "bg-[rgba(196,166,125,0.1)]"}`}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                              </div>
                              <span className={`text-[10px] font-medium ${lt ? "text-[#0a0a0a]/30" : "text-white/25"}`}>
                                {pose?.label ?? poseId}
                              </span>
                            </div>
                          </div>
                          {/* Label bar */}
                          <div
                            className="px-3 py-2"
                            style={{ background: lt ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)" }}
                          >
                            <div className={`h-2 rounded-full w-2/3 ${lt ? "bg-[rgba(0,0,0,0.06)]" : "bg-[rgba(255,255,255,0.06)]"} animate-pulse`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Results grid ── */}
              {results.length > 0 && !loading && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-base font-semibold ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
                      Generated Photos
                      <span className={`ml-2 text-sm font-normal ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>
                        ({results.length})
                      </span>
                    </h2>
                    {genCount > 0 && (
                      <span className={`text-[11px] ${lt ? "text-[#0a0a0a]/30" : "text-white/30"}`}>
                        {genCount} run{genCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div className={`grid gap-3 ${
                    results.length === 1 ? "grid-cols-1 max-w-xs" :
                    results.length === 2 ? "grid-cols-2" :
                    results.length === 3 ? "grid-cols-3" :
                    "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                  }`}>
                    {results.map((result, idx) => (
                      <div
                        key={result.generation_id + idx}
                        className="group rounded-2xl overflow-hidden relative cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                        style={{
                          border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
                          background: lt ? "#fff" : "rgba(255,255,255,0.02)",
                        }}
                        onClick={() => setLightboxIndex(idx)}
                      >
                        <img
                          src={result.image_url}
                          alt={`UGC ${result.pose}`}
                          className="w-full aspect-[3/4] object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                          <span className="text-white text-xs font-medium capitalize">
                            {result.pose.replace(/_/g, " ")}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImage(result.image_url, `ugc-${result.pose}-${idx + 1}.png`);
                            }}
                            className="absolute bottom-3 right-3 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Feedback */}
                  <FeedbackWidget
                    images={results.map((r) => ({
                      generationId: r.generation_id,
                      imageUrl: r.image_url,
                      label: `UGC — ${r.pose.replace(/_/g, " ")}`,
                    }))}
                    flowType="ugc"
                  />

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleGenerate}
                      disabled={poses.length === 0}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold text-white text-center transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: "linear-gradient(135deg, #8b7355, #c4a67d)",
                        boxShadow: "0 4px 16px rgba(196,166,125,0.3)",
                      }}
                    >
                      Generate More — {tokenCost} tokens
                    </button>
                    <button
                      onClick={resetFull}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                        lt
                          ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/70 hover:bg-[rgba(0,0,0,0.08)]"
                          : "bg-[rgba(255,255,255,0.06)] text-white/70 hover:bg-[rgba(255,255,255,0.1)]"
                      }`}
                    >
                      Start Over
                    </button>
                  </div>

                  {/* Video CTA */}
                  <div
                    className="rounded-2xl p-4"
                    style={{
                      border: `1px solid ${lt ? "rgba(168,85,247,0.15)" : "rgba(168,85,247,0.2)"}`,
                      background: lt ? "rgba(168,85,247,0.03)" : "rgba(168,85,247,0.05)",
                    }}
                  >
                    <p className={`text-xs font-semibold mb-2.5 ${lt ? "text-[#6b6b6b]" : "text-white/50"}`}>Take it further</p>
                    <button
                      onClick={() => {
                        const firstResult = results[0];
                        const params = new URLSearchParams();
                        if (firstResult?.image_url) {
                          if (firstResult.image_url.startsWith("http")) {
                            params.set("image", firstResult.image_url);
                          } else {
                            const b64 = firstResult.image_url.split(",")[1] || "";
                            try {
                              sessionStorage.setItem("video_image_b64", b64);
                              sessionStorage.setItem("video_image_preview", firstResult.image_url);
                            } catch {}
                          }
                        }
                        if (jewelryType) params.set("type", jewelryType);
                        if (sessionId) params.set("session", sessionId);
                        router.push(`/video?${params.toString()}`);
                      }}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", boxShadow: "0 4px 16px rgba(168,85,247,0.25)" }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      Create Video from this Photo
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ─── Lightbox ─── */}
        {lightboxIndex !== null && results[lightboxIndex] && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-5 right-5 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {lightboxIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            {lightboxIndex < results.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
            <div className="max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
              <img
                src={results[lightboxIndex].image_url}
                alt={`UGC ${results[lightboxIndex].pose}`}
                className="max-w-full max-h-[85vh] object-contain rounded-xl"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent rounded-b-xl flex items-center justify-between">
                <span className="text-white text-sm font-medium capitalize">
                  {results[lightboxIndex].pose.replace(/_/g, " ")}
                </span>
                <button
                  onClick={() => downloadImage(results[lightboxIndex!].image_url, `ugc-${results[lightboxIndex!].pose}-${lightboxIndex! + 1}.png`)}
                  className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg text-white text-xs font-medium hover:bg-white/30 transition-colors flex items-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download
                </button>
              </div>
              <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-white/70 text-xs">
                {lightboxIndex + 1} / {results.length}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </ResponsiveLayout>
  );
}

// ─── AccordionSection ───

function AccordionSection({
  title,
  summary,
  open,
  onToggle,
  lt,
  children,
}: {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  lt: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
        background: lt ? "#fff" : "rgba(255,255,255,0.02)",
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left group"
      >
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-bold uppercase tracking-[0.08em] ${lt ? "text-[#5a5a5a]" : "text-white/50"}`}>
            {title}
          </p>
          {!open && (
            <p className={`text-xs mt-0.5 truncate ${lt ? "text-[#0a0a0a]/60" : "text-white/50"}`}>
              {summary}
            </p>
          )}
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={lt ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.35)"}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`flex-shrink-0 ml-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: lt ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)" }}>
          <div className="pt-3 space-y-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
