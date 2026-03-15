"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/providers/AppProvider";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "next/navigation";
import { shareToWhatsApp, downloadImage } from "@/lib/share";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import CompareSlider from "@/components/ui/CompareSlider";

interface Background {
  id: string;
  label: string;
  type: "scene" | "color";
  color?: string;
  thumb?: string;
}

interface Toast {
  id: number;
  message: string;
  type: "error" | "success" | "info";
}

type Quality = "standard" | "pro";
type AspectRatioId = "square" | "portrait" | "story" | "landscape" | "widescreen";

const ASPECT_RATIOS: { id: AspectRatioId; label: string; ratio: string; w: number; h: number }[] = [
  { id: "square",    label: "Square",    ratio: "1:1",  w: 1, h: 1 },
  { id: "portrait",  label: "Portrait",  ratio: "3:4",  w: 3, h: 4 },
  { id: "story",     label: "Tall",      ratio: "9:16", w: 9, h: 16 },
  { id: "landscape", label: "Landscape", ratio: "4:3",  w: 4, h: 3 },
  { id: "widescreen",label: "Wide",      ratio: "16:9", w: 16, h: 9 },
];

const TOKEN_COST: Record<Quality, number> = { standard: 5, pro: 20 };

const PROGRESS_STEPS = [
  { label: "Enhancing lighting…", duration: 4000 },
  { label: "Setting up the background…", duration: 6000 },
  { label: "Correcting shadows…", duration: 12000 },
  { label: "Refining textures…", duration: 8000 },
  { label: "Almost there…", duration: 30000 },
];

