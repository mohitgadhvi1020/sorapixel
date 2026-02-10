"use client";

import { ASPECT_RATIOS } from "@/lib/aspect-ratios";

interface AspectRatioSelectorProps {
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function AspectRatioSelector({
  selectedId,
  onSelect,
}: AspectRatioSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ASPECT_RATIOS.map((r) => {
        const isSelected = selectedId === r.id;
        // Visual ratio box (max 24px tall)
        const maxH = 24;
        const scale = maxH / Math.max(r.ratio[0], r.ratio[1]);
        const boxW = Math.round(r.ratio[0] * scale);
        const boxH = Math.round(r.ratio[1] * scale);

        return (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-xs sm:text-sm font-medium transition-all duration-200 active:scale-[0.97]
              ${isSelected
                ? "border-[#8b7355] bg-[#f5f0e8] text-[#1b1b1f] shadow-sm shadow-[#8b7355]/10"
                : "border-[#e8e5df] bg-white text-[#8c8c8c] hover:border-[#c4a67d]"
              }
            `}
          >
            {/* Ratio visual */}
            <div
              className={`flex-shrink-0 ${r.circular ? "rounded-full" : "rounded-[2px]"} ${isSelected ? "bg-[#8b7355]" : "bg-[#d0cdc7]"}`}
              style={{ width: r.circular ? 22 : boxW, height: r.circular ? 22 : boxH }}
            />
            <div className="text-left leading-tight">
              <span className="block">{r.label}</span>
              <span className={`block text-[10px] ${isSelected ? "text-[#8b7355]" : "text-[#b0b0b0]"}`}>
                {r.platform}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
