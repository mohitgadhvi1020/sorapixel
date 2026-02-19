"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

interface AiModelOption {
  id: string;
  name: string;
  gender: string;
  age_group: string;
  thumbnail_url: string;
}

interface PoseOption {
  id: string;
  label: string;
}

interface BackgroundOption {
  id: string;
  label: string;
}

export default function CataloguePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [models, setModels] = useState<AiModelOption[]>([]);
  const [poses, setPoses] = useState<PoseOption[]>([]);
  const [backgrounds, setBackgrounds] = useState<BackgroundOption[]>([]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("indian_woman");
  const [selectedPose, setSelectedPose] = useState("best_match");
  const [selectedBg, setSelectedBg] = useState("best_match");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<{ base64: string; label: string }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    loadOptions();
  }, [authLoading, user, router]);

  async function loadOptions() {
    try {
      const [m, p, b] = await Promise.all([
        api.get<{ models: AiModelOption[] }>("/catalogue/models"),
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
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!imagePreview) return;
    setGenerating(true);
    setError("");
    setResults([]);

    try {
      const data = await api.post<{ success: boolean; images: { base64: string; label: string }[]; error?: string }>(
        "/catalogue/generate",
        {
          image_base64: imagePreview,
          model_type: selectedModel,
          pose: selectedPose,
          background: selectedBg,
          special_instructions: specialInstructions || undefined,
        }
      );

      if (data.success) {
        setResults(data.images.filter((img) => img.base64));
      } else {
        setError(data.error || "Generation failed");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center">
        <button onClick={() => router.back()} className="text-gray-600 mr-4">←</button>
        <h1 className="text-xl font-bold">Create Catalogue / UGC</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Upload */}
        <div>
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Product" className="w-full max-h-80 object-contain rounded-xl bg-gray-100" />
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-2 right-2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center"
              >
                x
              </button>
            </div>
          ) : (
            <label className="block border-2 border-dashed border-pink-300 rounded-xl p-12 text-center cursor-pointer bg-pink-50/50 hover:bg-pink-50">
              <div className="text-pink-400 text-4xl mb-2">+</div>
              <p className="text-gray-600 font-medium">Upload an Image</p>
              <p className="text-gray-400 text-sm">Drag and drop or browse to choose a file</p>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </div>

        {/* Special Instructions */}
        {imagePreview && (
          <>
            <div className="bg-white rounded-xl p-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">Special Instructions (optional)</label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g., Don't add additional items, Don't add dupatta..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 h-20 resize-none outline-none focus:border-pink-400"
                maxLength={200}
              />
              <p className="text-xs text-gray-400 mt-1">{specialInstructions.length}/200</p>
            </div>

            {/* Model Selection */}
            <div>
              <h3 className="font-medium mb-3">Choose Model</h3>
              <div className="grid grid-cols-4 gap-3">
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`rounded-xl p-2 border-2 text-center transition-colors ${
                      selectedModel === m.id ? "border-pink-500 bg-pink-50" : "border-gray-200"
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto bg-gray-200 rounded-full mb-1" />
                    <p className="text-xs">{m.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Pose Selection */}
            <div>
              <h3 className="font-medium mb-3">Choose Pose</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {poses.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPose(p.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full border text-sm ${
                      selectedPose === p.id ? "bg-pink-500 text-white border-pink-500" : "border-gray-300 text-gray-600"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Background Selection */}
            <div>
              <h3 className="font-medium mb-3">Choose Background</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {backgrounds.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBg(b.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full border text-sm ${
                      selectedBg === b.id ? "bg-pink-500 text-white border-pink-500" : "border-gray-300 text-gray-600"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">{error}</div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !imagePreview}
              className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-xl text-lg"
            >
              {generating ? "Creating..." : "Create"}
            </button>
          </>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div>
            <h3 className="font-bold text-lg mb-3">Results</h3>
            <div className="grid grid-cols-1 gap-4">
              {results.map((img, i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
                  <img src={`data:image/png;base64,${img.base64}`} alt={img.label} className="w-full" />
                  <div className="p-3 flex justify-between items-center">
                    <span className="text-sm font-medium">{img.label}</span>
                    <div className="flex gap-2">
                      <button className="text-green-500 text-sm">WhatsApp</button>
                      <button className="text-pink-500 text-sm font-medium">Download</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
