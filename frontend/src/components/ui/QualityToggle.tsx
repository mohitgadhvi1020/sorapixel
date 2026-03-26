interface QualityToggleProps {
  value: "standard" | "pro";
  onChange: (q: "standard" | "pro") => void;
  standardCost: number;
  proCost: number;
  /** Optional label shown below the cost (e.g. "/ pose", "/ image") */
  costUnit?: string;
  /** Light theme mode */
  lt?: boolean;
  /** Compact pill style (no cost subtitle) — used inside tight toolbars */
  compact?: boolean;
}

export default function QualityToggle({
  value,
  onChange,
  standardCost,
  proCost,
  costUnit,
  lt = false,
  compact = false,
}: QualityToggleProps) {
  if (compact) {
    return (
      <div className="inline-flex rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] p-0.5">
        <button
          onClick={() => onChange("standard")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            value === "standard"
              ? "bg-[rgba(255,255,255,0.1)] text-white shadow-sm"
              : "text-[rgba(255,255,255,0.5)]"
          }`}
        >
          Standard
        </button>
        <button
          onClick={() => onChange("pro")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
            value === "pro"
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
    );
  }

  return (
    <div className="flex gap-2">
      {(["standard", "pro"] as const).map((q) => {
        const sel = value === q;
        const cost = q === "standard" ? standardCost : proCost;
        return (
          <button
            key={q}
            onClick={() => onChange(q)}
            className="flex-1 py-3 rounded-xl text-center transition-all duration-200"
            style={{
              border: sel
                ? "1.5px solid #c4a67d"
                : `1.5px solid ${lt ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
              background: sel
                ? lt ? "rgba(196,166,125,0.08)" : "rgba(196,166,125,0.1)"
                : lt ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)",
              boxShadow: sel ? "0 0 0 3px rgba(196,166,125,0.1)" : "none",
            }}
          >
            <div className={`text-xs font-semibold capitalize flex items-center justify-center gap-1 ${sel ? "text-[#c4a67d]" : lt ? "text-[#0a0a0a]" : "text-white"}`}>
              {q === "pro" && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              )}
              {q === "standard" ? "Standard" : "Pro"}
            </div>
            {cost > 0 && (
              <div className={`text-[10px] mt-0.5 ${lt ? "text-[#0a0a0a]/40" : "text-white/40"}`}>
                {cost} tokens{costUnit ? ` ${costUnit}` : ""}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
