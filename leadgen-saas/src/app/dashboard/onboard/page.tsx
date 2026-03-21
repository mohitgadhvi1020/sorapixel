"use client";

import { useState, useRef } from "react";
import {
  Globe, Upload, Loader2, CheckCircle2, AlertCircle, Sparkles,
  FileText, X, ArrowRight, Building2, Target, Lightbulb, Shield
} from "lucide-react";

interface CompanyBrain {
  company_name: string;
  services: string[];
  industries_served: string[];
  target_customers: string;
  usp: string;
  proof_points: string[];
  tone: string;
}

interface PipelineEvent {
  step: string;
  message: string;
  brain?: CompanyBrain;
}

type Phase = "input" | "processing" | "complete";

export default function OnboardPage() {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>("input");
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [brain, setBrain] = useState<CompanyBrain | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const startOnboarding = async () => {
    if (!websiteUrl && files.length === 0) return;

    setPhase("processing");
    setEvents([]);
    setError("");
    setBrain(null);

    const formData = new FormData();
    if (websiteUrl) formData.append("website_url", websiteUrl);
    for (const file of files) formData.append("files", file);

    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        body: formData,
      });

      if (!res.ok || !res.body) {
        setError("Failed to start onboarding pipeline");
        setPhase("input");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: PipelineEvent = JSON.parse(line.slice(6));
            setEvents((prev) => [...prev, event]);

            if (event.step === "complete" && event.brain) {
              setBrain(event.brain);
              setPhase("complete");
            } else if (event.step === "error") {
              setError(event.message);
              setPhase("input");
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch {
      setError("Network error — please try again");
      setPhase("input");
    }
  };

  const reset = () => {
    setPhase("input");
    setEvents([]);
    setBrain(null);
    setError("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1">Onboard Your Business</h1>
        <p className="text-text-secondary text-sm">
          Give us your website and assets — AI will build a deep understanding
          of your company for personalized outreach.
        </p>
      </div>

      {/* Input Phase */}
      {phase === "input" && (
        <div className="space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Website URL */}
          <div className="bg-white rounded-2xl shadow-card border border-border/30 p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Website URL
            </h3>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourcompany.com"
              className="w-full px-4 py-3 rounded-xl border border-border bg-surface-secondary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
            />
            <p className="text-xs text-text-tertiary mt-2">
              We&apos;ll scrape your website to understand your services,
              positioning, and tone.
            </p>
          </div>

          {/* File Upload */}
          <div className="bg-white rounded-2xl shadow-card border border-border/30 p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-secondary" />
              Upload Assets{" "}
              <span className="text-xs font-normal text-text-tertiary">
                (optional)
              </span>
            </h3>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group"
            >
              <Upload className="w-10 h-10 text-text-tertiary mx-auto mb-3 group-hover:text-primary transition-colors" />
              <p className="text-sm font-medium mb-1">
                Drop files here or click to upload
              </p>
              <p className="text-xs text-text-tertiary">
                PDF brochures, catalogs, pitch decks, case studies
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-surface-secondary border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-text-tertiary">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="p-1 hover:bg-surface-tertiary rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-text-tertiary" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={startOnboarding}
            disabled={!websiteUrl && files.length === 0}
            className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-primary text-white font-bold rounded-xl text-lg hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <Sparkles className="w-5 h-5" />
            Build Company Brain
          </button>
        </div>
      )}

      {/* Processing Phase */}
      {phase === "processing" && (
        <div className="bg-white rounded-2xl shadow-card border border-border/30 p-8 animate-scale-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h2 className="text-xl font-bold mb-1">
              Building Your Company Brain...
            </h2>
            <p className="text-text-secondary text-sm">
              AI is analyzing your website and assets
            </p>
          </div>

          <div className="space-y-3 max-w-lg mx-auto">
            {events.map((event, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-secondary"
              >
                {event.step === "complete" ? (
                  <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                ) : event.step.includes("error") ? (
                  <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
                ) : (
                  <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                )}
                <span className="text-sm">{event.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete Phase */}
      {phase === "complete" && brain && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-card border border-border/30 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Company Brain Ready</h2>
                <p className="text-sm text-text-secondary">
                  AI has analyzed your business. Here&apos;s what it
                  understands.
                </p>
              </div>
            </div>

            <div className="grid gap-6">
              {/* Company Name */}
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-text-tertiary">
                    Company
                  </p>
                  <p className="text-lg font-bold">
                    {brain.company_name || "—"}
                  </p>
                </div>
              </div>

              {/* Services */}
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-secondary mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-text-tertiary mb-2">
                    Services
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {brain.services.map((s, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                      >
                        {s}
                      </span>
                    ))}
                    {brain.services.length === 0 && (
                      <span className="text-sm text-text-tertiary">
                        No services detected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Industries */}
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-text-tertiary mb-2">
                    Industries Served
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {brain.industries_served.map((ind, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 rounded-full bg-accent/10 text-accent-dark text-xs font-medium"
                      >
                        {ind}
                      </span>
                    ))}
                    {brain.industries_served.length === 0 && (
                      <span className="text-sm text-text-tertiary">
                        No industries detected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* USP */}
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-text-tertiary">
                    Unique Selling Proposition
                  </p>
                  <p className="text-sm mt-1">{brain.usp || "—"}</p>
                </div>
              </div>

              {/* Target Customers */}
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-info mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-text-tertiary">
                    Target Customers
                  </p>
                  <p className="text-sm mt-1">
                    {brain.target_customers || "—"}
                  </p>
                </div>
              </div>

              {/* Proof Points */}
              {brain.proof_points.length > 0 && (
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-success mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-text-tertiary mb-2">
                      Proof Points
                    </p>
                    <ul className="space-y-1">
                      {brain.proof_points.map((p, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-accent mt-1">•</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Tone */}
              {brain.tone && (
                <div className="p-4 rounded-xl bg-surface-secondary border border-border/50">
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                    Communication Tone
                  </p>
                  <p className="text-sm font-medium capitalize">{brain.tone}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href="/dashboard/discover"
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-primary text-white font-bold rounded-xl text-lg hover:opacity-90 transition-all shadow-lg"
            >
              Find Prospects
              <ArrowRight className="w-5 h-5" />
            </a>
            <button
              onClick={reset}
              className="px-6 py-4 bg-surface-secondary text-text-primary font-medium rounded-xl border border-border hover:bg-surface-tertiary transition-colors"
            >
              Re-analyze
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
