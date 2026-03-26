"use client";

import { useState, useRef, useCallback, Suspense } from "react";
import { api } from "@/lib/api-client";
import { useAuth, useCredits } from "@/providers/AppProvider";
import { useTheme } from "@/hooks/useTheme";
import { FLOW_VIDEO_PRICING } from "@/lib/token-pricing";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import QualityToggle from "@/components/ui/QualityToggle";

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

const ASPECT_RATIOS = [
  { id: "landscape", label: "16:9", desc: "Landscape" },
  { id: "portrait", label: "9:16", desc: "Portrait / Reels" },
  { id: "square", label: "1:1", desc: "Square" },
];

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

const PROGRESS_STEPS = [
  { label: "Setting up the product scene...", duration: 4000 },
  { label: "Styling the first frame...", duration: 10000 },
  { label: "Creating the model look...", duration: 10000 },
  { label: "Generating UGC last frame...", duration: 10000 },
  { label: "Uploading frames to video engine...", duration: 5000 },
  { label: "Generating cinematic transition...", duration: 30000 },
  { label: "Rendering video...", duration: 60000 },
  { label: "Almost there...", duration: 120000 },
];

export default function FlowVideoPage() {
  return (
    <Suspense fallback={null}>
      <FlowVideoInner />
    </Suspense>
  );
}

