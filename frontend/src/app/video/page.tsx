"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth, useCredits } from "@/providers/AppProvider";
import { useTheme } from "@/hooks/useTheme";
import { VIDEO_PRICING } from "@/lib/token-pricing";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";

const VIDEO_MODES = [
  { id: "360_spin", label: "360° Spin", desc: "Smooth rotating showcase", icon: "🔄" },
  { id: "hero_reveal", label: "Hero Reveal", desc: "Cinematic product reveal", icon: "✨" },
  { id: "lifestyle", label: "Lifestyle", desc: "Natural lifestyle motion", icon: "🌿" },
  { id: "sparkle", label: "Sparkle", desc: "Light catching sparkle effect", icon: "💎" },
  { id: "custom", label: "Custom", desc: "Your own prompt", icon: "🎬" },
];

const ASPECT_RATIOS = [
  { id: "landscape", label: "16:9" },
  { id: "square", label: "1:1" },
  { id: "portrait", label: "9:16" },
];

interface VideoResult {
  video_url: string;
  duration: number;
  mode: string;
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

  const [imageB64, setImageB64] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [videoMode, setVideoMode] = useState("360_spin");
  const [videoQuality, setVideoQuality] = useState<"standard" | "pro">("standard");
  const [videoCustomPrompt, setVideoCustomPrompt] = useState("");
  const [videoAspect, setVideoAspect] = useState("landscape");
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [jewelryType, setJewelryType] = useState("jewelry");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const initRef = useRef(false);

