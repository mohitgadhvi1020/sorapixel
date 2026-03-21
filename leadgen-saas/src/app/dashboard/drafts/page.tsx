"use client";

import { useState } from "react";
import {
  FileText, Mail, Copy, CheckCircle2, Edit3, Trash2,
  Download, Filter, Search, Building2, ArrowRight
} from "lucide-react";
import Link from "next/link";

interface Draft {
  id: string;
  prospect_name: string;
  prospect_industry: string;
  subject: string;
  body: string;
  personalization_reason: string;
  confidence: string;
  status: string;
  created_at: string;
}

const DEMO_DRAFTS: Draft[] = [
  {
    id: "1",
    prospect_name: "Bright Digital Agency",
    prospect_industry: "Digital Marketing",
    subject: "Quick thought on scaling beyond referrals",
    body: "Hi team at Bright Digital,\n\nI noticed you recently launched an analytics dashboard — congrats on the expansion. As you scale beyond referrals into outbound, having a website that converts cold traffic becomes critical.\n\nWe've helped agencies like yours increase inbound conversion by 40% through targeted landing page optimization.\n\nWould it be worth a quick chat about your growth plans?",
    personalization_reason: "Referenced their recent product launch and common agency pain point of scaling beyond referrals.",
    confidence: "high",
    status: "draft",
    created_at: "2026-03-17",
  },
  {
    id: "2",
    prospect_name: "GrowthStack Marketing",
    prospect_industry: "Marketing Agency",
    subject: "Helping SaaS-focused agencies convert more",
    body: "Hi GrowthStack team,\n\nYour focus on B2B SaaS marketing caught my eye — it's a space where website performance directly impacts pipeline.\n\nWe specialize in building conversion-optimized sites for SaaS companies and the agencies that serve them. Our last agency partner saw a 35% lift in client demo requests.\n\nInterested in exploring this?",
    personalization_reason: "Targeted their SaaS specialization and connected it to website conversion optimization.",
    confidence: "high",
    status: "draft",
    created_at: "2026-03-17",
  },
  {
    id: "3",
    prospect_name: "CloudNine Solutions",
    prospect_industry: "IT Consulting",
    subject: "Your cloud consulting site could work harder",
    body: "Hi CloudNine team,\n\nCloud migration is a competitive space in Europe — I imagine standing out online matters a lot for your pipeline.\n\nWe build websites specifically for IT consultancies that need to convey technical credibility while driving enterprise inquiries.\n\nWould you be open to a 15-minute look at some quick wins?",
    personalization_reason: "Referenced their European market focus and the competitive nature of cloud consulting.",
    confidence: "medium",
    status: "draft",
    created_at: "2026-03-16",
  },
];

export default function DraftsPage() {
  const [drafts] = useState<Draft[]>(DEMO_DRAFTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = drafts.filter((d) => {
    const matchesSearch =
      d.prospect_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const copyDraft = (draft: Draft) => {
    navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
    setCopiedId(draft.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Email Drafts</h1>
          <p className="text-text-secondary text-sm">
            Review, edit, and approve AI-generated outreach emails.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-surface-secondary text-text-secondary font-medium rounded-xl border border-border hover:bg-surface-tertiary transition-colors text-sm">
          <Download className="w-4 h-4" />
          Export All
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search drafts..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-tertiary" />
          {["all", "draft", "approved", "sent"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                statusFilter === s
                  ? "bg-primary text-white"
                  : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Drafts List */}
      <div className="space-y-4">
        {filtered.map((draft) => (
          <div
            key={draft.id}
            className="bg-white rounded-2xl shadow-card border border-border/30 overflow-hidden"
          >
            <div
              className="p-5 cursor-pointer hover:bg-surface-secondary/30 transition-colors"
              onClick={() =>
                setExpandedId(expandedId === draft.id ? null : draft.id)
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-card flex items-center justify-center border border-primary/10">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{draft.prospect_name}</p>
                      <span className="text-xs text-text-tertiary">
                        {draft.prospect_industry}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {draft.subject}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      draft.confidence === "high"
                        ? "bg-green-50 text-green-600"
                        : draft.confidence === "medium"
                          ? "bg-amber-50 text-amber-600"
                          : "bg-gray-50 text-gray-500"
                    }`}
                  >
                    {draft.confidence}
                  </span>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                      draft.status === "approved"
                        ? "bg-green-50 text-green-600"
                        : draft.status === "sent"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-gray-50 text-gray-500"
                    }`}
                  >
                    {draft.status}
                  </span>
                </div>
              </div>
            </div>

            {expandedId === draft.id && (
              <div className="px-5 pb-5 border-t border-border-light pt-4 animate-fade-in">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">
                      Subject
                    </p>
                    <p className="text-sm font-medium">{draft.subject}</p>
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
                    <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-primary">
                        Personalization reasoning
                      </p>
                      <p className="text-xs text-text-secondary">
                        {draft.personalization_reason}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border-light">
                  <button
                    onClick={() => copyDraft(draft)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    {copiedId === draft.id ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy
                      </>
                    )}
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface-secondary rounded-lg hover:bg-surface-tertiary transition-colors border border-border">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-error bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-surface-tertiary flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-text-tertiary" />
          </div>
          <p className="text-text-secondary mb-4">
            No drafts yet. Discover prospects and generate personalized emails.
          </p>
          <Link
            href="/dashboard/discover"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Discover Prospects
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
