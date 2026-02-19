"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { safeFetch } from "@/lib/safe-fetch";

interface ClientStat {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  isActive: boolean;
  listingTokens: number;
  createdAt: string;
  totalGenerations: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalImages: number;
  totalDownloads: number;
  imageGenCount: number;
}

interface Activity {
  id: string;
  client_id: string;
  generation_type: string;
  total_tokens: number;
  model_used: string;
  status: string;
  created_at: string;
  clients?: { email: string; company_name: string };
}

interface CostBreakdown {
  inputTokenCost: number;
  outputTokenCost: number;
  imageGenCost: number;
  totalCost: number;
}

interface Totals {
  totalGenerations: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalDownloads: number;
  totalImages: number;
  totalClients: number;
  totalImageGens: number;
  costBreakdown: CostBreakdown;
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ClientStat[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create client form
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newContact, setNewContact] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const [tab, setTab] = useState<"overview" | "clients" | "activity">("overview");

  // Token management
  const [tokenClientId, setTokenClientId] = useState<string | null>(null);
  const [tokenAmount, setTokenAmount] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const data = await safeFetch<{
        clientStats: ClientStat[];
        recentActivity: Activity[];
        totals: Totals;
        error?: string;
      }>("/api/admin/stats");

      if (data.error) throw new Error(data.error);
      setStats(data.clientStats || []);
      setActivity(data.recentActivity || []);
      setTotals(data.totals || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleCreateClient = useCallback(async () => {
    if (!newEmail.trim() || !newPassword.trim() || creating) return;
    setCreating(true);
    setCreateMsg(null);

    try {
      const data = await safeFetch<{
        success?: boolean;
        error?: string;
      }>("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword.trim(),
          companyName: newCompany.trim(),
          contactName: newContact.trim(),
        }),
      });

      if (!data.success) throw new Error(data.error || "Failed to create client");

      setCreateMsg("Client created successfully!");
      setNewEmail("");
      setNewPassword("");
      setNewCompany("");
      setNewContact("");
      setShowCreate(false);
      fetchStats();
    } catch (err) {
      setCreateMsg(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setCreating(false);
    }
  }, [newEmail, newPassword, newCompany, newContact, creating, fetchStats]);

  const handleToggleActive = useCallback(
    async (clientId: string, currentActive: boolean) => {
      try {
        await safeFetch("/api/admin/clients", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, isActive: !currentActive }),
        });
        fetchStats();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Toggle failed");
      }
    },
    [fetchStats]
  );

  const handleAddTokens = useCallback(
    async (clientId: string) => {
      const amount = parseInt(tokenAmount, 10);
      if (!amount || tokenLoading) return;
      setTokenLoading(true);
      try {
        const data = await safeFetch<{ success?: boolean; balance?: number; error?: string }>(
          "/api/admin/listing-tokens",
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientId, amount }),
          }
        );
        if (!data.success) throw new Error(data.error || "Failed");
        setTokenAmount("");
        setTokenClientId(null);
        fetchStats();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update tokens");
      } finally {
        setTokenLoading(false);
      }
    },
    [tokenAmount, tokenLoading, fetchStats]
  );

  const handleLogout = useCallback(async () => {
    try {
      await safeFetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    router.replace("/login");
  }, [router]);

  const formatNumber = (n: number) => n.toLocaleString();
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  const formatTime = (d: string) =>
    new Date(d).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#e8e5df] border-t-[#8b7355] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      {/* Header */}
      <header className="glass border-b border-[#e8e5df] sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-full bg-[#0a0a0a] flex items-center justify-center">
                <span className="text-white text-xs font-bold">SP</span>
              </div>
              <span className="font-display font-bold text-[15px] tracking-tight text-[#0a0a0a] hidden sm:block">SoraPixel</span>
            </a>
            <span className="text-[11px] font-semibold text-[#8b7355] bg-[#f5f0e8] px-2.5 py-1 rounded-md tracking-[0.06em] uppercase">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/jewelry" className="px-3 py-2 text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200">Studio</a>
            <button onClick={handleLogout} className="px-3 py-2 text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-6 sm:py-10 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {createMsg && (
          <div className={`p-3 rounded-xl text-sm border ${createMsg.includes("success") ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
            {createMsg}
            <button onClick={() => setCreateMsg(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Overview Cards */}
        {totals && (
          <>
            <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-5 gap-2.5 sm:gap-4">
              {[
                { label: "Clients", value: formatNumber(totals.totalClients) },
                { label: "Generations", value: formatNumber(totals.totalGenerations) },
                { label: "Tokens", value: formatNumber(totals.totalTokens) },
                { label: "Images", value: formatNumber(totals.totalImages) },
                { label: "Downloads", value: formatNumber(totals.totalDownloads) },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-xl border border-[#e8e5df] p-3 sm:p-4">
                  <p className="text-[10px] sm:text-xs font-medium text-[#8c8c8c] uppercase tracking-wider truncate">{card.label}</p>
                  <p className="text-lg sm:text-2xl font-bold text-[#1b1b1f] mt-0.5 sm:mt-1">{card.value}</p>
                </div>
              ))}
            </div>

            {/* Cost Breakdown */}
            <div className="bg-gradient-to-br from-[#1b1b1f] to-[#2d2b3a] rounded-xl p-4 sm:p-6">
              <div className="flex flex-col min-[480px]:flex-row min-[480px]:items-center justify-between gap-1 mb-4">
                <h3 className="text-[13px] sm:text-sm font-bold text-white uppercase tracking-wider">API Cost Estimate</h3>
                <span className="text-[10px] sm:text-xs text-[#a0a0a0]">Gemini 2.5 Flash · 1 USD ≈ ₹86.5</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <p className="text-[10px] text-[#a0a0a0] uppercase tracking-wider">Input Tokens</p>
                  <p className="text-lg font-bold text-white mt-0.5">₹{totals.costBreakdown.inputTokenCost.toFixed(2)}</p>
                  <p className="text-[10px] text-[#666]">{formatNumber(totals.totalInputTokens)} tokens</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#a0a0a0] uppercase tracking-wider">Output Tokens</p>
                  <p className="text-lg font-bold text-white mt-0.5">₹{totals.costBreakdown.outputTokenCost.toFixed(2)}</p>
                  <p className="text-[10px] text-[#666]">{formatNumber(totals.totalOutputTokens)} tokens</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#a0a0a0] uppercase tracking-wider">Image Generation</p>
                  <p className="text-lg font-bold text-white mt-0.5">₹{totals.costBreakdown.imageGenCost.toFixed(2)}</p>
                  <p className="text-[10px] text-[#666]">{formatNumber(totals.totalImageGens)} images</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3 -m-1">
                  <p className="text-[10px] text-[#c4a67d] uppercase tracking-wider font-bold">Total Cost</p>
                  <p className="text-2xl font-bold text-[#c4a67d] mt-0.5">₹{totals.costBreakdown.totalCost.toFixed(2)}</p>
                  <p className="text-[10px] text-[#a0a0a0]">INR estimated</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-[#e8e5df] rounded-xl p-1">
          {(["overview", "clients", "activity"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 sm:py-2 rounded-lg text-[12px] sm:text-sm font-medium transition-all duration-200 ${
                tab === t
                  ? "bg-[#f5f0e8] text-[#8b7355]"
                  : "text-[#8c8c8c] hover:text-[#1b1b1f]"
              }`}
            >
              <span className="hidden sm:inline">
                {t === "overview" ? "Per-Client Stats" : t === "clients" ? "Manage Clients" : "Recent Activity"}
              </span>
              <span className="sm:hidden">
                {t === "overview" ? "Stats" : t === "clients" ? "Clients" : "Activity"}
              </span>
            </button>
          ))}
        </div>

        {/* Per-Client Stats Table */}
        {tab === "overview" && (
          <div className="bg-white rounded-xl border border-[#e8e5df] overflow-hidden">
            <div className="overflow-x-auto scroll-x-mobile">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#e8e5df] bg-[#fafaf8]">
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Client</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Generations</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Tokens</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Images</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Downloads</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Est. Cost</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((c) => (
                    <tr key={c.id} className="border-b border-[#e8e5df] last:border-0 hover:bg-[#fafaf8] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#1b1b1f]">{c.companyName || c.email}</div>
                        <div className="text-xs text-[#8c8c8c]">{c.email}</div>
                      </td>
                      <td className="text-right px-4 py-3 text-[#1b1b1f] font-medium">{formatNumber(c.totalGenerations)}</td>
                      <td className="text-right px-4 py-3 text-[#1b1b1f]">{formatNumber(c.totalTokens)}</td>
                      <td className="text-right px-4 py-3 text-[#1b1b1f]">{formatNumber(c.totalImages)}</td>
                      <td className="text-right px-4 py-3 text-[#1b1b1f]">{formatNumber(c.totalDownloads)}</td>
                      <td className="text-right px-4 py-3 text-[#c4a67d] font-bold">
                        ₹{(((c.totalInputTokens / 1_000_000) * 0.15 + (c.totalOutputTokens / 1_000_000) * 0.60 + c.imageGenCount * 0.0258) * 86.5).toFixed(2)}
                      </td>
                      <td className="text-center px-4 py-3">
                        <span className={`inline-block w-2 h-2 rounded-full ${c.isActive ? "bg-green-500" : "bg-red-400"}`} />
                      </td>
                    </tr>
                  ))}
                  {stats.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[#8c8c8c]">No clients yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Manage Clients */}
        {tab === "clients" && (
          <div className="space-y-4">
            {/* Create Client */}
            <div className="bg-white rounded-xl border border-[#e8e5df] p-4">
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="flex items-center gap-2 text-sm font-semibold text-[#8b7355] hover:text-[#6b5740] transition-colors"
              >
                <span className="text-lg">{showCreate ? "−" : "+"}</span>
                {showCreate ? "Cancel" : "Create New Client"}
              </button>

              {showCreate && (
                <div className="mt-4 space-y-3 animate-slide-up-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#8c8c8c] uppercase tracking-wider mb-1">Email *</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="client@company.com"
                        className="w-full px-3 py-2.5 rounded-lg border border-[#e8e5df] bg-[#fafaf8] text-sm text-[#1b1b1f] placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#8b7355] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#8c8c8c] uppercase tracking-wider mb-1">Password *</label>
                      <input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Temporary password"
                        className="w-full px-3 py-2.5 rounded-lg border border-[#e8e5df] bg-[#fafaf8] text-sm text-[#1b1b1f] placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#8b7355] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#8c8c8c] uppercase tracking-wider mb-1">Company Name</label>
                      <input
                        type="text"
                        value={newCompany}
                        onChange={(e) => setNewCompany(e.target.value)}
                        placeholder="Stylika"
                        className="w-full px-3 py-2.5 rounded-lg border border-[#e8e5df] bg-[#fafaf8] text-sm text-[#1b1b1f] placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#8b7355] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#8c8c8c] uppercase tracking-wider mb-1">Contact Name</label>
                      <input
                        type="text"
                        value={newContact}
                        onChange={(e) => setNewContact(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-3 py-2.5 rounded-lg border border-[#e8e5df] bg-[#fafaf8] text-sm text-[#1b1b1f] placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#8b7355] transition-colors"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCreateClient}
                    disabled={!newEmail.trim() || !newPassword.trim() || creating}
                    className="w-full sm:w-auto px-6 py-3 bg-[#0a0a0a] text-white rounded-full font-semibold text-[13px] hover:bg-[#1a1a1a] transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create Client"}
                  </button>
                </div>
              )}
            </div>

            {/* Clients List */}
            <div className="bg-white rounded-xl border border-[#e8e5df] overflow-hidden">
              <div className="overflow-x-auto scroll-x-mobile">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[#e8e5df] bg-[#fafaf8]">
                      <th className="text-left px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Client</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Company</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Listing Tokens</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Joined</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Status</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((c) => (
                      <tr key={c.id} className="border-b border-[#e8e5df] last:border-0 hover:bg-[#fafaf8] transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-[#1b1b1f]">{c.contactName || c.email}</div>
                          <div className="text-xs text-[#8c8c8c]">{c.email}</div>
                        </td>
                        <td className="px-4 py-3 text-[#1b1b1f]">{c.companyName || "—"}</td>
                        <td className="text-right px-4 py-3">
                          <span className="text-[#1b1b1f] font-bold">{formatNumber(c.listingTokens)}</span>
                          <button
                            onClick={() => setTokenClientId(tokenClientId === c.id ? null : c.id)}
                            className="ml-2 text-[11px] font-semibold text-[#8b7355] hover:text-[#6b5740] underline transition-colors"
                          >
                            {tokenClientId === c.id ? "Cancel" : "Add"}
                          </button>
                          {tokenClientId === c.id && (
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="number"
                                value={tokenAmount}
                                onChange={(e) => setTokenAmount(e.target.value)}
                                placeholder="e.g. 100"
                                className="w-24 px-2 py-1.5 rounded-lg border border-[#e8e5df] bg-white text-sm text-[#1b1b1f] text-right focus:outline-none focus:border-[#8b7355] transition-colors"
                              />
                              <button
                                onClick={() => handleAddTokens(c.id)}
                                disabled={!tokenAmount || tokenLoading}
                                className="px-3 py-1.5 bg-[#0a0a0a] text-white rounded-lg text-[11px] font-semibold hover:bg-[#1a1a1a] transition-all disabled:opacity-50"
                              >
                                {tokenLoading ? "..." : "Add"}
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#8c8c8c]">{formatDate(c.createdAt)}</td>
                        <td className="text-center px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                            {c.isActive ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="text-center px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(c.id, c.isActive)}
                            className={`text-xs font-medium px-3 py-1 rounded-lg border transition-colors ${
                              c.isActive
                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                : "border-green-200 text-green-700 hover:bg-green-50"
                            }`}
                          >
                            {c.isActive ? "Disable" : "Enable"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {stats.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-[#8c8c8c]">No clients yet. Create one above.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {tab === "activity" && (
          <div className="bg-white rounded-xl border border-[#e8e5df] overflow-hidden">
            <div className="overflow-x-auto scroll-x-mobile">
              <table className="w-full text-sm min-w-[650px]">
                <thead>
                  <tr className="border-b border-[#e8e5df] bg-[#fafaf8]">
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Time</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Type</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Tokens</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Model</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((a) => (
                    <tr key={a.id} className="border-b border-[#e8e5df] last:border-0 hover:bg-[#fafaf8] transition-colors">
                      <td className="px-4 py-3 text-[#8c8c8c] whitespace-nowrap">{formatTime(a.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="text-[#1b1b1f] text-xs">{a.clients?.company_name || a.clients?.email || "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 bg-[#f5f0e8] text-[#8b7355] rounded-md text-xs font-medium capitalize">
                          {a.generation_type}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 text-[#1b1b1f] font-mono text-xs">{formatNumber(a.total_tokens)}</td>
                      <td className="px-4 py-3 text-[#8c8c8c] text-xs">{a.model_used}</td>
                      <td className="text-center px-4 py-3">
                        <span className={`w-2 h-2 inline-block rounded-full ${a.status === "success" ? "bg-green-500" : "bg-red-400"}`} />
                      </td>
                    </tr>
                  ))}
                  {activity.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#8c8c8c]">No activity yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
