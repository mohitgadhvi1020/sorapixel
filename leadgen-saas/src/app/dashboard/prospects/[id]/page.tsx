"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2, Mail, Phone, Star, Globe, MapPin, ArrowLeft,
  Sparkles, Loader2, Copy, CheckCircle2, AlertTriangle,
  FileText, Target, Lightbulb
} from "lucide-react";

interface EmailDraft {
  subject: string;
  body: string;
  personalization_reason: string;
  confidence: string;
}

const DEMO_PROSPECT = {
  company_name: "Bright Digital Agency",
  website: "brightdigital.com",
  phone: "+1-212-555-0101",
  address: "New York, US",
  industry: "Digital Marketing",
  rating: 4.8,
  reviews: 156,
  email: "hello@brightdigital.com",
  email_confidence: "high",
  research_summary: "Full-service digital agency specializing in SEO and PPC for e-commerce brands. They work with mid-size DTC brands and have a team of about 25 people.",
  research_data: {
    services: ["SEO", "PPC Management", "Content Marketing", "Social Media"],
    target_market: "Mid-size e-commerce and DTC brands",
    size_signals: "Team of ~25, 3 office locations",
    potential_pain_points: [
      "Scaling client acquisition beyond referrals",
      "Differentiating from commodity SEO providers",
      "Retaining clients in competitive market",
    ],
    recent_activity: "Recently launched a new analytics dashboard product",
  },
  score: 85,
};

export default function ProspectDetailPage() {
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const prospect = DEMO_PROSPECT;

  const generateDraft = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_brain: {
            company_name: "Your Company",
            services: ["Web Development", "UI/UX Design"],
            industries_served: ["SaaS", "E-commerce"],
            usp: "We build conversion-optimized websites that drive revenue",
            proof_points: ["Increased client revenue by 40% on average"],
            tone: "professional and friendly",
          },
          prospect: {
            company_name: prospect.company_name,
            industry: prospect.industry,
            website: prospect.website,
            email: prospect.email,
            research_summary: prospect.research_summary,
            research_data: prospect.research_data,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDraft(data.draft);
      }
    } catch {
      // handle error silently
    } finally {
      setGenerating(false);
    }
  };

  const copyDraft = () => {
    if (!draft) return;
    navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <Link
        href="/dashboard/prospects"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Prospects
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-card border border-border/30 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-card flex items-center justify-center border border-primary/10">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{prospect.company_name}</h1>
              <p className="text-text-secondary">{prospect.industry}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm font-semibold">Score</p>
              <p className="text-2xl font-bold text-primary">
                {prospect.score}
              </p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border-light">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-accent" />
            <div>
              <p className="text-xs text-text-tertiary">Email</p>
              <p className="text-sm font-medium">
                {prospect.email || "Not found"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-text-tertiary" />
            <div>
              <p className="text-xs text-text-tertiary">Phone</p>
              <p className="text-sm font-medium">{prospect.phone || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-info" />
            <div>
              <p className="text-xs text-text-tertiary">Website</p>
              <a
                href={`https://${prospect.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                {prospect.website}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-text-tertiary" />
            <div>
              <p className="text-xs text-text-tertiary">Location</p>
              <p className="text-sm font-medium">{prospect.address}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Research */}
        <div className="bg-white rounded-2xl shadow-card border border-border/30 p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-secondary" />
            AI Research
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-text-tertiary mb-1">
                Summary
              </p>
              <p className="text-sm">{prospect.research_summary}</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-text-tertiary mb-2">
                Services
              </p>
              <div className="flex flex-wrap gap-1.5">
                {prospect.research_data.services.map((s, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-accent mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-text-tertiary">
                  Target Market
                </p>
                <p className="text-sm">
                  {prospect.research_data.target_market}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-warning mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-text-tertiary mb-1">
                  Potential Pain Points
                </p>
                <ul className="space-y-1">
                  {prospect.research_data.potential_pain_points.map((p, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-warning mt-1">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-medium">{prospect.rating}</span>
              <span className="text-xs text-text-tertiary">
                ({prospect.reviews} reviews)
              </span>
            </div>
          </div>
        </div>

        {/* Draft Email */}
        <div className="bg-white rounded-2xl shadow-card border border-border/30 p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Personalized Draft
          </h3>

          {!draft && !generating && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-text-secondary mb-4">
                Generate a personalized email draft using your company brain and
                this prospect&apos;s research data.
              </p>
              <button
                onClick={generateDraft}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                <Sparkles className="w-4 h-4" />
                Generate Draft
              </button>
            </div>
          )}

          {generating && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
              <p className="text-sm text-text-secondary">
                AI is crafting a personalized email...
              </p>
            </div>
          )}

          {draft && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                  Subject
                </p>
                <p className="text-sm font-medium bg-surface-secondary px-3 py-2 rounded-lg">
                  {draft.subject}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                  Body
                </p>
                <div className="text-sm bg-surface-secondary px-4 py-3 rounded-lg whitespace-pre-wrap leading-relaxed">
                  {draft.body}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <AlertTriangle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-primary">
                    Why this angle
                  </p>
                  <p className="text-xs text-text-secondary">
                    {draft.personalization_reason}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    draft.confidence === "high"
                      ? "bg-green-50 text-green-600"
                      : draft.confidence === "medium"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-gray-50 text-gray-500"
                  }`}
                >
                  {draft.confidence} confidence
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={generateDraft}
                    className="px-3 py-1.5 text-xs font-medium bg-surface-secondary rounded-lg hover:bg-surface-tertiary transition-colors border border-border"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={copyDraft}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
