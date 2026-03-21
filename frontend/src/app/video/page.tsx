"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth, useCredits } from "@/providers/AppProvider";
import { useTheme } from "@/hooks/useTheme";
import { VIDEO_PRICING, FLOW_VIDEO_PRICING } from "@/lib/token-pricing";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";

/* ── Quick Video constants ── */
const VIDEO_MODES = [
  { id: "360_spin", label: "360° Spin", desc: "Smooth rotating showcase", icon: "🔄" },
  { id: "hero_reveal", label: "Hero Reveal", desc: "Cinematic product reveal", icon: "✨" },
  { id: "lifestyle", label: "Lifestyle", desc: "Natural lifestyle motion", icon: "🌿" },
  { id: "sparkle", label: "Sparkle", desc: "Light catching sparkle effect", icon: "💎" },
  { id: "custom", label: "Custom", desc: "Your own prompt", icon: "🎬" },
];

const ASPECT_RATIOS = [
  { id: "landscape", label: "16:9", desc: "Landscape" },
  { id: "square", label: "1:1", desc: "Square" },
  { id: "portrait", label: "9:16", desc: "Portrait / Reels" },
];

/* ── Flow Video constants ── */
const JEWELRY_CATEGORIES = [
  { id: "ring", label: "Ring", icon: "💍" },
  { id: "necklace", label: "Necklace", icon: "📿" },
  { id: "earring", label: "Earring", icon: "✨" },
  { id: "bracelet", label: "Bracelet", icon: "⭕" },
  { id: "bangle", label: "Bangle", icon: "🔵" },
  { id: "pendant", label: "Pendant", icon: "💎" },
  { id: "watch", label: "Watch", icon: "⌚" },
  { id: "chain", label: "Chain", icon: "🔗" },
  { id: "anklet", label: "Anklet", icon: "🦶" },
  { id: "brooch", label: "Brooch", icon: "🌸" },
  { id: "set", label: "Set", icon: "👑" },
  { id: "mangalsutra", label: "Mangalsutra", icon: "🪷" },
];

const ENGINES = [
  { id: "seedance", label: "Seedance 2.0", desc: "Best smooth transitions", badge: "Recommended" },
  { id: "kling", label: "Kling O1", desc: "Great for person scenes", badge: "" },
  { id: "veo2", label: "Veo 2", desc: "Uses Google credits", badge: "" },
];

const GENDERS = ["woman", "man"] as const;

const SKIN_TONES = [
  { id: "fair", label: "Fair", hex: "#F5D6B8" },
  { id: "light", label: "Light", hex: "#E8B88A" },
  { id: "medium", label: "Medium", hex: "#C68642" },
  { id: "tan", label: "Tan", hex: "#A0622E" },
  { id: "brown", label: "Brown", hex: "#7B4B2A" },
  { id: "dark", label: "Dark", hex: "#4A2912" },
];

const NATIONALITIES = [
  "Indian", "East Asian", "Southeast Asian", "Japanese", "Korean",
  "Middle Eastern", "European", "British", "French", "Italian",
  "African", "Latin American", "American", "Australian",
];

const FLOW_PROGRESS_STEPS = [
  { label: "Setting up the product scene...", duration: 4000 },
  { label: "Styling the first frame...", duration: 10000 },
  { label: "Creating the model look...", duration: 10000 },
  { label: "Generating UGC last frame...", duration: 10000 },
  { label: "Uploading frames to video engine...", duration: 5000 },
  { label: "Generating cinematic transition...", duration: 30000 },
  { label: "Rendering video...", duration: 60000 },
  { label: "Almost there...", duration: 120000 },
];

/* ── Types ── */
type VideoType = "quick" | "flow";

interface QuickVideoResult {
  video_url: string;
  duration: number;
  mode: string;
  tokens_used: number;
}

interface FlowPreset {
  id: string;
  label: string;
  description: string;
  first_frame_style: string;
  last_frame_pose: string;
  transition_prompt: string;
}

interface FlowResult {
  video_url: string;
  first_frame_b64: string;
  last_frame_b64: string;
  duration: number;
  engine: string;
  preset_label: string;
  tokens_used: number;
}

export default function VideoPage() {
  return (
    <Suspense fallback={null}>
      <VideoPageInner />
    </Suspense>
  );
}

