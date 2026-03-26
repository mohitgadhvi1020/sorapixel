"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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

interface AudioFeedbackResponse {
  success: boolean;
  feedback_id?: string;
  transcription?: string;
  summary_points?: string[];
}

interface FeedbackImage {
  imageUrl?: string;
  generationId: string;
  label?: string;
}

interface FeedbackWidgetProps {
  /** @deprecated Use `images` for per-image feedback. Falls back to batch mode. */
  generationIds?: string[];
  /** Per-image feedback entries */
  images?: FeedbackImage[];
  imageLabel?: string;
  compact?: boolean;
  flowType?: string;
  promptUsed?: string;
}

export default function FeedbackWidget({
  generationIds,
  images,
  imageLabel,
  compact,
  flowType,
  promptUsed,
}: FeedbackWidgetProps) {
  const feedbackImages: FeedbackImage[] =
    images && images.length > 0
      ? images
      : (generationIds || []).map((gid) => ({ generationId: gid, label: imageLabel }));

  if (!feedbackImages.length) return null;

  if (feedbackImages.length === 1) {
    return (
      <SingleImageFeedback
        image={feedbackImages[0]}
        compact={compact}
        flowType={flowType}
        promptUsed={promptUsed}
      />
    );
  }

  return (
    <div className="space-y-2">
      {feedbackImages.map((img, idx) => (
        <SingleImageFeedback
          key={img.generationId || idx}
          image={img}
          compact={compact}
          flowType={flowType}
          promptUsed={promptUsed}
          indexLabel={`Image ${idx + 1}`}
        />
      ))}
    </div>
  );
}

// ─── Per-image feedback component ────────────────────────────────────────────

interface SingleImageFeedbackProps {
  image: FeedbackImage;
  compact?: boolean;
  flowType?: string;
  promptUsed?: string;
  indexLabel?: string;
}