  const tokenCost = VIDEO_PRICING[videoQuality];

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
    }
  }, [searchParams]);

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

  const handleGenerate = useCallback(async () => {
    if (!imageB64 || videoGenerating) return;
    setVideoGenerating(true);
    setError("");
    setVideoResult(null);

    try {
      const data = await api.post<VideoResult>("/video/generate", {
        image_b64: imageB64,
        mode: videoMode,
        jewelry_type: jewelryType,
        aspect_ratio: videoAspect,
        quality: videoQuality,
        custom_prompt: videoMode === "custom" ? videoCustomPrompt : undefined,
        session_id: sessionId || undefined,
      });
      setVideoResult(data);
      await refreshCredits();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Video generation failed";
      setError(message);
    } finally {
      setVideoGenerating(false);
    }
  }, [imageB64, videoGenerating, videoMode, jewelryType, videoAspect, videoQuality, videoCustomPrompt, sessionId, refreshCredits]);

  function resetAll() {
    setVideoResult(null);
    setVideoGenerating(false);
    setError("");
  }

  function resetFull() {
    resetAll();
    setImageB64("");
    setImagePreview("");
    setVideoMode("360_spin");
    setVideoQuality("standard");
    setVideoCustomPrompt("");
    setVideoAspect("landscape");
    setJewelryType("jewelry");
    setSessionId(null);
  }

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

  return (
    <ResponsiveLayout title="Video Generation">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
            Video Generation
          </h1>
          <p className={`text-sm mt-1.5 ${lt ? "text-[#0a0a0a]/50" : "text-white/50"}`}>
            Create stunning jewelry videos
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

        {/* No image: Upload area */}
        {!imageB64 && !videoGenerating && !videoResult && (
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

        {/* Image loaded: Config panel */}
        {imageB64 && !videoGenerating && !videoResult && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Image preview */}
            <div
              className="rounded-2xl overflow-hidden relative"
              style={{
                border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
                background: lt ? "#fff" : "rgba(255,255,255,0.02)",
              }}
            >
              <img
                src={imagePreview}
                alt="Source"
                className="w-full h-auto max-h-[500px] object-contain p-4"
              />
              <button
                onClick={resetFull}
                className="absolute top-3 right-3 w-8 h-8 bg-black/60 backdrop-blur-sm text-white rounded-lg flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Right: Configuration */}
            <div className="space-y-5">
              {/* Video Style */}
              <div
                className="rounded-2xl p-5 space-y-3"
                style={{
                  border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
                  background: lt ? "#fff" : "rgba(255,255,255,0.02)",
                }}
              >
                <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${lt ? "text-[#5a5a5a]" : "text-white/50"}`}>
                  Video Style
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {VIDEO_MODES.map((mode) => {
                    const selected = videoMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => setVideoMode(mode.id)}
                        className="text-left p-3 rounded-xl transition-all duration-200"
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
                        <div className="text-lg mb-1">{mode.icon}</div>
                        <div className={`text-xs font-semibold ${selected ? "text-[#c4a67d]" : lt ? "text-[#0a0a0a]" : "text-white"}`}>
                          {mode.label}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>
                          {mode.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {videoMode === "custom" && (
                  <textarea
                    value={videoCustomPrompt}
                    onChange={(e) => setVideoCustomPrompt(e.target.value)}
                    placeholder="Describe the video motion you want..."
                    rows={3}
                    className={`w-full mt-2 px-3.5 py-2.5 rounded-xl text-sm resize-none outline-none transition-colors ${
                      lt
                        ? "bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.08)] text-[#0a0a0a] placeholder:text-[#0a0a0a]/30 focus:border-[#c4a67d]"
                        : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white placeholder:text-white/30 focus:border-[#c4a67d]"
                    }`}
                  />
                )}
              </div>

              {/* Aspect Ratio */}
              <div
                className="rounded-2xl p-5 space-y-3"
                style={{
                  border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
                  background: lt ? "#fff" : "rgba(255,255,255,0.02)",
                }}
              >
                <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${lt ? "text-[#5a5a5a]" : "text-white/50"}`}>
                  Aspect Ratio
                </span>
                <div className="flex gap-2">
                  {ASPECT_RATIOS.map((ar) => {
                    const selected = videoAspect === ar.id;
                    return (
                      <button
                        key={ar.id}
                        onClick={() => setVideoAspect(ar.id)}
                        className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                          selected
                            ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white shadow-[0_2px_8px_rgba(196,166,125,0.3)]"
                            : lt
                              ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/60 hover:bg-[rgba(0,0,0,0.08)]"
                              : "bg-[rgba(255,255,255,0.06)] text-white/60 hover:bg-[rgba(255,255,255,0.1)]"
                        }`}
                      >
                        {ar.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quality Toggle */}
              <div
                className="rounded-2xl p-5 space-y-3"
                style={{
                  border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
                  background: lt ? "#fff" : "rgba(255,255,255,0.02)",
                }}
              >
                <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${lt ? "text-[#5a5a5a]" : "text-white/50"}`}>
                  Quality
                </span>
                <div className="flex gap-2">
                  {(["standard", "pro"] as const).map((q) => {
                    const selected = videoQuality === q;
                    const cost = VIDEO_PRICING[q];
                    return (
                      <button
                        key={q}
                        onClick={() => setVideoQuality(q)}
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
                          {cost} tokens
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!imageB64 || (videoMode === "custom" && !videoCustomPrompt.trim())}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #8b7355, #c4a67d)",
                  boxShadow: "0 4px 16px rgba(196,166,125,0.3), 0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                Generate Video — {tokenCost} tokens
              </button>

              {credits && (
                <p className={`text-center text-[11px] ${lt ? "text-[#0a0a0a]/35" : "text-white/35"}`}>
                  Balance: {credits.token_balance} tokens
                </p>
              )}
            </div>
          </div>
        )}

        {/* Generating state */}
        {videoGenerating && (
          <div
            className="rounded-2xl p-10 md:p-16 text-center space-y-6"
            style={{
              border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
              background: lt ? "#fff" : "rgba(255,255,255,0.02)",
            }}
          >
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-2 border-[rgba(196,166,125,0.2)]" />
              <div className="absolute inset-0 rounded-full border-2 border-[#c4a67d] border-t-transparent animate-spin" />
            </div>
            <div>
              <p className={`text-lg font-semibold ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
                Generating video...
              </p>
              <p className={`text-sm mt-2 ${lt ? "text-[#0a0a0a]/50" : "text-white/50"}`}>
                This may take 1-2 minutes. Please don&apos;t close this page.
              </p>
            </div>
            <div className="max-w-xs mx-auto">
              <div className={`h-1 rounded-full overflow-hidden ${lt ? "bg-[rgba(0,0,0,0.06)]" : "bg-[rgba(255,255,255,0.06)]"}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8b7355] to-[#c4a67d] animate-pulse"
                  style={{ width: "60%" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {videoResult && (
          <div className="space-y-6">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: `1px solid ${lt ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
                background: lt ? "#fff" : "rgba(255,255,255,0.02)",
              }}
            >
              <video
                src={videoResult.video_url}
                controls
                autoPlay
                loop
                className="w-full max-h-[600px] object-contain bg-black"
              />
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${lt ? "text-[#0a0a0a]/50" : "text-white/50"}`}>
                    {videoResult.duration}s
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${lt ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/50" : "bg-[rgba(255,255,255,0.06)] text-white/50"}`}>
                    {VIDEO_MODES.find((m) => m.id === videoResult.mode)?.label || videoResult.mode}
                  </span>
                  <span className={`text-xs ${lt ? "text-[#0a0a0a]/35" : "text-white/35"}`}>
                    {videoResult.tokens_used} tokens used
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={videoResult.video_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white text-center transition-all duration-200 hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #8b7355, #c4a67d)",
                  boxShadow: "0 4px 16px rgba(196,166,125,0.3)",
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Video
                </span>
              </a>
              <button
                onClick={resetAll}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  lt
                    ? "bg-[rgba(0,0,0,0.04)] text-[#0a0a0a]/70 hover:bg-[rgba(0,0,0,0.08)]"
                    : "bg-[rgba(255,255,255,0.06)] text-white/70 hover:bg-[rgba(255,255,255,0.1)]"
                }`}
              >
                Generate Another
              </button>
            </div>
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
}