export default function StudioPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const lt = theme === "light";

  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedBg, setSelectedBg] = useState("white");
  const [quality, setQuality] = useState<Quality>("pro");
  const [aspectRatioId, setAspectRatioId] = useState<AspectRatioId>("square");
  const [showRatioPanel, setShowRatioPanel] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [results, setResults] = useState<{ base64: string; label: string }[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string, type: Toast["type"] = "error") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), type === "error" ? 8000 : 5000);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (!loaded.current) { loaded.current = true; loadBackgrounds(); }
  }, [authLoading, user, router]);

  async function loadBackgrounds() {
    try {
      const data = await api.get<{ backgrounds: Background[] }>("/studio/backgrounds");
      setBackgrounds(data.backgrounds);
    } catch { /* silent */ }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast("File too large. Max 10MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleImageUpload(fakeEvent);
  }

  const startProgress = () => {
    setProgressStep(0); setProgressPct(0); setElapsedSec(0);
    let step = 0;
    const advance = () => { step++; if (step < PROGRESS_STEPS.length) { setProgressStep(step); stepTimer.current = setTimeout(advance, PROGRESS_STEPS[step].duration); } };
    stepTimer.current = setTimeout(advance, PROGRESS_STEPS[0].duration);
    let pct = 0; let sec = 0;
    progressTimer.current = setInterval(() => { sec++; setElapsedSec(sec); pct = Math.min(95, pct + (95 - pct) * 0.04); setProgressPct(Math.round(pct)); }, 1000);
  };

  const stopProgress = (success: boolean) => {
    if (stepTimer.current) clearTimeout(stepTimer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
    if (success) setProgressPct(100);
  };

  const handleGenerate = async () => {
    if (!imagePreview) return;
    setGenerating(true); setResults([]); setCompareMode(false);
    startProgress();
    try {
      const data = await api.post<{ success: boolean; images: { base64: string; label: string }[]; error?: string }>(
        "/studio/generate",
        { image_base64: imagePreview, background_id: selectedBg, quality, aspect_ratio_id: aspectRatioId, special_instructions: specialInstructions || undefined }
      );
      stopProgress(data.success);
      if (data.success) {
        setResults(data.images.filter(i => i.base64));
        showToast("Studio image ready!", "success");
      } else {
        showToast(data.error || "Generation failed. No tokens were deducted.");
      }
    } catch (e: unknown) {
      stopProgress(false);
      showToast(e instanceof Error ? e.message : "Something went wrong. No tokens were deducted.");
    } finally { setGenerating(false); }
  };

  const handleRegenerate = async () => {
    await handleGenerate();
  };

  function downloadResult(img: { base64: string; label: string }) {
    downloadImage(img.base64, `soraipixel-studio-${img.label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`);
  }

  function startOver() {
    setImagePreview(null);
    setResults([]);
    setCompareMode(false);
    setExpandedIndex(null);
  }

  const scenes = backgrounds.filter(b => b.type === "scene");
  const colors = backgrounds.filter(b => b.type === "color");

  return (
    <ResponsiveLayout title="Studio">
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

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Page heading */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-[#c4a67d] tracking-[0.12em] uppercase bg-[rgba(196,166,125,0.1)] px-2.5 py-1 rounded-full">
              Studio
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Create Studio Image
          </h2>
          <p className="text-[rgba(255,255,255,0.5)] text-sm mt-1">
            Upload your product and select a background to generate a studio-quality photo.
          </p>
        </div>

        {/* Upload area */}
        {results.length === 0 && !generating && (
          <>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Card padding="none">
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Product" className="w-full max-h-96 object-contain rounded-[20px] bg-[rgba(255,255,255,0.04)]" />
                    <button
                      onClick={() => { setImagePreview(null); setResults([]); }}
                      className="absolute top-3 right-3 w-8 h-8 bg-black/60 backdrop-blur-sm text-white rounded-lg flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className="block p-12 md:p-16 text-center cursor-pointer rounded-[20px] border-2 border-dashed border-[rgba(196,166,125,0.2)] hover:border-[rgba(196,166,125,0.5)] hover:bg-[rgba(196,166,125,0.03)] transition-all duration-300 group shadow-[0_2px_16px_rgba(0,0,0,0.06),0_8px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.1),0_12px_48px_rgba(0,0,0,0.06)]">
                    <div className="w-16 h-16 mx-auto mb-5 bg-[rgba(196,166,125,0.1)] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-white">Upload your product image</p>
                    <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1.5">Drag and drop or click to browse</p>
                    <p className="text-[10px] text-[rgba(255,255,255,0.25)] mt-3">PNG, JPG up to 10MB</p>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); cameraInputRef.current?.click(); }}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#c4a67d] bg-[rgba(196,166,125,0.1)] hover:bg-[rgba(196,166,125,0.2)] transition-all md:hidden"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      Take Photo
                    </button>
                  </label>
                )}
              </Card>
            </div>

            {/* Special Instructions */}
            {imagePreview && (
              <button
                onClick={() => setShowInstructions(true)}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200 group"
                style={{
                  border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
                  background: lt ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: lt ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.06)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={lt ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.4)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </div>
                  <span style={{ color: specialInstructions ? (lt ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.7)") : (lt ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)"), fontSize: "14px" }}>
                    {specialInstructions || "Add special instructions"}
                  </span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={lt ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"} strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            )}

            {/* Background Selection */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: `1px solid ${lt ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.08)"}`,
                background: lt ? "#fff" : "rgba(255,255,255,0.02)",
                boxShadow: lt ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
              }}
            >
              <div className="px-5 pt-4 pb-5 space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: lt ? "#5a5a5a" : "rgba(255,255,255,0.5)" }}>Background</span>

                {scenes.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {scenes.map(bg => {
                      const sel = selectedBg === bg.id;
                      return (
                        <button key={bg.id} onClick={() => setSelectedBg(bg.id)} className="flex-shrink-0 text-center group">
                          <div
                            className="w-[72px] h-[72px] rounded-xl overflow-hidden transition-all duration-250 group-hover:-translate-y-0.5"
                            style={{
                              border: sel ? "2.5px solid #b8985f" : `1.5px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.1)"}`,
                              boxShadow: sel
                                ? `0 0 0 3px rgba(196,166,125,0.15), 0 6px 16px rgba(196,166,125,0.25), 0 2px 4px rgba(0,0,0,0.08)`
                                : lt
                                  ? "0 2px 6px rgba(0,0,0,0.08), 0 6px 14px rgba(0,0,0,0.06)"
                                  : "0 2px 8px rgba(0,0,0,0.3), 0 6px 16px rgba(0,0,0,0.2)",
                            }}
                          >
                            {bg.thumb ? (
                              <img src={bg.thumb} alt={bg.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{ background: lt ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.04)", color: lt ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.3)", fontSize: "10px" }}>
                                {bg.label.slice(0, 3)}
                              </div>
                            )}
                          </div>
                          <p className="mt-1.5 truncate w-[72px]" style={{ color: sel ? "#9a7d4e" : (lt ? "#6b6b6b" : "rgba(255,255,255,0.45)"), fontWeight: sel ? 600 : 500, fontSize: "11px" }}>{bg.label}</p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {colors.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {colors.map(bg => {
                      const sel = selectedBg === bg.id;
                      const isLight = ["#FFFFFF", "#F5F0E8", "#E8DCC8", "#E0E0E0", "#F8BBD0", "#FDD835"].includes(bg.color || "");
                      return (
                        <button key={bg.id} onClick={() => setSelectedBg(bg.id)} className="flex-shrink-0 text-center group">
                          <div
                            className="w-[72px] h-[72px] rounded-xl transition-all duration-250 group-hover:-translate-y-0.5"
                            style={{
                              backgroundColor: bg.color || "#ccc",
                              border: sel ? "2.5px solid #b8985f" : `1.5px solid ${isLight && lt ? "rgba(0,0,0,0.1)" : "transparent"}`,
                              boxShadow: sel
                                ? `0 0 0 3px rgba(196,166,125,0.15), 0 6px 16px rgba(196,166,125,0.25), 0 2px 4px rgba(0,0,0,0.08)`
                                : lt
                                  ? "0 2px 6px rgba(0,0,0,0.1), 0 6px 14px rgba(0,0,0,0.07)"
                                  : "0 2px 8px rgba(0,0,0,0.3), 0 6px 16px rgba(0,0,0,0.2)",
                            }}
                          />
                          <p className="mt-1.5 truncate w-[72px]" style={{ color: sel ? "#9a7d4e" : (lt ? "#6b6b6b" : "rgba(255,255,255,0.45)"), fontWeight: sel ? 600 : 500, fontSize: "11px" }}>{bg.label}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Quality & Aspect Ratio ── */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: `1px solid ${lt ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.08)"}`,
                background: lt ? "#fff" : "rgba(255,255,255,0.02)",
                boxShadow: lt ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
              }}
            >

              {/* Quality */}
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: lt ? "#5a5a5a" : "rgba(255,255,255,0.5)" }}>Quality</span>
                  <span className="text-[11px] font-medium" style={{ color: lt ? "#999" : "rgba(255,255,255,0.3)" }}>{TOKEN_COST[quality]} {TOKEN_COST[quality] === 1 ? "token" : "tokens"}/image</span>
                </div>
                <div
                  className="inline-flex w-full rounded-xl p-1"
                  style={{
                    background: lt ? "#f3f3f1" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${lt ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <button
                    onClick={() => setQuality("standard")}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-200"
                    style={{
                      background: quality === "standard" ? (lt ? "#fff" : "rgba(255,255,255,0.1)") : "transparent",
                      color: quality === "standard" ? (lt ? "#2a2a2a" : "#fff") : (lt ? "#999" : "rgba(255,255,255,0.4)"),
                      boxShadow: quality === "standard" ? (lt ? "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" : "0 1px 4px rgba(0,0,0,0.3)") : "none",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: quality === "standard" ? 0.8 : 0.5 }}>
                      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" />
                    </svg>
                    Standard
                  </button>
                  <button
                    onClick={() => setQuality("pro")}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-200"
                    style={{
                      background: quality === "pro" ? (lt ? "linear-gradient(135deg, rgba(184,152,95,0.18), rgba(184,152,95,0.08))" : "linear-gradient(135deg, rgba(196,166,125,0.2), rgba(196,166,125,0.1))") : "transparent",
                      color: quality === "pro" ? "#9a7d4e" : (lt ? "#999" : "rgba(255,255,255,0.4)"),
                      boxShadow: quality === "pro" ? (lt ? "0 1px 3px rgba(184,152,95,0.15), 0 1px 2px rgba(184,152,95,0.08)" : "0 1px 8px rgba(196,166,125,0.15)") : "none",
                      border: quality === "pro" ? `1px solid ${lt ? "rgba(184,152,95,0.3)" : "rgba(196,166,125,0.25)"}` : "1px solid transparent",
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    Pro
                    {quality === "pro" && (
                      <span className="ml-0.5 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-full" style={{ background: lt ? "rgba(154,125,78,0.12)" : "rgba(196,166,125,0.2)", color: lt ? "#8b7355" : "#c4a67d" }}>Best</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: lt ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)" }} />

              {/* Aspect Ratio */}
              <div className="px-5 py-4 space-y-3">
                <button
                  onClick={() => setShowRatioPanel(!showRatioPanel)}
                  className="w-full flex items-center justify-between group"
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: lt ? "#5a5a5a" : "rgba(255,255,255,0.5)" }}>
                    Aspect Ratio
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold" style={{ color: "#9a7d4e" }}>
                      {ASPECT_RATIOS.find(r => r.id === aspectRatioId)?.ratio}
                    </span>
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={lt ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)"} strokeWidth="2" strokeLinecap="round"
                      className={`transition-transform duration-200 ${showRatioPanel ? "rotate-180" : ""}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {showRatioPanel && (
                  <div className="flex gap-2">
                    {ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar.id}
                        onClick={() => setAspectRatioId(ar.id)}
                        className="flex-1 flex flex-col items-center gap-2 py-3.5 rounded-xl transition-all duration-200"
                        style={{
                          background: aspectRatioId === ar.id ? (lt ? "rgba(184,152,95,0.1)" : "rgba(196,166,125,0.1)") : (lt ? "#f9f9f7" : "rgba(255,255,255,0.02)"),
                          border: aspectRatioId === ar.id ? `1.5px solid ${lt ? "rgba(184,152,95,0.4)" : "rgba(196,166,125,0.3)"}` : `1.5px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
                          boxShadow: aspectRatioId === ar.id ? (lt ? "0 2px 8px rgba(184,152,95,0.12)" : "0 0 12px rgba(196,166,125,0.08)") : "none",
                        }}
                      >
                        <div
                          className="rounded-[3px]"
                          style={{
                            width: `${Math.round(24 * (ar.w / Math.max(ar.w, ar.h)))}px`,
                            height: `${Math.round(24 * (ar.h / Math.max(ar.w, ar.h)))}px`,
                            border: aspectRatioId === ar.id ? "2px solid #b8985f" : `2px solid ${lt ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.22)"}`,
                            background: aspectRatioId === ar.id ? "rgba(184,152,95,0.15)" : "transparent",
                          }}
                        />
                        <p style={{ fontSize: "11px", fontWeight: 600, lineHeight: 1, color: aspectRatioId === ar.id ? "#9a7d4e" : (lt ? "#777" : "rgba(255,255,255,0.4)") }}>{ar.ratio}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!imagePreview}
              className="w-full py-4 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-[14px] font-bold rounded-2xl shadow-[0_4px_24px_rgba(196,166,125,0.3)] hover:shadow-[0_6px_32px_rgba(196,166,125,0.45)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2.5"
              style={{ color: "#fff", letterSpacing: "0.01em" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
              Generate {quality === "pro" ? "Pro" : ""} Image
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-bold" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
                {TOKEN_COST[quality]} {TOKEN_COST[quality] === 1 ? "token" : "tokens"}
              </span>
            </button>
          </>
        )}

        {/* AI Processing Overlay */}
        {generating && (
          <div className="ai-overlay">
            <div className="glow-ring mb-8" />
            <h3 className="text-xl font-bold text-white mb-2">Creating Your Photo</h3>
            <p className="text-sm text-[rgba(255,255,255,0.6)] mb-8 min-h-[20px]">{PROGRESS_STEPS[progressStep]?.label}</p>
            <div className="w-64 bg-[rgba(255,255,255,0.06)] rounded-full h-1.5 mb-3 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#8b7355] to-[#c4a67d] transition-all duration-1000 ease-out" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-[rgba(255,255,255,0.4)] w-64">
              <span>{progressPct}%</span>
              <span>{elapsedSec}s</span>
            </div>
            <p className="text-xs text-[rgba(255,255,255,0.3)] mt-6">Usually takes 15-30 seconds</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && !generating && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-lg font-semibold text-white">Your Studio Image</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRegenerate}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] hover:text-white transition-all"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 4v6h6" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  Regenerate
                </button>
                {imagePreview && (
                  <button
                    onClick={() => setCompareMode(!compareMode)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                      compareMode
                        ? "bg-[rgba(196,166,125,0.2)] text-[#c4a67d] border border-[rgba(196,166,125,0.3)]"
                        : "bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)]"
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="2" x2="12" y2="22" />
                      <path d="M7 8l-4 4 4 4" /><path d="M17 8l4 4-4 4" />
                    </svg>
                    {compareMode ? "Side by Side" : "Compare"}
                  </button>
                )}
                <button
                  onClick={startOver}
                  className="text-sm text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
                >
                  ← New Photo
                </button>
              </div>
            </div>

            {results.map((img, i) => (
              <div key={i}>
                {compareMode && imagePreview ? (
                  <div className="max-w-2xl mx-auto">
                    <CompareSlider
                      beforeSrc={imagePreview}
                      afterSrc={`data:image/png;base64,${img.base64}`}
                      beforeLabel="Original"
                      afterLabel={img.label}
                      className="border border-[rgba(196,166,125,0.2)]"
                    />
                  </div>
                ) : (
                  <Card padding="none">
                    <img
                      src={`data:image/png;base64,${img.base64}`}
                      alt={img.label}
                      className="w-full rounded-t-[20px] cursor-pointer"
                      onClick={() => setExpandedIndex(i)}
                    />
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{img.label}</span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => shareToWhatsApp(img.base64, `soraipixel-studio-${Date.now()}.png`)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                          Share
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => downloadResult(img)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                          Download
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            ))}

            {/* Take it further */}
            <div className="pt-6 border-t border-[rgba(255,255,255,0.08)]">
              <p className="text-xs font-semibold text-[rgba(255,255,255,0.35)] uppercase tracking-wider mb-3">Take it further</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const img = results[0];
                    if (!img?.base64) return;
                    const blob = new Blob([Uint8Array.from(atob(img.base64), c => c.charCodeAt(0))], { type: "image/png" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    sessionStorage.setItem("video_image_b64", img.base64);
                    router.push("/video");
                  }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(196,166,125,0.3)] transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-[rgba(196,166,125,0.1)] flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">Create Video</span>
                    <span className="text-[11px] text-[rgba(255,255,255,0.35)]">Turn this image into a product video</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    const img = results[0];
                    if (!img?.base64) return;
                    sessionStorage.setItem("ugc_image_b64", img.base64);
                    router.push("/ugc");
                  }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(196,166,125,0.3)] transition-all group text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-[rgba(196,166,125,0.1)] flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">Create UGC</span>
                    <span className="text-[11px] text-[rgba(255,255,255,0.35)]">AI models showcasing your product</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {expandedIndex !== null && results[expandedIndex] && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-fade-in"
          onClick={() => setExpandedIndex(null)}
        >
          <div
            className="relative max-w-3xl w-full mx-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-white uppercase tracking-wider">
                {results[expandedIndex].label}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => downloadResult(results[expandedIndex])}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#c4a67d] bg-[rgba(196,166,125,0.1)] border border-[rgba(196,166,125,0.2)] rounded-full hover:bg-[rgba(196,166,125,0.2)] transition-colors"
                >
                  Download
                </button>
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
                src={`data:image/png;base64,${results[expandedIndex].base64}`}
                alt={results[expandedIndex].label}
                className="w-full object-contain max-h-[80vh] bg-black"
              />
            </div>
          </div>
        </div>
      )}

      {/* Special Instructions Sheet */}
      <Modal open={showInstructions} onClose={() => setShowInstructions(false)} title="Special Instructions" sheet>
        <div className="space-y-4">
          <textarea
            value={specialInstructions}
            onChange={e => setSpecialInstructions(e.target.value)}
            placeholder="Write custom settings..."
            maxLength={100}
            className="w-full border border-[rgba(255,255,255,0.08)] rounded-[14px] px-4 py-3 h-28 resize-none outline-none focus:border-[#c4a67d] focus:shadow-[0_0_0_3px_rgba(196,166,125,0.15)] bg-[rgba(255,255,255,0.04)] text-white text-sm transition-all duration-250 placeholder:text-[rgba(255,255,255,0.25)]"
          />
          <p className="text-xs text-[rgba(255,255,255,0.4)]">
            {specialInstructions.split(/\s+/).filter(Boolean).length}/10 words
          </p>
          <div className="space-y-1.5">
            <p className="text-sm text-[rgba(255,255,255,0.5)]"><span className="font-medium text-white">Example:</span> Don&apos;t add additional items</p>
            <p className="text-sm text-[rgba(255,255,255,0.5)]"><span className="font-medium text-white">Example:</span> Don&apos;t add dupatta</p>
          </div>
          <Button onClick={() => setShowInstructions(false)} fullWidth>
            Save Instructions
          </Button>
        </div>
      </Modal>
    </ResponsiveLayout>
  );
}
