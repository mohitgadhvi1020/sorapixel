"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

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

interface FeedItem {
  id: string;
  category_id: string;
  title: string;
  before_image_url: string;
  after_image_url: string;
  item_type: string;
  tags: Record<string, string> | null;
  display_order: number;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ModelOption { id: string; name: string; thumb: string; }
interface PoseOption { id: string; label: string; thumb: string; }
interface BackgroundOption { id: string; label: string; thumb: string; }
interface GenResult { url: string; label: string; pose: string; error?: string; }

const SECTIONS = ["studio", "jewelry"];
const ITEM_TYPES = ["photoshoot", "catalogue", "branding"];
const MAX_POSES = 4;

const EMPTY_FEED_FORM = {
  category_id: "",
  title: "",
  before_image_url: "",
  after_image_url: "",
  item_type: "catalogue",
  tags: "",
  display_order: 0,
  is_active: true,
};

type AdminTab = "overview" | "feed";

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
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

  // Feed state
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedForm, setFeedForm] = useState(EMPTY_FEED_FORM);
  const [editingFeedId, setEditingFeedId] = useState<string | null>(null);
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [feedSaving, setFeedSaving] = useState(false);
  const [afterUploading, setAfterUploading] = useState(false);
  const [beforeUploading, setBeforeUploading] = useState(false);
  const afterInputRef = useRef<HTMLInputElement>(null);
  const beforeInputRef = useRef<HTMLInputElement>(null);

  // Admin Catalogue Generation state
  const [showGenModal, setShowGenModal] = useState(false);
  const [genModels, setGenModels] = useState<ModelOption[]>([]);
  const [genPoses, setGenPoses] = useState<PoseOption[]>([]);
  const [genBackgrounds, setGenBackgrounds] = useState<BackgroundOption[]>([]);
  const [genImage, setGenImage] = useState<string | null>(null);
  const [genModel, setGenModel] = useState("indian_woman");
  const [genSelectedPoses, setGenSelectedPoses] = useState<string[]>(["standing", "side_view", "back_view", "sitting"]);
  const [genBg, setGenBg] = useState("best_match");
  const [genSpecialInstructions, setGenSpecialInstructions] = useState("");
  const [genKeyHighlights, setGenKeyHighlights] = useState("");
  const [genGenerating, setGenGenerating] = useState(false);
  const [genResults, setGenResults] = useState<GenResult[]>([]);
  const [genActiveResult, setGenActiveResult] = useState(0);
  const [genStep, setGenStep] = useState<"upload" | "configure" | "results">("upload");
  const [genSaving, setGenSaving] = useState(false);
  const [genSaveForm, setGenSaveForm] = useState({ title: "", category_id: "", display_order: 0 });
  const genFileRef = useRef<HTMLInputElement>(null);

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

  const fetchFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const [feedRes, catRes] = await Promise.all([
        api.get<{ items: FeedItem[] }>("/admin/feed-items"),
        api.get<{ categories: Category[] }>("/feed/categories"),
      ]);
      setFeedItems(feedRes.items || []);
      setCategories(catRes.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed items");
    } finally {
      setFeedLoading(false);
    }
  }, []);

  const loadCatalogueOptions = useCallback(async () => {
    try {
      const [m, p, b] = await Promise.all([
        api.get<{ models: ModelOption[] }>("/catalogue/models"),
        api.get<{ poses: PoseOption[] }>("/catalogue/poses"),
        api.get<{ backgrounds: BackgroundOption[] }>("/catalogue/backgrounds"),
      ]);
      setGenModels(m.models || []);
      setGenPoses(p.poses || []);
      setGenBackgrounds(b.backgrounds || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAdmin && user === null) { router.replace("/"); return; }
    if (!authLoading && !isAdmin && user) { router.replace("/"); return; }
    if (isAdmin) fetchData();
  }, [authLoading, isAdmin, user, router, fetchData]);

  useEffect(() => {
    if (isAdmin && activeTab === "feed" && feedItems.length === 0 && !feedLoading) {
      fetchFeed();
    }
  }, [isAdmin, activeTab, feedItems.length, feedLoading, fetchFeed]);

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
      setNewPhone(""); setNewName(""); setNewCompany("");
      setNewSections([...SECTIONS]);
      setShowCreate(false);
      fetchData();
    } catch (err) {
      setCreateMsg(err instanceof Error ? err.message : "Failed to create client");
    } finally { setCreating(false); }
  }, [newPhone, newName, newCompany, newSections, creating, fetchData]);

  const handleToggleActive = useCallback(async (clientId: string, currentActive: boolean) => {
    try {
      await api.patch("/admin/clients", { client_id: clientId, is_active: !currentActive });
      fetchData();
    } catch (err) { setError(err instanceof Error ? err.message : "Toggle failed"); }
  }, [fetchData]);

  const handleToggleSections = useCallback(async (clientId: string, currentSections: string[], section: string) => {
    const next = currentSections.includes(section)
      ? currentSections.filter((s) => s !== section)
      : [...currentSections, section];
    try {
      await api.patch("/admin/clients", { client_id: clientId, allowed_sections: next });
      fetchData();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to update sections"); }
  }, [fetchData]);

  const handleAddTokens = useCallback(async () => {
    if (!tokenClientId || !tokenAmount.trim() || addingTokens) return;
    const amount = parseInt(tokenAmount, 10);
    if (isNaN(amount) || amount <= 0) return;
    setAddingTokens(true);
    try {
      await api.post("/admin/tokens", { client_id: tokenClientId, amount });
      setTokenClientId(null); setTokenAmount("");
      fetchData();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to add tokens"); }
    finally { setAddingTokens(false); }
  }, [tokenClientId, tokenAmount, addingTokens, fetchData]);

  // Feed CRUD
  const openCreateFeed = () => {
    setFeedForm(EMPTY_FEED_FORM);
    setEditingFeedId(null);
    setShowFeedModal(true);
  };

  // Admin Catalogue Generation handlers
  const openGenModal = () => {
    setGenStep("upload");
    setGenImage(null);
    setGenResults([]);
    setGenActiveResult(0);
    setGenSpecialInstructions("");
    setGenKeyHighlights("");
    setGenSaveForm({ title: "", category_id: "", display_order: 0 });
    if (genModels.length === 0) loadCatalogueOptions();
    setShowGenModal(true);
  };

  const handleGenImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setGenImage(reader.result as string);
      setGenStep("configure");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const toggleGenPose = (poseId: string) => {
    setGenSelectedPoses(prev => {
      if (prev.includes(poseId)) return prev.filter(p => p !== poseId);
      if (prev.length >= MAX_POSES) return prev;
      return [...prev, poseId];
    });
  };

  const handleAdminGenerate = async () => {
    if (!genImage || genSelectedPoses.length === 0) return;
    setGenGenerating(true);
    setError("");
    try {
      const data = await api.post<{ success: boolean; images: GenResult[] }>(
        "/admin/generate-catalogue",
        {
          image_base64: genImage,
          model_type: genModel,
          poses: genSelectedPoses,
          background: genBg,
          special_instructions: genSpecialInstructions || undefined,
          key_highlights: genKeyHighlights || undefined,
        }
      );
      const valid = (data.images || []).filter(i => i.url);
      setGenResults(valid);
      setGenActiveResult(0);
      setGenStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenGenerating(false);
    }
  };

  const handleSaveCatFeedItem = async () => {
    if (!genResults[genActiveResult]?.url) return;
    if (!genSaveForm.category_id) { setError("Please select a category"); return; }
    setGenSaving(true);
    try {
      await api.post("/admin/feed-items", {
        category_id: genSaveForm.category_id,
        title: genSaveForm.title || genResults[genActiveResult].label,
        after_image_url: genResults[genActiveResult].url,
        item_type: "catalogue",
        display_order: genSaveForm.display_order,
        is_active: true,
        tags: {
          model: genModel,
          poses: genSelectedPoses,
          background: genBg,
          description: genResults[genActiveResult].label,
        },
      });
      setShowGenModal(false);
      fetchFeed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save feed item");
    } finally {
      setGenSaving(false);
    }
  };

  const openEditFeed = (item: FeedItem) => {
    setFeedForm({
      category_id: item.category_id || "",
      title: item.title || "",
      before_image_url: item.before_image_url || "",
      after_image_url: item.after_image_url || "",
      item_type: item.item_type || "photoshoot",
      tags: item.tags ? JSON.stringify(item.tags) : "",
      display_order: item.display_order || 0,
      is_active: item.is_active !== false,
    });
    setEditingFeedId(item.id);
    setShowFeedModal(true);
  };

  const handleSaveFeed = async () => {
    if (!feedForm.category_id || !feedForm.after_image_url) {
      setError("Category and After Image URL are required");
      return;
    }
    setFeedSaving(true);
    try {
      let parsedTags: Record<string, string> | undefined;
      if (feedForm.tags.trim()) {
        try { parsedTags = JSON.parse(feedForm.tags); } catch { parsedTags = { description: feedForm.tags }; }
      }

      const payload = {
        category_id: feedForm.category_id,
        title: feedForm.title,
        before_image_url: feedForm.before_image_url,
        after_image_url: feedForm.after_image_url,
        item_type: feedForm.item_type,
        tags: parsedTags || null,
        display_order: feedForm.display_order,
        is_active: feedForm.is_active,
      };

      if (editingFeedId) {
        await api.put(`/admin/feed-items/${editingFeedId}`, payload);
      } else {
        await api.post("/admin/feed-items", payload);
      }
      setShowFeedModal(false);
      fetchFeed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save feed item");
    } finally { setFeedSaving(false); }
  };

  const handleDeleteFeed = async (id: string) => {
    if (!confirm("Delete this feed item?")) return;
    try {
      await api.delete(`/admin/feed-items/${id}`);
      fetchFeed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete feed item");
    }
  };

  const handleToggleFeedActive = async (item: FeedItem) => {
    try {
      await api.put(`/admin/feed-items/${item.id}`, { is_active: !item.is_active });
      fetchFeed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update feed item");
    }
  };

  const uploadFeedImage = async (file: File, field: "after_image_url" | "before_image_url") => {
    const setUploading = field === "after_image_url" ? setAfterUploading : setBeforeUploading;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload<{ success: boolean; url: string }>("/admin/upload-image", fd);
      if (res.url) {
        setFeedForm(f => ({ ...f, [field]: res.url }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent, field: "after_image_url" | "before_image_url") => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) uploadFeedImage(file, field);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, field: "after_image_url" | "before_image_url") => {
    const file = e.target.files?.[0];
    if (file) uploadFeedImage(file, field);
    e.target.value = "";
  };

  const formatNumber = (n: number) => n.toLocaleString();
  const formatTime = (d: string) =>
    new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const clientMap = new Map(clients.map((c) => [c.id, c.company_name || c.phone || c.email || "—"]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  if (authLoading || (isAdmin && loading)) {
    return (
      <div className="min-h-screen bg-[#0E0F14] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[rgba(255,106,0,0.2)] border-t-[#FF6A00] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <ResponsiveLayout title="Admin">
      <div className="space-y-8">
        {/* Alerts */}
        {error && (
          <div className="bg-error-light border border-error/10 text-error px-4 py-3 rounded-xl text-sm flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-error font-medium text-xs">Dismiss</button>
          </div>
        )}
        {createMsg && (
          <div className={`px-4 py-3 rounded-xl text-sm border flex items-center justify-between ${createMsg.includes("success")
            ? "bg-success-light border-success/10 text-success"
            : "bg-error-light border-error/10 text-error"
            }`}>
            {createMsg}
            <button onClick={() => setCreateMsg(null)} className="font-medium text-xs">Dismiss</button>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex border-b border-border">
          {([
            { id: "overview" as const, label: "Overview & Clients" },
            { id: "feed" as const, label: "Feed Manager" },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 py-2.5 text-sm font-medium transition-all duration-200 ${activeTab === tab.id ? "text-foreground" : "text-text-secondary hover:text-foreground"
                }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#FF6A00] to-[#FF8A3D] rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === "overview" && (
          <>
            {/* Stats */}
            {stats?.totals && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Total Clients", value: formatNumber(stats.totals.total_clients) },
                  { label: "Total Generations", value: formatNumber(stats.totals.total_generations) },
                  { label: "Total Tokens", value: formatNumber(stats.totals.total_tokens) },
                ].map((card) => (
                  <Card key={card.label} padding="md">
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">{card.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
                  </Card>
                ))}
              </div>
            )}

            {/* Create client */}
            <Card padding="md">
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent-dark transition-colors"
              >
                <span className="text-lg">{showCreate ? "−" : "+"}</span>
                {showCreate ? "Cancel" : "Create New Client"}
              </button>

              {showCreate && (
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="9876543210" />
                    <Input label="Contact Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Doe" />
                    <div className="sm:col-span-2">
                      <Input label="Company" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="Acme Corp" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">Section Access</label>
                    <div className="flex gap-3">
                      {SECTIONS.map((section) => (
                        <label key={section} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newSections.includes(section)}
                            onChange={() => setNewSections((prev) => prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section])}
                            className="w-4 h-4 rounded border-border accent-accent"
                          />
                          <span className="text-sm font-medium text-foreground capitalize">{section}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleCreateClient} loading={creating} disabled={!newPhone.trim()}>
                    Create Client
                  </Button>
                </div>
              )}
            </Card>

            {/* Client table */}
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      {["Phone", "Company", "Status", "Tokens", "Sections", "Actions"].map(h => (
                        <th key={h} className={`px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider ${["Status", "Tokens", "Sections", "Actions"].includes(h) ? "text-center" : "text-left"
                          }`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c) => (
                      <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground text-sm">{c.phone || "—"}</div>
                          {c.email && <div className="text-xs text-text-secondary truncate max-w-[140px]">{c.email}</div>}
                        </td>
                        <td className="px-4 py-3 text-foreground text-sm">{c.company_name || c.contact_name || "—"}</td>
                        <td className="text-center px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${c.is_active ? "bg-success-light text-success" : "bg-error-light text-error"
                            }`}>{c.is_active ? "Active" : "Inactive"}</span>
                        </td>
                        <td className="text-center px-4 py-3">
                          <span className="text-sm font-bold text-accent">{c.token_balance}</span>
                        </td>
                        <td className="text-center px-4 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            {SECTIONS.map((section) => (
                              <button
                                key={section}
                                onClick={() => handleToggleSections(c.id, c.allowed_sections || [], section)}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition-colors capitalize ${(c.allowed_sections || []).includes(section)
                                  ? "bg-accent-light border-accent/30 text-accent"
                                  : "bg-surface border-border text-text-secondary"
                                  }`}
                              >{section}</button>
                            ))}
                          </div>
                        </td>
                        <td className="text-center px-4 py-3">
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant={c.is_active ? "danger" : "primary"}
                                size="sm"
                                onClick={() => handleToggleActive(c.id, c.is_active)}
                              >
                                {c.is_active ? "Disable" : "Enable"}
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setTokenClientId(tokenClientId === c.id ? null : c.id)}
                              >
                                + Tokens
                              </Button>
                            </div>
                            {tokenClientId === c.id && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  value={tokenAmount}
                                  onChange={(e) => setTokenAmount(e.target.value)}
                                  placeholder="Amount"
                                  className="w-20 px-2 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm text-center outline-none focus:border-[#FF6A00] transition-colors"
                                />
                                <Button size="sm" onClick={handleAddTokens} loading={addingTokens} disabled={!tokenAmount.trim()}>
                                  Add
                                </Button>
                                <button
                                  onClick={() => { setTokenClientId(null); setTokenAmount(""); }}
                                  className="text-xs font-medium text-text-secondary hover:text-foreground"
                                >Cancel</button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {clients.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">No clients yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Recent activity */}
            <Card padding="none">
              <div className="px-4 py-3 border-b border-border bg-surface">
                <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[550px]">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      {["Time", "Client", "Type", "Tokens", "Model", "Status"].map(h => (
                        <th key={h} className={`px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider ${["Tokens"].includes(h) ? "text-right" : ["Status"].includes(h) ? "text-center" : "text-left"
                          }`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.recent_activity || []).map((a) => (
                      <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                        <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">{formatTime(a.created_at)}</td>
                        <td className="px-4 py-3 text-foreground text-xs">{clientMap.get(a.client_id) || a.client_id.slice(0, 8) + "…"}</td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 bg-accent-light text-accent rounded-lg text-xs font-medium capitalize">{a.generation_type}</span>
                        </td>
                        <td className="text-right px-4 py-3 text-foreground font-mono text-xs">{formatNumber(a.total_tokens)}</td>
                        <td className="px-4 py-3 text-text-secondary text-xs">{a.model_used || "—"}</td>
                        <td className="text-center px-4 py-3">
                          <span className={`w-2 h-2 inline-block rounded-full ${a.status === "success" ? "bg-success" : "bg-error"}`} title={a.status} />
                        </td>
                      </tr>
                    ))}
                    {(!stats?.recent_activity || stats.recent_activity.length === 0) && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">No activity yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ===== FEED TAB ===== */}
        {activeTab === "feed" && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Feed Items</h2>
                <p className="text-sm text-text-secondary">Manage the demo photos shown on the Home page.</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={openGenModal} size="sm" variant="secondary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                  Generate Catalogue
                </Button>
                <Button onClick={openCreateFeed} size="sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Add Feed Item
                </Button>
              </div>
            </div>

            {feedLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-[rgba(255,106,0,0.2)] border-t-[#FF6A00] rounded-full animate-spin" />
              </div>
            ) : feedItems.length === 0 ? (
              <Card padding="lg" className="text-center">
                <p className="text-text-secondary text-sm">No feed items yet.</p>
                <Button onClick={openCreateFeed} size="sm" className="mt-3">Create Your First</Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {feedItems.map(item => (
                  <Card key={item.id} padding="none" className="overflow-hidden">
                    {/* Image preview */}
                    <div className="relative aspect-square bg-surface">
                      {item.after_image_url ? (
                        <img src={item.after_image_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs">No image</div>
                      )}
                      {/* Status badge */}
                      <div className="absolute top-2 left-2 flex gap-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${item.is_active ? "bg-success-light text-success" : "bg-error-light text-error"
                          }`}>
                          {item.is_active ? "Active" : "Hidden"}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-black/50 backdrop-blur-sm text-white capitalize">
                          {item.item_type}
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-3 space-y-2">
                      <div>
                        <p className="text-sm font-medium text-foreground truncate">{item.title || "Untitled"}</p>
                        <p className="text-[10px] text-text-secondary">
                          {categoryMap.get(item.category_id) || "Unknown category"} &middot; Order: {item.display_order}
                        </p>
                      </div>

                      {/* Before image thumbnail */}
                      {item.before_image_url && (
                        <div className="flex items-center gap-2">
                          <img src={item.before_image_url} alt="Before" className="w-8 h-8 rounded-lg object-cover border border-border" />
                          <span className="text-[10px] text-text-secondary">Before image</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <Button variant="secondary" size="sm" className="flex-1" onClick={() => openEditFeed(item)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFeedActive(item)}
                        >
                          {item.is_active ? "Hide" : "Show"}
                        </Button>
                        <button
                          onClick={() => handleDeleteFeed(item.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-error hover:bg-error-light transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Feed Create/Edit Modal */}
      <Modal open={showFeedModal} onClose={() => setShowFeedModal(false)} title={editingFeedId ? "Edit Feed Item" : "Add Feed Item"} sheet>
        <div className="space-y-4">
          <Input
            label="Title"
            value={feedForm.title}
            onChange={(e) => setFeedForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Studio Shot - Marble Background"
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Category</label>
            <select
              value={feedForm.category_id}
              onChange={(e) => setFeedForm(f => ({ ...f, category_id: e.target.value }))}
              className="w-full px-4 py-3 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-[#FF6A00] focus:shadow-[0_0_0_3px_rgba(255,106,0,0.15)] transition-all duration-250"
            >
              <option value="">Select category...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {ITEM_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setFeedForm(f => ({ ...f, item_type: t }))}
                  className={`py-2 rounded-xl border text-sm font-medium transition-all duration-200 capitalize ${feedForm.item_type === t
                    ? "border-accent bg-accent-light text-accent"
                    : "border-border text-text-secondary hover:border-border-hover"
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* After Image Upload */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              After Image <span className="text-text-secondary font-normal">(required)</span>
            </label>
            <input ref={afterInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, "after_image_url")} />
            {feedForm.after_image_url ? (
              <div className="relative rounded-xl overflow-hidden border border-border group">
                <img src={feedForm.after_image_url} alt="After" className="w-full h-44 object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => afterInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[rgba(255,255,255,0.1)] backdrop-blur-sm rounded-lg text-xs font-medium text-white shadow-sm"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedForm(f => ({ ...f, after_image_url: "" }))}
                      className="px-3 py-1.5 bg-[rgba(255,255,255,0.1)] backdrop-blur-sm rounded-lg text-xs font-medium text-[#EF4444] shadow-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => afterInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleFileDrop(e, "after_image_url")}
                disabled={afterUploading}
                className="w-full py-8 rounded-xl border-2 border-dashed border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,106,0,0.3)] bg-[rgba(255,255,255,0.02)] transition-all flex flex-col items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                {afterUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[rgba(255,106,0,0.2)] border-t-[#FF6A00] rounded-full animate-spin" />
                    <span className="text-xs text-text-secondary">Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-xs text-text-secondary">Click or drag image here</span>
                    <span className="text-[10px] text-text-secondary/60">PNG, JPG, WebP up to 10 MB</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Before Image Upload */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              Before Image <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <input ref={beforeInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, "before_image_url")} />
            {feedForm.before_image_url ? (
              <div className="relative rounded-xl overflow-hidden border border-border group">
                <img src={feedForm.before_image_url} alt="Before" className="w-full h-44 object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => beforeInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[rgba(255,255,255,0.1)] backdrop-blur-sm rounded-lg text-xs font-medium text-white shadow-sm"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedForm(f => ({ ...f, before_image_url: "" }))}
                      className="px-3 py-1.5 bg-[rgba(255,255,255,0.1)] backdrop-blur-sm rounded-lg text-xs font-medium text-[#EF4444] shadow-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => beforeInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleFileDrop(e, "before_image_url")}
                disabled={beforeUploading}
                className="w-full py-6 rounded-xl border-2 border-dashed border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,106,0,0.3)] bg-[rgba(255,255,255,0.02)] transition-all flex flex-col items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                {beforeUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[rgba(255,106,0,0.2)] border-t-[#FF6A00] rounded-full animate-spin" />
                    <span className="text-xs text-text-secondary">Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-xs text-text-secondary">Click or drag image here</span>
                  </>
                )}
              </button>
            )}
          </div>

          <Input
            label="Tags / Description"
            value={feedForm.tags}
            onChange={(e) => setFeedForm(f => ({ ...f, tags: e.target.value }))}
            placeholder="Short description or JSON tags"
            hint="Plain text becomes a description. Or use JSON like {&quot;background&quot;: &quot;marble&quot;}"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Display Order</label>
              <input
                type="number"
                value={feedForm.display_order}
                onChange={(e) => setFeedForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-[#FF6A00] focus:shadow-[0_0_0_3px_rgba(255,106,0,0.15)] transition-all duration-250"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Visible</label>
              <button
                onClick={() => setFeedForm(f => ({ ...f, is_active: !f.is_active }))}
                className={`w-full py-3 rounded-xl border text-sm font-medium transition-all duration-200 ${feedForm.is_active
                  ? "border-success bg-success-light text-success"
                  : "border-border text-text-secondary"
                  }`}
              >
                {feedForm.is_active ? "Active" : "Hidden"}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSaveFeed} loading={feedSaving} disabled={afterUploading || beforeUploading} fullWidth>
              {editingFeedId ? "Save Changes" : "Create Item"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===== GENERATE CATALOGUE MODAL ===== */}
      <Modal open={showGenModal} onClose={() => !genGenerating && setShowGenModal(false)} title="Generate Catalogue for Feed" sheet>
        <input ref={genFileRef} type="file" accept="image/*" className="hidden" onChange={handleGenImageUpload} />

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-5">
          {(["upload", "configure", "results"] as const).map((s, i) => {
            const STEPS = ["upload", "configure", "results"];
            const currentIdx = STEPS.indexOf(genStep);
            const isDone = currentIdx > i;
            const isActive = genStep === s;
            return (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${isDone ? "bg-success text-white" : isActive ? "bg-accent text-white shadow-[0_0_10px_rgba(255,106,0,0.4)]" : "bg-surface border border-border text-text-secondary"
                  }`}>
                  {isDone ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : i + 1}
                </div>
                <span className={`text-xs font-medium capitalize ${isActive ? "text-foreground" : isDone ? "text-success" : "text-text-secondary"
                  }`}>{s}</span>
                {i < 2 && <div className={`w-6 h-px mx-0.5 ${isDone ? "bg-success" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>

        {/* STEP 1: Upload */}
        {genStep === "upload" && (
          <button
            onClick={() => genFileRef.current?.click()}
            className="w-full py-16 rounded-xl border-2 border-dashed border-[rgba(255,106,0,0.2)] hover:border-[rgba(255,106,0,0.5)] hover:bg-[rgba(255,106,0,0.03)] transition-all flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 bg-[rgba(255,106,0,0.1)] rounded-2xl flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Upload Product Image</p>
              <p className="text-xs text-text-secondary mt-1">PNG, JPG up to 10 MB</p>
            </div>
          </button>
        )}

        {/* STEP 2: Configure + Generate */}
        {genStep === "configure" && (
          <div className="space-y-5">
            {/* Product preview */}
            {genImage && (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={genImage} alt="Product" className="w-full max-h-40 object-contain bg-surface" />
                <button
                  onClick={() => { setGenImage(null); setGenStep("upload"); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-lg flex items-center justify-center text-white text-xs hover:bg-black/80"
                >✕</button>
              </div>
            )}

            {/* Model */}
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Model</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {genModels.map(m => (
                  <button key={m.id} onClick={() => setGenModel(m.id)} className="flex-shrink-0 text-center">
                    <div className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${genModel === m.id ? "border-accent shadow-[0_0_12px_rgba(255,106,0,0.25)]" : "border-border"}`}>
                      <img src={m.thumb} alt={m.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <p className={`text-[10px] mt-1 truncate w-16 ${genModel === m.id ? "text-accent font-semibold" : "text-text-secondary"}`}>{m.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Poses */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Poses (up to {MAX_POSES})</p>
                <span className="text-xs text-accent font-medium">{genSelectedPoses.length}/{MAX_POSES} selected</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {genPoses.map(p => {
                  const sel = genSelectedPoses.includes(p.id);
                  return (
                    <button key={p.id} onClick={() => toggleGenPose(p.id)} className="text-center group relative">
                      <div className={`relative rounded-xl overflow-hidden border-2 aspect-[3/4] transition-all ${sel ? "border-accent shadow-[0_0_12px_rgba(255,106,0,0.25)]" : "border-border"}`}>
                        <img src={p.thumb} alt={p.label} className="w-full h-full object-cover" loading="lazy" />
                        {sel && (
                          <div className="absolute top-1 left-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                          </div>
                        )}
                      </div>
                      <p className={`text-[10px] mt-1 ${sel ? "text-accent font-semibold" : "text-text-secondary"}`}>{p.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Background */}
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Background</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {genBackgrounds.map(bg => (
                  <button key={bg.id} onClick={() => setGenBg(bg.id)} className="flex-shrink-0 text-center">
                    <div className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${genBg === bg.id ? "border-accent shadow-[0_0_12px_rgba(255,106,0,0.25)]" : "border-border"}`}>
                      <img src={bg.thumb} alt={bg.label} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <p className={`text-[10px] mt-1 truncate w-16 ${genBg === bg.id ? "text-accent font-semibold" : "text-text-secondary"}`}>{bg.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional instructions */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Key Highlights <span className="text-text-secondary/50">(optional)</span></label>
                <input
                  value={genKeyHighlights}
                  onChange={e => setGenKeyHighlights(e.target.value)}
                  placeholder="e.g. Premium gold plating, adjustable sizing"
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Special Instructions <span className="text-text-secondary/50">(optional)</span></label>
                <input
                  value={genSpecialInstructions}
                  onChange={e => setGenSpecialInstructions(e.target.value)}
                  placeholder="e.g. Focus on neckline, show intricate details"
                  className="w-full px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {/* Generate button */}
            {genGenerating ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-8 h-8 border-2 border-[rgba(255,106,0,0.2)] border-t-[#FF6A00] rounded-full animate-spin" />
                <p className="text-sm text-text-secondary">Generating {genSelectedPoses.length} image{genSelectedPoses.length > 1 ? "s" : ""}… this takes 30–60 seconds</p>
              </div>
            ) : (
              <Button onClick={handleAdminGenerate} disabled={!genImage || genSelectedPoses.length === 0} fullWidth>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                Generate {genSelectedPoses.length} Image{genSelectedPoses.length > 1 ? "s" : ""}
              </Button>
            )}
          </div>
        )}

        {/* STEP 3: Results + Save */}
        {genStep === "results" && genResults.length > 0 && (
          <div className="space-y-4">
            {/* Thumbnail strip */}
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {genResults.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setGenActiveResult(i)}
                  className={`flex-shrink-0 relative rounded-xl overflow-hidden border-2 transition-all ${genActiveResult === i
                    ? "border-accent shadow-[0_0_16px_rgba(255,106,0,0.3)] ring-2 ring-[rgba(255,106,0,0.15)]"
                    : "border-border hover:border-border-hover"
                    }`}
                  style={{ width: 72, height: 96 }}
                >
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                  {genActiveResult === i && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md bg-accent text-white text-[9px] font-bold whitespace-nowrap">
                      Selected
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Active image preview — full width */}
            <div className="rounded-2xl overflow-hidden border border-border bg-surface">
              <img
                src={genResults[genActiveResult]?.url}
                alt={genResults[genActiveResult]?.label}
                className="w-full max-h-[480px] object-contain"
              />
              {/* Pose label badge */}
              <div className="px-3 py-2 border-t border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{genResults[genActiveResult]?.label}</span>
                <span className="text-[10px] text-text-secondary">{genActiveResult + 1} of {genResults.length}</span>
              </div>
            </div>

            {/* Save as feed item form */}
            <div className="rounded-2xl border border-border bg-surface/50 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-4 bg-accent rounded-full" />
                <p className="text-sm font-semibold text-foreground">Save as Feed Item</p>
              </div>

              {/* Category + Title side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-text-secondary">Category <span className="text-error">*</span></label>
                  <select
                    value={genSaveForm.category_id}
                    onChange={e => setGenSaveForm(f => ({ ...f, category_id: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-accent transition-all"
                  >
                    <option value="">Select category…</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-text-secondary">Title</label>
                  <input
                    value={genSaveForm.title}
                    onChange={e => setGenSaveForm(f => ({ ...f, title: e.target.value }))}
                    placeholder={genResults[genActiveResult]?.label || "Catalogue – Standing"}
                    className="w-full px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-accent transition-all placeholder:text-text-secondary/40"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="ghost" onClick={() => setGenStep("configure")} size="sm">← Back</Button>
                <Button onClick={handleSaveCatFeedItem} loading={genSaving} disabled={!genSaveForm.category_id} fullWidth>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                  Save as Feed Item
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </ResponsiveLayout>

  );
}
