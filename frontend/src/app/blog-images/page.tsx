"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/providers/AppProvider";
import { useTheme } from "@/hooks/useTheme";
import { downloadImage } from "@/lib/share";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";

type Quality = "standard" | "pro";
type AspectRatioId = "square" | "portrait" | "story" | "landscape" | "widescreen";
type SceneStyle = "" | "editorial" | "lifestyle" | "outdoor" | "studio" | "flat_lay" | "seasonal";

const ASPECT_RATIOS: { id: AspectRatioId; label: string; ratio: string; w: number; h: number }[] = [
  { id: "square",     label: "Square",    ratio: "1:1",  w: 1,  h: 1  },
  { id: "portrait",   label: "Portrait",  ratio: "3:4",  w: 3,  h: 4  },
  { id: "story",      label: "Tall",      ratio: "9:16", w: 9,  h: 16 },
  { id: "landscape",  label: "Landscape", ratio: "4:3",  w: 4,  h: 3  },
  { id: "widescreen", label: "Wide",      ratio: "16:9", w: 16, h: 9  },
];

const SCENE_STYLES: { id: SceneStyle; label: string; icon: string }[] = [
  { id: "",          label: "Auto",       icon: "✨" },
  { id: "editorial", label: "Editorial",  icon: "📰" },
  { id: "lifestyle", label: "Lifestyle",  icon: "🏠" },
  { id: "outdoor",   label: "Outdoor",    icon: "🌿" },
  { id: "studio",    label: "Studio",     icon: "📷" },
  { id: "flat_lay",  label: "Flat Lay",   icon: "🎨" },
  { id: "seasonal",  label: "Seasonal",   icon: "🍂" },
];

const TOKEN_COST: Record<Quality, number> = { standard: 5, pro: 20 };

const PROGRESS_STEPS = [
  { label: "Analyzing your product — understanding what it is…", duration: 4000 },
  { label: "Identifying use case, materials & key features…", duration: 4000 },
  { label: "Reading blog content & SEO intent…", duration: 5000 },
  { label: "Matching product to article context…", duration: 3000 },
  { label: "Building image strategy & creative brief…", duration: 4000 },
  { label: "Composing the scene around your product…", duration: 8000 },
  { label: "Rendering photorealistic image…", duration: 15000 },
  { label: "Final touches…", duration: 30000 },
];

interface GenerateResult {
  success: boolean;
  images: { base64: string; mime_type: string; label: string }[];
  credits_remaining: number | null;
}

