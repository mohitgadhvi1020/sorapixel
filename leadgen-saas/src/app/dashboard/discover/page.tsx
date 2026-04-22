"use client";

import { useState } from "react";
import {
  Search, MapPin, Loader2, CheckCircle2, AlertCircle, Compass,
  Globe, Building2, Star, Mail, Phone, ExternalLink, ArrowRight,
  Instagram, Save, FileText
} from "lucide-react";

interface SocialProfiles {
  instagram?: { handle: string; url: string };
  facebook?: { handle: string; url: string };
  twitter?: { handle: string; url: string };
  linkedin?: { handle: string; url: string };
  [key: string]: { handle: string; url: string } | undefined;
}

interface Prospect {
  company_name: string;
  website: string;
  phone: string;
  address: string;
  industry: string;
  rating: number;
  reviews: number;
  email: string;
  email_confidence: string;
  research_summary: string;
  research_data: Record<string, unknown>;
  score: number;
  source: string;
  place_id: string;
  socials?: SocialProfiles;
  contact_name?: string;
  status: string;
}

interface PipelineEvent {
  step: string;
  message: string;
  count?: number;
  progress?: number;
  prospects?: Prospect[];
  search_query?: string;
}

type Phase = "input" | "running" | "complete";

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [limit, setLimit] = useState(20);
  const [phase, setPhase] = useState<Phase>("input");
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [currentStep, setCurrentStep] = useState("");
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const startDiscovery = async () => {
    if (!query) return;

    setPhase("running");
    setEvents([]);
    setProspects([]);
    setCurrentStep("searching");
    setProgress(0);
    setSaved(false);

    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, location, limit }),
      });

      if (!res.ok || !res.body) {
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
            setCurrentStep(event.step);
            if (event.progress) setProgress(event.progress);

            if (event.step === "complete" && event.prospects) {
              setProspects(event.prospects);
              setSearchQuery(event.search_query || "");
              setPhase("complete");
            } else if (event.step === "error" || event.step === "no_results") {
              setPhase("input");
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setPhase("input");
    }
  };

  const saveProspects = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospects: prospects.map((p) => ({ ...p, search_query: searchQuery })),
        }),
      });
      if (res.ok) setSaved(true);
    } catch { /* skip */ }
    setSaving(false);
  };

  const stepLabel: Record<string, string> = {
    searching: "Searching Google Places & Maps...",
    found: "Extracting business data...",
    researching: "Researching prospect websites...",
    researched: "Analyzing prospects...",
    enriching: "Finding email addresses...",
    enriched: "Enriching contacts...",
    finding_socials: "Finding social media profiles...",
    socials_found: "Discovering Instagram, Facebook, LinkedIn...",
    complete: "Discovery complete!",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1">Discover Prospects</h1>
        <p className="text-text-secondary text-sm">
          Search for businesses matching your ideal customer profile. AI will research, find emails, and discover social profiles.
        </p>
      </div>

      {/* Input Phase */}
      {phase === "input" && (
        <div className="bg-white rounded-2xl shadow-card border border-border/30 p-8 animate-scale-in">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                Industry / Keyword
              </label>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Digital marketing agency, Dental clinic, Restaurant..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface-secondary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Location
              </label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. New York, Mumbai, London..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface-secondary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm" />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Result Limit
              </label>
              <div className="flex gap-2">
                {[20, 40, 60].map((l) => (
                  <button key={l} onClick={() => setLimit(l)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      limit === l ? "bg-primary text-white shadow-md" : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary border border-border"
                    }`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border-light">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Pipeline</p>
            <div className="flex flex-wrap gap-2">
              {["Google Places", "Google Maps", "Website Research", "Email Enrichment", "Social Discovery", "AI Scoring"].map((source) => (
                <span key={source} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-secondary text-xs font-medium text-text-secondary border border-border/50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                  {source}
                </span>
              ))}
            </div>
          </div>

          <button onClick={startDiscovery} disabled={!query}
            className="mt-8 w-full flex items-center justify-center gap-2 py-4 bg-gradient-primary text-white font-bold rounded-xl text-lg hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl">
            <Compass className="w-5 h-5" />
            Discover Prospects
          </button>
        </div>
      )}

      {/* Running Phase */}
      {phase === "running" && (
        <div className="bg-white rounded-2xl shadow-card border border-border/30 p-8 animate-scale-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h2 className="text-xl font-bold mb-1">Discovering Prospects...</h2>
            <p className="text-text-secondary text-sm">
              Searching for <span className="font-semibold text-primary">{query}</span>
              {location && <> in <span className="font-semibold text-primary">{location}</span></>}
            </p>
          </div>

          <div className="max-w-lg mx-auto mb-6">
            <p className="text-sm font-medium text-text-secondary mb-2">
              {stepLabel[currentStep] || currentStep}
            </p>
            {progress > 0 && (
              <div className="w-full bg-border/50 rounded-full h-2">
                <div className="bg-gradient-primary h-2 rounded-full progress-stripe transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>

          <div className="space-y-2 max-w-lg mx-auto max-h-64 overflow-y-auto">
            {events.map((event, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg text-sm">
                {event.step === "complete" ? (
                  <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                ) : event.step.includes("error") ? (
                  <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-primary/20 flex-shrink-0" />
                )}
                <span className="text-text-secondary">{event.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete Phase */}
      {phase === "complete" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{prospects.length} Prospects Found</h2>
              <p className="text-sm text-text-secondary">Sorted by quality score. Includes emails, socials, and AI research.</p>
            </div>
            <div className="flex gap-2">
              {!saved ? (
                <button onClick={saveProspects} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white font-medium rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving..." : "Save All Prospects"}
                </button>
              ) : (
                <>
                  <span className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 font-medium rounded-xl text-sm border border-green-200">
                    <CheckCircle2 className="w-4 h-4" /> Saved!
                  </span>
                  <a href="/dashboard/drafts"
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white font-medium rounded-xl text-sm hover:opacity-90 transition-opacity">
                    <FileText className="w-4 h-4" /> Generate Drafts
                  </a>
                </>
              )}
              <button onClick={() => { setPhase("input"); setSaved(false); }}
                className="px-4 py-2 bg-surface-secondary text-text-primary font-medium rounded-xl border border-border hover:bg-surface-tertiary transition-colors text-sm">
                New Search
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-border/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-secondary text-text-secondary text-left">
                    <th className="px-4 py-3 font-semibold">Company</th>
                    <th className="px-4 py-3 font-semibold">Industry</th>
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    <th className="px-4 py-3 font-semibold">Socials</th>
                    <th className="px-4 py-3 font-semibold">Rating</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {prospects.map((p, i) => (
                    <tr key={i} className="hover:bg-surface-secondary/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-card flex items-center justify-center border border-primary/10 flex-shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{p.company_name}</p>
                            <p className="text-xs text-text-tertiary truncate">{p.address || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">{p.industry || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {p.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-accent" />
                              <span className="text-xs truncate max-w-[160px]">{p.email}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                p.email_confidence === "high" ? "bg-green-50 text-green-600"
                                : p.email_confidence === "medium" ? "bg-amber-50 text-amber-600"
                                : "bg-gray-50 text-gray-500"
                              }`}>{p.email_confidence}</span>
                            </div>
                          )}
                          {p.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-text-tertiary" />
                              <span className="text-xs">{p.phone}</span>
                            </div>
                          )}
                          {!p.email && !p.phone && <span className="text-xs text-text-tertiary">No contact</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {p.socials?.instagram && (
                            <a href={p.socials.instagram.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 text-[10px] font-medium hover:bg-pink-100 transition-colors">
                              <Instagram className="w-3 h-3" />
                              @{p.socials.instagram.handle}
                            </a>
                          )}
                          {p.socials?.facebook && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium">FB</span>
                          )}
                          {p.socials?.linkedin && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-medium">Li</span>
                          )}
                          {!p.socials?.instagram && !p.socials?.facebook && !p.socials?.linkedin && (
                            <span className="text-xs text-text-tertiary">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.rating > 0 ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span className="text-sm font-medium">{p.rating}</span>
                            <span className="text-xs text-text-tertiary">({p.reviews})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-text-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-border/50 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${p.score >= 70 ? "bg-accent" : p.score >= 40 ? "bg-amber-500" : "bg-gray-400"}`}
                              style={{ width: `${p.score}%` }} />
                          </div>
                          <span className="text-xs font-medium">{p.score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {p.website && (
                          <a href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                            target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-surface-tertiary transition-colors">
                            <ExternalLink className="w-3.5 h-3.5 text-text-tertiary" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
