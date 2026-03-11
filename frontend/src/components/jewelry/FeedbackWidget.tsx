"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { useTheme } from "@/hooks/useTheme";

const FEEDBACK_CATEGORIES = [
  { id: "low_quality", label: "Low quality" },
  { id: "wrong_style", label: "Wrong style / theme" },
  { id: "artifacts", label: "Artifacts / glitches" },
  { id: "color_mismatch", label: "Wrong colors" },
  { id: "bad_background", label: "Bad background" },
  { id: "jewelry_distorted", label: "Jewelry distorted" },
  { id: "wrong_jewelry_type", label: "Wrong jewelry type" },
  { id: "blurry", label: "Blurry / soft" },
  { id: "unrealistic", label: "Looks unrealistic" },
  { id: "wrong_angle", label: "Wrong angle" },
  { id: "missing_details", label: "Missing details" },
  { id: "too_dark", label: "Too dark" },
  { id: "too_bright", label: "Too bright / washed out" },
];

interface FeedbackWidgetProps {
  generationIds: string[];
  imageLabel?: string;
  compact?: boolean;
}

export default function FeedbackWidget({ generationIds, imageLabel, compact }: FeedbackWidgetProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!generationIds.length) return null;

  function toggleCategory(catId: string) {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  }

  async function submitFeedback(selectedRating: "up" | "down", cats?: string[], text?: string) {
    setSubmitting(true);
    try {
      const promises = generationIds.map((gid) =>
        api.post("/feedback", {
          generation_id: gid,
          rating: selectedRating,
          categories: cats?.length ? cats : undefined,
          comment: text || undefined,
          image_label: imageLabel,
        })
      );
      await Promise.all(promises);
      setSubmitted(true);
    } catch {
      // Silent fail — feedback is non-critical
    } finally {
      setSubmitting(false);
    }
  }

  function handleThumbsUp() {
    setRating("up");
    setShowForm(false);
    submitFeedback("up");
  }

  function handleThumbsDown() {
    setRating("down");
    setShowForm(true);
  }

  function handleFormSubmit() {
    submitFeedback("down", selectedCategories, comment.trim());
  }

  if (submitted) {
    return (
      <div className={`flex items-center gap-2 py-2 px-3 rounded-xl transition-all duration-300 ${
        isLight ? "bg-[#f5f0e8]" : "bg-[rgba(196,166,125,0.06)]"
      }`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span className={`text-[12px] ${isLight ? "text-[#8b7355]" : "text-[#c4a67d]/70"}`}>
          Thanks for your feedback!
        </span>
      </div>
    );
  }

  if (rating === "down" && showForm) {
    return (
      <div className={`rounded-xl border p-4 space-y-3 transition-all duration-300 ${
        isLight
          ? "bg-[#faf7f2] border-[#e8ddd0]"
          : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)]"
      }`}>
        <div className="flex items-center justify-between">
          <p className={`text-[13px] font-semibold ${isLight ? "text-[#3a3a3a]" : "text-white/80"}`}>
            What went wrong?
          </p>
          <button
            onClick={() => { setShowForm(false); setRating(null); setSelectedCategories([]); setComment(""); }}
            className={`text-[11px] ${isLight ? "text-[#999]" : "text-white/30"} hover:text-[#c4a67d] transition-colors`}
          >
            Cancel
          </button>
        </div>

        <p className={`text-[11px] ${isLight ? "text-[#999]" : "text-white/30"}`}>
          Select all that apply
        </p>

        <div className="flex flex-wrap gap-1.5">
          {FEEDBACK_CATEGORIES.map((cat) => {
            const isSelected = selectedCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  isSelected
                    ? "bg-[#c4a67d] text-white"
                    : isLight
                      ? "bg-white border border-[#e5e0d8] text-[#5a5a5a] hover:border-[#c4a67d]"
                      : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white/50 hover:border-[#c4a67d]/40"
                }`}
              >
                {isSelected && (
                  <span className="mr-1">✓</span>
                )}
                {cat.label}
              </button>
            );
          })}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Describe the issue in your own words (optional)..."
          rows={2}
          className={`w-full rounded-lg px-3 py-2 text-[12px] resize-none outline-none transition-colors ${
            isLight
              ? "bg-white border border-[#e5e0d8] text-[#3a3a3a] placeholder:text-[#bbb] focus:border-[#c4a67d]"
              : "bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-white/80 placeholder:text-white/20 focus:border-[#c4a67d]/40"
          }`}
        />

        <button
          onClick={handleFormSubmit}
          disabled={submitting || (selectedCategories.length === 0 && !comment.trim())}
          className="w-full py-2 rounded-lg text-[12px] font-semibold bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white hover:shadow-lg hover:shadow-[#c4a67d]/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Sending..." : `Submit Feedback${selectedCategories.length > 0 ? ` (${selectedCategories.length})` : ""}`}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${compact ? "gap-2" : "gap-3"} py-2 ${compact ? "px-2" : "px-3"} rounded-xl ${
      isLight ? "bg-[#f9f6f1]" : "bg-[rgba(255,255,255,0.02)]"
    }`}>
      <span className={`text-[11px] ${isLight ? "text-[#999]" : "text-white/30"}`}>
        How was this result?
      </span>
      <div className="flex gap-1">
        <button
          onClick={handleThumbsUp}
          className={`p-1.5 rounded-lg transition-all ${
            rating === "up"
              ? "bg-green-500/20 text-green-500"
              : isLight
                ? "hover:bg-[#eee8de] text-[#aaa] hover:text-green-600"
                : "hover:bg-[rgba(255,255,255,0.05)] text-white/25 hover:text-green-400"
          }`}
          title="Good result"
        >
          <svg width={compact ? "14" : "16"} height={compact ? "14" : "16"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 10v12" /><path d="M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H4a2 2 0 01-2-2v-8a2 2 0 012-2h2.76a2 2 0 001.79-1.11L12 2a3.13 3.13 0 013 3.88z" />
          </svg>
        </button>
        <button
          onClick={handleThumbsDown}
          className={`p-1.5 rounded-lg transition-all ${
            rating === "down"
              ? "bg-red-500/20 text-red-500"
              : isLight
                ? "hover:bg-[#eee8de] text-[#aaa] hover:text-red-500"
                : "hover:bg-[rgba(255,255,255,0.05)] text-white/25 hover:text-red-400"
          }`}
          title="Needs improvement"
        >
          <svg width={compact ? "14" : "16"} height={compact ? "14" : "16"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 14V2" /><path d="M9 18.12L10 14H4.17a2 2 0 01-1.92-2.56l2.33-8A2 2 0 016.5 2H20a2 2 0 012 2v8a2 2 0 01-2 2h-2.76a2 2 0 00-1.79 1.11L12 22a3.13 3.13 0 01-3-3.88z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
