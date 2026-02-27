"use client";

import { useState } from "react";
import type { Theme, ThemeShot } from "./ThemeGallery";

export interface ShotConfig {
  shot_id: string;
  label: string;
  additional_details: string;
  theme_color: string;
  selected: boolean;
}

interface ShotConfiguratorProps {
  theme: Theme;
  shotConfigs: ShotConfig[];
  onUpdateShots: (configs: ShotConfig[]) => void;
  onBack: () => void;
  onGenerate: () => void;
  tokenCost: number;
  tokenBalance: number;
  quality: "standard" | "pro";
  onQualityChange: (q: "standard" | "pro") => void;
  aspectRatioId: string;
  onAspectRatioChange: (id: string) => void;
  isGenerating: boolean;
  jewelryType?: string;
}

const SHOT_ICONS: Record<string, string> = {
  hero: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  dramatic: "M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1",
  lifestyle: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  closeup: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35M11 8v6M8 11h6",
};

const ASPECT_RATIOS = [
  { id: "square", label: "Square", ratio: "1:1", w: 1, h: 1 },
  { id: "portrait", label: "Portrait", ratio: "3:4", w: 3, h: 4 },
  { id: "story", label: "Tall", ratio: "9:16", w: 9, h: 16 },
  { id: "landscape", label: "Landscape", ratio: "4:3", w: 4, h: 3 },
  { id: "widescreen", label: "Wide", ratio: "16:9", w: 16, h: 9 },
];

