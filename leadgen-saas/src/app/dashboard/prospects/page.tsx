"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Building2, Mail, Phone, Star, Search, Filter, Download,
  ExternalLink, ArrowRight, Users, Loader2, Instagram, Trash2,
  FileText, Sparkles
} from "lucide-react";

interface SocialProfiles {
  instagram?: { handle: string; url: string };
  facebook?: { handle: string; url: string };
  linkedin?: { handle: string; url: string };
  [key: string]: { handle: string; url: string } | undefined;
}

interface Prospect {
  id: string;
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
  score: number;
  status: string;
  socials: SocialProfiles;
  contact_name: string;
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/prospects?${params}`);
      const data = await res.json();
      setProspects(data.prospects || []);
    } catch { /* skip */ }
    setLoading(false);
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(fetchProspects, 300);
    return () => clearTimeout(timer);
  }, [fetchProspects]);

  const deleteProspect = async (id: string) => {
    await fetch(`/api/prospects?id=${id}`, { method: "DELETE" });
    setProspects((prev) => prev.filter((p) => p.id !== id));
  };

  const generateDraft = async (prospect: Prospect) => {
    setGeneratingFor(prospect.id);
    try {
      // Get company brain
      const brainRes = await fetch("/api/brain");
      const brainData = await brainRes.json();

      if (!brainData.brain) {
        alert("Please onboard your business first to generate drafts.");
        setGeneratingFor(null);
        return;
      }

      const companyBrain = {
        company_name: brainData.brain.company_name,
        services: brainData.brain.services,
        industries_served: brainData.brain.industries_served,
        target_customers: brainData.brain.target_customers,
        usp: brainData.brain.usp,
        proof_points: brainData.brain.proof_points,
        tone: brainData.brain.tone,
      };

      // Generate draft
      const draftRes = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_brain: companyBrain,
          prospect: {
            company_name: prospect.company_name,
            industry: prospect.industry,
            research_summary: prospect.research_summary,
            email: prospect.email,
            website: prospect.website,
          },
        }),
      });

      const draftData = await draftRes.json();
      if (draftData.draft) {
        // Save draft to DB
        await fetch("/api/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prospect_id: prospect.id,
            subject: draftData.draft.subject,
            body: draftData.draft.body,
            personalization_reason: draftData.draft.personalization_reason,
            confidence: draftData.draft.confidence,
          }),
        });
        alert(`Draft generated for ${prospect.company_name}! Check the Drafts page.`);
      }
    } catch {
      alert("Failed to generate draft. Please try again.");
    }
    setGeneratingFor(null);
  };

  const exportCSV = () => {
    const headers = ["Company", "Industry", "Email", "Phone", "Website", "Rating", "Reviews", "Score", "Instagram", "Address"];
    const rows = prospects.map((p) => [
      p.company_name, p.industry, p.email, p.phone, p.website,
      p.rating, p.reviews, p.score, p.socials?.instagram?.handle || "", p.address,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prospects.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Prospects</h1>
          <p className="text-text-secondary text-sm">
            {prospects.length} prospects discovered. Click a prospect to see research and generate drafts.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-surface-secondary text-text-secondary font-medium rounded-xl border border-border hover:bg-surface-tertiary transition-colors text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <Link href="/dashboard/discover"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white font-medium rounded-xl text-sm hover:opacity-90 transition-opacity">
            <Users className="w-4 h-4" /> Find More
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search prospects..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-tertiary" />
          {["all", "new", "contacted", "replied"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                statusFilter === s ? "bg-primary text-white" : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary"
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {/* Table */}
      {!loading && prospects.length > 0 && (
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
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {prospects.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-card flex items-center justify-center border border-primary/10 flex-shrink-0">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.company_name}</p>
                          <p className="text-xs text-text-tertiary truncate">{p.address}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{p.industry}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {p.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-accent" />
                            <span className="text-xs truncate max-w-[140px]">{p.email}</span>
                          </div>
                        )}
                        {p.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-text-tertiary" />
                            <span className="text-xs">{p.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {p.socials?.instagram && (
                          <a href={p.socials.instagram.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-pink-50 text-pink-600 text-[10px] font-medium hover:bg-pink-100">
                            <Instagram className="w-3 h-3" /> @{p.socials.instagram.handle}
                          </a>
                        )}
                        {p.socials?.facebook && <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium">FB</span>}
                        {p.socials?.linkedin && <span className="px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-600 text-[10px] font-medium">Li</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-medium">{p.rating}</span>
                        <span className="text-xs text-text-tertiary">({p.reviews})</span>
                      </div>
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
                      <div className="flex items-center gap-1">
                        <button onClick={() => generateDraft(p)} disabled={generatingFor === p.id}
                          className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors" title="Generate Draft">
                          {generatingFor === p.id ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-primary" />}
                        </button>
                        {p.website && (
                          <a href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                            target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-surface-tertiary transition-colors">
                            <ExternalLink className="w-3.5 h-3.5 text-text-tertiary" />
                          </a>
                        )}
                        <button onClick={() => deleteProspect(p.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5 text-text-tertiary hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && prospects.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-surface-tertiary flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-text-tertiary" />
          </div>
          <p className="text-text-secondary mb-4">No prospects yet. Start discovering businesses.</p>
          <Link href="/dashboard/discover"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity">
            Discover Prospects <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
