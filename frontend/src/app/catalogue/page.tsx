"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { shareToWhatsApp, downloadImage } from "@/lib/share";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";

interface ModelOption { id: string; name: string; thumb: string; }
interface PoseOption { id: string; label: string; thumb: string; }
interface BackgroundOption { id: string; label: string; thumb: string; }

const MAX_POSES = 4;

const PROGRESS_STEPS = [
  { label: "Analyzing your product…", duration: 4000 },
  { label: "Selecting the best model pose…", duration: 6000 },
  { label: "Generating catalogue image…", duration: 15000 },
  { label: "Applying finishing touches…", duration: 10000 },
  { label: "Almost there…", duration: 30000 },
];

export default function CataloguePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read pre-selection from URL query params (from feed "Try This Style")
  const paramModel = searchParams.get("model");
  const paramBg = searchParams.get("bg");
  const paramPoses = searchParams.get("poses");

  const [models, setModels] = useState<ModelOption[]>([]);
  const [poses, setPoses] = useState<PoseOption[]>([]);
  const [backgrounds, setBackgrounds] = useState<BackgroundOption[]>([]);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(paramModel || "indian_woman");
  const [selectedPoses, setSelectedPoses] = useState<string[]>(
    paramPoses ? paramPoses.split(",").filter(Boolean) : ["standing", "side_view", "back_view", "sitting"]
  );
  const [selectedBg, setSelectedBg] = useState(paramBg || "best_match");
  const [keyHighlights, setKeyHighlights] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [addBranding, setAddBranding] = useState(false);

  const [showPreferences, setShowPreferences] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [results, setResults] = useState<{ base64: string; label: string }[]>([]);
  const [activeResult, setActiveResult] = useState(0);
  const [error, setError] = useState("");
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (!loaded.current) { loaded.current = true; loadOptions(); }
  }, [authLoading, user, router]);

  async function loadOptions() {
    try {
      const [m, p, b] = await Promise.all([
        api.get<{ models: ModelOption[] }>("/catalogue/models"),
        api.get<{ poses: PoseOption[] }>("/catalogue/poses"),
        api.get<{ backgrounds: BackgroundOption[] }>("/catalogue/backgrounds"),
      ]);
      setModels(m.models);
      setPoses(p.poses);
      setBackgrounds(b.backgrounds);
    } catch { /* silent */ }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const togglePose = (poseId: string) => {
    setSelectedPoses(prev => {
      if (prev.includes(poseId)) return prev.filter(p => p !== poseId);
      if (prev.length >= MAX_POSES) return prev;
      return [...prev, poseId];
    });
  };

  const startProgress = () => {
    setProgressStep(0); setProgressPct(0); setElapsedSec(0);
    let step = 0;
    const advance = () => { step++; if (step < PROGRESS_STEPS.length) { setProgressStep(step); stepTimer.current = setTimeout(advance, PROGRESS_STEPS[step].duration); } };
    stepTimer.current = setTimeout(advance, PROGRESS_STEPS[0].duration);
    let pct = 0; let sec = 0;
    progressTimer.current = setInterval(() => { sec++; setElapsedSec(sec); pct = Math.min(95, pct + (95 - pct) * 0.03); setProgressPct(Math.round(pct)); }, 1000);
  };

  const stopProgress = (success: boolean) => {
    if (stepTimer.current) clearTimeout(stepTimer.current);
    if (progressTimer.current) clearInterval(progressTimer.current);
    if (success) setProgressPct(100);
  };

  const handleGenerate = async () => {
    if (!imagePreview || selectedPoses.length === 0) return;
    setGenerating(true); setError(""); setResults([]);
    setActiveResult(0);
    startProgress();
    try {
      const data = await api.post<{ success: boolean; images: { base64: string; label: string }[]; error?: string }>(
        "/catalogue/generate",
        {
          image_base64: imagePreview,
          model_type: selectedModel,
          poses: selectedPoses,
          background: selectedBg,
          special_instructions: specialInstructions || undefined,
          key_highlights: keyHighlights || undefined,
          add_logo: addBranding,
        }
      );
      stopProgress(data.success);
      if (data.success) {
        setResults(data.images.filter(i => i.base64));
        setActiveResult(0);
      } else setError(data.error || "Generation failed");
    } catch (e: unknown) {
      stopProgress(false);
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setGenerating(false); }
  };

  const handleNewImage = () => {
    setImagePreview(null); setResults([]); setError("");
  };

  const totalCredits = selectedPoses.length;
  const active = results[activeResult] || results[0];

  return (
    <ResponsiveLayout title="Catalogue">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Page heading */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Create UGC
            </h2>
            <p className="text-[rgba(255,255,255,0.5)] text-sm mt-1">
              Place your product on an AI model for catalogue-style photos.
            </p>
          </div>
          {results.length > 0 && (
            <button onClick={handleNewImage} className="text-[#FF8A3D] text-sm font-semibold whitespace-nowrap">
              + New Image
            </button>
          )}
        </div>

        {/* Results view */}
        {results.length > 0 ? (
          <div className="space-y-6">
            <p className="text-sm font-medium text-white">All Images Processed</p>

            {/* Thumbnail strip */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {results.map((img, i) => (
                <button key={i} onClick={() => setActiveResult(i)}
                  className={`flex-shrink-0 w-16 h-20 rounded-xl overflow-hidden border-2 transition-all duration-250 ${activeResult === i ? "border-[#FF6A00] shadow-[0_0_16px_rgba(255,106,0,0.25)] ring-2 ring-[rgba(255,106,0,0.15)]" : "border-[rgba(255,255,255,0.08)]"
                    }`}>
                  <img src={`data:image/png;base64,${img.base64}`} alt={img.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Large preview */}
            {active && (
              <Card padding="none">
                <img src={`data:image/png;base64,${active.base64}`} alt={active.label} className="w-full rounded-t-[20px]" />
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{active.label}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => shareToWhatsApp(active.base64, `sorapixel-catalogue-${Date.now()}.png`)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                      Share
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => downloadImage(active.base64, `sorapixel-catalogue-${Date.now()}.png`)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                      Download
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <>
            {/* Upload area */}
            <Card padding="none">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Product" className="w-full max-h-80 object-contain rounded-[20px] bg-[rgba(255,255,255,0.04)]" />
                  <button
                    onClick={handleNewImage}
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
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-white">Upload an Image</p>
                  <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1.5">Drag and drop or click to browse</p>
                  <p className="text-[10px] text-[rgba(255,255,255,0.25)] mt-3">PNG, JPG up to 10MB</p>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </Card>

            {imagePreview && (
              <>
                {/* Catalogue settings button */}
                <button
                  onClick={() => setShowPreferences(true)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)] hover:bg-[rgba(255,255,255,0.04)] transition-all duration-250"
                >
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                    <span className="text-sm text-[rgba(255,255,255,0.5)]">Catalogue (Uses {totalCredits} Credits)</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>

                {/* Choose Model */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider">Choose Model</h3>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {models.map(m => (
                      <button key={m.id} onClick={() => setSelectedModel(m.id)} className="flex-shrink-0 text-center group">
                        <div className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-250 ${selectedModel === m.id ? "border-[#FF6A00] shadow-[0_0_16px_rgba(255,106,0,0.25)] ring-2 ring-[rgba(255,106,0,0.15)]" : "border-[rgba(255,255,255,0.08)] group-hover:border-[rgba(255,255,255,0.14)]"
                          }`}>
                          <img src={m.thumb} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <p className={`text-xs mt-1.5 w-20 truncate ${selectedModel === m.id ? "text-[#FF8A3D] font-medium" : "text-[rgba(255,255,255,0.4)]"
                          }`}>{m.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#EF4444] px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                {/* Generate */}
                {!generating && (
                  <Button onClick={handleGenerate} disabled={!imagePreview || selectedPoses.length === 0} fullWidth size="lg">
                    Create Catalogue
                  </Button>
                )}
              </>
            )}
          </>
        )}

        {/* AI Processing overlay */}
        {generating && (
          <div className="ai-overlay">
            <div className="glow-ring mb-8" />
            <h3 className="text-xl font-bold text-white mb-2">Creating Your Catalogue</h3>
            <p className="text-sm text-[rgba(255,255,255,0.5)] mb-1">Generating {selectedPoses.length} images</p>
            <p className="text-sm text-[rgba(255,255,255,0.6)] mb-8 min-h-[20px]">{PROGRESS_STEPS[progressStep]?.label}</p>
            <div className="w-64 bg-[rgba(255,255,255,0.06)] rounded-full h-1.5 mb-3 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#FF6A00] to-[#FF8A3D] transition-all duration-1000 ease-out" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-[rgba(255,255,255,0.4)] w-64">
              <span>{progressPct}%</span><span>{elapsedSec}s</span>
            </div>
            <p className="text-xs text-[rgba(255,255,255,0.3)] mt-6">Usually takes 30-60 seconds</p>
          </div>
        )}
      </div>

      {/* Catalogue Preferences Sheet */}
      <Modal open={showPreferences} onClose={() => setShowPreferences(false)} title={`Catalogue - Select any ${MAX_POSES}`} sheet>
        <div className="space-y-6">
          {/* Model Views */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-white">Model Views</h4>
              <span className="text-xs text-[#FF8A3D] font-medium">See All</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {poses.map(p => {
                const isSelected = selectedPoses.includes(p.id);
                return (
                  <button key={p.id} onClick={() => togglePose(p.id)} className="text-center group">
                    <div className={`relative rounded-xl overflow-hidden border-2 aspect-[3/4] transition-all duration-250 ${isSelected ? "border-[#FF6A00] shadow-[0_0_16px_rgba(255,106,0,0.25)]" : "border-[rgba(255,255,255,0.08)] group-hover:border-[rgba(255,255,255,0.14)]"
                      }`}>
                      <img src={p.thumb} alt={p.label} className="w-full h-full object-cover" loading="lazy" />
                      {isSelected && (
                        <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-[#FF6A00] rounded-full flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                      )}
                    </div>
                    <p className={`text-xs mt-1.5 ${isSelected ? "text-[#FF8A3D] font-semibold" : "text-[rgba(255,255,255,0.4)]"}`}>{p.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Studio Views */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Studio Views</h4>
            <div className="grid grid-cols-3 gap-3">
              {[{ id: "product_view", label: "Product View" }, { id: "magic_studio", label: "Magic Studio" }].map(v => (
                <div key={v.id} className="text-center">
                  <div className="rounded-xl bg-[rgba(255,255,255,0.04)] aspect-[3/4] flex items-center justify-center border-2 border-[rgba(255,255,255,0.08)]">
                    <span className="text-[rgba(255,255,255,0.3)] text-xs">{v.label}</span>
                  </div>
                  <p className="text-xs mt-1.5 text-[rgba(255,255,255,0.4)]">{v.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Highlights */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Key Highlights</h4>
            <div className="flex gap-3">
              <button onClick={() => setShowHighlights(true)}
                className="flex-1 rounded-xl bg-[rgba(255,255,255,0.04)] p-3 text-left border-2 border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)] transition-colors">
                <p className="text-xs font-medium text-white">With Model</p>
                <p className="text-[10px] text-[rgba(255,255,255,0.4)] mt-0.5 truncate">{keyHighlights || "Tap to add"}</p>
              </button>
              <div className="flex-1 rounded-xl bg-[rgba(255,255,255,0.04)] p-3 text-left border-2 border-[rgba(255,255,255,0.08)] opacity-50">
                <p className="text-xs font-medium text-white">Without Model</p>
                <p className="text-[10px] text-[rgba(255,255,255,0.4)] mt-0.5">Coming soon</p>
              </div>
            </div>
            <p className="text-xs text-[#FF8A3D] font-medium mt-2 text-center">Select {MAX_POSES} poses</p>
          </div>

          {/* Background */}
          <div>
            <h4 className="text-xs font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-3">Background</h4>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {backgrounds.map(bg => (
                <button key={bg.id} onClick={() => setSelectedBg(bg.id)} className="flex-shrink-0 text-center group">
                  <div className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-250 ${selectedBg === bg.id ? "border-[#FF6A00] shadow-[0_0_16px_rgba(255,106,0,0.25)] ring-2 ring-[rgba(255,106,0,0.15)]" : "border-[rgba(255,255,255,0.08)] group-hover:border-[rgba(255,255,255,0.14)]"
                    }`}>
                    <img src={bg.thumb} alt={bg.label} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <p className={`text-xs mt-1.5 w-20 truncate ${selectedBg === bg.id ? "text-[#FF8A3D] font-medium" : "text-[rgba(255,255,255,0.4)]"
                    }`}>{bg.id === "best_match" ? "Best Match" : bg.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Branding toggle */}
          <div className="flex items-center justify-between py-3 border-t border-b border-[rgba(255,255,255,0.06)]">
            <div>
              <p className="text-sm font-medium text-white">Add Branding</p>
              <p className="text-xs text-[rgba(255,255,255,0.4)]">Logo, name & contact on image</p>
            </div>
            <button
              onClick={() => setAddBranding(!addBranding)}
              className={`w-11 h-6 rounded-full transition-colors duration-250 ${addBranding ? "bg-[#FF6A00]" : "bg-[rgba(255,255,255,0.1)]"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-250 ${addBranding ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          {addBranding && user?.company_name && (
            <div className="bg-[rgba(255,255,255,0.04)] rounded-xl p-3 flex items-center gap-3">
              {user.business_logo_url ? (
                <img src={user.business_logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-[rgba(255,255,255,0.08)]" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[rgba(255,106,0,0.1)] flex items-center justify-center text-[#FF8A3D] font-bold text-sm">
                  {user.company_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.company_name}</p>
                <p className="text-xs text-[rgba(255,255,255,0.4)] truncate">
                  {[user.phone, user.business_website].filter(Boolean).join(" | ") || "Add details in Profile"}
                </p>
              </div>
              <button onClick={() => router.push("/profile")} className="text-xs text-[#FF8A3D] font-medium whitespace-nowrap">Edit</button>
            </div>
          )}

          <Button onClick={() => setShowPreferences(false)} fullWidth>
            Save Preference
          </Button>
        </div>
      </Modal>

      {/* Key Highlights Sheet */}
      <Modal open={showHighlights} onClose={() => setShowHighlights(false)} title="Key Highlights - With Model" sheet>
        <div className="space-y-4">
          <div>
            <textarea
              value={keyHighlights}
              onChange={e => setKeyHighlights(e.target.value)}
              placeholder="Write Key Highlights"
              className="w-full border border-[rgba(255,255,255,0.08)] rounded-[14px] px-4 py-3 h-28 resize-none outline-none focus:border-[#FF6A00] focus:shadow-[0_0_0_3px_rgba(255,106,0,0.15)] bg-[rgba(255,255,255,0.04)] text-white text-sm transition-all duration-250 placeholder:text-[rgba(255,255,255,0.25)]"
            />
            <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">({keyHighlights.split(/\s+/).filter(Boolean).length}/10 words)</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm text-[rgba(255,255,255,0.5)]"><span className="font-medium text-white">Example 1:</span> Natural Ingredients, Gentle Formula.</p>
            <p className="text-sm text-[rgba(255,255,255,0.5)]"><span className="font-medium text-white">Example 2:</span> Lightweight Design, Secure Lock, Easy</p>
          </div>
          <Button onClick={() => setShowHighlights(false)} fullWidth>
            Save
          </Button>
        </div>
      </Modal>
    </ResponsiveLayout>
  );
}