function SingleImageFeedback({ image, compact, flowType, promptUsed, indexLabel }: SingleImageFeedbackProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioSubmitting, setAudioSubmitting] = useState(false);
  const [summaryPoints, setSummaryPoints] = useState<string[] | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function toggleCategory(catId: string) {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  }

  async function submitFeedback(selectedRating: "up" | "down", cats?: string[], text?: string) {
    setSubmitting(true);
    try {
      await api.post("/feedback", {
        generation_id: image.generationId,
        rating: selectedRating,
        categories: cats?.length ? cats : undefined,
        comment: text || undefined,
        image_label: image.label || indexLabel,
        image_url: image.imageUrl,
        flow_type: flowType,
        prompt_used: promptUsed,
      });
      setSubmitted(true);
    } catch {
      // Silent fail — feedback is non-critical
    } finally {
      setSubmitting(false);
    }
  }

  const startRecording = useCallback(async () => {
    setMicError(null);
    setAudioBlob(null);
    setSummaryPoints(null);
    setTranscription(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      setMicError("Microphone access denied. Please allow mic access and try again.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  async function submitAudioFeedback() {
    if (!audioBlob) return;
    setAudioSubmitting(true);
    try {
      const formData = new FormData();
      const ext = audioBlob.type.includes("mp4") ? "m4a" : "webm";
      formData.append("audio", audioBlob, `feedback.${ext}`);
      formData.append("generation_id", image.generationId);
      formData.append("rating", rating || "down");
      if (image.imageUrl) formData.append("image_url", image.imageUrl);
      if (flowType) formData.append("flow_type", flowType);
      if (promptUsed) formData.append("prompt_used", promptUsed);
      if (image.label || indexLabel) formData.append("image_label", image.label || indexLabel || "");

      const resp = await api.upload<AudioFeedbackResponse>("/feedback/audio", formData);
      if (resp.success) {
        setSummaryPoints(resp.summary_points || []);
        setTranscription(resp.transcription || null);
        setSubmitted(true);
      }
    } catch {
      setMicError("Failed to process audio. Please try text feedback instead.");
    } finally {
      setAudioSubmitting(false);
    }
  }

  function discardRecording() {
    setAudioBlob(null);
    setSummaryPoints(null);
    setTranscription(null);
    setRecordingSeconds(0);
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

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ── Submitted state — show summary if audio ────────────────────────────────

  if (submitted) {
    return (
      <div
        className={`py-2 px-3 rounded-xl transition-all duration-300 ${
          isLight ? "bg-[#f5f0e8]" : "bg-[rgba(196,166,125,0.06)]"
        }`}
      >
        <div className="flex items-center gap-2">
          {indexLabel && (
            <span className={`text-[11px] font-medium ${isLight ? "text-[#8b7355]" : "text-[#c4a67d]/60"}`}>
              {indexLabel}
            </span>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span className={`text-[12px] ${isLight ? "text-[#8b7355]" : "text-[#c4a67d]/70"}`}>
            Thanks for your feedback!
          </span>
        </div>

        {summaryPoints && summaryPoints.length > 0 && (
          <div className={`mt-2 pl-1 space-y-1 border-l-2 ${isLight ? "border-[#c4a67d]/30" : "border-[#c4a67d]/20"}`}>
            <p className={`text-[11px] font-medium pl-2 ${isLight ? "text-[#8b7355]" : "text-[#c4a67d]/60"}`}>
              Your feedback summary:
            </p>
            {summaryPoints.map((pt, i) => (
              <p key={i} className={`text-[11px] pl-2 ${isLight ? "text-[#6b5b45]" : "text-[#c4a67d]/50"}`}>
                • {pt}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Expanded feedback form (thumbs down) ───────────────────────────────────

  if (rating === "down" && showForm) {
    return (
      <div
        className={`rounded-xl border p-4 space-y-3 transition-all duration-300 ${
          isLight
            ? "bg-[#faf7f2] border-[#e8ddd0]"
            : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)]"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className={`text-[13px] font-semibold ${isLight ? "text-[#3a3a3a]" : "text-white/80"}`}>
            {indexLabel ? `${indexLabel} — What went wrong?` : "What went wrong?"}
          </p>
          <button
            onClick={() => {
              setShowForm(false);
              setRating(null);
              setSelectedCategories([]);
              setComment("");
              discardRecording();
            }}
            className={`text-[11px] ${isLight ? "text-[#999]" : "text-white/30"} hover:text-[#c4a67d] transition-colors`}
          >
            Cancel
          </button>
        </div>

        <p className={`text-[11px] ${isLight ? "text-[#999]" : "text-white/30"}`}>Select all that apply</p>

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
                {isSelected && <span className="mr-1">✓</span>}
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

        {/* ── Audio recording section ────────────────────────────────────── */}
        <div className={`rounded-lg p-3 ${isLight ? "bg-[#f0ebe3]" : "bg-[rgba(255,255,255,0.03)]"}`}>
          <div className="flex items-center gap-2 mb-1">
            <MicIcon size={14} isLight={isLight} recording={isRecording} />
            <span className={`text-[11px] font-medium ${isLight ? "text-[#5a5a5a]" : "text-white/50"}`}>
              Voice feedback
            </span>
            {isRecording && (
              <span className="text-[11px] text-red-500 font-mono animate-pulse">
                ● {formatTime(recordingSeconds)}
              </span>
            )}
          </div>

          {micError && (
            <p className="text-[11px] text-red-500 mb-2">{micError}</p>
          )}

          {!audioBlob && !isRecording && (
            <button
              onClick={startRecording}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                isLight
                  ? "bg-white border border-[#e5e0d8] text-[#5a5a5a] hover:border-[#c4a67d] hover:text-[#8b7355]"
                  : "bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-white/50 hover:border-[#c4a67d]/40"
              }`}
            >
              <MicIcon size={12} isLight={isLight} />
              Tap to record
            </button>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-all"
            >
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
              Stop recording
            </button>
          )}

          {audioBlob && !audioSubmitting && !summaryPoints && (
            <div className="flex items-center gap-2">
              <button
                onClick={submitAudioFeedback}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white hover:shadow-lg hover:shadow-[#c4a67d]/20 transition-all"
              >
                Send voice feedback
              </button>
              <button
                onClick={discardRecording}
                className={`text-[11px] ${isLight ? "text-[#999]" : "text-white/30"} hover:text-red-400 transition-colors`}
              >
                Discard
              </button>
            </div>
          )}

          {audioSubmitting && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-[#c4a67d] border-t-transparent rounded-full animate-spin" />
              <span className={`text-[11px] ${isLight ? "text-[#8b7355]" : "text-[#c4a67d]/70"}`}>
                Transcribing & summarizing…
              </span>
            </div>
          )}

          {summaryPoints && summaryPoints.length > 0 && (
            <div className={`mt-2 space-y-1 border-l-2 pl-2 ${isLight ? "border-[#c4a67d]/30" : "border-[#c4a67d]/20"}`}>
              <p className={`text-[11px] font-medium ${isLight ? "text-[#8b7355]" : "text-[#c4a67d]/60"}`}>
                Summary:
              </p>
              {summaryPoints.map((pt, i) => (
                <p key={i} className={`text-[11px] ${isLight ? "text-[#6b5b45]" : "text-[#c4a67d]/50"}`}>
                  • {pt}
                </p>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleFormSubmit}
          disabled={submitting || (selectedCategories.length === 0 && !comment.trim())}
          className="w-full py-2 rounded-lg text-[12px] font-semibold bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white hover:shadow-lg hover:shadow-[#c4a67d]/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting
            ? "Sending..."
            : `Submit Feedback${selectedCategories.length > 0 ? ` (${selectedCategories.length})` : ""}`}
        </button>
      </div>
    );
  }

  // ── Default state — thumbs up / down ───────────────────────────────────────

  return (
    <div
      className={`flex items-center ${compact ? "gap-2" : "gap-3"} py-2 ${compact ? "px-2" : "px-3"} rounded-xl ${
        isLight ? "bg-[#f9f6f1]" : "bg-[rgba(255,255,255,0.02)]"
      }`}
    >
      {indexLabel && (
        <span className={`text-[11px] font-medium ${isLight ? "text-[#8b7355]" : "text-[#c4a67d]/50"}`}>
          {indexLabel}
        </span>
      )}
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
          <svg
            width={compact ? "14" : "16"}
            height={compact ? "14" : "16"}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 10v12" />
            <path d="M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H4a2 2 0 01-2-2v-8a2 2 0 012-2h2.76a2 2 0 001.79-1.11L12 2a3.13 3.13 0 013 3.88z" />
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
          <svg
            width={compact ? "14" : "16"}
            height={compact ? "14" : "16"}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 14V2" />
            <path d="M9 18.12L10 14H4.17a2 2 0 01-1.92-2.56l2.33-8A2 2 0 016.5 2H20a2 2 0 012 2v8a2 2 0 01-2 2h-2.76a2 2 0 00-1.79 1.11L12 22a3.13 3.13 0 01-3-3.88z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Mic icon component ──────────────────────────────────────────────────────

function MicIcon({ size = 16, isLight = false, recording = false }: { size?: number; isLight?: boolean; recording?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={recording ? "#ef4444" : isLight ? "#8b7355" : "#c4a67d"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="1" width="6" height="12" rx="3" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
