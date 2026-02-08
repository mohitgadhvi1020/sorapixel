"use client";

import { useState } from "react";

interface InfoInputsProps {
  onGenerate: (properties: string, dimensions: string) => void;
  isGenerating: boolean;
}

export default function InfoInputs({
  onGenerate,
  isGenerating,
}: InfoInputsProps) {
  const [properties, setProperties] = useState("");
  const [dimensions, setDimensions] = useState("");

  const canGenerate =
    (properties.trim() || dimensions.trim()) && !isGenerating;

  return (
    <div className="border border-[#e8e5df] rounded-xl sm:rounded-2xl p-4 sm:p-8 space-y-4 sm:space-y-6 bg-white shadow-sm">
      <div>
        <h3 className="text-xs font-bold text-[#8b7355] uppercase tracking-widest mb-1.5 sm:mb-2">
          Product Info Images
        </h3>
        <p className="text-xs sm:text-sm text-[#8c8c8c]">
          Add product details to generate feature and dimension infographics.
          All text and numbers will be rendered exactly as you type them.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {/* Properties */}
        <div className="space-y-1.5 sm:space-y-2">
          <label htmlFor="properties" className="block text-sm font-semibold text-[#1b1b1f]">
            Features / Properties
          </label>
          <textarea
            id="properties"
            value={properties}
            onChange={(e) => setProperties(e.target.value)}
            disabled={isGenerating}
            placeholder={`Anti-Slip Handle\nEasy to Grip\nWide Mouth Opening\n600ml Each Container\nBPA Free Material`}
            rows={4}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-[#e8e5df] bg-[#fafaf8] text-[#1b1b1f] text-sm placeholder:text-[#c0bdb7] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/30 focus:border-[#8b7355] resize-y disabled:opacity-50 transition-all duration-300"
          />
          <p className="text-[10px] sm:text-xs text-[#b0b0b0]">One feature per line</p>
        </div>

        {/* Dimensions */}
        <div className="space-y-1.5 sm:space-y-2">
          <label htmlFor="dimensions" className="block text-sm font-semibold text-[#1b1b1f]">
            Dimensions / Measurements
          </label>
          <textarea
            id="dimensions"
            value={dimensions}
            onChange={(e) => setDimensions(e.target.value)}
            disabled={isGenerating}
            placeholder={`Height: 4 cm\nLength: 20.2 cm\nDiameter: 10.3 cm\n2 Container Capacity: 280 ml each`}
            rows={4}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-[#e8e5df] bg-[#fafaf8] text-[#1b1b1f] text-sm placeholder:text-[#c0bdb7] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/30 focus:border-[#8b7355] resize-y disabled:opacity-50 transition-all duration-300"
          />
          <p className="text-[10px] sm:text-xs text-[#b0b0b0]">One measurement per line — rendered exactly</p>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={() => onGenerate(properties, dimensions)}
        disabled={!canGenerate}
        className={`
          w-full py-3 sm:py-3.5 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300
          ${
            canGenerate
              ? "bg-gradient-to-r from-[#8b7355] to-[#6b5740] text-white shadow-lg shadow-[#8b7355]/15 active:scale-[0.99]"
              : "bg-[#e8e5df] text-[#b0b0b0] cursor-not-allowed"
          }
        `}
      >
        {isGenerating ? (
          <span className="inline-flex items-center gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating Info Images...
          </span>
        ) : (
          "Generate Info Images"
        )}
      </button>
    </div>
  );
}