export default function ShotConfigurator({
  theme,
  shotConfigs,
  onUpdateShots,
  onBack,
  onGenerate,
  tokenCost,
  tokenBalance,
  quality,
  onQualityChange,
  aspectRatioId,
  onAspectRatioChange,
  isGenerating,
  jewelryType,
}: ShotConfiguratorProps) {
  const [editingShot, setEditingShot] = useState<string | null>(null);
  const [showAspectRatio, setShowAspectRatio] = useState(false);

  const selectedCount = shotConfigs.filter((s) => s.selected).length;

  function toggleShot(shotId: string) {
    onUpdateShots(
      shotConfigs.map((s) =>
        s.shot_id === shotId ? { ...s, selected: !s.selected } : s
      )
    );
  }

  function updateShotField(shotId: string, field: "additional_details" | "theme_color", value: string) {
    onUpdateShots(
      shotConfigs.map((s) =>
        s.shot_id === shotId ? { ...s, [field]: value } : s
      )
    );
  }

  const editingShotConfig = shotConfigs.find((s) => s.shot_id === editingShot);
  const editingShotMeta = theme.shots.find((s) => s.id === editingShot);

  return (
    <div className="space-y-6">
      {/* Header with theme info */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="mt-1 w-9 h-9 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[rgba(255,255,255,0.5)] hover:text-white hover:border-[rgba(255,255,255,0.15)] transition-all flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white truncate">{theme.name}</h2>
          <p className="text-xs text-[rgba(255,255,255,0.4)] mt-0.5 line-clamp-1">{theme.description}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(125,207,90,0.1)] border border-[rgba(125,207,90,0.15)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7dcf5a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-[11px] font-semibold text-[#7dcf5a]">Applied</span>
          </div>
        </div>
      </div>

      {/* Section: Select Shots */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Select Shots & Configure</h3>
        <p className="text-xs text-[rgba(255,255,255,0.4)] mb-4">
          Choose which shots to generate. Each can be configured independently.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {shotConfigs.map((config) => {
            const shotMeta = theme.shots.find((s) => s.id === config.shot_id);
            if (!shotMeta) return null;

            return (
              <div
                key={config.shot_id}
                className={`relative rounded-2xl border transition-all duration-200 overflow-hidden ${
                  config.selected
                    ? "border-[#c4a67d] bg-[rgba(196,166,125,0.05)] shadow-[0_0_15px_rgba(196,166,125,0.08)]"
                    : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.12)]"
                }`}
              >
                <button
                  onClick={() => toggleShot(config.shot_id)}
                  className="w-full text-left"
                >
                  <div className="aspect-[4/3] relative bg-[rgba(255,255,255,0.03)] overflow-hidden">
                    {jewelryType ? (
                      <img
                        src={`/shot-previews/${jewelryType}/${config.shot_id}.jpg`}
                        alt={shotMeta.short_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: theme.preview_color || "#1a1a1a" }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d={SHOT_ICONS[config.shot_id] || SHOT_ICONS.hero} />
                        </svg>
                      </div>
                    )}

                    {/* Description overlay */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-8">
                      <p className="text-[10px] text-white/80 line-clamp-2">{shotMeta.description}</p>
                    </div>

                    {config.selected && (
                      <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-[#c4a67d] flex items-center justify-center shadow-md">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>

                {/* Shot info + configure button */}
                <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{shotMeta.short_name}</p>
                    {config.additional_details && (
                      <p className="text-[10px] text-[rgba(196,166,125,0.7)] truncate mt-0.5">
                        {config.additional_details}
                      </p>
                    )}
                  </div>
                  {config.selected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingShot(config.shot_id);
                      }}
                      className="w-7 h-7 rounded-lg bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(196,166,125,0.15)] flex items-center justify-center transition-colors flex-shrink-0"
                      title="Configure shot"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aspect Ratio */}
      <div>
        <button
          onClick={() => setShowAspectRatio(!showAspectRatio)}
          className="flex items-center gap-2 text-xs font-semibold text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`transition-transform duration-200 ${showAspectRatio ? "rotate-90" : ""}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          Aspect Ratio
          <span className="text-[rgba(255,255,255,0.3)]">
            ({ASPECT_RATIOS.find((a) => a.id === aspectRatioId)?.ratio || "1:1"})
          </span>
        </button>

        {showAspectRatio && (
          <div className="mt-3 grid grid-cols-3 md:grid-cols-5 gap-2">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.id}
                onClick={() => onAspectRatioChange(ar.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  aspectRatioId === ar.id
                    ? "bg-[rgba(196,166,125,0.1)] border-[rgba(196,166,125,0.3)] text-[#c4a67d]"
                    : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.5)] hover:border-[rgba(255,255,255,0.12)]"
                }`}
              >
                <div
                  className="border border-current rounded-sm"
                  style={{
                    width: `${Math.round(28 * (ar.w / Math.max(ar.w, ar.h)))}px`,
                    height: `${Math.round(28 * (ar.h / Math.max(ar.w, ar.h)))}px`,
                  }}
                />
                <div className="text-center">
                  <p className="text-[11px] font-semibold">{ar.label}</p>
                  <p className="text-[10px] opacity-60">{ar.ratio}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quality Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-[rgba(255,255,255,0.5)]">Quality</span>
        <div className="inline-flex rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] p-0.5">
          <button
            onClick={() => onQualityChange("standard")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              quality === "standard"
                ? "bg-[rgba(255,255,255,0.1)] text-white shadow-sm"
                : "text-[rgba(255,255,255,0.5)]"
            }`}
          >
            Standard
          </button>
          <button
            onClick={() => onQualityChange("pro")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
              quality === "pro"
                ? "bg-gradient-to-r from-[rgba(196,166,125,0.2)] to-[rgba(196,166,125,0.1)] text-[#c4a67d] shadow-sm border border-[rgba(196,166,125,0.2)]"
                : "text-[rgba(255,255,255,0.5)]"
            }`}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Pro
          </button>
        </div>
      </div>

      {/* Generate CTA — sticky bottom */}
      <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)] to-transparent -mx-4 px-4 md:mx-0 md:px-0">
        <button
          onClick={onGenerate}
          disabled={selectedCount === 0 || isGenerating}
          className="w-full py-3.5 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-sm font-semibold rounded-2xl shadow-[0_4px_24px_rgba(196,166,125,0.3)] hover:shadow-[0_6px_32px_rgba(196,166,125,0.45)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
              Generate {selectedCount} Shot{selectedCount !== 1 ? "s" : ""}
              <span className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.15)] text-xs">
                <span className="text-[10px]">🪙</span>
                {tokenCost}
              </span>
            </>
          )}
        </button>
        {!isGenerating && (
          <p className="text-center text-[11px] text-[rgba(255,255,255,0.35)] mt-2">
            {tokenBalance} tokens available
            {tokenBalance < tokenCost && tokenCost > 0 && (
              <span className="text-red-400 ml-1">
                — need {tokenCost - tokenBalance} more
              </span>
            )}
          </p>
        )}
      </div>

      {/* Configure Shot Modal */}
      {editingShot && editingShotConfig && editingShotMeta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#1a1b20] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Configure Prompt</h3>
                <p className="text-xs text-[rgba(255,255,255,0.4)] mt-0.5">
                  {editingShotMeta.name}
                </p>
              </div>
              <button
                onClick={() => setEditingShot(null)}
                className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-5 pb-5 space-y-4">
              {/* Additional Details */}
              <div>
                <label className="text-xs font-semibold text-[rgba(255,255,255,0.6)] mb-2 block">
                  Additional Details
                </label>
                <textarea
                  value={editingShotConfig.additional_details}
                  onChange={(e) =>
                    updateShotField(editingShot, "additional_details", e.target.value)
                  }
                  placeholder="Enter additional details for this shot..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(196,166,125,0.4)] transition-all resize-y"
                />
              </div>

              {/* Theme Color */}
              <div>
                <label className="text-xs font-semibold text-[rgba(255,255,255,0.6)] mb-2 block">
                  Theme Color <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editingShotConfig.theme_color}
                  onChange={(e) =>
                    updateShotField(editingShot, "theme_color", e.target.value)
                  }
                  placeholder={theme.default_color}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(196,166,125,0.4)] transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setEditingShot(null)}
                  className="px-4 py-2 text-sm text-[rgba(255,255,255,0.5)] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setEditingShot(null)}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-sm font-semibold rounded-xl shadow-[0_4px_16px_rgba(196,166,125,0.2)] hover:shadow-[0_6px_20px_rgba(196,166,125,0.35)] transition-all"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