export default function BlogImagesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const lt = theme === "light";

  const MAX_IMAGES = 5;

  const [blogContent, setBlogContent] = useState("");
  const [images, setImages] = useState<{ b64: string; preview: string }[]>([]);
  const [quality, setQuality] = useState<Quality>("standard");
  const [aspectRatioId, setAspectRatioId] = useState<AspectRatioId>("landscape");
  const [customPrompt, setCustomPrompt] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [includeHuman, setIncludeHuman] = useState(false);
  const [sceneStyle, setSceneStyle] = useState<SceneStyle>("");
  const [generating, setGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedRatio = ASPECT_RATIOS.find((r) => r.id === aspectRatioId) || ASPECT_RATIOS[3];
  const tokenCost = TOKEN_COST[quality];
  const hasImages = images.length > 0;

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) { setError(`Maximum ${MAX_IMAGES} images allowed`); return; }
    const toAdd = arr.slice(0, remaining);

    toAdd.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) { setError("File too large. Max 10MB per image."); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const b64 = res.split(",")[1] || res;
        setImages((prev) => {
          if (prev.length >= MAX_IMAGES) return prev;
          return [...prev, { b64, preview: res }];
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }

  function advanceProgress(step: number) {
    if (step >= PROGRESS_STEPS.length) return;
    setProgressStep(step);
    progressTimer.current = setTimeout(() => advanceProgress(step + 1), PROGRESS_STEPS[step].duration);
  }

  const handleGenerate = useCallback(async () => {
    if (!hasImages || !blogContent.trim() || generating) return;
    setGenerating(true);
    setError("");
    setResult(null);
    setProgressStep(0);
    advanceProgress(0);

    try {
      const data = await api.post<GenerateResult>("/blog-images/generate", {
        images: images.map((img) => img.b64),
        blog_content: blogContent,
        aspect_ratio_id: aspectRatioId,
        custom_prompt: customPrompt || undefined,
        quality,
        include_human: includeHuman,
        scene_style: sceneStyle || undefined,
      });

      if (data.success && data.images.length > 0) {
        setResult(`data:${data.images[0].mime_type};base64,${data.images[0].base64}`);
      } else {
        setError("Generation failed — no image returned");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
    } finally {
      setGenerating(false);
      if (progressTimer.current) clearTimeout(progressTimer.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasImages, images, blogContent, generating, aspectRatioId, customPrompt, quality, includeHuman, sceneStyle]);

  function resetAll() {
    setResult(null);
    setError("");
    setGenerating(false);
    setProgressStep(0);
  }

  function resetFull() {
    resetAll();
    setImages([]);
    setBlogContent("");
    setCustomPrompt("");
    setQuality("standard");
    setAspectRatioId("landscape");
    setIncludeHuman(false);
    setSceneStyle("");
  }

  if (authLoading) {
    return (
      <ResponsiveLayout title="Blog Images">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-[#c4a67d] border-t-transparent rounded-full animate-spin" />
        </div>
      </ResponsiveLayout>
    );
  }

  if (!user) {
    return (
      <ResponsiveLayout title="Blog Images">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className={lt ? "text-[#0a0a0a]/60" : "text-white/60"}>Please sign in to generate blog images.</p>
          <a href="/login" className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white hover:opacity-90 transition-opacity">
            Sign In
          </a>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout title="Blog Images">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className={`text-2xl md:text-3xl font-bold tracking-tight ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
            Blog Image Generator
          </h1>
          <p className={`text-sm mt-1.5 ${lt ? "text-[#0a0a0a]/50" : "text-white/50"}`}>
            Upload your blog content and product images — get perfectly matched visuals
          </p>
        </div>

        {/* Error */}
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

        {/* ─── Result View ─── */}
        {result && (
          <div className="space-y-6">
            <div className="rounded-2xl overflow-hidden border border-[#e8e5df] shadow-lg" style={{ aspectRatio: `${selectedRatio.w}/${selectedRatio.h}`, maxHeight: "600px" }}>
              <img src={result} alt="Generated blog image" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => downloadImage(result, "blog-image.png")}
                className="px-6 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white hover:opacity-90 transition-opacity"
              >
                Download Image
              </button>
              <button
                onClick={resetAll}
                className={`px-6 py-2.5 rounded-xl text-sm font-medium border transition-all ${lt ? "border-[#e8e5df] text-[#4a4a4a] hover:border-[#0a0a0a]" : "border-white/10 text-white/60 hover:border-white/30"}`}
              >
                Generate Another
              </button>
              <button
                onClick={resetFull}
                className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${lt ? "text-[#8c8c8c] hover:text-[#0a0a0a]" : "text-white/30 hover:text-white/60"}`}
              >
                Start Over
              </button>
            </div>

            {/* Create Video CTA */}
            <button
              onClick={() => {
                if (!result) return;
                const b64 = result.includes("base64,") ? result.split("base64,")[1] : "";
                if (b64) sessionStorage.setItem("video_image_b64", b64);
                router.push("/video");
              }}
              className={`flex items-center gap-3 w-full max-w-md mx-auto p-4 rounded-xl transition-all text-left ${
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
                <span className={`text-[11px] ${lt ? "text-[#0a0a0a]/40" : "text-[rgba(255,255,255,0.35)]"}`}>Turn this blog image into a product video</span>
              </div>
            </button>
          </div>
        )}

        {/* ─── Generating State ─── */}
        {generating && (
          <div className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-[rgba(196,166,125,0.15)]" />
              <div className="absolute inset-0 rounded-full border-2 border-[#c4a67d]/60 border-t-transparent animate-spin" />
              <div className="absolute inset-3 rounded-full border-2 border-[rgba(196,166,125,0.15)]" />
              <div className="absolute inset-3 rounded-full border-2 border-[#c4a67d]/60 border-b-transparent animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
            </div>
            <div className="text-center">
              <p className={`text-lg font-semibold ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
                Generating blog image...
              </p>
              <p className={`text-sm mt-2 ${lt ? "text-[#0a0a0a]/50" : "text-white/50"}`}>
                {PROGRESS_STEPS[progressStep]?.label || "Processing..."}
              </p>
            </div>
            <div className="max-w-xs w-full mx-auto">
              <div className={`h-1.5 rounded-full overflow-hidden ${lt ? "bg-[rgba(0,0,0,0.06)]" : "bg-[rgba(255,255,255,0.06)]"}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8b7355] to-[#c4a67d] transition-all duration-1000"
                  style={{ width: `${Math.min(12 + progressStep * 11, 92)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── Input Form ─── */}
        {!generating && !result && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column: Blog content + Image upload */}
            <div className="space-y-5">
              {/* Blog content textarea */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
                  Blog Content
                </label>
                <p className={`text-xs mb-3 ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>
                  Paste your blog text — the AI will generate a product photo that matches the context
                </p>
                <textarea
                  value={blogContent}
                  onChange={(e) => setBlogContent(e.target.value)}
                  placeholder="Paste your blog content here... The AI will analyze the topic, mood, and context to generate a matching product photo."
                  rows={10}
                  className={`w-full rounded-xl px-4 py-3 text-sm resize-y transition-all duration-200 ${
                    lt
                      ? "bg-white border border-[#e8e5df] text-[#0a0a0a] placeholder:text-[#0a0a0a]/30 focus:border-[#c4a67d] focus:ring-1 focus:ring-[#c4a67d]/20"
                      : "bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#c4a67d] focus:ring-1 focus:ring-[#c4a67d]/20"
                  }`}
                />
                <p className={`text-[10px] mt-1.5 ${lt ? "text-[#0a0a0a]/25" : "text-white/25"}`}>
                  {blogContent.length} characters
                </p>
              </div>

              {/* Product images upload (multi) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`block text-sm font-semibold ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
                    Product Images
                  </label>
                  <span className={`text-[11px] ${lt ? "text-[#0a0a0a]/30" : "text-white/30"}`}>
                    {images.length}/{MAX_IMAGES}
                  </span>
                </div>

                {/* Thumbnails grid */}
                {images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                    {images.map((img, idx) => (
                      <div key={idx} className={`relative rounded-lg overflow-hidden border aspect-square group ${lt ? "border-[#e8e5df]" : "border-white/10"}`}>
                        <img src={img.preview} alt={`Product ${idx + 1}`} className="w-full h-full object-contain" style={{ background: lt ? "#fafaf8" : "#111" }} />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}

                    {/* Add more button (inline) */}
                    {images.length < MAX_IMAGES && (
                      <label className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed aspect-square cursor-pointer transition-all ${
                        lt
                          ? "border-[rgba(0,0,0,0.1)] hover:border-[#c4a67d]/40 hover:bg-[rgba(196,166,125,0.02)]"
                          : "border-[rgba(255,255,255,0.1)] hover:border-[#c4a67d]/40 hover:bg-[rgba(196,166,125,0.03)]"
                      }`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span className="text-[9px] font-medium text-[#c4a67d]/60 mt-1">Add</span>
                        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                )}

                {/* Empty state upload zone */}
                {images.length === 0 && (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <label
                      className={`block p-8 text-center cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 group ${
                        dragOver
                          ? "border-[#c4a67d] bg-[rgba(196,166,125,0.06)]"
                          : lt
                            ? "border-[rgba(0,0,0,0.12)] hover:border-[rgba(196,166,125,0.4)] hover:bg-[rgba(196,166,125,0.02)]"
                            : "border-[rgba(196,166,125,0.2)] hover:border-[rgba(196,166,125,0.5)] hover:bg-[rgba(196,166,125,0.03)]"
                      }`}
                    >
                      <div className="w-12 h-12 mx-auto mb-3 bg-[rgba(196,166,125,0.1)] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </div>
                      <p className={`text-sm font-semibold ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
                        Upload product images
                      </p>
                      <p className={`text-xs mt-1 ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>
                        Drag and drop or click — up to {MAX_IMAGES} images
                      </p>
                      <p className={`text-[10px] mt-2 ${lt ? "text-[#0a0a0a]/25" : "text-white/25"}`}>
                        PNG, JPG up to 10MB each
                      </p>
                      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Right column: Settings + Generate */}
            <div className="space-y-5">
              {/* Aspect Ratio */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {ASPECT_RATIOS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setAspectRatioId(r.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                        aspectRatioId === r.id
                          ? lt
                            ? "border-[#c4a67d] bg-[rgba(196,166,125,0.06)]"
                            : "border-[#c4a67d] bg-[rgba(196,166,125,0.08)]"
                          : lt
                            ? "border-[#e8e5df] hover:border-[#c4a67d]/40"
                            : "border-white/[0.08] hover:border-white/20"
                      }`}
                    >
                      <div
                        className={`rounded border ${aspectRatioId === r.id ? "border-[#c4a67d]" : lt ? "border-[#ccc]" : "border-white/20"}`}
                        style={{ width: `${Math.min(r.w / Math.max(r.w, r.h) * 28, 28)}px`, height: `${Math.min(r.h / Math.max(r.w, r.h) * 28, 28)}px` }}
                      />
                      <span className={`text-[10px] font-medium ${aspectRatioId === r.id ? "text-[#c4a67d]" : lt ? "text-[#8c8c8c]" : "text-white/50"}`}>
                        {r.ratio}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scene Style */}
              <div>
                <label className={`block text-sm font-semibold mb-2 ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
                  Scene Style
                </label>
                <p className={`text-xs mb-3 ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>
                  Choose how the product is presented in the scene
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {SCENE_STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSceneStyle(s.id)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all duration-200 ${
                        sceneStyle === s.id
                          ? lt
                            ? "border-[#c4a67d] bg-[rgba(196,166,125,0.06)]"
                            : "border-[#c4a67d] bg-[rgba(196,166,125,0.08)]"
                          : lt
                            ? "border-[#e8e5df] hover:border-[#c4a67d]/40"
                            : "border-white/[0.08] hover:border-white/20"
                      }`}
                    >
                      <span className="text-base">{s.icon}</span>
                      <span className={`text-[10px] font-medium leading-tight ${sceneStyle === s.id ? "text-[#c4a67d]" : lt ? "text-[#8c8c8c]" : "text-white/50"}`}>
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Include Human Toggle */}
              <div
                onClick={() => setIncludeHuman(!includeHuman)}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                  includeHuman
                    ? lt
                      ? "border-[#c4a67d] bg-[rgba(196,166,125,0.06)]"
                      : "border-[#c4a67d] bg-[rgba(196,166,125,0.08)]"
                    : lt
                      ? "border-[#e8e5df] hover:border-[#c4a67d]/40"
                      : "border-white/[0.08] hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    includeHuman ? "bg-[rgba(196,166,125,0.15)]" : lt ? "bg-[#f5f0e8]" : "bg-white/[0.06]"
                  }`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={includeHuman ? "#c4a67d" : lt ? "#8c8c8c" : "rgba(255,255,255,0.4)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <span className={`text-sm font-semibold block ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
                      Include Human Model
                    </span>
                    <span className={`text-[11px] ${lt ? "text-[#8c8c8c]" : "text-white/40"}`}>
                      Add a person naturally interacting with the product
                    </span>
                  </div>
                </div>
                <div className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ${
                  includeHuman ? "bg-[#c4a67d]" : lt ? "bg-[#d4d4d4]" : "bg-white/20"
                }`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    includeHuman ? "translate-x-5" : "translate-x-0"
                  }`} />
                </div>
              </div>

              {/* Quality */}
              <div>
                <label className={`block text-sm font-semibold mb-3 ${lt ? "text-[#0a0a0a]" : "text-white"}`}>
                  Quality
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["standard", "pro"] as Quality[]).map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                        quality === q
                          ? lt
                            ? "border-[#c4a67d] bg-[rgba(196,166,125,0.06)]"
                            : "border-[#c4a67d] bg-[rgba(196,166,125,0.08)]"
                          : lt
                            ? "border-[#e8e5df] hover:border-[#c4a67d]/40"
                            : "border-white/[0.08] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-semibold capitalize ${lt ? "text-[#0a0a0a]" : "text-white"}`}>{q}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          q === "pro"
                            ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white"
                            : lt ? "bg-[#f0f0ee] text-[#4a4a4a]" : "bg-white/[0.06] text-white/50"
                        }`}>
                          {TOKEN_COST[q]} tokens
                        </span>
                      </div>
                      <p className={`text-[11px] ${lt ? "text-[#8c8c8c]" : "text-white/40"}`}>
                        {q === "pro" ? "Highest quality, best detail" : "Fast, great for drafts"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt */}
              <div>
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${lt ? "text-[#8b7355] hover:text-[#6a5740]" : "text-[#c4a67d] hover:text-[#e8d5b5]"}`}
                >
                  <svg className={`w-4 h-4 transition-transform duration-200 ${showPrompt ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  Custom Prompt (optional)
                </button>
                {showPrompt && (
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Add extra instructions to guide the AI... e.g. 'outdoor setting with warm sunset lighting' or 'minimalist white background with soft shadows'"
                    rows={4}
                    className={`w-full mt-3 rounded-xl px-4 py-3 text-sm resize-y transition-all duration-200 ${
                      lt
                        ? "bg-white border border-[#e8e5df] text-[#0a0a0a] placeholder:text-[#0a0a0a]/30 focus:border-[#c4a67d] focus:ring-1 focus:ring-[#c4a67d]/20"
                        : "bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#c4a67d] focus:ring-1 focus:ring-[#c4a67d]/20"
                    }`}
                  />
                )}
              </div>

              {/* Generate Button */}
              <div className="pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={!hasImages || !blogContent.trim() || generating}
                  className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                    hasImages && blogContent.trim()
                      ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white hover:shadow-[0_6px_24px_rgba(196,166,125,0.35)] active:scale-[0.98]"
                      : lt
                        ? "bg-[#e8e5df] text-[#8c8c8c] cursor-not-allowed"
                        : "bg-white/[0.06] text-white/30 cursor-not-allowed"
                  }`}
                >
                  Generate Blog Image · {tokenCost} tokens
                </button>
                {(!hasImages || !blogContent.trim()) && (
                  <p className={`text-[11px] mt-2 text-center ${lt ? "text-[#8c8c8c]" : "text-white/30"}`}>
                    {!blogContent.trim() && !hasImages
                      ? "Add blog content and upload product images to continue"
                      : !blogContent.trim()
                        ? "Add blog content to continue"
                        : "Upload at least one product image to continue"}
                  </p>
                )}
              </div>

              {/* Info box */}
              <div className={`rounded-xl p-4 ${lt ? "bg-[#fafaf8] border border-[#e8e5df]" : "bg-white/[0.02] border border-white/[0.06]"}`}>
                <h4 className={`text-xs font-semibold mb-2 ${lt ? "text-[#0a0a0a]" : "text-white/80"}`}>How it works</h4>
                <div className="space-y-2">
                  {[
                    "Upload product images — AI identifies what they are & how they're used",
                    "Paste your blog text — AI reads the topic, SEO intent & target reader",
                    "AI matches product use-case to article context for the right scene",
                    "Only YOUR products appear — placed in a semantically correct setting",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`text-[10px] font-bold mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${lt ? "bg-[#f5f0e8] text-[#8b7355]" : "bg-[rgba(196,166,125,0.1)] text-[#c4a67d]"}`}>
                        {i + 1}
                      </span>
                      <span className={`text-[12px] leading-relaxed ${lt ? "text-[#8c8c8c]" : "text-white/40"}`}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
}
