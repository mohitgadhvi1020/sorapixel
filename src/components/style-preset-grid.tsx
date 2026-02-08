"use client";

import { STYLE_PRESETS } from "@/lib/styles";

interface StylePresetGridProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

export default function StylePresetGrid({
  selectedId,
  onSelect,
  disabled,
}: StylePresetGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 stagger-children">
      {STYLE_PRESETS.map((style) => (
        <button
          key={style.id}
          onClick={() => onSelect(style.id)}
          disabled={disabled}
          className={`
            relative flex flex-col items-center gap-1.5 sm:gap-2.5 p-3 sm:p-4 rounded-xl border-2
            transition-all duration-300 text-left
            ${
              selectedId === style.id
                ? "border-[#8b7355] bg-[#f5f0e8] shadow-sm shadow-[#8b7355]/10"
                : "border-[#e8e5df] bg-white hover:border-[#c4a67d] hover:bg-[#f5f0e8]/30"
            }
            ${disabled ? "opacity-50 pointer-events-none" : ""}
            active:scale-[0.97]
          `}
        >
          <span className="text-2xl sm:text-3xl">{style.thumbnail}</span>
          <div className="w-full">
            <p className="text-xs sm:text-sm font-semibold text-[#1b1b1f] leading-tight">{style.name}</p>
            <p className="text-[10px] sm:text-xs text-[#8c8c8c] mt-0.5 line-clamp-2 leading-snug">
              {style.description}
            </p>
          </div>
          {selectedId === style.id && (
            <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-4 h-4 sm:w-5 sm:h-5 bg-[#8b7355] rounded-full flex items-center justify-center animate-scale-in">
              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
