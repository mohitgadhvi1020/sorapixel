export type Quality = "standard" | "pro" | "ultra";

// Generic so callers that only handle "standard" | "pro" (most pages) keep
// their narrow setter types. When `ultraCost` is omitted the component never
// emits "ultra", so the narrower Q is safe.
interface QualityToggleProps<Q extends Quality = Quality> {
  value: Q;
  onChange: (q: Q) => void;
  standardCost: number;
  proCost: number;
  /** Optional ultra tier (gpt-image-2). Omit to hide the Ultra option. */
  ultraCost?: number;
  /** Optional label shown below the cost (e.g. "/ pose", "/ image") */
  costUnit?: string;
  /** Light theme mode */
  lt?: boolean;
  /** Compact pill style (no cost subtitle) — used inside tight toolbars */
  compact?: boolean;
}

export default function QualityToggle<Q extends Quality = Quality>({
  value,
  onChange,
  standardCost,
  proCost,
  ultraCost,
  costUnit,
  lt = false,
  compact = false,
}: QualityToggleProps<Q>) {
  const options: Q[] = (ultraCost !== undefined
    ? (["standard", "pro", "ultra"] as Quality[])
    : (["standard", "pro"] as Quality[])) as Q[];

  if (compact) {
    return (
      <div className="inline-flex rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] p-0.5">
        {options.map((q) => {
          const sel = value === q;
          const isUltra = q === "ultra";
          const isPro = q === "pro";
          return (
            <button
              key={q}
              onClick={() => onChange(q)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                sel && isUltra
                  ? "bg-gradient-to-r from-[rgba(139,92,246,0.25)] to-[rgba(99,102,241,0.15)] text-[#c4b5fd] shadow-sm border border-[rgba(139,92,246,0.3)]"
                  : sel && isPro
                    ? "bg-gradient-to-r from-[rgba(196,166,125,0.2)] to-[rgba(196,166,125,0.1)] text-[#c4a67d] shadow-sm border border-[rgba(196,166,125,0.2)]"
                    : sel
                      ? "bg-[rgba(255,255,255,0.1)] text-white shadow-sm"
                      : "text-[rgba(255,255,255,0.5)]"
              }`}
            >
              {(isPro || isUltra) && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              )}
              {q === "standard" ? "Standard" : q === "pro" ? "Pro" : "Ultra"}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {options.map((q) => {
        const sel = value === q;
        const cost = q === "standard" ? standardCost : q === "pro" ? proCost : (ultraCost ?? 0);
        const isUltra = q === "ultra";
        const isPro = q === "pro";
        return (
          <button
            key={q}
            onClick={() => onChange(q)}
            className="flex-1 py-3 rounded-xl text-center transition-all duration-200"
            style={{
              border: sel
                ? isUltra ? "1.5px solid #8b5cf6" : "1.5px solid #c4a67d"
                : `1.5px solid ${lt ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"}`,
              background: sel
                ? isUltra ? (lt ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.12)") : (lt ? "rgba(196,166,125,0.08)" : "rgba(196,166,125,0.1)")
                : lt ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)",
              boxShadow: sel ? (isUltra ? "0 0 0 3px rgba(139,92,246,0.12)" : "0 0 0 3px rgba(196,166,125,0.1)") : "none",
            }}
          >
            <div className={`text-xs font-semibold capitalize flex items-center justify-center gap-1 ${
              sel ? (isUltra ? "text-[#c4b5fd]" : "text-[#c4a67d]") : lt ? "text-[#0a0a0a]" : "text-white"
            }`}>
              {(isPro || isUltra) && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              )}
              {q === "standard" ? "Standard" : q === "pro" ? "Pro" : "Ultra"}
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
