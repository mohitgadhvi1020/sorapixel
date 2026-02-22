"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import Button from "@/components/ui/Button";

interface BrandProfile {
  id: string;
  slug: string;
  name: string;
  config: BrandConfig;
}

interface BrandConfig {
  brandName: string;
  website: string;
  tagline: string;
  productType: string;
  targetAudience: string;
  voice: {
    tone: string;
    doRules: string[];
    dontRules: string[];
  };
  materialRules: {
    note: string;
    neverSay: Record<string, string>;
    bannedWords: string[];
    acceptableExamples: string[];
  };
  taxonomy: {
    categories: Record<string, string[]>;
    collections: string[];
    occasions: string[];
  };
  outputFormat: {
    titleFormat: string;
    titleCharRange: [number, number];
    titleExclude: string[];
    descriptionWordRange: [number, number];
    descriptionStructure: string;
    metaDescCharRange: [number, number];
    altTextMaxChars: number;
  };
}

const DEFAULT_CONFIG: BrandConfig = {
  brandName: "",
  website: "",
  tagline: "",
  productType: "",
  targetAudience: "",
  voice: { tone: "", doRules: [], dontRules: [] },
  materialRules: { note: "", neverSay: {}, bannedWords: [], acceptableExamples: [] },
  taxonomy: { categories: {}, collections: [], occasions: [] },
  outputFormat: {
    titleFormat: "[Descriptive Name] | {brandName}",
    titleCharRange: [50, 65],
    titleExclude: [],
    descriptionWordRange: [100, 160],
    descriptionStructure: "",
    metaDescCharRange: [140, 155],
    altTextMaxChars: 125,
  },
};

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag, i) => (
          <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[rgba(196,166,125,0.1)] border border-[rgba(196,166,125,0.15)] text-xs text-white">
            {tag}
            <button onClick={() => onChange(tags.filter((_, j) => j !== i))} className="text-[rgba(255,255,255,0.4)] hover:text-white ml-0.5">×</button>
          </span>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && input.trim()) {
            e.preventDefault();
            onChange([...tags, input.trim()]);
            setInput("");
          }
        }}
        placeholder={placeholder || "Type and press Enter..."}
        className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(196,166,125,0.3)] transition-all"
      />
    </div>
  );
}