function VideoPageInner() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { credits, refreshCredits } = useCredits();
  const { theme } = useTheme();
  const lt = theme === "light";

  /* ── Shared state ── */
  const [videoType, setVideoType] = useState<VideoType>("quick");
  const [imageB64, setImageB64] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  /* ── Quick Video state ── */
  const [videoMode, setVideoMode] = useState("360_spin");
  const [videoQuality, setVideoQuality] = useState<"standard" | "pro">("standard");
  const [videoCustomPrompt, setVideoCustomPrompt] = useState("");
  const [videoAspect, setVideoAspect] = useState("landscape");
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [quickResult, setQuickResult] = useState<QuickVideoResult | null>(null);
  const [jewelryType, setJewelryType] = useState("jewelry");
  const [sessionId, setSessionId] = useState<string | null>(null);

  /* ── Flow Video state ── */
  const [flowCategory, setFlowCategory] = useState("necklace");
  const [flowPresets, setFlowPresets] = useState<FlowPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<FlowPreset | null>(null);
  const [flowEngine, setFlowEngine] = useState("seedance");
  const [flowQuality, setFlowQuality] = useState<"standard" | "pro">("standard");
  const [flowAspect, setFlowAspect] = useState("landscape");
  const [flowGender, setFlowGender] = useState("woman");
  const [flowNationality, setFlowNationality] = useState("Indian");
  const [flowSkinTone, setFlowSkinTone] = useState("medium");
  const [flowOutfit, setFlowOutfit] = useState("modern");
  const [flowCustomPrompt, setFlowCustomPrompt] = useState("");
  const [flowGenerating, setFlowGenerating] = useState(false);
  const [flowProgressStep, setFlowProgressStep] = useState(0);
  const [flowResult, setFlowResult] = useState<FlowResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const initRef = useRef(false);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const isGenerating = videoGenerating || flowGenerating;
  const hasResult = !!quickResult || !!flowResult;

  /* ── Init from URL params / sessionStorage ── */
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const imageUrl = searchParams.get("image");
    const type = searchParams.get("type");
    const session = searchParams.get("session");
    const mode = searchParams.get("mode");

    if (type) { setJewelryType(type); setFlowCategory(type); }
    if (session) setSessionId(session);
    if (mode === "flow") setVideoType("flow");

    if (imageUrl) {
      fetchImageAsBase64(imageUrl);
    } else {
      try {
        const stored = sessionStorage.getItem("video_image_b64");
        if (stored) {
          const preview = sessionStorage.getItem("video_image_preview") || `data:image/png;base64,${stored}`;
          setImageB64(stored);
          setImagePreview(preview);
        }
      } catch { /* ignore */ }
    }
  }, [searchParams]);

  /* ── Fetch flow presets when category changes ── */
  const fetchPresets = useCallback(async (cat: string) => {
    try {
      const data = await api.get<{ presets: FlowPreset[] }>(`/flow-video/presets/${cat}`);
      setFlowPresets(data.presets || []);
      if (data.presets?.length) setSelectedPreset(data.presets[0]);
    } catch {
      setFlowPresets([]);
    }
  }, []);

  useEffect(() => {
    if (videoType === "flow" && imageB64) fetchPresets(flowCategory);
  }, [videoType, imageB64, flowCategory, fetchPresets]);

  /* ── Shared handlers ── */
  async function fetchImageAsBase64(url: string) {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const r = reader.result as string;
        persistImage(r.split(",")[1] || r, url);
      };
      reader.readAsDataURL(blob);
    } catch {
      setError("Failed to load image from URL");
    }
  }

  function persistImage(b64: string, preview: string) {
    setImageB64(b64);
    setImagePreview(preview);
    try { sessionStorage.setItem("video_image_b64", b64); sessionStorage.setItem("video_image_preview", preview); } catch { /* quota */ }
  }

  function handleFileSelect(file: File) {
    if (file.size > 10 * 1024 * 1024) { setError("File too large. Max 10MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      persistImage(r.split(",")[1] || r, r);
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

  function resetFull() {
    setImageB64(""); setImagePreview("");
    setQuickResult(null); setFlowResult(null);
    setVideoGenerating(false); setFlowGenerating(false);
    setError(""); setFlowProgressStep(0);
    setVideoMode("360_spin"); setVideoQuality("standard");
    setVideoCustomPrompt(""); setVideoAspect("landscape");
    setJewelryType("jewelry"); setSessionId(null);
    if (progressRef.current) clearTimeout(progressRef.current);
    try { sessionStorage.removeItem("video_image_b64"); sessionStorage.removeItem("video_image_preview"); } catch { /* ignore */ }
  }

  function resetResult() {
    setQuickResult(null); setFlowResult(null);
    setVideoGenerating(false); setFlowGenerating(false);
    setError(""); setFlowProgressStep(0);
    if (progressRef.current) clearTimeout(progressRef.current);
  }

  /* ── Quick Video generate ── */
  const handleQuickGenerate = useCallback(async () => {
    if (!imageB64 || videoGenerating) return;
    setVideoGenerating(true); setError(""); setQuickResult(null);
    try {
      const data = await api.post<QuickVideoResult>("/video/generate", {
        image_b64: imageB64, mode: videoMode, jewelry_type: jewelryType,
        aspect_ratio: videoAspect, quality: videoQuality,
        custom_prompt: videoMode === "custom" ? videoCustomPrompt : undefined,
        session_id: sessionId || undefined,
      });
      setQuickResult(data);
      await refreshCredits();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Video generation failed");
    } finally { setVideoGenerating(false); }
  }, [imageB64, videoGenerating, videoMode, jewelryType, videoAspect, videoQuality, videoCustomPrompt, sessionId, refreshCredits]);

  /* ── Flow Video progress ── */
  function startProgress() {
    setFlowProgressStep(0);
    let idx = 0;
    const advance = () => {
      idx++;
      if (idx < FLOW_PROGRESS_STEPS.length) {
        setFlowProgressStep(idx);
        progressRef.current = setTimeout(advance, FLOW_PROGRESS_STEPS[idx].duration);
      }
    };
    progressRef.current = setTimeout(advance, FLOW_PROGRESS_STEPS[0].duration);
  }

  /* ── Flow Video generate ── */
  const handleFlowGenerate = useCallback(async () => {
    if (!imageB64 || !selectedPreset || flowGenerating) return;
    setFlowGenerating(true); setError(""); setFlowResult(null);
    startProgress();
    try {
      const data = await api.post<FlowResult & { success: boolean }>("/flow-video/generate", {
        image_b64: imageB64, jewelry_type: flowCategory, preset_id: selectedPreset.id,
        engine: flowEngine, quality: flowQuality, aspect_ratio: flowAspect,
        gender: flowGender, nationality: flowNationality, skin_tone: flowSkinTone,
        outfit_style: flowOutfit, custom_transition_prompt: flowCustomPrompt || undefined,
      });
      if (progressRef.current) clearTimeout(progressRef.current);
      setFlowResult(data);
      await refreshCredits();
    } catch (err: unknown) {
      if (progressRef.current) clearTimeout(progressRef.current);
      setError(err instanceof Error ? err.message : "Flow video generation failed");
    } finally { setFlowGenerating(false); }
  }, [imageB64, selectedPreset, flowGenerating, flowCategory, flowEngine, flowQuality, flowAspect, flowGender, flowNationality, flowSkinTone, flowOutfit, flowCustomPrompt, refreshCredits]);

  /* ── Token cost ── */
  const tokenCost = videoType === "quick" ? VIDEO_PRICING[videoQuality] : FLOW_VIDEO_PRICING[flowQuality];

  /* ── Auth guards ── */
  if (authLoading) {
    return (
      <ResponsiveLayout title="Video Generation">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-[#c4a67d] border-t-transparent rounded-full animate-spin" />
        </div>
      </ResponsiveLayout>
    );
  }

  if (!user) {
    return (
      <ResponsiveLayout title="Video Generation">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className={lt ? "text-[#0a0a0a]/60" : "text-white/60"}>Please sign in to generate videos.</p>
          <a href="/login" className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white hover:opacity-90 transition-opacity">
            Sign In
          </a>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout title="Video Generation">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
            Video Generation
          </h1>
          <p className={`text-sm mt-1.5 ${lt ? "text-[#0a0a0a]/50" : "text-white/50"}`}>
            Create stunning jewelry videos
          </p>
        </div>

        {/* ── Video Type Tabs ── */}
        {!isGenerating && !hasResult && (
          <div className={`flex gap-1 p-1 rounded-xl w-fit ${lt ? "bg-[rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.06)]" : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]"}`}>
            {([
              { key: "quick" as VideoType, label: "Quick Video", desc: "360° spin, reveal, sparkle" },
              { key: "flow" as VideoType, label: "Flow Video", desc: "Product → Model transition" },
            ]).map((tab) => {
              const sel = videoType === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setVideoType(tab.key); setError(""); }}
                  className={`px-5 py-2.5 rounded-lg transition-all duration-200 text-left ${
                    sel
                      ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white shadow-[0_2px_8px_rgba(196,166,125,0.3)]"
                      : lt
                        ? "text-[#0a0a0a]/50 hover:text-[#0a0a0a] hover:bg-[rgba(0,0,0,0.04)]"
                        : "text-white/50 hover:text-white hover:bg-[rgba(255,255,255,0.06)]"
                  }`}
                >
                  <div className="text-xs font-semibold">{tab.label}</div>
                  <div className={`text-[10px] mt-0.5 ${sel ? "text-white/70" : lt ? "text-[#0a0a0a]/30" : "text-white/30"}`}>{tab.desc}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-3 text-red-400/60 hover:text-red-400 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* ── UPLOAD AREA (shared) ── */}
        {/* ═══════════════════════════════════════════════════ */}
        {!imageB64 && !isGenerating && !hasResult && (
          <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}>
            <label
              className={`block p-12 md:p-20 text-center cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 group ${
                dragOver
                  ? "border-[#c4a67d] bg-[rgba(196,166,125,0.06)]"
                  : lt
                    ? "border-[rgba(0,0,0,0.12)] hover:border-[rgba(196,166,125,0.4)] hover:bg-[rgba(196,166,125,0.02)]"
                    : "border-[rgba(196,166,125,0.2)] hover:border-[rgba(196,166,125,0.5)] hover:bg-[rgba(196,166,125,0.03)]"
              }`}
              style={{ boxShadow: lt ? "0 2px 16px rgba(0,0,0,0.04)" : "0 2px 16px rgba(0,0,0,0.1)" }}
            >
              <div className="w-16 h-16 mx-auto mb-5 bg-[rgba(196,166,125,0.1)] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className={`text-sm font-semibold ${lt ? "text-[#0a0a0a]" : "text-white"}`}>Upload your jewelry image</p>
              <p className={`text-xs mt-1.5 ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>Drag and drop or click to browse</p>
              <p className={`text-[10px] mt-3 ${lt ? "text-[#0a0a0a]/25" : "text-white/25"}`}>PNG, JPG up to 10MB</p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* ── QUICK VIDEO CONFIG ── */}
        {/* ═══════════════════════════════════════════════════ */}
        {videoType === "quick" && imageB64 && !isGenerating && !hasResult && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Image */}
            <div className="rounded-2xl overflow-hidden relative" style={{ border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`, background: lt ? "#fff" : "rgba(255,255,255,0.02)" }}>
              <img src={imagePreview} alt="Source" className="w-full h-auto max-h-[500px] object-contain p-4" />
              <button onClick={resetFull} className="absolute top-3 right-3 w-8 h-8 bg-black/60 backdrop-blur-sm text-white rounded-lg flex items-center justify-center hover:bg-black/80 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            {/* Right: Config */}
            <div className="space-y-5">
              <Card lt={lt} title="Video Style">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {VIDEO_MODES.map((mode) => {
                    const sel = videoMode === mode.id;
                    return (
                      <button key={mode.id} onClick={() => setVideoMode(mode.id)} className="text-left p-3 rounded-xl transition-all duration-200" style={{
                        border: sel ? "1.5px solid #c4a67d" : `1.5px solid ${lt ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
                        background: sel ? (lt ? "rgba(196,166,125,0.08)" : "rgba(196,166,125,0.1)") : (lt ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)"),
                        boxShadow: sel ? "0 0 0 3px rgba(196,166,125,0.1)" : "none",
                      }}>
                        <div className="text-lg mb-1">{mode.icon}</div>
                        <div className={`text-xs font-semibold ${sel ? "text-[#c4a67d]" : lt ? "text-[#0a0a0a]" : "text-white"}`}>{mode.label}</div>
                        <div className={`text-[10px] mt-0.5 ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>{mode.desc}</div>
                      </button>
                    );
                  })}
                </div>
                {videoMode === "custom" && (
                  <textarea value={videoCustomPrompt} onChange={(e) => setVideoCustomPrompt(e.target.value)}
                    placeholder="Describe the video motion you want..." rows={3}
                    className={`w-full mt-2 px-3.5 py-2.5 rounded-xl text-sm resize-none outline-none transition-colors ${lt ? "bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.08)] text-[#0a0a0a] placeholder:text-[#0a0a0a]/30 focus:border-[#c4a67d]" : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white placeholder:text-white/30 focus:border-[#c4a67d]"}`} />
                )}
              </Card>

              <Card lt={lt} title="Aspect Ratio">
                <div className="flex gap-2">
                  {ASPECT_RATIOS.map((ar) => {
                    const sel = videoAspect === ar.id;
                    return (
                      <button key={ar.id} onClick={() => setVideoAspect(ar.id)}
                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${sel ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white shadow-[0_2px_8px_rgba(196,166,125,0.3)]" : lt ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/60 hover:bg-[rgba(0,0,0,0.08)]" : "bg-[rgba(255,255,255,0.06)] text-white/60 hover:bg-[rgba(255,255,255,0.1)]"}`}>
                        {ar.label}
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card lt={lt} title="Quality">
                <div className="flex gap-2">
                  {(["standard", "pro"] as const).map((q) => {
                    const sel = videoQuality === q;
                    return (
                      <button key={q} onClick={() => setVideoQuality(q)} className="flex-1 py-3 rounded-xl text-center transition-all duration-200" style={{
                        border: sel ? "1.5px solid #c4a67d" : `1.5px solid ${lt ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
                        background: sel ? (lt ? "rgba(196,166,125,0.08)" : "rgba(196,166,125,0.1)") : (lt ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)"),
                        boxShadow: sel ? "0 0 0 3px rgba(196,166,125,0.1)" : "none",
                      }}>
                        <div className={`text-xs font-semibold capitalize ${sel ? "text-[#c4a67d]" : lt ? "text-[#0a0a0a]" : "text-white"}`}>{q}</div>
                        <div className={`text-[10px] mt-0.5 ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>{VIDEO_PRICING[q]} tokens</div>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <button onClick={handleQuickGenerate} disabled={!imageB64 || (videoMode === "custom" && !videoCustomPrompt.trim())}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #8b7355, #c4a67d)", boxShadow: "0 4px 16px rgba(196,166,125,0.3), 0 1px 3px rgba(0,0,0,0.1)" }}>
                Generate Video — {VIDEO_PRICING[videoQuality]} tokens
              </button>
              {credits && <p className={`text-center text-[11px] ${lt ? "text-[#0a0a0a]/35" : "text-white/35"}`}>Balance: {credits.token_balance} tokens</p>}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* ── FLOW VIDEO CONFIG ── */}
        {/* ═══════════════════════════════════════════════════ */}
        {videoType === "flow" && imageB64 && !isGenerating && !hasResult && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Image + Category */}
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden relative" style={{ border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`, background: lt ? "#fff" : "rgba(255,255,255,0.02)" }}>
                <img src={imagePreview} alt="Product" className="w-full h-auto max-h-[300px] object-contain p-3" />
                <button onClick={resetFull} className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur-sm text-white rounded-lg flex items-center justify-center hover:bg-black/80 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <Card lt={lt} title="Category">
                <div className="grid grid-cols-3 gap-1.5">
                  {JEWELRY_CATEGORIES.map((c) => (
                    <button key={c.id} onClick={() => setFlowCategory(c.id)}
                      className={`px-2 py-2 rounded-lg text-center transition-all text-[11px] ${flowCategory === c.id ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white shadow-sm" : lt ? "bg-[rgba(0,0,0,0.03)] text-[#0a0a0a]/70 hover:bg-[rgba(0,0,0,0.06)]" : "bg-[rgba(255,255,255,0.04)] text-white/70 hover:bg-[rgba(255,255,255,0.08)]"}`}>
                      <span className="block text-sm mb-0.5">{c.icon}</span>{c.label}
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            {/* Center: Presets + Engine + Aspect */}
            <div className="space-y-4">
              <Card lt={lt} title="Story Flow">
                {flowPresets.length === 0 ? (
                  <p className={`text-xs ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>Loading presets...</p>
                ) : (
                  <div className="space-y-2">
                    {flowPresets.map((p) => {
                      const sel = selectedPreset?.id === p.id;
                      return (
                        <button key={p.id} onClick={() => setSelectedPreset(p)} className="w-full text-left p-3 rounded-xl transition-all" style={{
                          border: sel ? "1.5px solid #c4a67d" : `1.5px solid ${lt ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
                          background: sel ? (lt ? "rgba(196,166,125,0.08)" : "rgba(196,166,125,0.1)") : (lt ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)"),
                          boxShadow: sel ? "0 0 0 3px rgba(196,166,125,0.1)" : "none",
                        }}>
                          <div className={`text-xs font-semibold ${sel ? "text-[#c4a67d]" : lt ? "text-[#0a0a0a]" : "text-white"}`}>{p.label}</div>
                          <div className={`text-[10px] mt-0.5 ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>{p.description}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card lt={lt} title="Video Engine">
                <div className="space-y-2">
                  {ENGINES.map((e) => {
                    const sel = flowEngine === e.id;
                    return (
                      <button key={e.id} onClick={() => setFlowEngine(e.id)} className="w-full text-left p-3 rounded-xl transition-all flex items-center justify-between" style={{
                        border: sel ? "1.5px solid #c4a67d" : `1.5px solid ${lt ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
                        background: sel ? (lt ? "rgba(196,166,125,0.08)" : "rgba(196,166,125,0.1)") : (lt ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)"),
                      }}>
                        <div>
                          <div className={`text-xs font-semibold ${sel ? "text-[#c4a67d]" : lt ? "text-[#0a0a0a]" : "text-white"}`}>{e.label}</div>
                          <div className={`text-[10px] mt-0.5 ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>{e.desc}</div>
                        </div>
                        {e.badge && <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#c4a67d]/20 text-[#c4a67d]">{e.badge}</span>}
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card lt={lt} title="Aspect Ratio">
                <div className="flex gap-2">
                  {ASPECT_RATIOS.map((ar) => {
                    const sel = flowAspect === ar.id;
                    return (
                      <button key={ar.id} onClick={() => setFlowAspect(ar.id)}
                        className={`flex-1 py-2.5 rounded-xl text-center transition-all text-xs font-medium ${sel ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white shadow-sm" : lt ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/60" : "bg-[rgba(255,255,255,0.06)] text-white/60"}`}>
                        <div>{ar.label}</div>
                        <div className="text-[9px] opacity-60 mt-0.5">{ar.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Right: Model + Quality + Generate */}
            <div className="space-y-4">
              <Card lt={lt} title="Model Appearance">
                <div className="space-y-3">
                  <div>
                    <label className={`text-[10px] font-medium uppercase tracking-wider ${lt ? "text-[#5a5a5a]" : "text-white/40"}`}>Gender</label>
                    <div className="flex gap-2 mt-1.5">
                      {GENDERS.map((g) => (
                        <button key={g} onClick={() => setFlowGender(g)}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${flowGender === g ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white" : lt ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/60" : "bg-[rgba(255,255,255,0.06)] text-white/60"}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`text-[10px] font-medium uppercase tracking-wider ${lt ? "text-[#5a5a5a]" : "text-white/40"}`}>Skin Tone</label>
                    <div className="flex gap-1.5 mt-1.5">
                      {SKIN_TONES.map((st) => (
                        <button key={st.id} onClick={() => setFlowSkinTone(st.id)} title={st.label}
                          className={`w-8 h-8 rounded-full transition-all ${flowSkinTone === st.id ? "ring-2 ring-[#c4a67d] ring-offset-2" : "hover:scale-110"}`}
                          style={{ backgroundColor: st.hex, ringOffsetColor: lt ? "#fff" : "#1a1612" }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`text-[10px] font-medium uppercase tracking-wider ${lt ? "text-[#5a5a5a]" : "text-white/40"}`}>Nationality</label>
                    <select value={flowNationality} onChange={(e) => setFlowNationality(e.target.value)}
                      className={`w-full mt-1.5 px-3 py-2 rounded-lg text-xs outline-none transition-colors ${lt ? "bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.08)] text-[#0a0a0a]" : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white"}`}>
                      {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`text-[10px] font-medium uppercase tracking-wider ${lt ? "text-[#5a5a5a]" : "text-white/40"}`}>Outfit Style</label>
                    <div className="flex gap-2 mt-1.5">
                      {["modern", "traditional"].map((o) => (
                        <button key={o} onClick={() => setFlowOutfit(o)}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${flowOutfit === o ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white" : lt ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/60" : "bg-[rgba(255,255,255,0.06)] text-white/60"}`}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              <Card lt={lt} title="Quality">
                <div className="flex gap-2">
                  {(["standard", "pro"] as const).map((q) => {
                    const sel = flowQuality === q;
                    return (
                      <button key={q} onClick={() => setFlowQuality(q)} className="flex-1 py-3 rounded-xl text-center transition-all" style={{
                        border: sel ? "1.5px solid #c4a67d" : `1.5px solid ${lt ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
                        background: sel ? (lt ? "rgba(196,166,125,0.08)" : "rgba(196,166,125,0.1)") : (lt ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)"),
                      }}>
                        <div className={`text-xs font-semibold capitalize ${sel ? "text-[#c4a67d]" : lt ? "text-[#0a0a0a]" : "text-white"}`}>{q}</div>
                        <div className={`text-[10px] mt-0.5 ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>{FLOW_VIDEO_PRICING[q]} tokens</div>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card lt={lt} title="Custom Direction (optional)">
                <textarea value={flowCustomPrompt} onChange={(e) => setFlowCustomPrompt(e.target.value)}
                  placeholder="Override the transition prompt..." rows={2}
                  className={`w-full px-3 py-2 rounded-lg text-xs resize-none outline-none transition-colors ${lt ? "bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.08)] text-[#0a0a0a] placeholder:text-[#0a0a0a]/30" : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white placeholder:text-white/30"}`} />
              </Card>

              <button onClick={handleFlowGenerate} disabled={!selectedPreset}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #8b7355, #c4a67d)", boxShadow: "0 4px 16px rgba(196,166,125,0.3)" }}>
                Generate Flow Video — {FLOW_VIDEO_PRICING[flowQuality]} tokens
              </button>
              {credits && <p className={`text-center text-[11px] ${lt ? "text-[#0a0a0a]/35" : "text-white/35"}`}>Balance: {credits.token_balance} tokens</p>}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* ── GENERATING STATE ── */}
        {/* ═══════════════════════════════════════════════════ */}
        {isGenerating && (
          <div className="rounded-2xl p-10 md:p-16 text-center space-y-6" style={{ border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`, background: lt ? "#fff" : "rgba(255,255,255,0.02)" }}>
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-[rgba(196,166,125,0.2)]" />
              <div className="absolute inset-0 rounded-full border-2 border-[#c4a67d] border-t-transparent animate-spin" />
            </div>
            <div>
              <p className={`text-lg font-semibold ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
                {flowGenerating ? (FLOW_PROGRESS_STEPS[flowProgressStep]?.label || "Generating...") : "Generating video..."}
              </p>
              <p className={`text-sm mt-2 ${lt ? "text-[#0a0a0a]/50" : "text-white/50"}`}>
                {flowGenerating ? "This may take 2-4 minutes." : "This may take 1-2 minutes."} Please don&apos;t close this page.
              </p>
            </div>
            <div className="max-w-sm mx-auto">
              <div className={`h-1.5 rounded-full overflow-hidden ${lt ? "bg-[rgba(0,0,0,0.06)]" : "bg-[rgba(255,255,255,0.06)]"}`}>
                <div className="h-full rounded-full bg-gradient-to-r from-[#8b7355] to-[#c4a67d] transition-all duration-1000"
                  style={{ width: flowGenerating ? `${Math.min(10 + flowProgressStep * 12, 92)}%` : "60%" }} />
              </div>
              {flowGenerating && (
                <p className={`text-[10px] mt-2 ${lt ? "text-[#0a0a0a]/30" : "text-white/30"}`}>
                  Step {flowProgressStep + 1} of {FLOW_PROGRESS_STEPS.length}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* ── QUICK VIDEO RESULT ── */}
        {/* ═══════════════════════════════════════════════════ */}
        {quickResult && (
          <div className="space-y-6">
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`, background: lt ? "#fff" : "rgba(255,255,255,0.02)" }}>
              <video src={quickResult.video_url} controls autoPlay loop className="w-full max-h-[600px] object-contain bg-black" />
              <div className="p-4 flex items-center gap-3">
                <span className={`text-xs ${lt ? "text-[#0a0a0a]/50" : "text-white/50"}`}>{quickResult.duration}s</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${lt ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/50" : "bg-[rgba(255,255,255,0.06)] text-white/50"}`}>
                  {VIDEO_MODES.find((m) => m.id === quickResult.mode)?.label || quickResult.mode}
                </span>
                <span className={`text-xs ${lt ? "text-[#0a0a0a]/35" : "text-white/35"}`}>{quickResult.tokens_used} tokens used</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={quickResult.video_url} download target="_blank" rel="noopener noreferrer"
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white text-center transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #8b7355, #c4a67d)", boxShadow: "0 4px 16px rgba(196,166,125,0.3)" }}>
                <span className="inline-flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Download Video
                </span>
              </a>
              <button onClick={resetResult} className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${lt ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/70 hover:bg-[rgba(0,0,0,0.08)]" : "bg-[rgba(255,255,255,0.06)] text-white/70 hover:bg-[rgba(255,255,255,0.1)]"}`}>
                Generate Another
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* ── FLOW VIDEO RESULT ── */}
        {/* ═══════════════════════════════════════════════════ */}
        {flowResult && (
          <div className="space-y-6">
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`, background: lt ? "#fff" : "rgba(255,255,255,0.02)" }}>
              <video src={flowResult.video_url} controls autoPlay loop className="w-full max-h-[600px] object-contain bg-black" />
              <div className="p-4 flex items-center gap-3 flex-wrap">
                <span className={`text-xs ${lt ? "text-[#0a0a0a]/50" : "text-white/50"}`}>{flowResult.duration}s</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${lt ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/50" : "bg-[rgba(255,255,255,0.06)] text-white/50"}`}>{flowResult.preset_label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${lt ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/50" : "bg-[rgba(255,255,255,0.06)] text-white/50"}`}>
                  {ENGINES.find((e) => e.id === flowResult.engine)?.label || flowResult.engine}
                </span>
                <span className={`text-xs ${lt ? "text-[#0a0a0a]/35" : "text-white/35"}`}>{flowResult.tokens_used} tokens</span>
              </div>
            </div>

            {/* Frame previews */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}` }}>
                <img src={`data:image/png;base64,${flowResult.first_frame_b64}`} alt="First Frame" className="w-full h-auto" />
                <div className={`px-3 py-2 text-[10px] font-medium ${lt ? "text-[#0a0a0a]/50 bg-[rgba(0,0,0,0.02)]" : "text-white/50 bg-[rgba(255,255,255,0.02)]"}`}>First Frame — Product</div>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}` }}>
                <img src={`data:image/png;base64,${flowResult.last_frame_b64}`} alt="Last Frame" className="w-full h-auto" />
                <div className={`px-3 py-2 text-[10px] font-medium ${lt ? "text-[#0a0a0a]/50 bg-[rgba(0,0,0,0.02)]" : "text-white/50 bg-[rgba(255,255,255,0.02)]"}`}>Last Frame — Lifestyle</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a href={flowResult.video_url} download target="_blank" rel="noopener noreferrer"
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white text-center transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #8b7355, #c4a67d)", boxShadow: "0 4px 16px rgba(196,166,125,0.3)" }}>
                Download Video
              </a>
              <button onClick={resetResult} className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${lt ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/70 hover:bg-[rgba(0,0,0,0.08)]" : "bg-[rgba(255,255,255,0.06)] text-white/70 hover:bg-[rgba(255,255,255,0.1)]"}`}>
                Generate Another
              </button>
            </div>
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
}

function Card({ lt, title, children }: { lt: boolean; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 space-y-3" style={{
      border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
      background: lt ? "#fff" : "rgba(255,255,255,0.02)",
    }}>
      <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${lt ? "text-[#5a5a5a]" : "text-white/50"}`}>{title}</span>
      {children}
    </div>
  );
}