function FlowVideoInner() {
  const { user, loading: authLoading } = useAuth();
  const { credits, refreshCredits } = useCredits();
  const { theme } = useTheme();
  const lt = theme === "light";

  const [step, setStep] = useState<"upload" | "configure" | "generating" | "result">("upload");
  const [imageB64, setImageB64] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [category, setCategory] = useState("necklace");
  const [presets, setPresets] = useState<FlowPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<FlowPreset | null>(null);
  const [engine, setEngine] = useState("seedance");
  const [quality, setQuality] = useState<"standard" | "pro">("standard");
  const [aspectRatio, setAspectRatio] = useState("landscape");
  const [gender, setGender] = useState("woman");
  const [nationality, setNationality] = useState("Indian");
  const [skinTone, setSkinTone] = useState("medium");
  const [outfitStyle, setOutfitStyle] = useState("modern");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState<FlowResult | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const tokenCost = FLOW_VIDEO_PRICING[quality];

  const fetchPresets = useCallback(async (cat: string) => {
    try {
      const data = await api.get<{ presets: FlowPreset[] }>(`/flow-video/presets/${cat}`);
      setPresets(data.presets || []);
      if (data.presets?.length) setSelectedPreset(data.presets[0]);
    } catch {
      setPresets([]);
    }
  }, []);

  function handleFileSelect(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      setImageB64(r.split(",")[1] || r);
      setImagePreview(r);
      setStep("configure");
      fetchPresets(category);
    };
    reader.readAsDataURL(file);
  }

  function handleCategoryChange(cat: string) {
    setCategory(cat);
    fetchPresets(cat);
  }

  function startProgress() {
    setProgressStep(0);
    let idx = 0;
    const advance = () => {
      idx++;
      if (idx < PROGRESS_STEPS.length) {
        setProgressStep(idx);
        progressRef.current = setTimeout(advance, PROGRESS_STEPS[idx].duration);
      }
    };
    progressRef.current = setTimeout(advance, PROGRESS_STEPS[0].duration);
  }

  function stopProgress() {
    if (progressRef.current) clearTimeout(progressRef.current);
  }

  const handleGenerate = useCallback(async () => {
    if (!imageB64 || !selectedPreset || generating) return;
    setGenerating(true);
    setStep("generating");
    setError("");
    setResult(null);
    startProgress();

    try {
      const data = await api.post<FlowResult & { success: boolean }>("/flow-video/generate", {
        image_b64: imageB64,
        jewelry_type: category,
        preset_id: selectedPreset.id,
        engine,
        quality,
        aspect_ratio: aspectRatio,
        gender,
        nationality,
        skin_tone: skinTone,
        outfit_style: outfitStyle,
        custom_transition_prompt: customPrompt || undefined,
      });
      stopProgress();
      setResult(data);
      setStep("result");
      await refreshCredits();
    } catch (err: unknown) {
      stopProgress();
      const message = err instanceof Error ? err.message : "Flow video generation failed";
      setError(message);
      setStep("configure");
    } finally {
      setGenerating(false);
    }
  }, [imageB64, selectedPreset, generating, category, engine, quality, aspectRatio, gender, nationality, skinTone, outfitStyle, customPrompt, refreshCredits]);

  function resetAll() {
    setStep("upload");
    setImageB64("");
    setImagePreview("");
    setResult(null);
    setError("");
    setGenerating(false);
    setProgressStep(0);
    stopProgress();
  }

  function resetToConfig() {
    setStep("configure");
    setResult(null);
    setError("");
  }

  if (authLoading) {
    return (
      <ResponsiveLayout title="Flow Video">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-[#c4a67d] border-t-transparent rounded-full animate-spin" />
        </div>
      </ResponsiveLayout>
    );
  }

  if (!user) {
    return (
      <ResponsiveLayout title="Flow Video">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className={lt ? "text-[#0a0a0a]/60" : "text-white/60"}>Please sign in to create flow videos.</p>
          <a href="/login" className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white hover:opacity-90 transition-opacity">
            Sign In
          </a>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout title="Flow Video">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
            Flow Video
          </h1>
          <p className={`text-sm mt-1.5 ${lt ? "text-[#0a0a0a]/50" : "text-white/50"}`}>
            Product shot to lifestyle — cinematic transitions powered by AI
          </p>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-3 text-red-400/60 hover:text-red-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        )}

        {/* ── STEP 1: Upload ── */}
        {step === "upload" && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelect(f); }}
          >
            <label
              className={`block p-12 md:p-20 text-center cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 group ${
                dragOver
                  ? "border-[#c4a67d] bg-[rgba(196,166,125,0.06)]"
                  : lt
                    ? "border-[rgba(0,0,0,0.12)] hover:border-[rgba(196,166,125,0.4)]"
                    : "border-[rgba(196,166,125,0.2)] hover:border-[rgba(196,166,125,0.5)]"
              }`}
            >
              <div className="w-16 h-16 mx-auto mb-5 bg-[rgba(196,166,125,0.1)] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className={`text-sm font-semibold ${lt ? "text-[#0a0a0a]" : "text-white"}`}>Upload your product image</p>
              <p className={`text-xs mt-1.5 ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>Drag and drop or click to browse</p>
              <p className={`text-[10px] mt-3 ${lt ? "text-[#0a0a0a]/25" : "text-white/25"}`}>PNG, JPG up to 10MB</p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} className="hidden" />
            </label>
          </div>
        )}

        {/* ── STEP 2: Configure ── */}
        {step === "configure" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Image + Category */}
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden relative" style={{ border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`, background: lt ? "#fff" : "rgba(255,255,255,0.02)" }}>
                <img src={imagePreview} alt="Product" className="w-full h-auto max-h-[300px] object-contain p-3" />
                <button onClick={resetAll} className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur-sm text-white rounded-lg flex items-center justify-center hover:bg-black/80 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              {/* Category */}
              <Card lt={lt} title="Category">
                <div className="grid grid-cols-3 gap-1.5">
                  {JEWELRY_CATEGORIES.map((c) => (
                    <button key={c.id} onClick={() => handleCategoryChange(c.id)}
                      className={`px-2 py-2 rounded-lg text-center transition-all text-[11px] ${category === c.id ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white shadow-sm" : lt ? "bg-[rgba(0,0,0,0.03)] text-[#0a0a0a]/70 hover:bg-[rgba(0,0,0,0.06)]" : "bg-[rgba(255,255,255,0.04)] text-white/70 hover:bg-[rgba(255,255,255,0.08)]"}`}>
                      <span className="block text-sm mb-0.5">{c.icon}</span>{c.label}
                    </button>
                  ))}
                </div>
              </Card>
            </div>

            {/* Center: Flow Presets + Engine */}
            <div className="space-y-4">
              {/* Flow Presets */}
              <Card lt={lt} title="Story Flow">
                {presets.length === 0 ? (
                  <p className={`text-xs ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>Loading presets...</p>
                ) : (
                  <div className="space-y-2">
                    {presets.map((p) => {
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

              {/* Video Engine */}
              <Card lt={lt} title="Video Engine">
                <div className="space-y-2">
                  {ENGINES.map((e) => {
                    const sel = engine === e.id;
                    return (
                      <button key={e.id} onClick={() => setEngine(e.id)} className="w-full text-left p-3 rounded-xl transition-all flex items-center justify-between" style={{
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

              {/* Aspect Ratio */}
              <Card lt={lt} title="Aspect Ratio">
                <div className="flex gap-2">
                  {ASPECT_RATIOS.map((ar) => {
                    const sel = aspectRatio === ar.id;
                    return (
                      <button key={ar.id} onClick={() => setAspectRatio(ar.id)}
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
              {/* Model Settings */}
              <Card lt={lt} title="Model Appearance">
                <div className="space-y-3">
                  {/* Gender */}
                  <div>
                    <label className={`text-[10px] font-medium uppercase tracking-wider ${lt ? "text-[#5a5a5a]" : "text-white/40"}`}>Gender</label>
                    <div className="flex gap-2 mt-1.5">
                      {GENDERS.map((g) => (
                        <button key={g} onClick={() => setGender(g)}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${gender === g ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white" : lt ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/60" : "bg-[rgba(255,255,255,0.06)] text-white/60"}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Skin Tone */}
                  <div>
                    <label className={`text-[10px] font-medium uppercase tracking-wider ${lt ? "text-[#5a5a5a]" : "text-white/40"}`}>Skin Tone</label>
                    <div className="flex gap-1.5 mt-1.5">
                      {SKIN_TONES.map((st) => (
                        <button key={st.id} onClick={() => setSkinTone(st.id)} title={st.label}
                          className={`w-8 h-8 rounded-full transition-all ${skinTone === st.id ? "ring-2 ring-[#c4a67d] ring-offset-2" : "hover:scale-110"}`}
                          style={{ backgroundColor: st.hex, "--tw-ring-offset-color": lt ? "#fff" : "#1a1612" } as React.CSSProperties} />
                      ))}
                    </div>
                  </div>

                  {/* Nationality */}
                  <div>
                    <label className={`text-[10px] font-medium uppercase tracking-wider ${lt ? "text-[#5a5a5a]" : "text-white/40"}`}>Nationality</label>
                    <select value={nationality} onChange={(e) => setNationality(e.target.value)}
                      className={`w-full mt-1.5 px-3 py-2 rounded-lg text-xs outline-none transition-colors ${lt ? "bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.08)] text-[#0a0a0a]" : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white"}`}>
                      {NATIONALITIES.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>

                  {/* Outfit */}
                  <div>
                    <label className={`text-[10px] font-medium uppercase tracking-wider ${lt ? "text-[#5a5a5a]" : "text-white/40"}`}>Outfit Style</label>
                    <div className="flex gap-2 mt-1.5">
                      {["modern", "traditional"].map((o) => (
                        <button key={o} onClick={() => setOutfitStyle(o)}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${outfitStyle === o ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white" : lt ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/60" : "bg-[rgba(255,255,255,0.06)] text-white/60"}`}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Quality */}
              <Card lt={lt} title="Quality">
                <QualityToggle
                  value={quality}
                  onChange={setQuality}
                  standardCost={FLOW_VIDEO_PRICING.standard}
                  proCost={FLOW_VIDEO_PRICING.pro}
                  lt={lt}
                />
              </Card>

              {/* Custom Prompt */}
              <Card lt={lt} title="Custom Direction (optional)">
                <textarea
                  value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Override the transition prompt..."
                  rows={2}
                  className={`w-full px-3 py-2 rounded-lg text-xs resize-none outline-none transition-colors ${lt ? "bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.08)] text-[#0a0a0a] placeholder:text-[#0a0a0a]/30" : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white placeholder:text-white/30"}`}
                />
              </Card>

              {/* Generate */}
              <button onClick={handleGenerate} disabled={!selectedPreset}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #8b7355, #c4a67d)", boxShadow: "0 4px 16px rgba(196,166,125,0.3)" }}>
                Generate Flow Video — {tokenCost} tokens
              </button>
              {credits && (
                <p className={`text-center text-[11px] ${lt ? "text-[#0a0a0a]/35" : "text-white/35"}`}>
                  Balance: {credits.token_balance} tokens
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Generating ── */}
        {step === "generating" && (
          <div className="rounded-2xl p-10 md:p-16 text-center space-y-6" style={{ border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`, background: lt ? "#fff" : "rgba(255,255,255,0.02)" }}>
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-[rgba(196,166,125,0.2)]" />
              <div className="absolute inset-0 rounded-full border-2 border-[#c4a67d] border-t-transparent animate-spin" />
            </div>
            <div>
              <p className={`text-lg font-semibold ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
                {PROGRESS_STEPS[progressStep]?.label || "Generating..."}
              </p>
              <p className={`text-sm mt-2 ${lt ? "text-[#0a0a0a]/50" : "text-white/50"}`}>
                This may take 2-4 minutes. Please don&apos;t close this page.
              </p>
            </div>
            <div className="max-w-sm mx-auto">
              <div className={`h-1.5 rounded-full overflow-hidden ${lt ? "bg-[rgba(0,0,0,0.06)]" : "bg-[rgba(255,255,255,0.06)]"}`}>
                <div className="h-full rounded-full bg-gradient-to-r from-[#8b7355] to-[#c4a67d] transition-all duration-1000"
                  style={{ width: `${Math.min(10 + progressStep * 12, 92)}%` }} />
              </div>
              <p className={`text-[10px] mt-2 ${lt ? "text-[#0a0a0a]/30" : "text-white/30"}`}>
                Step {progressStep + 1} of {PROGRESS_STEPS.length}
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 4: Result ── */}
        {step === "result" && result && (
          <div className="space-y-6">
            {/* Video */}
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`, background: lt ? "#fff" : "rgba(255,255,255,0.02)" }}>
              <video src={result.video_url} controls autoPlay loop className="w-full max-h-[600px] object-contain bg-black" />
              <div className="p-4 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${lt ? "text-[#0a0a0a]/50" : "text-white/50"}`}>{result.duration}s</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${lt ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/50" : "bg-[rgba(255,255,255,0.06)] text-white/50"}`}>
                    {result.preset_label}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${lt ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/50" : "bg-[rgba(255,255,255,0.06)] text-white/50"}`}>
                    {ENGINES.find((e) => e.id === result.engine)?.label || result.engine}
                  </span>
                  <span className={`text-xs ${lt ? "text-[#0a0a0a]/35" : "text-white/35"}`}>{result.tokens_used} tokens</span>
                </div>
              </div>
            </div>

            {/* Frames Preview */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}` }}>
                <img src={`data:image/png;base64,${result.first_frame_b64}`} alt="First Frame" className="w-full h-auto" />
                <div className={`px-3 py-2 text-[10px] font-medium ${lt ? "text-[#0a0a0a]/50 bg-[rgba(0,0,0,0.02)]" : "text-white/50 bg-[rgba(255,255,255,0.02)]"}`}>First Frame — Product</div>
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}` }}>
                <img src={`data:image/png;base64,${result.last_frame_b64}`} alt="Last Frame" className="w-full h-auto" />
                <div className={`px-3 py-2 text-[10px] font-medium ${lt ? "text-[#0a0a0a]/50 bg-[rgba(0,0,0,0.02)]" : "text-white/50 bg-[rgba(255,255,255,0.02)]"}`}>Last Frame — Lifestyle</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={result.video_url} download target="_blank" rel="noopener noreferrer"
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white text-center transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #8b7355, #c4a67d)", boxShadow: "0 4px 16px rgba(196,166,125,0.3)" }}>
                Download Video
              </a>
              <button onClick={resetToConfig}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${lt ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/70 hover:bg-[rgba(0,0,0,0.08)]" : "bg-[rgba(255,255,255,0.06)] text-white/70 hover:bg-[rgba(255,255,255,0.1)]"}`}>
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
