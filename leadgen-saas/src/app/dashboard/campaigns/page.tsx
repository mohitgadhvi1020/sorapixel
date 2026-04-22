"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Megaphone, Plus, Users, Mail, Send, Loader2, CheckCircle2,
  Play, Pause, ArrowRight, BarChart3, Calendar
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: string;
  prospects_count: number;
  emails_sent: number;
  created_at: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch { /* skip */ }
    setLoading(false);
  };

  const createCampaign = async () => {
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        setName("");
        setDescription("");
        setShowCreate(false);
        fetchCampaigns();
      }
    } catch { /* skip */ }
    setCreating(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch("/api/campaigns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-50 text-green-600";
      case "paused": return "bg-amber-50 text-amber-600";
      case "completed": return "bg-blue-50 text-blue-600";
      default: return "bg-gray-50 text-gray-500";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Campaigns</h1>
          <p className="text-text-secondary text-sm">
            Organize your outreach into campaigns. Track prospects and email performance.
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white font-medium rounded-xl text-sm hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* Create Campaign Form */}
      {showCreate && (
        <div className="bg-white rounded-2xl shadow-card border border-border/30 p-6 animate-scale-in">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" /> Create Campaign
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Campaign Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Q2 Agency Outreach"
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface-secondary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Description (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this campaign's goal"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface-secondary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm resize-y" />
            </div>
            <div className="flex gap-2">
              <button onClick={createCampaign} disabled={!name || creating}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {creating ? "Creating..." : "Create Campaign"}
              </button>
              <button onClick={() => setShowCreate(false)}
                className="px-6 py-3 bg-surface-secondary text-text-secondary font-medium rounded-xl border border-border hover:bg-surface-tertiary transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {/* Campaigns Grid */}
      {!loading && campaigns.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-2xl shadow-card border border-border/30 p-6 hover:shadow-card-hover transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold">{campaign.name}</h3>
                  {campaign.description && (
                    <p className="text-sm text-text-secondary mt-1">{campaign.description}</p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusColor(campaign.status)}`}>
                  {campaign.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 rounded-xl bg-surface-secondary">
                  <Users className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold">{campaign.prospects_count}</p>
                  <p className="text-[10px] text-text-tertiary">Prospects</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-surface-secondary">
                  <Mail className="w-4 h-4 text-accent mx-auto mb-1" />
                  <p className="text-lg font-bold">{campaign.emails_sent}</p>
                  <p className="text-[10px] text-text-tertiary">Sent</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-surface-secondary">
                  <Calendar className="w-4 h-4 text-text-tertiary mx-auto mb-1" />
                  <p className="text-xs font-medium mt-1">{new Date(campaign.created_at).toLocaleDateString()}</p>
                  <p className="text-[10px] text-text-tertiary">Created</p>
                </div>
              </div>

              <div className="flex gap-2">
                {campaign.status === "draft" && (
                  <button onClick={() => updateStatus(campaign.id, "active")}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-primary text-white font-medium rounded-xl text-sm hover:opacity-90 transition-opacity">
                    <Play className="w-4 h-4" /> Start
                  </button>
                )}
                {campaign.status === "active" && (
                  <button onClick={() => updateStatus(campaign.id, "paused")}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-500 text-white font-medium rounded-xl text-sm hover:opacity-90 transition-opacity">
                    <Pause className="w-4 h-4" /> Pause
                  </button>
                )}
                {campaign.status === "paused" && (
                  <button onClick={() => updateStatus(campaign.id, "active")}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white font-medium rounded-xl text-sm hover:opacity-90 transition-opacity">
                    <Play className="w-4 h-4" /> Resume
                  </button>
                )}
                {campaign.status === "active" && (
                  <button onClick={() => updateStatus(campaign.id, "completed")}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-surface-secondary text-text-secondary font-medium rounded-xl text-sm border border-border hover:bg-surface-tertiary transition-colors">
                    <CheckCircle2 className="w-4 h-4" /> Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && campaigns.length === 0 && !showCreate && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-surface-tertiary flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-text-tertiary" />
          </div>
          <p className="text-text-secondary mb-2">No campaigns yet.</p>
          <p className="text-sm text-text-tertiary mb-6">Create a campaign to organize your outreach and track performance.</p>
          <button onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Create First Campaign
          </button>
        </div>
      )}
    </div>
  );
}