function KeyValueEditor({ pairs, onChange }: { pairs: Record<string, string>; onChange: (p: Record<string, string>) => void }) {
  const entries = Object.entries(pairs);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  return (
    <div className="space-y-2">
      {entries.map(([k, v], i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="text-xs text-[rgba(255,255,255,0.5)] min-w-[120px] truncate">"{k}"</span>
          <span className="text-xs text-[rgba(255,255,255,0.3)]">→</span>
          <span className="text-xs text-white flex-1 truncate">"{v}"</span>
          <button
            onClick={() => { const copy = { ...pairs }; delete copy[k]; onChange(copy); }}
            className="text-[10px] text-[rgba(255,255,255,0.3)] hover:text-red-400"
          >×</button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={newKey} onChange={(e) => setNewKey(e.target.value)}
          placeholder="Don't say..."
          className="flex-1 px-2.5 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(196,166,125,0.3)]"
        />
        <input
          value={newVal} onChange={(e) => setNewVal(e.target.value)}
          placeholder="Say this instead..."
          className="flex-1 px-2.5 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-xs text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(196,166,125,0.3)]"
        />
        <button
          onClick={() => {
            if (newKey.trim() && newVal.trim()) {
              onChange({ ...pairs, [newKey.trim()]: newVal.trim() });
              setNewKey(""); setNewVal("");
            }
          }}
          className="px-3 py-1.5 rounded-lg bg-[rgba(196,166,125,0.1)] border border-[rgba(196,166,125,0.2)] text-xs text-[#c4a67d] hover:bg-[rgba(196,166,125,0.15)]"
        >Add</button>
      </div>
    </div>
  );
}

export default function BrandSettingsPage() {
  const { user } = useAuth();
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [config, setConfig] = useState<BrandConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadBrand = useCallback(async () => {
    try {
      const data = await api.get<{ brand: BrandProfile | null }>("/brands/me");
      if (data.brand) {
        setBrand(data.brand);
        setConfig({ ...DEFAULT_CONFIG, ...data.brand.config });
      }
    } catch { /* no brand yet */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadBrand(); }, [loadBrand]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function updateConfig<K extends keyof BrandConfig>(key: K, value: BrandConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (brand) {
        await api.put(`/brands/${brand.id}`, { config });
      } else {
        const data = await api.post<{ brand: BrandProfile }>("/brands", {
          name: config.brandName || "My Brand",
          slug: (config.brandName || "my-brand").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          config,
        });
        setBrand(data.brand);
      }
      showToast("Brand settings saved!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(196,166,125,0.3)] focus:ring-1 focus:ring-[rgba(196,166,125,0.15)] transition-all";
  const textareaClass = `${inputClass} min-h-[80px] resize-y`;
  const labelClass = "block text-xs font-semibold text-[rgba(255,255,255,0.5)] uppercase tracking-wider mb-1.5";
  const sectionClass = "space-y-4 p-5 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]";

  if (loading) {
    return (
      <ResponsiveLayout title="Brand Settings">
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-[rgba(196,166,125,0.2)] border-t-[#c4a67d] rounded-full animate-spin" />
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout title="Brand Settings">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Toast */}
        {toast && (
          <div className="fixed top-20 right-4 z-50 px-4 py-2.5 rounded-xl bg-[rgba(196,166,125,0.15)] border border-[rgba(196,166,125,0.3)] text-sm text-white shadow-lg">
            {toast}
          </div>
        )}

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Brand Settings</h1>
          <p className="text-sm text-[rgba(255,255,255,0.5)] mt-1">
            Configure how AI generates product listings for your brand.
            {!brand && " No brand profile yet — fill in the details and save."}
          </p>
        </div>

        {/* Brand Info */}
        <div className={sectionClass}>
          <h3 className="text-sm font-bold text-white">Brand Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Brand Name</label>
              <input value={config.brandName} onChange={(e) => updateConfig("brandName", e.target.value)} placeholder="e.g. Stylika" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Website</label>
              <input value={config.website} onChange={(e) => updateConfig("website", e.target.value)} placeholder="www.yourbrand.com" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Tagline</label>
            <input value={config.tagline} onChange={(e) => updateConfig("tagline", e.target.value)} placeholder="One-line brand description" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Product Type</label>
            <input value={config.productType} onChange={(e) => updateConfig("productType", e.target.value)} placeholder="e.g. Fashion jewellery — plated, coated, alloy-based" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Target Audience</label>
            <textarea value={config.targetAudience} onChange={(e) => updateConfig("targetAudience", e.target.value)} placeholder="Describe your ideal customer..." className={textareaClass} />
          </div>
        </div>

        {/* Voice & Tone */}
        <div className={sectionClass}>
          <h3 className="text-sm font-bold text-white">Voice & Tone</h3>
          <div>
            <label className={labelClass}>Tone</label>
            <input value={config.voice.tone} onChange={(e) => updateConfig("voice", { ...config.voice, tone: e.target.value })} placeholder="e.g. Confident, modern, accessible" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Do Rules</label>
            <TagInput tags={config.voice.doRules} onChange={(t) => updateConfig("voice", { ...config.voice, doRules: t })} placeholder="What the AI SHOULD do..." />
          </div>
          <div>
            <label className={labelClass}>Don't Rules</label>
            <TagInput tags={config.voice.dontRules} onChange={(t) => updateConfig("voice", { ...config.voice, dontRules: t })} placeholder="What the AI should AVOID..." />
          </div>
        </div>

        {/* Material Rules */}
        <div className={sectionClass}>
          <h3 className="text-sm font-bold text-white">Material Language Rules</h3>
          <div>
            <label className={labelClass}>Important Note</label>
            <textarea value={config.materialRules.note} onChange={(e) => updateConfig("materialRules", { ...config.materialRules, note: e.target.value })} placeholder="e.g. Fashion jewellery — NEVER imply solid precious metals" className={textareaClass} />
          </div>
          <div>
            <label className={labelClass}>Never Say → Always Say</label>
            <KeyValueEditor pairs={config.materialRules.neverSay} onChange={(p) => updateConfig("materialRules", { ...config.materialRules, neverSay: p })} />
          </div>
          <div>
            <label className={labelClass}>Banned Words</label>
            <TagInput tags={config.materialRules.bannedWords} onChange={(t) => updateConfig("materialRules", { ...config.materialRules, bannedWords: t })} placeholder="Words to never use..." />
          </div>
          <div>
            <label className={labelClass}>Acceptable Examples</label>
            <TagInput tags={config.materialRules.acceptableExamples} onChange={(t) => updateConfig("materialRules", { ...config.materialRules, acceptableExamples: t })} placeholder="e.g. Brass with gold-tone finish" />
          </div>
        </div>

        {/* Taxonomy */}
        <div className={sectionClass}>
          <h3 className="text-sm font-bold text-white">Product Taxonomy</h3>
          <div>
            <label className={labelClass}>Collections</label>
            <TagInput tags={config.taxonomy.collections} onChange={(t) => updateConfig("taxonomy", { ...config.taxonomy, collections: t })} placeholder="e.g. Minimal, Bold, Glam" />
          </div>
          <div>
            <label className={labelClass}>Occasions</label>
            <TagInput tags={config.taxonomy.occasions} onChange={(t) => updateConfig("taxonomy", { ...config.taxonomy, occasions: t })} placeholder="e.g. Everyday Wear, Party Wear" />
          </div>
        </div>

        {/* Output Format */}
        <div className={sectionClass}>
          <h3 className="text-sm font-bold text-white">Output Format</h3>
          <div>
            <label className={labelClass}>Title Format</label>
            <input value={config.outputFormat.titleFormat} onChange={(e) => updateConfig("outputFormat", { ...config.outputFormat, titleFormat: e.target.value })} placeholder="[Descriptive Name] | {brandName}" className={inputClass} />
            <p className="text-[10px] text-[rgba(255,255,255,0.3)] mt-1">Use {"{brandName}"} as a placeholder for your brand name</p>
          </div>
          <div>
            <label className={labelClass}>Words to Exclude from Title</label>
            <TagInput tags={config.outputFormat.titleExclude} onChange={(t) => updateConfig("outputFormat", { ...config.outputFormat, titleExclude: t })} placeholder="e.g. Gold-Tone, CZ, Silver" />
          </div>
          <div>
            <label className={labelClass}>Description Structure</label>
            <textarea value={config.outputFormat.descriptionStructure} onChange={(e) => updateConfig("outputFormat", { ...config.outputFormat, descriptionStructure: e.target.value })} placeholder="e.g. Paragraph 1: What the piece IS. Paragraph 2: How to WEAR it. Bullet list: Material, Stones, Closure." className={textareaClass} />
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <p className="text-xs text-[rgba(255,255,255,0.3)]">
            {brand ? "Brand profile saved" : "New brand profile"}
          </p>
          <Button onClick={handleSave} loading={saving} size="lg">
            {brand ? "Save Changes" : "Create Brand Profile"}
          </Button>
        </div>
      </div>
    </ResponsiveLayout>
  );
}
