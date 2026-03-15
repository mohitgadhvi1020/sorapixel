"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth, useCredits } from "@/providers/AppProvider";
import { useTheme } from "@/hooks/useTheme";
import { JEWELRY_PRICING } from "@/lib/token-pricing";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import FeedbackWidget from "@/components/jewelry/FeedbackWidget";

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
  { id: "best_match", label: "Best Match", swatch: "linear-gradient(135deg, #c4a67d, #8b7355)" },
  { id: "outdoor", label: "Outdoor", swatch: "#6B8E6B" },
  { id: "studio", label: "Studio", swatch: "#2A2A2A" },
  { id: "flora", label: "Flora", swatch: "#8FBC8F" },
  { id: "wooden", label: "Wooden", swatch: "#8B6914" },
  { id: "indoor", label: "Indoor", swatch: "#D2B48C" },
  { id: "livingroom", label: "Living Room", swatch: "#BC8F8F" },
] as const;

const PRODUCT_POSE_MAP: Record<string, string[]> = {
  necklace: ["standing", "close_up", "neck_macro", "side_view"],
  pendant: ["standing", "close_up", "neck_macro", "side_view"],
  chain: ["standing", "close_up", "neck_macro"],
  mangalsutra: ["standing", "close_up", "neck_macro"],
  earring: ["close_up", "side_view", "ear_macro"],
  ring: ["close_up", "finger_macro", "hand_closeup", "mirror_selfie"],
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
  const [productType, setProductType] = useState("product");
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

  // Generation
  const [loading, setLoading] = useState(false);
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

  const recommendedPoses = PRODUCT_POSE_MAP[productType] || PRODUCT_POSE_MAP.default;
  const tokenCost = poses.length * JEWELRY_PRICING[quality].ugcPerPose;

  // ─── Init from query params ───
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const imageUrl = searchParams.get("image");
    const type = searchParams.get("type");
    const session = searchParams.get("session");

    if (type) setProductType(type);
    if (session) setSessionId(session);

    if (imageUrl) {
      fetchImageAsBase64(imageUrl);
    }

    const storedB64 = sessionStorage.getItem("ugc_image_b64");
    if (!imageUrl && storedB64) {
      setImageB64(storedB64);
      setImagePreview(`data:image/png;base64,${storedB64}`);
      sessionStorage.removeItem("ugc_image_b64");
    }
  }, [searchParams]);

  // Auto-select recommended poses when product type changes
  useEffect(() => {
    if (poses.length === 0) {
      setPoses(recommendedPoses.slice(0, 2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productType]);

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
    setError("");

    try {
      const data = await api.post<{ results: UgcResult[] }>("/catalogue/generate", {
        image_base64: imageB64,
        gender,
        nationality,
        skin_tone: skinTone,
        jewelry_type: productType,
        poses,
        quality,
        background,
        outfit_style: outfitStyle === "custom" ? undefined : outfitStyle,
        outfit_custom: outfitStyle === "custom" ? outfitCustom : undefined,
        session_id: sessionId || undefined,
        special_instructions: undefined,
      });

      setResults((prev) => [...prev, ...data.results]);
      setGenerationIds((prev) => [...prev, ...data.results.map((r) => r.generation_id)]);
      setGenCount((c) => c + 1);
      await refreshCredits();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [imageB64, loading, poses, gender, nationality, skinTone, productType, quality, background, outfitStyle, outfitCustom, sessionId, refreshCredits]);

  function resetFull() {
    setImageB64("");
    setImagePreview("");
    setResults([]);
    setGenerationIds([]);
    setGenCount(0);
    setLoading(false);
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
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
            Model / UGC Photos
          </h1>
          <p className={`text-sm mt-1.5 ${lt ? "text-[#0a0a0a]/50" : "text-white/50"}`}>
            Generate AI model photos with your product
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
        {!imageB64 && !loading && results.length === 0 && (
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
                Upload your product image
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

        {/* ─── Config Panel ─── */}
        {imageB64 && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
            {/* Left: Image preview */}
            <div
              className="rounded-2xl overflow-hidden relative self-start lg:sticky lg:top-24"
              style={{
                border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
                background: lt ? "#fff" : "rgba(255,255,255,0.02)",
              }}
            >
              <img
                src={imagePreview}
                alt="Source product"
                className="w-full h-auto max-h-[400px] object-contain p-4"
              />
              <button
                onClick={resetFull}
                className="absolute top-3 right-3 w-8 h-8 bg-black/60 backdrop-blur-sm text-white rounded-lg flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              {productType !== "product" && (
                <div className="px-4 pb-3">
                  <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-1 rounded-full ${lt ? "bg-[#f0ebe3] text-[#8b7355]" : "bg-[rgba(196,166,125,0.12)] text-[#c4a67d]"}`}>
                    {productType}
                  </span>
                </div>
              )}
            </div>

            {/* Right: Configuration */}
            <div className="space-y-5">
              {/* Gender */}
              <ConfigSection title="Gender" lt={lt}>
                <div className="flex flex-wrap gap-2">
                  {UGC_GENDERS.map((g) => (
                    <PillButton
                      key={g}
                      label={g.charAt(0).toUpperCase() + g.slice(1)}
                      selected={gender === g}
                      onClick={() => setGender(g)}
                      lt={lt}
                    />
                  ))}
                </div>
              </ConfigSection>

              {/* Nationality */}
              <ConfigSection title="Nationality" lt={lt}>
                <div ref={natRef} className="relative">
                  <button
                    onClick={() => setNatOpen(!natOpen)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                      lt
                        ? "bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.08)] text-[#0a0a0a] hover:border-[#c4a67d]"
                        : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white hover:border-[#c4a67d]"
                    }`}
                  >
                    <span>{nationality}</span>
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
                          placeholder="Search nationality..."
                          autoFocus
                          className={`w-full px-3 py-2 rounded-lg text-sm outline-none ${
                            lt
                              ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a] placeholder:text-[#0a0a0a]/30"
                              : "bg-[rgba(255,255,255,0.06)] text-white placeholder:text-white/30"
                          }`}
                        />
                      </div>
                      <div className="max-h-52 overflow-y-auto">
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
                          <p className={`px-4 py-3 text-sm ${lt ? "text-[#0a0a0a]/30" : "text-white/30"}`}>
                            No matches
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ConfigSection>

              {/* Skin Tone */}
              <ConfigSection title="Skin Tone" lt={lt}>
                <div className="flex flex-wrap gap-3">
                  {UGC_SKIN_TONES.map((tone) => {
                    const selected = skinTone === tone.id;
                    return (
                      <button
                        key={tone.id}
                        onClick={() => setSkinTone(tone.id)}
                        className="flex flex-col items-center gap-1.5 group"
                        title={tone.label}
                      >
                        <div
                          className={`w-9 h-9 rounded-full transition-all duration-200 ${
                            selected
                              ? `ring-2 ring-[#c4a67d] ring-offset-2 scale-110 ${lt ? "ring-offset-white" : "ring-offset-[#0a0a0a]"}`
                              : "hover:scale-105"
                          }`}
                          style={{ backgroundColor: tone.hex }}
                        />
                        <span className={`text-[10px] font-medium ${selected ? "text-[#c4a67d]" : lt ? "text-[#0a0a0a]/50" : "text-white/40"}`}>
                          {tone.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ConfigSection>

              {/* Background */}
              <ConfigSection title="Background" lt={lt}>
                <div className="flex flex-wrap gap-2.5">
                  {UGC_BACKGROUNDS.map((bg) => {
                    const selected = background === bg.id;
                    return (
                      <button
                        key={bg.id}
                        onClick={() => setBackground(bg.id)}
                        className="flex flex-col items-center gap-1.5 group"
                        title={bg.label}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl transition-all duration-200 ${
                            selected
                              ? `ring-2 ring-[#c4a67d] ring-offset-2 scale-110 ${lt ? "ring-offset-white" : "ring-offset-[#0a0a0a]"}`
                              : "hover:scale-105"
                          }`}
                          style={{ background: bg.swatch }}
                        />
                        <span className={`text-[10px] font-medium ${selected ? "text-[#c4a67d]" : lt ? "text-[#0a0a0a]/50" : "text-white/40"}`}>
                          {bg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ConfigSection>

              {/* Outfit Style */}
              <ConfigSection title="Outfit Style" lt={lt}>
                <div className="flex flex-wrap gap-2">
                  {OUTFIT_STYLES.map((o) => (
                    <PillButton
                      key={o.id}
                      label={o.label}
                      selected={outfitStyle === o.id}
                      onClick={() => setOutfitStyle(o.id)}
                      lt={lt}
                    />
                  ))}
                </div>
                {outfitStyle === "custom" && (
                  <input
                    type="text"
                    value={outfitCustom}
                    onChange={(e) => setOutfitCustom(e.target.value)}
                    placeholder="Describe the outfit (e.g. red silk saree, white gown)..."
                    className={`w-full mt-3 px-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors ${
                      lt
                        ? "bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.08)] text-[#0a0a0a] placeholder:text-[#0a0a0a]/30 focus:border-[#c4a67d]"
                        : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white placeholder:text-white/30 focus:border-[#c4a67d]"
                    }`}
                  />
                )}
              </ConfigSection>

              {/* Poses */}
              <ConfigSection title={`Poses (${poses.length} selected)`} lt={lt}>
                <div className="flex flex-wrap gap-2">
                  {UGC_ALL_POSES.map((pose) => {
                    const selected = poses.includes(pose.id);
                    const recommended = recommendedPoses.includes(pose.id);
                    return (
                      <button
                        key={pose.id}
                        onClick={() => togglePose(pose.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 relative ${
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
                        {selected && (
                          <span className="mr-1">&#10003;</span>
                        )}
                        {pose.label}
                        {recommended && !selected && (
                          <span className="ml-1 text-[9px] opacity-60">&#9733;</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {recommendedPoses.length > 0 && (
                  <p className={`text-[10px] mt-2 ${lt ? "text-[#0a0a0a]/30" : "text-white/30"}`}>
                    &#9733; Recommended for {productType}
                  </p>
                )}
              </ConfigSection>

              {/* Quality */}
              <ConfigSection title="Quality" lt={lt}>
                <div className="flex gap-2">
                  {(["standard", "pro"] as const).map((q) => {
                    const selected = quality === q;
                    const cost = JEWELRY_PRICING[q].ugcPerPose;
                    return (
                      <button
                        key={q}
                        onClick={() => setQuality(q)}
                        className="flex-1 py-3 rounded-xl text-center transition-all duration-200"
                        style={{
                          border: selected
                            ? "1.5px solid #c4a67d"
                            : `1.5px solid ${lt ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
                          background: selected
                            ? lt ? "rgba(196,166,125,0.08)" : "rgba(196,166,125,0.1)"
                            : lt ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)",
                          boxShadow: selected ? "0 0 0 3px rgba(196,166,125,0.1)" : "none",
                        }}
                      >
                        <div className={`text-xs font-semibold capitalize ${selected ? "text-[#c4a67d]" : lt ? "text-[#0a0a0a]" : "text-white"}`}>
                          {q}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>
                          {cost} tokens / pose
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ConfigSection>

              {/* Generate Button */}
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

              {credits && (
                <p className={`text-center text-[11px] ${lt ? "text-[#0a0a0a]/35" : "text-white/35"}`}>
                  Balance: {credits.token_balance} tokens
                </p>
              )}
            </div>
          </div>
        )}

        {/* ─── Loading State ─── */}
        {loading && (
          <div
            className="rounded-2xl p-10 md:p-16 text-center space-y-6"
            style={{
              border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
              background: lt ? "#fff" : "rgba(255,255,255,0.02)",
            }}
          >
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-[rgba(196,166,125,0.2)]" />
              <div className="absolute inset-0 rounded-full border-2 border-[#c4a67d] border-t-transparent animate-spin" />
              <div className="absolute inset-3 rounded-full border-2 border-[rgba(196,166,125,0.15)]" />
              <div className="absolute inset-3 rounded-full border-2 border-[#c4a67d]/60 border-b-transparent animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
            </div>
            <div>
              <p className={`text-lg font-semibold ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
                Generating model photos...
              </p>
              <p className={`text-sm mt-2 ${lt ? "text-[#0a0a0a]/50" : "text-white/50"}`}>
                Creating {poses.length} pose{poses.length !== 1 ? "s" : ""} with your product. This may take a moment.
              </p>
            </div>
            <div className="max-w-xs mx-auto">
              <div className={`h-1.5 rounded-full overflow-hidden ${lt ? "bg-[rgba(0,0,0,0.06)]" : "bg-[rgba(255,255,255,0.06)]"}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8b7355] to-[#c4a67d]"
                  style={{
                    animation: "ugcProgress 3s ease-in-out infinite",
                    width: "70%",
                  }}
                />
              </div>
            </div>
            <style>{`
              @keyframes ugcProgress {
                0%, 100% { opacity: 0.5; width: 30%; }
                50% { opacity: 1; width: 80%; }
              }
            `}</style>
          </div>
        )}

        {/* ─── Results Grid ─── */}
        {results.length > 0 && !loading && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-lg font-semibold ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
                Generated Photos
                <span className={`ml-2 text-sm font-normal ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>
                  ({results.length} image{results.length !== 1 ? "s" : ""})
                </span>
              </h2>
              {genCount > 0 && (
                <span className={`text-[11px] ${lt ? "text-[#0a0a0a]/30" : "text-white/30"}`}>
                  {genCount} generation{genCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
            <FeedbackWidget generationIds={generationIds} imageLabel="UGC Model Photo" />

            {/* Generate More */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleGenerate}
                disabled={poses.length === 0}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white text-center transition-all duration-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #8b7355, #c4a67d)",
                  boxShadow: "0 4px 16px rgba(196,166,125,0.3)",
                }}
              >
                Generate More — {tokenCost} tokens
              </button>
              <button
                onClick={resetFull}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  lt
                    ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/70 hover:bg-[rgba(0,0,0,0.08)]"
                    : "bg-[rgba(255,255,255,0.06)] text-white/70 hover:bg-[rgba(255,255,255,0.1)]"
                }`}
              >
                Start Over
              </button>
            </div>

            {/* Create Video CTA */}
            {results.length > 0 && results[0]?.image_url && (
              <div className={`pt-4 border-t ${lt ? "border-[rgba(0,0,0,0.06)]" : "border-[rgba(255,255,255,0.08)]"}`}>
                <button
                  onClick={async () => {
                    try {
                      const resp = await fetch(results[0].image_url);
                      const blob = await resp.blob();
                      const reader = new FileReader();
                      reader.onload = () => {
                        const b64 = (reader.result as string).split(",")[1] || "";
                        sessionStorage.setItem("video_image_b64", b64);
                        router.push("/video");
                      };
                      reader.readAsDataURL(blob);
                    } catch {
                      router.push("/video");
                    }
                  }}
                  className={`flex items-center gap-3 w-full p-4 rounded-xl transition-all text-left ${
                    lt
                      ? "bg-[rgba(0,0,0,0.02)] border border-[rgba(0,0,0,0.06)] hover:border-[rgba(139,115,85,0.3)]"
                      : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(196,166,125,0.3)]"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-[rgba(196,166,125,0.1)] flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  </div>
                  <div>
                    <span className={`text-sm font-semibold block ${lt ? "text-[#0a0a0a]" : "text-white"}`}>Create Video</span>
                    <span className={`text-[11px] ${lt ? "text-[#0a0a0a]/40" : "text-[rgba(255,255,255,0.35)]"}`}>Turn this UGC photo into a product video</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Lightbox ─── */}
        {lightboxIndex !== null && results[lightboxIndex] && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Close */}
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-5 right-5 w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Prev */}
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

            {/* Next */}
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

            {/* Image */}
            <div
              className="max-w-4xl max-h-[90vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={results[lightboxIndex].image_url}
                alt={`UGC ${results[lightboxIndex].pose}`}
                className="max-w-full max-h-[85vh] object-contain rounded-xl"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent rounded-b-xl flex items-center justify-between">
                <span className="text-white text-sm font-medium capitalize">
                  {results[lightboxIndex].pose.replace(/_/g, " ")}
                </span>
                <div className="flex gap-2">
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
              </div>
              <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-white/70 text-xs">
                {lightboxIndex + 1} / {results.length}
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
}

// ─── Reusable sub-components ───

function ConfigSection({ title, lt, children }: { title: string; lt: boolean; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{
        border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
        background: lt ? "#fff" : "rgba(255,255,255,0.02)",
      }}
    >
      <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${lt ? "text-[#5a5a5a]" : "text-white/50"}`}>
        {title}
      </span>
      {children}
    </div>
  );
}

function PillButton({ label, selected, onClick, lt }: { label: string; selected: boolean; onClick: () => void; lt: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
        selected
          ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white shadow-[0_2px_8px_rgba(196,166,125,0.3)]"
          : lt
            ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/60 hover:bg-[rgba(0,0,0,0.08)]"
            : "bg-[rgba(255,255,255,0.06)] text-white/60 hover:bg-[rgba(255,255,255,0.1)]"
      }`}
    >
      {label}
    </button>
  );
}
