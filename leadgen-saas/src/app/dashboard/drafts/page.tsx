"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText, Mail, Copy, CheckCircle2, Edit3, Trash2,
  Download, Filter, Search, Building2, ArrowRight, Send,
  Loader2, Sparkles, X, Save
} from "lucide-react";

interface Draft {
  id: string;
  prospect_id: string;
  subject: string;
  body: string;
  personalization_reason: string;
  confidence: string;
  status: string;
  created_at: string;
  prospects?: { company_name: string; industry: string } | null;
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState("");

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/drafts?${params}`);
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch { /* skip */ }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  const filtered = drafts.filter((d) => {
    const name = d.prospects?.company_name || "";
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.subject.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const copyDraft = (draft: Draft) => {
    navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopiedId(draft.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteDraft = async (id: string) => {
    await fetch(`/api/drafts?id=${id}`, { method: "DELETE" });
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const approveDraft = async (id: string) => {
    const res = await fetch("/api/drafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "approved" }),
    });
    if (res.ok) {
      setDrafts((prev) => prev.map((d) => d.id === id ? { ...d, status: "approved" } : d));
    }
  };

  const sendDraft = async (draft: Draft) => {
    setSendingId(draft.id);
    try {
      // Need prospect email — fetch from prospects API
      const prospectRes = await fetch(`/api/prospects?search=${encodeURIComponent(draft.prospects?.company_name || "")}`);
      const prospectData = await prospectRes.json();
      const prospect = prospectData.prospects?.find((p: { id: string }) => p.id === draft.prospect_id);

      if (!prospect?.email) {
        alert("No email found for this prospect. Please enrich the prospect first.");
        setSendingId(null);
        return;
      }

      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: prospect.email,
          subject: draft.subject,
          body: draft.body,
          draft_id: draft.id,
          prospect_id: draft.prospect_id,
        }),
      });

      if (res.ok) {
        setDrafts((prev) => prev.map((d) => d.id === draft.id ? { ...d, status: "sent" } : d));
      } else {
        const err = await res.json();
        alert(`Failed to send: ${err.error}`);
      }
    } catch {
      alert("Failed to send email.");
    }
    setSendingId(null);
  };

  const startEdit = (draft: Draft) => {
    setEditingId(draft.id);
    setEditSubject(draft.subject);
    setEditBody(draft.body);
  };

  const saveEdit = async (id: string) => {
    const res = await fetch("/api/drafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, subject: editSubject, body: editBody }),
    });
    if (res.ok) {
      setDrafts((prev) => prev.map((d) => d.id === id ? { ...d, subject: editSubject, body: editBody } : d));
    }
    setEditingId(null);
  };

  const generateBatchDrafts = async () => {
    setGenerating(true);
    setGenProgress("Loading company brain...");
    try {
      const brainRes = await fetch("/api/brain");
      const brainData = await brainRes.json();
      if (!brainData.brain) {
        alert("Please onboard your business first.");
        setGenerating(false);
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

      setGenProgress("Fetching prospects...");
      const prospectsRes = await fetch("/api/prospects?status=new&limit=10");
      const prospectsData = await prospectsRes.json();
      const prospects = prospectsData.prospects || [];

      if (prospects.length === 0) {
        alert("No new prospects found. Discover prospects first.");
        setGenerating(false);
        return;
      }

      for (let i = 0; i < Math.min(prospects.length, 10); i++) {
        const prospect = prospects[i];
        setGenProgress(`Generating draft ${i + 1}/${Math.min(prospects.length, 10)} for ${prospect.company_name}...`);

        try {
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
          }
        } catch { /* continue */ }
      }

      setGenProgress("");
      fetchDrafts();
    } catch {
      alert("Generation failed.");
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Email Drafts</h1>
          <p className="text-text-secondary text-sm">
            Review, edit, approve, and send AI-generated outreach emails.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateBatchDrafts} disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white font-medium rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-60">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Generating..." : "Generate Drafts"}
          </button>
        </div>
      </div>

      {/* Generation Progress */}
      {generating && genProgress && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
          <span className="text-sm text-primary font-medium">{genProgress}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search drafts..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-tertiary" />
          {["all", "draft", "approved", "sent"].map((s) => (
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

      {/* Drafts List */}
      {!loading && (
        <div className="space-y-4">
          {filtered.map((draft) => (
            <div key={draft.id} className="bg-white rounded-2xl shadow-card border border-border/30 overflow-hidden">
              <div className="p-5 cursor-pointer hover:bg-surface-secondary/30 transition-colors"
                onClick={() => setExpandedId(expandedId === draft.id ? null : draft.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-card flex items-center justify-center border border-primary/10">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{draft.prospects?.company_name || "Unknown"}</p>
                        <span className="text-xs text-text-tertiary">{draft.prospects?.industry || ""}</span>
                      </div>
                      <p className="text-sm text-text-secondary flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />{draft.subject}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      draft.confidence === "high" ? "bg-green-50 text-green-600"
                      : draft.confidence === "medium" ? "bg-amber-50 text-amber-600"
                      : "bg-gray-50 text-gray-500"
                    }`}>{draft.confidence}</span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                      draft.status === "approved" ? "bg-green-50 text-green-600"
                      : draft.status === "sent" ? "bg-blue-50 text-blue-600"
                      : "bg-gray-50 text-gray-500"
                    }`}>{draft.status}</span>
                  </div>
                </div>
              </div>

              {expandedId === draft.id && (
                <div className="px-5 pb-5 border-t border-border-light pt-4 animate-fade-in">
                  {editingId === draft.id ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">Subject</p>
                        <input type="text" value={editSubject} onChange={(e) => setEditSubject(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">Body</p>
                        <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={8}
                          className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-y" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(draft.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:opacity-90">
                          <Save className="w-3.5 h-3.5" /> Save
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface-secondary rounded-lg hover:bg-surface-tertiary border border-border">
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">Subject</p>
                        <p className="text-sm font-medium">{draft.subject}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">Body</p>
                        <div className="text-sm bg-surface-secondary px-4 py-3 rounded-lg whitespace-pre-wrap leading-relaxed">
                          {draft.body}
                        </div>
                      </div>
                      {draft.personalization_reason && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-primary">Personalization reasoning</p>
                            <p className="text-xs text-text-secondary">{draft.personalization_reason}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-light">
                        {draft.status !== "sent" && (
                          <button onClick={() => sendDraft(draft)} disabled={sendingId === draft.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
                            {sendingId === draft.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            {sendingId === draft.id ? "Sending..." : "Send Email"}
                          </button>
                        )}
                        {draft.status === "draft" && (
                          <button onClick={() => approveDraft(draft.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-500 text-white rounded-lg hover:opacity-90">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}
                        <button onClick={() => copyDraft(draft)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:opacity-90">
                          {copiedId === draft.id ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                        </button>
                        <button onClick={() => startEdit(draft)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface-secondary rounded-lg hover:bg-surface-tertiary border border-border">
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button onClick={() => deleteDraft(draft.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-error bg-red-50 rounded-lg hover:bg-red-100">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-surface-tertiary flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-text-tertiary" />
          </div>
          <p className="text-text-secondary mb-4">No drafts yet. Discover prospects and generate personalized emails.</p>
          <Link href="/dashboard/discover"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity">
            Discover Prospects <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
