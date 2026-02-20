"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { shareToWhatsApp, downloadImage } from "@/lib/share";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";

interface Background {
  id: string;
  label: string;
  type: "scene" | "color";
  color?: string;
  thumb?: string;
}

const PROGRESS_STEPS = [
  { label: "Enhancing lighting…", duration: 4000 },
  { label: "Setting up the background…", duration: 6000 },
  { label: "Correcting shadows…", duration: 12000 },
  { label: "Refining textures…", duration: 8000 },
  { label: "Almost there…", duration: 30000 },
];

export default function StudioPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedBg, setSelectedBg] = useState("studio");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [results, setResults] = useState<{ base64: string; label: string }[]>([]);
  const [error, setError] = useState("");
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

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
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

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
    setGenerating(true); setError(""); setResults([]);
    startProgress();
    try {
      const data = await api.post<{ success: boolean; images: { base64: string; label: string }[]; error?: string }>(
        "/studio/generate",
        { image_base64: imagePreview, background_id: selectedBg, special_instructions: specialInstructions || undefined }
      );
      stopProgress(data.success);
      if (data.success) setResults(data.images.filter(i => i.base64));
      else setError(data.error || "Generation failed");
    } catch (e: unknown) {
      stopProgress(false);
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setGenerating(false); }
  };

  const scenes = backgrounds.filter(b => b.type === "scene");
  const colors = backgrounds.filter(b => b.type === "color");

  return (
    <ResponsiveLayout title="Studio">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Page heading */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Create Studio Image
          </h2>
          <p className="text-[rgba(255,255,255,0.5)] text-sm mt-1">
            Upload your product and select a background to generate a studio-quality photo.
          </p>
        </div>

        {/* Upload area */}
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
            <label className="block p-12 md:p-16 text-center cursor-pointer rounded-[20px] border-2 border-dashed border-[rgba(255,106,0,0.2)] hover:border-[rgba(255,106,0,0.5)] hover:bg-[rgba(255,106,0,0.03)] transition-all duration-300 group">
              <div className="w-16 h-16 mx-auto mb-5 bg-[rgba(255,106,0,0.1)] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white">Upload your product image</p>
              <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1.5">Drag and drop or click to browse</p>
              <p className="text-[10px] text-[rgba(255,255,255,0.25)] mt-3">PNG, JPG up to 10MB</p>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </Card>

        {/* Special Instructions */}
        {imagePreview && (
          <button
            onClick={() => setShowInstructions(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-250"
          >
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span className="text-sm text-[rgba(255,255,255,0.5)]">
                {specialInstructions ? specialInstructions : "Add special instructions"}
              </span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        )}

        {/* Background Selection */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider">
            Choose Background
          </h3>

          {scenes.length > 0 && (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {scenes.map(bg => (
                <button key={bg.id} onClick={() => setSelectedBg(bg.id)} className="flex-shrink-0 text-center group">
                  <div className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-250 ${selectedBg === bg.id ? "border-[#FF6A00] shadow-[0_0_16px_rgba(255,106,0,0.25)] ring-2 ring-[rgba(255,106,0,0.15)]" : "border-[rgba(255,255,255,0.08)] group-hover:border-[rgba(255,255,255,0.14)]"
                    }`}>
                    {bg.thumb ? (
                      <img src={bg.thumb} alt={bg.label} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-[rgba(255,255,255,0.04)] flex items-center justify-center text-xs text-[rgba(255,255,255,0.4)]">
                        {bg.label.slice(0, 3)}
                      </div>
                    )}
                  </div>
                  <p className={`text-xs mt-1.5 truncate w-20 ${selectedBg === bg.id ? "text-[#FF8A3D] font-medium" : "text-[rgba(255,255,255,0.4)]"
                    }`}>{bg.label}</p>
                </button>
              ))}
            </div>
          )}

          {colors.length > 0 && (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {colors.map(bg => (
                <button key={bg.id} onClick={() => setSelectedBg(bg.id)} className="flex-shrink-0 text-center group">
                  <div
                    className={`w-20 h-20 rounded-xl border-2 transition-all duration-250 ${selectedBg === bg.id ? "border-[#FF6A00] shadow-[0_0_16px_rgba(255,106,0,0.25)] ring-2 ring-[rgba(255,106,0,0.15)]" : "border-[rgba(255,255,255,0.08)] group-hover:border-[rgba(255,255,255,0.14)]"
                      }`}
                    style={{ backgroundColor: bg.color || "#ccc" }}
                  />
                  <p className={`text-xs mt-1.5 truncate w-20 ${selectedBg === bg.id ? "text-[#FF8A3D] font-medium" : "text-[rgba(255,255,255,0.4)]"
                    }`}>{bg.label}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#EF4444] px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Generate button */}
        {!generating && (
          <Button onClick={handleGenerate} disabled={!imagePreview} fullWidth size="lg">
            Generate Image
          </Button>
        )}

        {/* AI Processing Overlay */}
        {generating && (
          <div className="ai-overlay">
            <div className="glow-ring mb-8" />
            <h3 className="text-xl font-bold text-white mb-2">Creating Your Photo</h3>
            <p className="text-sm text-[rgba(255,255,255,0.6)] mb-8 min-h-[20px]">{PROGRESS_STEPS[progressStep]?.label}</p>
            <div className="w-64 bg-[rgba(255,255,255,0.06)] rounded-full h-1.5 mb-3 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF8A3D] transition-all duration-1000 ease-out" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-[rgba(255,255,255,0.4)] w-64">
              <span>{progressPct}%</span>
              <span>{elapsedSec}s</span>
            </div>
            <p className="text-xs text-[rgba(255,255,255,0.3)] mt-6">Usually takes 15-30 seconds</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Your Studio Image</h3>
            {results.map((img, i) => (
              <Card key={i} padding="none">
                <img src={`data:image/png;base64,${img.base64}`} alt={img.label} className="w-full rounded-t-[20px]" />
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{img.label}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => shareToWhatsApp(img.base64, `sorapixel-studio-${Date.now()}.png`)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                      Share
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => downloadImage(img.base64, `sorapixel-studio-${Date.now()}.png`)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                      Download
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Special Instructions Sheet */}
      <Modal open={showInstructions} onClose={() => setShowInstructions(false)} title="Special Instructions" sheet>
        <div className="space-y-4">
          <textarea
            value={specialInstructions}
            onChange={e => setSpecialInstructions(e.target.value)}
            placeholder="Write custom settings..."
            maxLength={100}
            className="w-full border border-[rgba(255,255,255,0.08)] rounded-[14px] px-4 py-3 h-28 resize-none outline-none focus:border-[#FF6A00] focus:shadow-[0_0_0_3px_rgba(255,106,0,0.15)] bg-[rgba(255,255,255,0.04)] text-white text-sm transition-all duration-250 placeholder:text-[rgba(255,255,255,0.25)]"
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
