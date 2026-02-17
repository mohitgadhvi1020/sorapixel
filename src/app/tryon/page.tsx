"use client";

import { useState, useCallback, useRef } from "react";
import PasswordGate from "@/components/password-gate";
import AspectRatioSelector from "@/components/aspect-ratio-selector";
import { safeFetch } from "@/lib/safe-fetch";

type JewelryType = "necklace" | "earring" | "bracelet" | "ring";

const JEWELRY_TYPES: { id: JewelryType; label: string; icon: string }[] = [
  { id: "necklace", label: "Necklace", icon: "💎" },
  { id: "earring", label: "Earring", icon: "✨" },
  { id: "bracelet", label: "Bracelet", icon: "⭕" },
  { id: "ring", label: "Ring", icon: "💍" },
];

export default function TryOnPage() {
  const [jewelryBase64, setJewelryBase64] = useState<string | null>(null);
  const [personBase64, setPersonBase64] = useState<string | null>(null);
  const [jewelryType, setJewelryType] = useState<JewelryType>("necklace");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("square");

  const handleFileUpload = useCallback(
    (setter: (val: string) => void) => (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => setter(e.target?.result as string);
      reader.readAsDataURL(file);
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    if (!jewelryBase64 || !personBase64) return;
    setIsGenerating(true);
    setError(null);
    setResultImage(null);
    try {
      const data = await safeFetch<{ success: boolean; image?: { base64: string; mimeType: string }; error?: string }>("/api/generate-tryon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jewelryBase64, personBase64, jewelryType, aspectRatioId: aspectRatio }),
      });
      if (!data.success || !data.image) throw new Error(data.error || "Generation failed");
      setResultImage(`data:${data.image.mimeType};base64,${data.image.base64}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  }, [jewelryBase64, personBase64, jewelryType]);

  const handleDownload = useCallback(() => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = `sorapixel-tryon-${jewelryType}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [resultImage, jewelryType]);

  const handleReset = useCallback(() => {
    setJewelryBase64(null);
    setPersonBase64(null);
    setResultImage(null);
    setError(null);
    setJewelryType("necklace");
  }, []);

  return (
    <PasswordGate>
      <div className="min-h-screen bg-[#f7f7f5]">
        {/* Header */}
        <header className="glass border-b border-[#e8e5df] sticky top-0 z-50">
          <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-3 md:py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-full bg-[#0a0a0a] flex items-center justify-center">
                <span className="text-white text-xs font-bold">SP</span>
              </div>
              <span className="font-display font-bold text-[15px] tracking-tight text-[#0a0a0a] hidden sm:block">
                SoraPixel
              </span>
            </a>
            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href="/jewelry"
                className="px-3 py-2 text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200"
              >
                Jewelry
              </a>
              {(jewelryBase64 || resultImage) && (
                <button
                  onClick={handleReset}
                  className="px-3 py-2 text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200"
                >
                  Start over
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-6 sm:py-10">
          {/* Page title */}
          <div className="text-center mb-8 sm:mb-10 animate-slide-up">
            <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
              Virtual Try-On
            </span>
            <h1 className="font-display font-bold text-[#0a0a0a] text-2xl sm:text-3xl uppercase tracking-[-0.02em]">
              See It On You
            </h1>
            <p className="text-sm sm:text-base text-[#8c8c8c] mt-2 max-w-md mx-auto">
              Upload your jewelry and a photo — AI will generate a realistic try-on image
            </p>
          </div>

          {/* ---- RESULT VIEW ---- */}
          {resultImage && (
            <div className="space-y-6 sm:space-y-8 animate-fade-in">
              {/* Result image */}
              <div className="max-w-lg mx-auto">
                <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-[#e8e5df] shadow-sm bg-white">
                  <img
                    src={resultImage}
                    alt="Virtual try-on result"
                    className="w-full aspect-square object-cover"
                  />
                </div>
              </div>

              {/* Original images for reference */}
              <div className="flex justify-center gap-4 sm:gap-6">
                {jewelryBase64 && (
                  <div className="text-center">
                    <p className="text-[10px] sm:text-xs font-medium text-[#8c8c8c] mb-1.5">Jewelry</p>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-[#e8e5df] bg-white">
                      <img src={jewelryBase64} alt="Jewelry" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
                {personBase64 && (
                  <div className="text-center">
                    <p className="text-[10px] sm:text-xs font-medium text-[#8c8c8c] mb-1.5">Your Photo</p>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-[#e8e5df] bg-white">
                      <img src={personBase64} alt="Person" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3">
                <button
                  onClick={handleDownload}
                  className="px-7 py-3.5 bg-[#0a0a0a] text-white rounded-full text-[14px] font-semibold hover:bg-[#1a1a1a] transition-all duration-200 active:scale-[0.97] text-center"
                >
                  Download Image
                </button>
                <button
                  onClick={() => { setResultImage(null); setError(null); }}
                  className="px-7 py-3.5 bg-white text-[#4a4a4a] rounded-full text-[14px] font-medium border border-[#e8e5df] hover:bg-[#f5f0e8] hover:border-[#c4a67d] transition-all duration-200 active:scale-[0.97] text-center"
                >
                  Try Again
                </button>
                <button
                  onClick={handleReset}
                  className="px-5 py-3 text-[#8c8c8c] text-[13px] font-medium hover:text-[#0a0a0a] transition-colors duration-200 text-center"
                >
                  New Try-On
                </button>
              </div>
            </div>
          )}

          {/* ---- GENERATING ---- */}
          {isGenerating && (
            <div className="text-center py-16 sm:py-24 animate-fade-in">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#f5f0e8] mb-5 sm:mb-6">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#8b7355] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1b1b1f] tracking-tight">
                Creating your try-on
              </h2>
              <p className="text-[#8c8c8c] text-sm sm:text-base mt-2">
                AI is placing the jewelry on your photo
              </p>
              <div className="mt-5 sm:mt-6 w-40 sm:w-48 h-1.5 mx-auto rounded-full overflow-hidden bg-[#e8e5df]">
                <div className="h-full rounded-full animate-shimmer" />
              </div>
              <p className="text-[#b0b0b0] text-xs sm:text-sm mt-3 sm:mt-4">This takes 15-30 seconds</p>
            </div>
          )}

          {/* ---- UPLOAD FLOW ---- */}
          {!resultImage && !isGenerating && (
            <div className="space-y-8 sm:space-y-10">
              {/* Step 1: Jewelry Image */}
              <section className="space-y-3 sm:space-y-4 animate-slide-up">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-[#8b7355] tracking-widest uppercase mb-1.5 sm:mb-2">
                    <span className="w-5 h-5 rounded-full bg-[#f5f0e8] flex items-center justify-center text-[10px] font-bold">1</span>
                    Jewelry
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#1b1b1f]">
                    {jewelryBase64 ? "Jewelry uploaded" : "Upload your jewelry"}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#8c8c8c] mt-0.5 sm:mt-1">
                    A clear photo of the jewelry piece
                  </p>
                </div>
                {jewelryBase64 ? (
                  <div className="flex items-start gap-3 sm:gap-4 animate-scale-in">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden border border-[#e8e5df] bg-white shadow-sm flex-shrink-0">
                      <img src={jewelryBase64} alt="Jewelry" className="w-full h-full object-contain" />
                    </div>
                    <button
                      onClick={() => setJewelryBase64(null)}
                      className="text-xs sm:text-sm text-[#8c8c8c] hover:text-[#1b1b1f] mt-1 transition-colors duration-300"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <ImageUploadBox
                    onFile={handleFileUpload(setJewelryBase64)}
                    label="Drop jewelry image here"
                    mobileLabel="Tap to upload jewelry"
                  />
                )}
              </section>

              {/* Step 2: Jewelry Type */}
              {jewelryBase64 && (
                <section className="space-y-3 sm:space-y-4 animate-slide-up" style={{ animationDelay: "50ms" }}>
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs font-bold text-[#8b7355] tracking-widest uppercase mb-1.5 sm:mb-2">
                      <span className="w-5 h-5 rounded-full bg-[#f5f0e8] flex items-center justify-center text-[10px] font-bold">2</span>
                      Type
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#1b1b1f]">What type of jewelry?</h2>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {JEWELRY_TYPES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setJewelryType(t.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-medium transition-all duration-200 active:scale-[0.97] ${
                          jewelryType === t.id
                            ? "bg-[#0a0a0a] text-white shadow-sm"
                            : "bg-white border border-[#e8e5df] text-[#4a4a4a] hover:border-[#c4a67d] hover:text-[#0a0a0a]"
                        }`}
                      >
                        <span className="text-base">{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Step 3: Person Photo */}
              {jewelryBase64 && (
                <section className="space-y-3 sm:space-y-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs font-bold text-[#8b7355] tracking-widest uppercase mb-1.5 sm:mb-2">
                      <span className="w-5 h-5 rounded-full bg-[#f5f0e8] flex items-center justify-center text-[10px] font-bold">3</span>
                      Your Photo
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#1b1b1f]">
                      {personBase64 ? "Photo uploaded" : "Upload your photo"}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#8c8c8c] mt-0.5 sm:mt-1">
                      A clear photo showing your face and the area where the jewelry will go
                    </p>
                  </div>
                  {personBase64 ? (
                    <div className="flex items-start gap-3 sm:gap-4 animate-scale-in">
                      <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden border border-[#e8e5df] bg-white shadow-sm flex-shrink-0">
                        <img src={personBase64} alt="Person" className="w-full h-full object-cover" />
                      </div>
                      <button
                        onClick={() => setPersonBase64(null)}
                        className="text-xs sm:text-sm text-[#8c8c8c] hover:text-[#1b1b1f] mt-1 transition-colors duration-300"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <ImageUploadBox
                      onFile={handleFileUpload(setPersonBase64)}
                      label="Drop your photo here"
                      mobileLabel="Tap to upload your photo"
                      showCamera
                    />
                  )}
                </section>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-slide-up-sm">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* Aspect Ratio */}
              {jewelryBase64 && personBase64 && (
                <section className="space-y-3 animate-slide-up" style={{ animationDelay: "120ms" }}>
                  <div>
                    <h3 className="text-sm font-semibold text-[#1b1b1f] mb-1">Aspect Ratio</h3>
                    <p className="text-xs text-[#8c8c8c]">Choose a format for your target platform</p>
                  </div>
                  <AspectRatioSelector selectedId={aspectRatio} onSelect={setAspectRatio} />
                </section>
              )}

              {/* Generate */}
              {jewelryBase64 && personBase64 && (
                <div className="flex justify-center pt-2 sm:pt-4 animate-slide-up" style={{ animationDelay: "150ms" }}>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full sm:w-auto px-10 py-3.5 sm:py-4 bg-[#0a0a0a] text-white rounded-full font-semibold text-[15px] sm:text-base hover:bg-[#1a1a1a] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 text-center"
                  >
                    Generate Try-On
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </PasswordGate>
  );
}

/* Reusable image upload box */
function ImageUploadBox({
  onFile,
  label,
  mobileLabel,
  showCamera,
}: {
  onFile: (file: File) => void;
  label: string;
  mobileLabel: string;
  showCamera?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="space-y-3">
      <div
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) onFile(file);
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => fileRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all duration-300 cursor-pointer
          ${isDragging
            ? "border-[#8b7355] bg-[#f5f0e8]/50 scale-[1.01]"
            : "border-[#e8e5df] hover:border-[#c4a67d] hover:bg-[#f5f0e8]/30"
          }
        `}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
            isDragging ? "bg-[#8b7355] text-white" : "bg-[#f5f0e8] text-[#8b7355]"
          }`}>
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm sm:text-base font-semibold text-[#1b1b1f]">
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{mobileLabel}</span>
            </p>
            <p className="text-xs sm:text-sm text-[#8c8c8c] mt-0.5">PNG, JPG up to 10MB</p>
          </div>
        </div>
      </div>
      {showCamera && (
        <>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="sm:hidden w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border border-[#e8e5df] bg-white text-[#1b1b1f] text-sm font-medium active:scale-[0.98] transition-all duration-200"
          >
            <svg className="w-5 h-5 text-[#8b7355]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            Take Selfie
          </button>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}
