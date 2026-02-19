"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";

interface Client {
  id: string;
  phone: string;
  email: string;
  company_name: string;
  contact_name: string;
  is_active: boolean;
  is_admin: boolean;
  token_balance: number;
  studio_free_used: number;
  allowed_sections: string[];
  subscription_plan?: string;
}

interface ActivityItem {
  id: string;
  client_id: string;
  generation_type: string;
  total_tokens: number;
  model_used: string;
  status: string;
  created_at: string;
}

interface StatsResponse {
  client_stats: Array<{
    id: string;
    phone?: string;
    email?: string;
    company_name?: string;
    total_generations: number;
    total_tokens_used: number;
    total_images: number;
    total_downloads: number;
    token_balance: number;
  }>;
  recent_activity: ActivityItem[];
  totals: {
    total_clients: number;
    total_generations: number;
    total_tokens: number;
  };
}

const SECTIONS = ["studio", "jewelry"];

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newSections, setNewSections] = useState<string[]>([...SECTIONS]);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const [tokenClientId, setTokenClientId] = useState<string | null>(null);
  const [tokenAmount, setTokenAmount] = useState("");
  const [addingTokens, setAddingTokens] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [clientsRes, statsRes] = await Promise.all([
        api.get<{ clients: Client[] }>("/admin/clients"),
        api.get<StatsResponse>("/admin/stats"),
      ]);
      setClients(clientsRes.clients || []);
      setStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAdmin && user === null) {
      router.replace("/");
      return;
    }
    if (!authLoading && !isAdmin && user) {
      router.replace("/");
      return;
    }
    if (isAdmin) {
      fetchData();
    }
  }, [authLoading, isAdmin, user, router, fetchData]);

  const handleCreateClient = useCallback(async () => {
    if (!newPhone.trim() || creating) return;
    setCreating(true);
    setCreateMsg(null);

    try {
      const data = await api.post<{ success: boolean; client_id?: string }>("/admin/clients", {
        phone: newPhone.trim(),
        name: newName.trim(),
        company_name: newCompany.trim(),
        allowed_sections: newSections,
      });

      if (!data.success) throw new Error("Failed to create client");

      setCreateMsg("Client created successfully!");
      setNewPhone("");
      setNewName("");
      setNewCompany("");
      setNewSections([...SECTIONS]);
      setShowCreate(false);
      fetchData();
    } catch (err) {
      setCreateMsg(err instanceof Error ? err.message : "Failed to create client");
    } finally {
      setCreating(false);
    }
  }, [newPhone, newName, newCompany, newSections, creating, fetchData]);

  const handleToggleActive = useCallback(
    async (clientId: string, currentActive: boolean) => {
      try {
        await api.patch("/admin/clients", {
          client_id: clientId,
          is_active: !currentActive,
        });
        fetchData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Toggle failed");
      }
    },
    [fetchData]
  );

  const handleToggleSections = useCallback(
    async (clientId: string, currentSections: string[], section: string) => {
      const next = currentSections.includes(section)
        ? currentSections.filter((s) => s !== section)
        : [...currentSections, section];

      try {
        await api.patch("/admin/clients", {
          client_id: clientId,
          allowed_sections: next,
        });
        fetchData();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update sections");
      }
    },
    [fetchData]
  );

  const handleAddTokens = useCallback(async () => {
    if (!tokenClientId || !tokenAmount.trim() || addingTokens) return;
    const amount = parseInt(tokenAmount, 10);
    if (isNaN(amount) || amount <= 0) return;

    setAddingTokens(true);
    try {
      await api.post("/admin/tokens", { client_id: tokenClientId, amount });
      setTokenClientId(null);
      setTokenAmount("");
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add tokens");
    } finally {
      setAddingTokens(false);
    }
  }, [tokenClientId, tokenAmount, addingTokens, fetchData]);

  const formatNumber = (n: number) => n.toLocaleString();
  const formatTime = (d: string) =>
    new Date(d).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const clientMap = new Map(clients.map((c) => [c.id, c.company_name || c.phone || c.email || "—"]));

  if (authLoading || (isAdmin && loading)) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#e8e5df] border-t-[#8b7355] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <header className="bg-white/80 backdrop-blur border-b border-[#e8e5df] sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-full bg-[#0a0a0a] flex items-center justify-center">
                <span className="text-white text-xs font-bold">SP</span>
              </div>
              <span className="font-semibold text-[15px] tracking-tight text-[#0a0a0a] hidden sm:block">
                SoraPixel
              </span>
            </a>
            <span className="text-[11px] font-semibold text-[#8b7355] bg-[#f5f0e8] px-2.5 py-1 rounded-md tracking-[0.06em] uppercase">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/studio"
              className="px-3 py-2 text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200"
            >
              Studio
            </a>
            <a
              href="/jewelry"
              className="px-3 py-2 text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200"
            >
              Jewelry
            </a>
            <a
              href="/profile"
              className="px-3 py-2 text-[13px] font-medium text-[#4a4a4a] rounded-lg hover:text-[#0a0a0a] hover:bg-black/[0.04] transition-all duration-200"
            >
              Profile
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 py-6 sm:py-10 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {createMsg && (
          <div
            className={`p-3 rounded-xl text-sm border ${
              createMsg.includes("success")
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {createMsg}
            <button onClick={() => setCreateMsg(null)} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Stats overview */}
        {stats?.totals && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
            {[
              { label: "Total Clients", value: formatNumber(stats.totals.total_clients) },
              { label: "Total Generations", value: formatNumber(stats.totals.total_generations) },
              { label: "Total Tokens", value: formatNumber(stats.totals.total_tokens) },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-white rounded-xl border border-[#e8e5df] p-3 sm:p-4"
              >
                <p className="text-[10px] sm:text-xs font-medium text-[#8c8c8c] uppercase tracking-wider truncate">
                  {card.label}
                </p>
                <p className="text-lg sm:text-2xl font-bold text-[#1b1b1f] mt-0.5 sm:mt-1">
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Create new client */}
        <div className="bg-white rounded-xl border border-[#e8e5df] p-4">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 text-sm font-semibold text-[#8b7355] hover:text-[#6b5740] transition-colors"
          >
            <span className="text-lg">{showCreate ? "−" : "+"}</span>
            {showCreate ? "Cancel" : "Create New Client"}
          </button>

          {showCreate && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#8c8c8c] uppercase tracking-wider mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2.5 rounded-lg border border-[#e8e5df] bg-[#fafaf8] text-sm text-[#1b1b1f] placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#8b7355] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#8c8c8c] uppercase tracking-wider mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-3 py-2.5 rounded-lg border border-[#e8e5df] bg-[#fafaf8] text-sm text-[#1b1b1f] placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#8b7355] transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#8c8c8c] uppercase tracking-wider mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full px-3 py-2.5 rounded-lg border border-[#e8e5df] bg-[#fafaf8] text-sm text-[#1b1b1f] placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#8b7355] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8c8c8c] uppercase tracking-wider mb-2">
                  Section Access
                </label>
                <div className="flex gap-3">
                  {SECTIONS.map((section) => (
                    <label key={section} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newSections.includes(section)}
                        onChange={() =>
                          setNewSections((prev) =>
                            prev.includes(section)
                              ? prev.filter((s) => s !== section)
                              : [...prev, section]
                          )
                        }
                        className="w-4 h-4 rounded border-[#e8e5df] text-[#8b7355] focus:ring-[#8b7355]"
                      />
                      <span className="text-sm font-medium text-[#1b1b1f] capitalize">
                        {section}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateClient}
                disabled={!newPhone.trim() || creating}
                className="px-6 py-3 bg-[#0a0a0a] text-white rounded-full font-semibold text-[13px] hover:bg-[#1a1a1a] transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Client"}
              </button>
            </div>
          )}
        </div>

        {/* Client list table */}
        <div className="bg-white rounded-xl border border-[#e8e5df] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-[#e8e5df] bg-[#fafaf8]">
                  <th className="text-left px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">
                    Company
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">
                    Tokens
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">
                    Sections
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[#e8e5df] last:border-0 hover:bg-[#fafaf8] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1b1b1f]">{c.phone || "—"}</div>
                      {c.email && (
                        <div className="text-xs text-[#8c8c8c] truncate max-w-[140px]">
                          {c.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#1b1b1f]">
                      {c.company_name || c.contact_name || "—"}
                    </td>
                    <td className="text-center px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          c.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                        }`}
                      >
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <span className="text-sm font-bold text-[#8b7355]">{c.token_balance}</span>
                    </td>
                    <td className="text-center px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {SECTIONS.map((section) => (
                          <button
                            key={section}
                            onClick={() =>
                              handleToggleSections(c.id, c.allowed_sections || [], section)
                            }
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors capitalize ${
                              (c.allowed_sections || []).includes(section)
                                ? "bg-[#f5f0e8] border-[#d4c5a9] text-[#8b7355]"
                                : "bg-[#f5f5f5] border-[#e0e0e0] text-[#b0b0b0]"
                            }`}
                          >
                            {section}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="text-center px-4 py-3">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggleActive(c.id, c.is_active)}
                            className={`text-xs font-medium px-3 py-1 rounded-lg border transition-colors ${
                              c.is_active
                                ? "border-red-200 text-red-600 hover:bg-red-50"
                                : "border-green-200 text-green-700 hover:bg-green-50"
                            }`}
                          >
                            {c.is_active ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() =>
                              setTokenClientId(tokenClientId === c.id ? null : c.id)
                            }
                            className="text-xs font-medium px-3 py-1 rounded-lg border border-[#d4c5a9] text-[#8b7355] hover:bg-[#f5f0e8] transition-colors"
                          >
                            + Tokens
                          </button>
                        </div>
                        {tokenClientId === c.id && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              value={tokenAmount}
                              onChange={(e) => setTokenAmount(e.target.value)}
                              placeholder="Amount"
                              className="w-24 px-2 py-1.5 rounded-lg border border-[#e8e5df] bg-[#fafaf8] text-sm text-center focus:outline-none focus:border-[#8b7355]"
                            />
                            <button
                              onClick={handleAddTokens}
                              disabled={!tokenAmount.trim() || addingTokens}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                            >
                              {addingTokens ? "..." : "Add"}
                            </button>
                            <button
                              onClick={() => {
                                setTokenClientId(null);
                                setTokenAmount("");
                              }}
                              className="text-xs font-medium text-[#8c8c8c] hover:text-[#1b1b1f]"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-[#8c8c8c]"
                    >
                      No clients yet. Create one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-[#e8e5df] overflow-hidden">
          <h3 className="px-4 py-3 text-sm font-bold text-[#8b7355] uppercase tracking-wider border-b border-[#e8e5df] bg-[#fafaf8]">
            Recent Activity (last 50)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[550px]">
              <thead>
                <tr className="border-b border-[#e8e5df] bg-[#fafaf8]">
                  <th className="text-left px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">
                    Time
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">
                    Client
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">
                    Tokens
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">
                    Model
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-[#8b7355] uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recent_activity || []).map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-[#e8e5df] last:border-0 hover:bg-[#fafaf8] transition-colors"
                  >
                    <td className="px-4 py-3 text-[#8c8c8c] whitespace-nowrap">
                      {formatTime(a.created_at)}
                    </td>
                    <td className="px-4 py-3 text-[#1b1b1f] text-xs">
                      {clientMap.get(a.client_id) || a.client_id.slice(0, 8) + "…"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 bg-[#f5f0e8] text-[#8b7355] rounded-md text-xs font-medium capitalize">
                        {a.generation_type}
                      </span>
                    </td>
                    <td className="text-right px-4 py-3 text-[#1b1b1f] font-mono text-xs">
                      {formatNumber(a.total_tokens)}
                    </td>
                    <td className="px-4 py-3 text-[#8c8c8c] text-xs">
                      {a.model_used || "—"}
                    </td>
                    <td className="text-center px-4 py-3">
                      <span
                        className={`w-2 h-2 inline-block rounded-full ${
                          a.status === "success" ? "bg-green-500" : "bg-red-400"
                        }`}
                        title={a.status}
                      />
                    </td>
                  </tr>
                ))}
                {(!stats?.recent_activity || stats.recent_activity.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-[#8c8c8c]"
                    >
                      No activity yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
