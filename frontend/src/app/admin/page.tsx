"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useAuth } from "@/providers/AppProvider";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import dynamic from "next/dynamic";

const TiptapEditor = dynamic(() => import("@/components/blog/TiptapEditor"), { ssr: false });

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

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  cover_image_url?: string;
  category_id?: string;
  tags?: string[];
  status: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
}

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

const EMPTY_POST_FORM = {
  title: "",
  slug: "",
  excerpt: "",
  cover_image_url: "",
  category_id: "",
  tags: "",
  meta_title: "",
  meta_description: "",
  og_image_url: "",
  status: "draft" as "draft" | "published",
};

const EMPTY_BLOG_CAT_FORM = {
  name: "",
  slug: "",
  description: "",
  display_order: 0,
};

type AdminTab = "overview" | "feed" | "blog" | "revenue" | "pricing" | "leads";

const LEADGEN_API = process.env.NEXT_PUBLIC_LEADGEN_API_URL || "http://localhost:8001/api/v1";

interface LeadStats {
  total_leads: number;
  by_status: Record<string, number>;
  by_platform: Record<string, number>;
  by_region: Record<string, number>;
  emails: { total: number; opened: number; clicked: number };
}

interface Lead {
  id: string;
  store_name: string;
  platform: string;
  region: string;
  store_url: string;
  domain: string;
  contact_email: string | null;
  contact_name: string | null;
  status: string;
  created_at: string;
  metadata: Record<string, string> | null;
}

interface LeadProduct {
  id: string;
  product_name: string;
  original_image_url: string;
  generated_studio_url: string | null;
  generated_model_url: string | null;
  jewelry_type: string;
  status: string;
}

interface LeadEmail {
  id: string;
  subject: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
}

interface RevenueData {
  revenue: { total_inr: number; total_usd: number; payment_count: number };
  token_usage: {
    total_deducted: number;
    by_operation: Record<string, { count: number; tokens: number }>;
    by_client: Record<string, { tokens_used: number; operations: number }>;
    log_count: number;
  };
  profit: { estimated_cost_inr: number; estimated_profit_inr: number };
  recent_logs: Array<{
    id: string;
    client_id: string;
    operation: string;
    tokens_deducted: number;
    quality: string;
    balance_after: number;
    created_at: string;
  }>;
}

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
  const [feedFetched, setFeedFetched] = useState(false);
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
  const blogCoverInputRef = useRef<HTMLInputElement>(null);

  // Blog state
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>([]);
  const [blogLoading, setBlogLoading] = useState(false);
  const [blogPostForm, setBlogPostForm] = useState(EMPTY_POST_FORM);
  const [blogPostContent, setBlogPostContent] = useState<Record<string, unknown> | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [blogSaving, setBlogSaving] = useState(false);
  const [blogCoverUploading, setBlogCoverUploading] = useState(false);
  const [showBlogCatModal, setShowBlogCatModal] = useState(false);
  const [blogCatForm, setBlogCatForm] = useState(EMPTY_BLOG_CAT_FORM);
  const [editingBlogCatId, setEditingBlogCatId] = useState<string | null>(null);
  const [blogCatSaving, setBlogCatSaving] = useState(false);
  const [blogView, setBlogView] = useState<"posts" | "categories">("posts");
  const [blogFetched, setBlogFetched] = useState(false);
  const [showAiGenModal, setShowAiGenModal] = useState(false);
  const [aiGenForm, setAiGenForm] = useState({ topic: "", keywords: "", tone: "professional", word_count: 1200, category_id: "", auto_publish: false });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [topicSuggestions, setTopicSuggestions] = useState<{ topic: string; keywords: string[]; category: string }[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  // Revenue state
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueFetched, setRevenueFetched] = useState(false);

  // Pricing state
  interface PricingPlan {
    id?: string;
    plan_id: string;
    name: string;
    plan_type: string;
    price_inr: number;
    price_usd: number;
    price_eur: number;
    tokens: number;
    description: string;
    recommended: boolean;
    is_active: boolean;
    sort_order: number;
  }
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingFetched, setPricingFetched] = useState(false);
  const [pricingSource, setPricingSource] = useState<string>("");
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [pricingSaving, setPricingSaving] = useState(false);

  // Leads state
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsFetched, setLeadsFetched] = useState(false);
  const [leadsFilter, setLeadsFilter] = useState({ status: "", platform: "", region: "" });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadProducts, setLeadProducts] = useState<LeadProduct[]>([]);
  const [leadEmails, setLeadEmails] = useState<LeadEmail[]>([]);
  const [leadDetailOpen, setLeadDetailOpen] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState<string | null>(null);
  const [pipelineResult, setPipelineResult] = useState<string | null>(null);

  const leadgenFetch = useCallback(async (endpoint: string, options?: { method?: string; body?: unknown }) => {
    const adminEmail = user?.email || "";
    const resp = await fetch(`${LEADGEN_API}${endpoint}`, {
      method: options?.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Email": adminEmail,
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
    if (!resp.ok) throw new Error(`LeadGen API error: ${resp.status}`);
    return resp.json();
  }, [user?.email]);

  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const params = new URLSearchParams();
      if (leadsFilter.status) params.set("status", leadsFilter.status);
      if (leadsFilter.platform) params.set("platform", leadsFilter.platform);
      if (leadsFilter.region) params.set("region", leadsFilter.region);
      params.set("limit", "100");
      const [statsRes, leadsRes] = await Promise.all([
        leadgenFetch("/pipeline/stats"),
        leadgenFetch(`/pipeline/leads?${params.toString()}`),
      ]);
      setLeadStats(statsRes);
      setLeads(leadsRes.leads || []);
      setLeadsTotal(leadsRes.total || 0);
      setLeadsFetched(true);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLeadsLoading(false);
    }
  }, [leadgenFetch, leadsFilter]);

  const fetchLeadDetail = useCallback(async (leadId: string) => {
    try {
      const data = await leadgenFetch(`/pipeline/leads/${leadId}`);
      setSelectedLead(data.lead);
      setLeadProducts(data.products || []);
      setLeadEmails(data.emails || []);
      setLeadDetailOpen(true);
    } catch (err) {
      console.error("Failed to fetch lead detail:", err);
    }
  }, [leadgenFetch]);

  const runPipelineStep = useCallback(async (step: string, body?: Record<string, unknown>) => {
    setPipelineRunning(step);
    setPipelineResult(null);
    try {
      const data = await leadgenFetch(`/pipeline/${step}`, { method: "POST", body: body || {} });
      setPipelineResult(JSON.stringify(data, null, 2));
      fetchLeads();
    } catch (err) {
      setPipelineResult(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setPipelineRunning(null);
    }
  }, [leadgenFetch, fetchLeads]);

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
      setFeedFetched(true);
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
    if (isAdmin && activeTab === "feed" && !feedFetched && !feedLoading) {
      fetchFeed();
    }
  }, [isAdmin, activeTab, feedFetched, feedLoading, fetchFeed]);

  useEffect(() => {
    if (isAdmin && activeTab === "leads" && !leadsFetched && !leadsLoading) {
      fetchLeads();
    }
  }, [isAdmin, activeTab, leadsFetched, leadsLoading, fetchLeads]);

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

  // Blog functions
  const fetchBlog = useCallback(async () => {
    setBlogLoading(true);
    try {
      const [postsRes, catsRes] = await Promise.all([
        api.get<{ posts: BlogPost[] }>("/blog/admin/posts"),
        api.get<{ categories: BlogCategory[] }>("/blog/categories"),
      ]);
      setBlogPosts(postsRes.posts || []);
      setBlogCategories(catsRes.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blog data");
    } finally {
      setBlogLoading(false);
      setBlogFetched(true);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && activeTab === "blog" && !blogFetched && !blogLoading) {
      fetchBlog();
    }
  }, [isAdmin, activeTab, blogFetched, blogLoading, fetchBlog]);

  const fetchRevenue = useCallback(async () => {
    setRevenueLoading(true);
    try {
      const data = await api.get<RevenueData>("/admin/revenue");
      setRevenueData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load revenue data");
    } finally {
      setRevenueLoading(false);
      setRevenueFetched(true);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && activeTab === "revenue" && !revenueFetched && !revenueLoading) {
      fetchRevenue();
    }
  }, [isAdmin, activeTab, revenueFetched, revenueLoading, fetchRevenue]);

  const fetchPricing = useCallback(async () => {
    setPricingLoading(true);
    try {
      const data = await api.get<{ plans: PricingPlan[]; source: string }>("/admin/plans");
      setPricingPlans(data.plans || []);
      setPricingSource(data.source || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pricing plans");
    } finally {
      setPricingLoading(false);
      setPricingFetched(true);
    }
  }, []);

  useEffect(() => {
    if (isAdmin && activeTab === "pricing" && !pricingFetched && !pricingLoading) {
      fetchPricing();
    }
  }, [isAdmin, activeTab, pricingFetched, pricingLoading, fetchPricing]);

  const handleSeedPlans = async () => {
    setPricingSaving(true);
    try {
      await api.post("/admin/plans/seed", {});
      setPricingFetched(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed plans");
    } finally {
      setPricingSaving(false);
    }
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    setPricingSaving(true);
    try {
      if (editingPlan.id) {
        await api.put(`/admin/plans/${editingPlan.plan_id}`, editingPlan);
      } else {
        await api.post("/admin/plans", editingPlan);
      }
      setEditingPlan(null);
      setPricingFetched(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save plan");
    } finally {
      setPricingSaving(false);
    }
  };

  const handleTogglePlanActive = async (plan: PricingPlan) => {
    try {
      await api.put(`/admin/plans/${plan.plan_id}`, { is_active: !plan.is_active });
      setPricingFetched(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update plan");
    }
  };

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const openCreatePost = () => {
    setBlogPostForm(EMPTY_POST_FORM);
    setBlogPostContent(null);
    setEditingPostId(null);
    setShowPostModal(true);
  };

  const openEditPost = async (post: BlogPost) => {
    setBlogPostForm({
      title: post.title || "",
      slug: post.slug || "",
      excerpt: post.excerpt || "",
      cover_image_url: post.cover_image_url || "",
      category_id: post.category_id || "",
      tags: (post.tags || []).join(", "),
      meta_title: "",
      meta_description: "",
      og_image_url: "",
      status: (post.status as "draft" | "published") || "draft",
    });
    setEditingPostId(post.id);
    setShowPostModal(true);

    try {
      const full = await api.get<Record<string, unknown>>(`/blog/admin/posts/${post.id}`);
      setBlogPostContent((full.content as Record<string, unknown>) || null);
      if (full.meta_title) setBlogPostForm(f => ({ ...f, meta_title: full.meta_title as string }));
      if (full.meta_description) setBlogPostForm(f => ({ ...f, meta_description: full.meta_description as string }));
      if (full.og_image_url) setBlogPostForm(f => ({ ...f, og_image_url: full.og_image_url as string }));
    } catch {
      setBlogPostContent(null);
    }
  };

  const handleSavePost = async () => {
    if (!blogPostForm.title.trim() || !blogPostForm.slug.trim()) {
      setError("Title and slug are required");
      return;
    }
    setBlogSaving(true);
    try {
      const tags = blogPostForm.tags
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);

      const payload = {
        title: blogPostForm.title,
        slug: blogPostForm.slug,
        excerpt: blogPostForm.excerpt || undefined,
        cover_image_url: blogPostForm.cover_image_url || undefined,
        category_id: blogPostForm.category_id || undefined,
        tags,
        content: blogPostContent || undefined,
        meta_title: blogPostForm.meta_title || undefined,
        meta_description: blogPostForm.meta_description || undefined,
        og_image_url: blogPostForm.og_image_url || undefined,
        status: blogPostForm.status,
      };

      if (editingPostId) {
        await api.put(`/blog/admin/posts/${editingPostId}`, payload);
      } else {
        await api.post("/blog/admin/posts", payload);
      }
      setShowPostModal(false);
      fetchBlog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setBlogSaving(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("Delete this blog post?")) return;
    try {
      await api.delete(`/blog/admin/posts/${id}`);
      fetchBlog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
    }
  };

  const handleBulkGenerate = async () => {
    if (!confirm("This will generate 3 SEO-optimized blog posts targeting 'AI photography' and 'AI jewelry photography' keywords. Continue?")) return;
    setBulkGenerating(true);
    try {
      const res = await api.post<{ results: { topic: string; slug: string; success: boolean; error?: string }[] }>("/blog/admin/bulk-generate", {});
      const succeeded = res.results.filter(r => r.success).length;
      const failed = res.results.filter(r => !r.success).length;
      if (failed > 0) setError(`Generated ${succeeded} posts, ${failed} failed`);
      fetchBlog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk generation failed");
    } finally {
      setBulkGenerating(false);
    }
  };

  const fetchTopicBank = useCallback(async () => {
    if (topicSuggestions.length > 0) return;
    setTopicsLoading(true);
    try {
      const res = await api.get<{ topics: { topic: string; keywords: string[]; category: string }[] }>("/blog/admin/topic-bank");
      setTopicSuggestions(res.topics || []);
    } catch { /* ignore */ }
    finally { setTopicsLoading(false); }
  }, [topicSuggestions.length]);

  const generateFreshTopics = async () => {
    setTopicsLoading(true);
    try {
      const res = await api.post<{ topics: { topic: string; keywords: string[]; category: string }[] }>("/blog/admin/generate-topics", {});
      setTopicSuggestions(prev => [...(res.topics || []), ...prev]);
    } catch { /* ignore */ }
    finally { setTopicsLoading(false); }
  };

  const handleAiGenerate = async () => {
    if (!aiGenForm.topic.trim()) { setError("Topic is required"); return; }
    setAiGenerating(true);
    try {
      const payload = {
        topic: aiGenForm.topic,
        keywords: aiGenForm.keywords.split(",").map(k => k.trim()).filter(Boolean),
        tone: aiGenForm.tone,
        word_count: aiGenForm.word_count,
        category_id: aiGenForm.category_id || undefined,
        auto_publish: aiGenForm.auto_publish,
      };
      const res = await api.post<{ success: boolean; post?: Record<string, unknown>; error?: string; generated_fields?: Record<string, unknown> }>("/blog/admin/generate-post", payload);
      if (res.success) {
        setShowAiGenModal(false);
        setAiGenForm({ topic: "", keywords: "", tone: "professional", word_count: 1200, category_id: "", auto_publish: false });
        fetchBlog();
      } else {
        setError(res.error || "Generation failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setAiGenerating(false);
    }
  };

  const uploadBlogCover = async (file: File) => {
    setBlogCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.upload<{ success: boolean; url: string }>("/blog/admin/upload-image", fd);
      if (res.url) setBlogPostForm(f => ({ ...f, cover_image_url: res.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setBlogCoverUploading(false);
    }
  };

  const handleBlogImageUpload = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.upload<{ success: boolean; url: string }>("/blog/admin/upload-image", fd);
    return res.url;
  };

  const openCreateBlogCat = () => {
    setBlogCatForm(EMPTY_BLOG_CAT_FORM);
    setEditingBlogCatId(null);
    setShowBlogCatModal(true);
  };

  const openEditBlogCat = (cat: BlogCategory) => {
    setBlogCatForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      display_order: cat.display_order || 0,
    });
    setEditingBlogCatId(cat.id);
    setShowBlogCatModal(true);
  };

  const handleSaveBlogCat = async () => {
    if (!blogCatForm.name.trim() || !blogCatForm.slug.trim()) {
      setError("Name and slug are required");
      return;
    }
    setBlogCatSaving(true);
    try {
      const payload = { ...blogCatForm };
      if (editingBlogCatId) {
        await api.put(`/blog/admin/categories/${editingBlogCatId}`, payload);
      } else {
        await api.post("/blog/admin/categories", payload);
      }
      setShowBlogCatModal(false);
      fetchBlog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setBlogCatSaving(false);
    }
  };

  const handleDeleteBlogCat = async (id: string) => {
    if (!confirm("Delete this blog category?")) return;
    try {
      await api.delete(`/blog/admin/categories/${id}`);
      fetchBlog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
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
        <div className="w-6 h-6 border-2 border-[rgba(196,166,125,0.2)] border-t-[#c4a67d] rounded-full animate-spin" />
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
            { id: "revenue" as const, label: "Revenue" },
            { id: "pricing" as const, label: "Pricing" },
            { id: "feed" as const, label: "Feed Manager" },
            { id: "blog" as const, label: "Blog" },
            { id: "leads" as const, label: "Leads" },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 py-2.5 text-sm font-medium transition-all duration-200 ${activeTab === tab.id ? "text-foreground" : "text-text-secondary hover:text-foreground"
                }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#c4a67d] to-[#d4b88f] rounded-t-full" />
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
                                  className="w-20 px-2 py-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm text-center outline-none focus:border-[#c4a67d] transition-colors"
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

        {/* ===== REVENUE TAB ===== */}
        {activeTab === "revenue" && (
          <>
            {revenueLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-[rgba(196,166,125,0.2)] border-t-[#c4a67d] rounded-full animate-spin" />
              </div>
            ) : revenueData ? (
              <div className="space-y-6">
                {/* Revenue summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card padding="md">
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Total Revenue (INR)</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      <span className="text-lg">&#8377;</span>{formatNumber(revenueData.revenue.total_inr)}
                    </p>
                    <p className="text-[10px] text-text-secondary mt-1">{revenueData.revenue.payment_count} payments</p>
                  </Card>
                  <Card padding="md">
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Total Revenue (USD)</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      ${formatNumber(revenueData.revenue.total_usd / 100)}
                    </p>
                  </Card>
                  <Card padding="md">
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Tokens Used</p>
                    <p className="text-2xl font-bold text-accent mt-1">{formatNumber(revenueData.token_usage.total_deducted)}</p>
                    <p className="text-[10px] text-text-secondary mt-1">{revenueData.token_usage.log_count} operations</p>
                  </Card>
                  <Card padding="md">
                    <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">Est. Profit (INR)</p>
                    <p className={`text-2xl font-bold mt-1 ${revenueData.profit.estimated_profit_inr >= 0 ? "text-success" : "text-error"}`}>
                      <span className="text-lg">&#8377;</span>{formatNumber(Math.round(revenueData.profit.estimated_profit_inr))}
                    </p>
                    <p className="text-[10px] text-text-secondary mt-1">
                      Cost: &#8377;{formatNumber(Math.round(revenueData.profit.estimated_cost_inr))}
                    </p>
                  </Card>
                </div>

                {/* Token usage by operation */}
                <Card padding="none">
                  <div className="px-4 py-3 border-b border-border bg-surface">
                    <h3 className="text-sm font-semibold text-foreground">Token Usage by Operation</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-surface">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Operation</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Count</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Tokens</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Avg / Op</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(revenueData.token_usage.by_operation)
                          .sort(([, a], [, b]) => b.tokens - a.tokens)
                          .map(([op, data]) => (
                            <tr key={op} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                              <td className="px-4 py-3">
                                <span className="inline-block px-2 py-0.5 bg-accent-light text-accent rounded-lg text-xs font-medium">
                                  {op}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-foreground font-mono text-xs">{formatNumber(data.count)}</td>
                              <td className="px-4 py-3 text-right text-foreground font-mono text-xs font-bold">{formatNumber(data.tokens)}</td>
                              <td className="px-4 py-3 text-right text-text-secondary font-mono text-xs">
                                {data.count > 0 ? (data.tokens / data.count).toFixed(1) : "—"}
                              </td>
                            </tr>
                          ))}
                        {Object.keys(revenueData.token_usage.by_operation).length === 0 && (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-text-secondary">No token usage yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Per-client usage */}
                <Card padding="none">
                  <div className="px-4 py-3 border-b border-border bg-surface">
                    <h3 className="text-sm font-semibold text-foreground">Token Usage by Client</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-surface">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Client</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Operations</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Tokens Used</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(revenueData.token_usage.by_client)
                          .sort(([, a], [, b]) => b.tokens_used - a.tokens_used)
                          .slice(0, 20)
                          .map(([cid, data]) => (
                            <tr key={cid} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                              <td className="px-4 py-3 text-foreground text-xs">
                                {clientMap.get(cid) || cid.slice(0, 12) + "..."}
                              </td>
                              <td className="px-4 py-3 text-right text-foreground font-mono text-xs">{formatNumber(data.operations)}</td>
                              <td className="px-4 py-3 text-right text-foreground font-mono text-xs font-bold">{formatNumber(data.tokens_used)}</td>
                            </tr>
                          ))}
                        {Object.keys(revenueData.token_usage.by_client).length === 0 && (
                          <tr><td colSpan={3} className="px-4 py-8 text-center text-text-secondary">No client usage yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Recent token logs */}
                <Card padding="none">
                  <div className="px-4 py-3 border-b border-border bg-surface">
                    <h3 className="text-sm font-semibold text-foreground">Recent Token Logs</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b border-border bg-surface">
                          {["Time", "Client", "Operation", "Tokens", "Quality", "Balance After"].map(h => (
                            <th key={h} className={`px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider ${["Tokens", "Balance After"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {revenueData.recent_logs.map((log) => (
                          <tr key={log.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                            <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">{formatTime(log.created_at)}</td>
                            <td className="px-4 py-3 text-foreground text-xs">
                              {clientMap.get(log.client_id) || log.client_id.slice(0, 8) + "..."}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-block px-2 py-0.5 bg-accent-light text-accent rounded-lg text-xs font-medium">
                                {log.operation}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-foreground font-mono text-xs font-bold">-{log.tokens_deducted}</td>
                            <td className="px-4 py-3 text-text-secondary text-xs capitalize">{log.quality}</td>
                            <td className="px-4 py-3 text-right text-text-secondary font-mono text-xs">{log.balance_after ?? "—"}</td>
                          </tr>
                        ))}
                        {revenueData.recent_logs.length === 0 && (
                          <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">No token logs yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            ) : (
              <Card padding="lg" className="text-center">
                <p className="text-text-secondary text-sm">No revenue data available.</p>
              </Card>
            )}
          </>
        )}

        {/* ===== PRICING TAB ===== */}
        {activeTab === "pricing" && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Pricing Plans</h2>
                <p className="text-sm text-text-secondary">
                  Manage pricing for all currencies.
                  {pricingSource === "hardcoded" && (
                    <span className="ml-2 text-amber-500 font-semibold">(Using hardcoded defaults — seed to DB to enable editing)</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                {pricingSource === "hardcoded" && (
                  <Button onClick={handleSeedPlans} loading={pricingSaving} size="sm">
                    Seed Plans to DB
                  </Button>
                )}
                <Button
                  onClick={() => setEditingPlan({
                    plan_id: "",
                    name: "",
                    plan_type: "token_pack",
                    price_inr: 0,
                    price_usd: 0,
                    price_eur: 0,
                    tokens: 0,
                    description: "",
                    recommended: false,
                    is_active: true,
                    sort_order: pricingPlans.length,
                  })}
                  size="sm"
                  variant="ghost"
                >
                  + Add Plan
                </Button>
              </div>
            </div>

            {pricingLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
              </div>
            ) : pricingPlans.length === 0 ? (
              <Card padding="lg" className="text-center">
                <p className="text-text-secondary text-sm">No plans found. Seed defaults to get started.</p>
              </Card>
            ) : (
              <Card padding="none">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-secondary/30">
                        <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Plan</th>
                        <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">₹ INR</th>
                        <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">$ USD</th>
                        <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">€ EUR</th>
                        <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Tokens</th>
                        <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">Status</th>
                        <th className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pricingPlans.map((plan) => (
                        <tr key={plan.plan_id || plan.id} className={`hover:bg-surface-secondary/20 transition-colors ${!plan.is_active ? "opacity-50" : ""}`}>
                          <td className="px-4 py-3">
                            <div>
                              <span className="text-foreground font-semibold">{plan.name}</span>
                              {plan.recommended && (
                                <span className="ml-2 text-[8px] font-bold bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white px-1.5 py-0.5 rounded-full uppercase">
                                  Best Value
                                </span>
                              )}
                              <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">{plan.description}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              plan.plan_type === "subscription"
                                ? "bg-blue-500/15 text-blue-400"
                                : "bg-emerald-500/15 text-emerald-400"
                            }`}>
                              {plan.plan_type === "subscription" ? "Monthly" : "One-time"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-foreground">
                            ₹{plan.price_inr}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-foreground">
                            ${(plan.price_usd / 100).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-foreground">
                            €{(plan.price_eur / 100).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-accent">
                            {plan.tokens}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleTogglePlanActive(plan)}
                              className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                                plan.is_active
                                  ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                                  : "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                              }`}
                            >
                              {plan.is_active ? "Active" : "Inactive"}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setEditingPlan({ ...plan })}
                              className="text-xs text-accent hover:text-accent/80 font-medium transition-colors"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
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
                <div className="w-6 h-6 border-2 border-[rgba(196,166,125,0.2)] border-t-[#c4a67d] rounded-full animate-spin" />
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
        {/* ===== BLOG TAB ===== */}
        {activeTab === "blog" && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Blog</h2>
                <p className="text-sm text-text-secondary">Manage blog posts and categories for SEO.</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setBlogView(blogView === "posts" ? "categories" : "posts")}
                  size="sm"
                  variant="ghost"
                >
                  {blogView === "posts" ? "Manage Categories" : "Back to Posts"}
                </Button>
                {blogView === "posts" ? (
                  <div className="flex gap-2">
                    <Button onClick={handleBulkGenerate} size="sm" variant="ghost" disabled={bulkGenerating} className="border border-[rgba(196,166,125,0.15)] text-text-secondary text-xs">
                      {bulkGenerating ? <span className="w-3 h-3 border-2 border-[#c4a67d]/30 border-t-[#c4a67d] rounded-full animate-spin" /> : "Bulk SEO"}
                    </Button>
                    <Button onClick={() => setShowAiGenModal(true)} size="sm" variant="ghost" className="border border-[rgba(196,166,125,0.3)] text-[#c4a67d]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      AI Generate
                    </Button>
                    <Button onClick={openCreatePost} size="sm">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      New Post
                    </Button>
                  </div>
                ) : (
                  <Button onClick={openCreateBlogCat} size="sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    New Category
                  </Button>
                )}
              </div>
            </div>

            {blogLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-[rgba(196,166,125,0.2)] border-t-[#c4a67d] rounded-full animate-spin" />
              </div>
            ) : blogView === "posts" ? (
              /* Posts list */
              blogPosts.length === 0 ? (
                <Card padding="lg" className="text-center">
                  <p className="text-text-secondary text-sm">No blog posts yet.</p>
                  <Button onClick={openCreatePost} size="sm" className="mt-3">Write Your First Post</Button>
                </Card>
              ) : (
                <Card padding="none">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[650px]">
                      <thead>
                        <tr className="border-b border-border bg-surface">
                          {["Title", "Category", "Status", "Date", "Actions"].map(h => (
                            <th key={h} className={`px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider ${["Status", "Actions"].includes(h) ? "text-center" : "text-left"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {blogPosts.map(post => {
                          const catName = blogCategories.find(c => c.id === post.category_id)?.name;
                          return (
                            <tr key={post.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-medium text-foreground text-sm truncate max-w-[250px]">{post.title}</div>
                                <div className="text-[10px] text-text-secondary font-mono">/{post.slug}</div>
                              </td>
                              <td className="px-4 py-3 text-foreground text-xs">{catName || "—"}</td>
                              <td className="text-center px-4 py-3">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${post.status === "published" ? "bg-success-light text-success" : "bg-[rgba(255,255,255,0.06)] text-text-secondary"}`}>
                                  {post.status === "published" ? "Published" : "Draft"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">
                                {post.published_at ? new Date(post.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : post.created_at ? new Date(post.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                              </td>
                              <td className="text-center px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <Button variant="secondary" size="sm" onClick={() => openEditPost(post)}>Edit</Button>
                                  <button
                                    onClick={() => handleDeletePost(post.id)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-error hover:bg-error-light transition-colors"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )
            ) : (
              /* Categories list */
              blogCategories.length === 0 ? (
                <Card padding="lg" className="text-center">
                  <p className="text-text-secondary text-sm">No blog categories yet.</p>
                  <Button onClick={openCreateBlogCat} size="sm" className="mt-3">Create First Category</Button>
                </Card>
              ) : (
                <Card padding="none">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-surface">
                          {["Name", "Slug", "Order", "Actions"].map(h => (
                            <th key={h} className={`px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider ${h === "Actions" ? "text-center" : "text-left"}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {blogCategories.map(cat => (
                          <tr key={cat.id} className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-foreground text-sm">{cat.name}</td>
                            <td className="px-4 py-3 text-text-secondary text-xs font-mono">{cat.slug}</td>
                            <td className="px-4 py-3 text-text-secondary text-sm">{cat.display_order}</td>
                            <td className="text-center px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <Button variant="secondary" size="sm" onClick={() => openEditBlogCat(cat)}>Edit</Button>
                                <button
                                  onClick={() => handleDeleteBlogCat(cat.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-error hover:bg-error-light transition-colors"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )
            )}
          </>
        )}
      </div>

      {/* AI Blog Generation Modal */}
      <Modal open={showAiGenModal} onClose={() => setShowAiGenModal(false)} title="Generate Blog Post with AI" size="lg" sheet>
        <div className="space-y-4">
          <Input
            label="Topic / Title Idea"
            placeholder="e.g. 10 Tips for Better Jewelry Product Photography"
            value={aiGenForm.topic}
            onChange={(e) => setAiGenForm(f => ({ ...f, topic: e.target.value }))}
          />

          {/* Topic Suggestions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-secondary">Suggested Topics</span>
              <div className="flex gap-2">
                <button onClick={fetchTopicBank} className="text-xs text-[#c4a67d] hover:underline">Load Suggestions</button>
                <button onClick={generateFreshTopics} className="text-xs text-[#c4a67d] hover:underline flex items-center gap-1">
                  {topicsLoading && <span className="w-3 h-3 border border-[#c4a67d]/30 border-t-[#c4a67d] rounded-full animate-spin" />}
                  AI Fresh Ideas
                </button>
              </div>
            </div>
            {topicSuggestions.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border border-border p-2 bg-background">
                {topicSuggestions.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setAiGenForm(f => ({ ...f, topic: t.topic, keywords: t.keywords.join(", ") }))}
                    className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-surface transition-colors group"
                  >
                    <span className="text-foreground group-hover:text-[#c4a67d]">{t.topic}</span>
                    <span className="ml-2 text-text-secondary opacity-60">{t.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input
            label="SEO Keywords (comma-separated)"
            placeholder="e.g. jewelry photography, product photos, AI photography"
            value={aiGenForm.keywords}
            onChange={(e) => setAiGenForm(f => ({ ...f, keywords: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Tone</label>
              <select
                value={aiGenForm.tone}
                onChange={(e) => setAiGenForm(f => ({ ...f, tone: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[#c4a67d]"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual & Friendly</option>
                <option value="educational">Educational</option>
                <option value="persuasive">Persuasive / Sales</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Word Count</label>
              <select
                value={aiGenForm.word_count}
                onChange={(e) => setAiGenForm(f => ({ ...f, word_count: Number(e.target.value) }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[#c4a67d]"
              >
                <option value={600}>Short (~600 words)</option>
                <option value={1200}>Medium (~1200 words)</option>
                <option value={2000}>Long (~2000 words)</option>
                <option value={3000}>In-Depth (~3000 words)</option>
              </select>
            </div>
          </div>
          {blogCategories.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
              <select
                value={aiGenForm.category_id}
                onChange={(e) => setAiGenForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[#c4a67d]"
              >
                <option value="">No Category</option>
                {blogCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={aiGenForm.auto_publish}
              onChange={(e) => setAiGenForm(f => ({ ...f, auto_publish: e.target.checked }))}
              className="w-4 h-4 accent-[#c4a67d] rounded"
            />
            Auto-publish immediately (otherwise saves as draft)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAiGenModal(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAiGenerate} disabled={aiGenerating || !aiGenForm.topic.trim()}>
              {aiGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  Generate Post
                </span>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Blog Post Create/Edit Modal */}
      <Modal open={showPostModal} onClose={() => setShowPostModal(false)} title={editingPostId ? "Edit Blog Post" : "New Blog Post"} size="lg" sheet>
        <div className="space-y-4">
          <Input
            label="Title"
            value={blogPostForm.title}
            onChange={(e) => {
              const title = e.target.value;
              setBlogPostForm(f => ({
                ...f,
                title,
                slug: editingPostId ? f.slug : slugify(title),
              }));
            }}
            placeholder="Best Jewelry Photography Tips for 2026"
          />

          <Input
            label="Slug"
            value={blogPostForm.slug}
            onChange={(e) => setBlogPostForm(f => ({ ...f, slug: e.target.value }))}
            placeholder="best-jewelry-photography-tips"
            hint="URL path: /blog/your-slug-here"
          />

          <Input
            label="Excerpt"
            value={blogPostForm.excerpt}
            onChange={(e) => setBlogPostForm(f => ({ ...f, excerpt: e.target.value }))}
            placeholder="Short summary for cards and meta description..."
          />

          {/* Cover image */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Cover Image</label>
            <input ref={blogCoverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadBlogCover(file);
              e.target.value = "";
            }} />
            {blogPostForm.cover_image_url ? (
              <div className="relative rounded-xl overflow-hidden border border-border group">
                <img src={blogPostForm.cover_image_url} alt="Cover" className="w-full h-36 object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => blogCoverInputRef.current?.click()} className="px-3 py-1.5 bg-[rgba(255,255,255,0.1)] backdrop-blur-sm rounded-lg text-xs font-medium text-white shadow-sm">Replace</button>
                    <button type="button" onClick={() => setBlogPostForm(f => ({ ...f, cover_image_url: "" }))} className="px-3 py-1.5 bg-[rgba(255,255,255,0.1)] backdrop-blur-sm rounded-lg text-xs font-medium text-[#EF4444] shadow-sm">Remove</button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => blogCoverInputRef.current?.click()}
                disabled={blogCoverUploading}
                className="w-full py-6 rounded-xl border-2 border-dashed border-[rgba(255,255,255,0.1)] hover:border-[rgba(196,166,125,0.3)] bg-[rgba(255,255,255,0.02)] transition-all flex flex-col items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {blogCoverUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[rgba(196,166,125,0.2)] border-t-[#c4a67d] rounded-full animate-spin" />
                    <span className="text-xs text-text-secondary">Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    <span className="text-xs text-text-secondary">Upload cover image</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Category</label>
            <select
              value={blogPostForm.category_id}
              onChange={(e) => setBlogPostForm(f => ({ ...f, category_id: e.target.value }))}
              className="w-full px-4 py-3 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-[#c4a67d] transition-all"
            >
              <option value="">No category</option>
              {blogCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <Input
            label="Tags"
            value={blogPostForm.tags}
            onChange={(e) => setBlogPostForm(f => ({ ...f, tags: e.target.value }))}
            placeholder="jewelry, photography, tips"
            hint="Comma-separated tags"
          />

          {/* Content editor */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Content</label>
            <TiptapEditor
              content={blogPostContent}
              onChange={setBlogPostContent}
              onImageUpload={handleBlogImageUpload}
            />
          </div>

          {/* SEO fields (collapsible) */}
          <details className="group">
            <summary className="text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer py-2 flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="transition-transform group-open:rotate-90"><path d="M9 18l6-6-6-6" /></svg>
              SEO Settings
            </summary>
            <div className="space-y-3 pt-2">
              <Input
                label="Meta Title"
                value={blogPostForm.meta_title}
                onChange={(e) => setBlogPostForm(f => ({ ...f, meta_title: e.target.value }))}
                placeholder="Custom SEO title (falls back to post title)"
              />
              <Input
                label="Meta Description"
                value={blogPostForm.meta_description}
                onChange={(e) => setBlogPostForm(f => ({ ...f, meta_description: e.target.value }))}
                placeholder="Custom meta description (falls back to excerpt)"
              />
              <Input
                label="OG Image URL"
                value={blogPostForm.og_image_url}
                onChange={(e) => setBlogPostForm(f => ({ ...f, og_image_url: e.target.value }))}
                placeholder="Custom Open Graph image URL"
              />
            </div>
          </details>

          {/* Status + Save */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setBlogPostForm(f => ({ ...f, status: f.status === "draft" ? "published" : "draft" }))}
              className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                blogPostForm.status === "published"
                  ? "border-success bg-success-light text-success"
                  : "border-border text-text-secondary"
              }`}
            >
              {blogPostForm.status === "published" ? "Published" : "Draft"}
            </button>
            <Button onClick={handleSavePost} loading={blogSaving} disabled={blogCoverUploading} fullWidth>
              {editingPostId ? "Save Changes" : "Create Post"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Blog Category Create/Edit Modal */}
      <Modal open={showBlogCatModal} onClose={() => setShowBlogCatModal(false)} title={editingBlogCatId ? "Edit Category" : "New Category"}>
        <div className="space-y-4">
          <Input
            label="Name"
            value={blogCatForm.name}
            onChange={(e) => {
              const name = e.target.value;
              setBlogCatForm(f => ({
                ...f,
                name,
                slug: editingBlogCatId ? f.slug : slugify(name),
              }));
            }}
            placeholder="Jewelry Photography Tips"
          />
          <Input
            label="Slug"
            value={blogCatForm.slug}
            onChange={(e) => setBlogCatForm(f => ({ ...f, slug: e.target.value }))}
            placeholder="jewelry-photography-tips"
          />
          <Input
            label="Description"
            value={blogCatForm.description}
            onChange={(e) => setBlogCatForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Tips and guides for jewelry photography"
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Display Order</label>
            <input
              type="number"
              value={blogCatForm.display_order}
              onChange={(e) => setBlogCatForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-[#c4a67d] transition-all"
            />
          </div>
          <Button onClick={handleSaveBlogCat} loading={blogCatSaving} fullWidth>
            {editingBlogCatId ? "Save Changes" : "Create Category"}
          </Button>
        </div>
      </Modal>

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
              className="w-full px-4 py-3 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-[#c4a67d] focus:shadow-[0_0_0_3px_rgba(196,166,125,0.15)] transition-all duration-250"
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
                className="w-full py-8 rounded-xl border-2 border-dashed border-[rgba(255,255,255,0.1)] hover:border-[rgba(196,166,125,0.3)] bg-[rgba(255,255,255,0.02)] transition-all flex flex-col items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                {afterUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[rgba(196,166,125,0.2)] border-t-[#c4a67d] rounded-full animate-spin" />
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
                className="w-full py-6 rounded-xl border-2 border-dashed border-[rgba(255,255,255,0.1)] hover:border-[rgba(196,166,125,0.3)] bg-[rgba(255,255,255,0.02)] transition-all flex flex-col items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                {beforeUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[rgba(196,166,125,0.2)] border-t-[#c4a67d] rounded-full animate-spin" />
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
                className="w-full px-4 py-3 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-[#c4a67d] focus:shadow-[0_0_0_3px_rgba(196,166,125,0.15)] transition-all duration-250"
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
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${isDone ? "bg-success text-white" : isActive ? "bg-accent text-white shadow-[0_0_10px_rgba(196,166,125,0.4)]" : "bg-surface border border-border text-text-secondary"
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
            className="w-full py-16 rounded-xl border-2 border-dashed border-[rgba(196,166,125,0.2)] hover:border-[rgba(196,166,125,0.5)] hover:bg-[rgba(196,166,125,0.03)] transition-all flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 bg-[rgba(196,166,125,0.1)] rounded-2xl flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
                    <div className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${genModel === m.id ? "border-accent shadow-[0_0_12px_rgba(196,166,125,0.25)]" : "border-border"}`}>
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
                      <div className={`relative rounded-xl overflow-hidden border-2 aspect-[3/4] transition-all ${sel ? "border-accent shadow-[0_0_12px_rgba(196,166,125,0.25)]" : "border-border"}`}>
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
                    <div className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${genBg === bg.id ? "border-accent shadow-[0_0_12px_rgba(196,166,125,0.25)]" : "border-border"}`}>
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
                <div className="w-8 h-8 border-2 border-[rgba(196,166,125,0.2)] border-t-[#c4a67d] rounded-full animate-spin" />
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
                    ? "border-accent shadow-[0_0_16px_rgba(196,166,125,0.3)] ring-2 ring-[rgba(196,166,125,0.15)]"
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

      {/* Pricing Plan Edit Modal */}
      <Modal open={!!editingPlan} onClose={() => setEditingPlan(null)} title={editingPlan?.id ? "Edit Plan" : "New Plan"}>
        {editingPlan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Plan ID</label>
                <input
                  value={editingPlan.plan_id}
                  onChange={e => setEditingPlan(p => p ? { ...p, plan_id: e.target.value } : p)}
                  disabled={!!editingPlan.id}
                  placeholder="e.g. starter_149"
                  className="w-full px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-accent transition-all disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Name</label>
                <input
                  value={editingPlan.name}
                  onChange={e => setEditingPlan(p => p ? { ...p, name: e.target.value } : p)}
                  placeholder="Starter Pack"
                  className="w-full px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-accent transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
                <select
                  value={editingPlan.plan_type}
                  onChange={e => setEditingPlan(p => p ? { ...p, plan_type: e.target.value } : p)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-accent transition-all"
                >
                  <option value="token_pack">Token Pack (One-time)</option>
                  <option value="subscription">Subscription (Monthly)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Tokens</label>
                <input
                  type="number"
                  value={editingPlan.tokens}
                  onChange={e => setEditingPlan(p => p ? { ...p, tokens: parseInt(e.target.value) || 0 } : p)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-accent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">Pricing</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-text-secondary mb-1">₹ INR (rupees)</label>
                  <input
                    type="number"
                    value={editingPlan.price_inr}
                    onChange={e => setEditingPlan(p => p ? { ...p, price_inr: parseInt(e.target.value) || 0 } : p)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-accent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary mb-1">$ USD (cents)</label>
                  <input
                    type="number"
                    value={editingPlan.price_usd}
                    onChange={e => setEditingPlan(p => p ? { ...p, price_usd: parseInt(e.target.value) || 0 } : p)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-accent transition-all"
                  />
                  <p className="text-[9px] text-text-secondary/50 mt-0.5">= ${(editingPlan.price_usd / 100).toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary mb-1">€ EUR (cents)</label>
                  <input
                    type="number"
                    value={editingPlan.price_eur}
                    onChange={e => setEditingPlan(p => p ? { ...p, price_eur: parseInt(e.target.value) || 0 } : p)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-accent transition-all"
                  />
                  <p className="text-[9px] text-text-secondary/50 mt-0.5">= €{(editingPlan.price_eur / 100).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
              <input
                value={editingPlan.description}
                onChange={e => setEditingPlan(p => p ? { ...p, description: e.target.value } : p)}
                placeholder="80 tokens — 10 Standard images or 4 Pro images"
                className="w-full px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-accent transition-all"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-text-secondary mb-1">Sort Order</label>
                <input
                  type="number"
                  value={editingPlan.sort_order}
                  onChange={e => setEditingPlan(p => p ? { ...p, sort_order: parseInt(e.target.value) || 0 } : p)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-white text-sm outline-none focus:border-accent transition-all"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-4">
                <input
                  type="checkbox"
                  checked={editingPlan.recommended}
                  onChange={e => setEditingPlan(p => p ? { ...p, recommended: e.target.checked } : p)}
                  className="rounded border-border"
                />
                <span className="text-xs text-text-secondary">Recommended</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer pt-4">
                <input
                  type="checkbox"
                  checked={editingPlan.is_active}
                  onChange={e => setEditingPlan(p => p ? { ...p, is_active: e.target.checked } : p)}
                  className="rounded border-border"
                />
                <span className="text-xs text-text-secondary">Active</span>
              </label>
            </div>

            <Button onClick={handleSavePlan} loading={pricingSaving} fullWidth>
              {editingPlan.id ? "Update Plan" : "Create Plan"}
            </Button>
          </div>
        )}
      </Modal>

      {/* ===== LEADS TAB ===== */}
      {activeTab === "leads" && (
        <>
          {/* Pipeline Controls */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Pipeline Controls</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { step: "discover", label: "Discover", body: { platform: null, region: "us", max_results: 50 } },
                { step: "enrich", label: "Enrich Emails" },
                { step: "scrape", label: "Scrape Photos" },
                { step: "generate", label: "Generate AI" },
                { step: "send-emails", label: "Send Emails" },
                { step: "find-instagram", label: "Find Instagram" },
              ].map(({ step, label, body }) => (
                <Button
                  key={step}
                  onClick={() => runPipelineStep(step, body)}
                  loading={pipelineRunning === step}
                  className="text-xs"
                >
                  {label}
                </Button>
              ))}
              <Button
                onClick={() => runPipelineStep("run-full", { platform: null, region: "us", max_discover: 50, batch_size: 50 })}
                loading={pipelineRunning === "run-full"}
                className="text-xs !bg-gradient-to-r !from-[#c4a67d] !to-[#d4b88f] !text-[#1a1612]"
              >
                Run Full Pipeline
              </Button>
            </div>
            {pipelineResult && (
              <pre className="mt-3 p-3 bg-surface rounded-lg text-xs overflow-auto max-h-40 border border-border">
                {pipelineResult}
              </pre>
            )}
          </Card>

          {/* Stats */}
          {leadStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Leads", value: leadStats.total_leads },
                { label: "Emails Sent", value: leadStats.emails.total },
                { label: "Opened", value: leadStats.emails.opened },
                { label: "Clicked", value: leadStats.emails.clicked },
              ].map(s => (
                <Card key={s.label} className="p-3 text-center">
                  <div className="text-lg font-bold text-foreground">{s.value}</div>
                  <div className="text-xs text-text-secondary">{s.label}</div>
                </Card>
              ))}
            </div>
          )}

          {/* Funnel */}
          {leadStats && Object.keys(leadStats.by_status).length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Funnel</h3>
              <div className="space-y-1.5">
                {Object.entries(leadStats.by_status)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary w-24 truncate">{status}</span>
                      <div className="flex-1 h-5 bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#c4a67d] to-[#d4b88f] rounded-full transition-all"
                          style={{ width: `${Math.max(2, (count / leadStats.total_leads) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-10 text-right">{count}</span>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* Platform & Region breakdown */}
          {leadStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-2">By Platform</h3>
                {Object.entries(leadStats.by_platform).map(([p, c]) => (
                  <div key={p} className="flex justify-between text-xs py-1">
                    <span className="text-text-secondary capitalize">{p.replace("_", " ")}</span>
                    <span className="font-medium">{c}</span>
                  </div>
                ))}
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-2">By Region</h3>
                {Object.entries(leadStats.by_region).map(([r, c]) => (
                  <div key={r} className="flex justify-between text-xs py-1">
                    <span className="text-text-secondary uppercase">{r}</span>
                    <span className="font-medium">{c}</span>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs text-text-secondary block mb-1">Status</label>
                <select
                  value={leadsFilter.status}
                  onChange={e => { setLeadsFilter(f => ({ ...f, status: e.target.value })); setLeadsFetched(false); }}
                  className="text-xs border border-border rounded-lg px-3 py-1.5 bg-surface"
                >
                  <option value="">All</option>
                  {["discovered","enriched","no_email","scraped","scrape_failed","generating","generated","gen_failed","sent","delivered","opened","clicked","converted","bounced"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Platform</label>
                <select
                  value={leadsFilter.platform}
                  onChange={e => { setLeadsFilter(f => ({ ...f, platform: e.target.value })); setLeadsFetched(false); }}
                  className="text-xs border border-border rounded-lg px-3 py-1.5 bg-surface"
                >
                  <option value="">All</option>
                  {["google_places","shopify","etsy","instagram"].map(p => (
                    <option key={p} value={p}>{p.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Region</label>
                <select
                  value={leadsFilter.region}
                  onChange={e => { setLeadsFilter(f => ({ ...f, region: e.target.value })); setLeadsFetched(false); }}
                  className="text-xs border border-border rounded-lg px-3 py-1.5 bg-surface"
                >
                  <option value="">All</option>
                  {["us","eu","dubai","other"].map(r => (
                    <option key={r} value={r}>{r.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <Button onClick={() => { setLeadsFetched(false); }} className="text-xs">Refresh</Button>
            </div>
          </Card>

          {/* Leads Table */}
          <Card className="p-0 overflow-hidden">
            {leadsLoading ? (
              <div className="p-8 text-center text-text-secondary text-sm">Loading leads...</div>
            ) : leads.length === 0 ? (
              <div className="p-8 text-center text-text-secondary text-sm">
                No leads found. Run the discovery pipeline to find jewelry stores.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface/50">
                      <th className="text-left px-3 py-2 font-medium text-text-secondary">Store</th>
                      <th className="text-left px-3 py-2 font-medium text-text-secondary">Platform</th>
                      <th className="text-left px-3 py-2 font-medium text-text-secondary">Region</th>
                      <th className="text-left px-3 py-2 font-medium text-text-secondary">Email</th>
                      <th className="text-left px-3 py-2 font-medium text-text-secondary">IG</th>
                      <th className="text-left px-3 py-2 font-medium text-text-secondary">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-text-secondary">Date</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => (
                      <tr
                        key={lead.id}
                        className="border-b border-border/50 hover:bg-surface/30 cursor-pointer transition-colors"
                        onClick={() => fetchLeadDetail(lead.id)}
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium truncate max-w-[180px]">{lead.store_name}</div>
                          <div className="text-text-secondary truncate max-w-[180px]">{lead.domain}</div>
                        </td>
                        <td className="px-3 py-2 capitalize">{lead.platform.replace("_", " ")}</td>
                        <td className="px-3 py-2 uppercase">{lead.region}</td>
                        <td className="px-3 py-2 truncate max-w-[160px]">{lead.contact_email || "—"}</td>
                        <td className="px-3 py-2">
                          {lead.metadata?.instagram_handle ? (
                            <a href={lead.metadata.instagram_url} target="_blank" rel="noopener noreferrer" className="text-[#c4a67d] hover:underline text-xs">@{lead.metadata.instagram_handle}</a>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            lead.status === "converted" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            lead.status === "clicked" || lead.status === "opened" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                            lead.status === "sent" || lead.status === "delivered" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                            lead.status === "generated" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                            lead.status.includes("fail") || lead.status === "bounced" || lead.status === "no_email" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                            "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-text-secondary">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={e => { e.stopPropagation(); leadgenFetch(`/pipeline/leads/${lead.id}`, { method: "DELETE" }).then(() => { setLeadsFetched(false); }); }}
                            className="text-red-400 hover:text-red-600 text-[10px]"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {leadsTotal > 0 && (
              <div className="px-3 py-2 text-xs text-text-secondary border-t border-border bg-surface/30">
                Showing {leads.length} of {leadsTotal} leads
              </div>
            )}
          </Card>
        </>
      )}

      {/* Lead Detail Modal */}
      <Modal open={leadDetailOpen} onClose={() => setLeadDetailOpen(false)} title={selectedLead?.store_name || "Lead Detail"}>
        {selectedLead && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-text-secondary">Platform:</span> <span className="capitalize">{selectedLead.platform.replace("_", " ")}</span></div>
              <div><span className="text-text-secondary">Region:</span> <span className="uppercase">{selectedLead.region}</span></div>
              <div><span className="text-text-secondary">Email:</span> {selectedLead.contact_email || <span className="text-red-400">No email</span>}</div>
              <div><span className="text-text-secondary">Status:</span> <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                selectedLead.status === "sent" || selectedLead.status === "delivered" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                selectedLead.status === "generated" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                selectedLead.status === "no_email" || selectedLead.status === "scrape_failed" || selectedLead.status === "gen_failed" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}>{selectedLead.status}</span></div>
              <div className="col-span-2"><span className="text-text-secondary">URL:</span> <a href={selectedLead.store_url} target="_blank" rel="noopener noreferrer" className="text-[#c4a67d] hover:underline">{selectedLead.store_url}</a></div>
            </div>

            {/* Instagram */}
            {(() => {
              const meta = selectedLead.metadata || {};
              const igHandle = meta.instagram_handle;
              const igUrl = meta.instagram_url;
              const storeName = selectedLead.store_name;

              const dmTemplate = `Hi! I came across ${storeName} and love your jewelry collection 💎\n\nI work at SoraPixel — we use AI to transform product photos into studio-quality shots. I actually ran one of your products through our tool and the result is amazing.\n\nWould love to show you the before/after — can I send it over?\n\nCheck us out: soraipixel.com`;

              return (
                <div className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">Instagram</h4>
                    {!igHandle && (
                      <Button
                        className="text-xs"
                        loading={pipelineRunning === `find-ig-${selectedLead.id}`}
                        onClick={async () => {
                          setPipelineRunning(`find-ig-${selectedLead.id}`);
                          try {
                            const res = await leadgenFetch(`/pipeline/leads/${selectedLead.id}/find-instagram`, { method: "POST" });
                            if (res.instagram_handle) {
                              fetchLeadDetail(selectedLead.id);
                            } else {
                              alert("No Instagram found. You can add it manually.");
                            }
                          } catch (err) {
                            alert(err instanceof Error ? err.message : "Search failed");
                          } finally {
                            setPipelineRunning(null);
                          }
                        }}
                      >
                        Find Instagram
                      </Button>
                    )}
                  </div>

                  {igHandle ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <a href={igUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[#c4a67d] hover:underline font-medium">
                          @{igHandle}
                        </a>
                        <a
                          href={`https://www.instagram.com/direct/new/?text=${encodeURIComponent(dmTemplate)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition"
                        >
                          Open DM
                        </a>
                      </div>
                      <div className="relative">
                        <textarea
                          readOnly
                          value={dmTemplate}
                          className="w-full text-xs p-2 rounded-lg border border-border bg-surface-secondary resize-none"
                          rows={5}
                        />
                        <button
                          onClick={() => { navigator.clipboard.writeText(dmTemplate); }}
                          className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded bg-surface-primary border border-border hover:bg-surface-secondary"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="@handle or instagram.com/handle"
                        id={`manual-ig-${selectedLead.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border bg-transparent flex-1"
                      />
                      <Button
                        className="text-xs whitespace-nowrap"
                        loading={pipelineRunning === `save-ig-${selectedLead.id}`}
                        onClick={async () => {
                          const input = document.getElementById(`manual-ig-${selectedLead.id}`) as HTMLInputElement;
                          let val = input?.value?.trim();
                          if (!val) return alert("Enter an Instagram handle or URL");
                          val = val.replace(/^@/, "").replace(/.*instagram\.com\//, "").replace(/\/$/, "");
                          setPipelineRunning(`save-ig-${selectedLead.id}`);
                          try {
                            await leadgenFetch(`/pipeline/leads/${selectedLead.id}`, {
                              method: "PATCH",
                              body: { instagram_handle: val },
                            });
                            fetchLeadDetail(selectedLead.id);
                          } catch (err) {
                            alert(err instanceof Error ? err.message : "Save failed");
                          } finally {
                            setPipelineRunning(null);
                          }
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Manual Email / Name Input */}
            {(!selectedLead.contact_email || selectedLead.status === "no_email" || selectedLead.status === "discovered") && (
              <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-3">
                <h4 className="text-sm font-semibold mb-2 text-amber-500">Add Contact Info</h4>
                <p className="text-xs text-text-secondary mb-2">Find the owner&apos;s email from their website, LinkedIn, or Instagram and add it here.</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="email"
                    placeholder="owner@store.com"
                    id={`manual-email-${selectedLead.id}`}
                    defaultValue={selectedLead.contact_email || ""}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border bg-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Owner name (optional)"
                    id={`manual-name-${selectedLead.id}`}
                    defaultValue={selectedLead.contact_name || ""}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border bg-transparent"
                  />
                </div>
                <Button
                  className="text-xs"
                  loading={pipelineRunning === `save-email-${selectedLead.id}`}
                  onClick={async () => {
                    const emailInput = document.getElementById(`manual-email-${selectedLead.id}`) as HTMLInputElement;
                    const nameInput = document.getElementById(`manual-name-${selectedLead.id}`) as HTMLInputElement;
                    const email = emailInput?.value?.trim();
                    if (!email || !email.includes("@")) return alert("Enter a valid email");
                    setPipelineRunning(`save-email-${selectedLead.id}`);
                    try {
                      await leadgenFetch(`/pipeline/leads/${selectedLead.id}`, {
                        method: "PATCH",
                        body: { contact_email: email, contact_name: nameInput?.value?.trim() || null },
                      });
                      fetchLeadDetail(selectedLead.id);
                      fetchLeads();
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "Save failed");
                    } finally {
                      setPipelineRunning(null);
                    }
                  }}
                >
                  Save Email
                </Button>
              </div>
            )}

            {/* Editable email for leads that already have one */}
            {selectedLead.contact_email && !["no_email", "discovered"].includes(selectedLead.status) && (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  id={`edit-email-${selectedLead.id}`}
                  defaultValue={selectedLead.contact_email}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border bg-transparent flex-1"
                />
                <input
                  type="text"
                  id={`edit-name-${selectedLead.id}`}
                  defaultValue={selectedLead.contact_name || ""}
                  placeholder="Name"
                  className="text-xs px-3 py-1.5 rounded-lg border border-border bg-transparent w-32"
                />
                <Button
                  className="text-xs whitespace-nowrap"
                  loading={pipelineRunning === `update-email-${selectedLead.id}`}
                  onClick={async () => {
                    const emailInput = document.getElementById(`edit-email-${selectedLead.id}`) as HTMLInputElement;
                    const nameInput = document.getElementById(`edit-name-${selectedLead.id}`) as HTMLInputElement;
                    const email = emailInput?.value?.trim();
                    if (!email || !email.includes("@")) return alert("Enter a valid email");
                    setPipelineRunning(`update-email-${selectedLead.id}`);
                    try {
                      await leadgenFetch(`/pipeline/leads/${selectedLead.id}`, {
                        method: "PATCH",
                        body: { contact_email: email, contact_name: nameInput?.value?.trim() || null },
                      });
                      fetchLeadDetail(selectedLead.id);
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "Update failed");
                    } finally {
                      setPipelineRunning(null);
                    }
                  }}
                >
                  Update
                </Button>
              </div>
            )}

            {/* Products — Before/After */}
            {leadProducts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Products ({leadProducts.length})</h4>
                <div className="space-y-3">
                  {leadProducts.map(p => (
                    <div key={p.id} className="border border-border rounded-lg p-3">
                      <div className="text-xs font-medium mb-2">{p.product_name} <span className="text-text-secondary capitalize">({p.jewelry_type})</span>
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${
                          p.status === "generated" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          p.status === "failed" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}>{p.status}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {p.original_image_url && (
                          <div>
                            <div className="text-[10px] text-text-secondary mb-1 uppercase tracking-wider">Original</div>
                            <img src={p.original_image_url} alt="Original" className="w-full rounded-lg border border-border" />
                          </div>
                        )}
                        {p.generated_studio_url && (
                          <div>
                            <div className="text-[10px] text-text-secondary mb-1 uppercase tracking-wider">Studio</div>
                            <img src={p.generated_studio_url} alt="Studio" className="w-full rounded-lg border border-border" />
                          </div>
                        )}
                        {p.generated_model_url && (
                          <div>
                            <div className="text-[10px] text-text-secondary mb-1 uppercase tracking-wider">Model</div>
                            <img src={p.generated_model_url} alt="Model" className="w-full rounded-lg border border-border" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No products message */}
            {leadProducts.length === 0 && (
              <div className="text-center py-3 text-xs text-text-secondary">No product images yet — drop images below</div>
            )}

            {/* Drag & Drop Image Upload */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                pipelineRunning === `drag-${selectedLead.id}` ? "border-[#c4a67d] bg-[#c4a67d]/10" : "border-border hover:border-[#c4a67d]/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setPipelineRunning(`drag-${selectedLead.id}`); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (pipelineRunning === `drag-${selectedLead.id}`) setPipelineRunning(null); }}
              onDrop={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
                if (files.length === 0) { setPipelineRunning(null); return alert("Drop image files only"); }
                const nameInput = document.getElementById(`upload-name-${selectedLead.id}`) as HTMLInputElement;
                const typeSelect = document.getElementById(`upload-type-${selectedLead.id}`) as HTMLSelectElement;
                setPipelineRunning(`upload-${selectedLead.id}`);
                try {
                  for (const file of files) {
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("product_name", nameInput?.value || file.name.replace(/\.[^.]+$/, ""));
                    formData.append("jewelry_type", typeSelect?.value || "other");
                    const resp = await fetch(`${LEADGEN_API}/pipeline/leads/${selectedLead.id}/upload-image`, {
                      method: "POST",
                      headers: { "X-Admin-Email": user?.email || "" },
                      body: formData,
                    });
                    if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
                  }
                  fetchLeadDetail(selectedLead.id);
                } catch (err) {
                  alert(err instanceof Error ? err.message : "Upload failed");
                } finally {
                  setPipelineRunning(null);
                }
              }}
            >
              <label htmlFor={`upload-file-${selectedLead.id}`} className="block cursor-pointer mb-3">
                {pipelineRunning === `upload-${selectedLead.id}` ? (
                  <p className="text-sm text-[#c4a67d] animate-pulse">Uploading...</p>
                ) : (
                  <>
                    <div className="text-2xl mb-1">📸</div>
                    <p className="text-sm font-medium">Drop product images here</p>
                    <p className="text-xs text-text-secondary mt-0.5">or click to browse</p>
                  </>
                )}
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                id={`upload-file-${selectedLead.id}`}
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;
                  const nameInput = document.getElementById(`upload-name-${selectedLead.id}`) as HTMLInputElement;
                  const typeSelect = document.getElementById(`upload-type-${selectedLead.id}`) as HTMLSelectElement;
                  setPipelineRunning(`upload-${selectedLead.id}`);
                  try {
                    for (const file of files) {
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("product_name", nameInput?.value || file.name.replace(/\.[^.]+$/, ""));
                      formData.append("jewelry_type", typeSelect?.value || "other");
                      const resp = await fetch(`${LEADGEN_API}/pipeline/leads/${selectedLead.id}/upload-image`, {
                        method: "POST",
                        headers: { "X-Admin-Email": user?.email || "" },
                        body: formData,
                      });
                      if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
                    }
                    fetchLeadDetail(selectedLead.id);
                  } catch (err) {
                    alert(err instanceof Error ? err.message : "Upload failed");
                  } finally {
                    setPipelineRunning(null);
                    e.target.value = "";
                  }
                }}
              />
              <div className="grid grid-cols-2 gap-2 mt-3">
                <input
                  type="text"
                  placeholder="Product name (optional)"
                  id={`upload-name-${selectedLead.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border bg-transparent"
                />
                <select
                  id={`upload-type-${selectedLead.id}`}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border bg-transparent"
                  defaultValue="other"
                >
                  <option value="ring">Ring</option>
                  <option value="necklace">Necklace</option>
                  <option value="bracelet">Bracelet</option>
                  <option value="earring">Earring</option>
                  <option value="pendant">Pendant</option>
                  <option value="watch">Watch</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Email History */}
            {leadEmails.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Email History</h4>
                <div className="space-y-1">
                  {leadEmails.map(e => (
                    <div key={e.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50">
                      <span className="truncate max-w-[200px]">{e.subject}</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          e.status === "clicked" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          e.status === "opened" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                          e.status === "bounced" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}>{e.status}</span>
                        {e.sent_at && <span className="text-text-secondary">{new Date(e.sent_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              {leadProducts.length > 0 && !["sent", "delivered", "opened", "clicked", "converted"].includes(selectedLead.status) && (
                <Button
                  onClick={async () => {
                    setPipelineRunning(`regenerate-${selectedLead.id}`);
                    try {
                      await leadgenFetch(`/pipeline/leads/${selectedLead.id}/regenerate`, { method: "POST" });
                      fetchLeadDetail(selectedLead.id);
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "Regenerate failed");
                    } finally {
                      setPipelineRunning(null);
                    }
                  }}
                  loading={pipelineRunning === `regenerate-${selectedLead.id}`}
                  className="text-xs"
                >
                  {leadProducts.some(p => p.generated_studio_url) ? "Regenerate AI" : "Generate AI"}
                </Button>
              )}
              {selectedLead.contact_email && leadProducts.some(p => p.generated_studio_url || p.generated_model_url) && (
                <Button
                  onClick={async () => {
                    setPipelineRunning(`send-email-${selectedLead.id}`);
                    try {
                      await leadgenFetch(`/pipeline/send-email/${selectedLead.id}`, { method: "POST" });
                      fetchLeadDetail(selectedLead.id);
                      fetchLeads();
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "Send failed");
                    } finally {
                      setPipelineRunning(null);
                    }
                  }}
                  loading={pipelineRunning === `send-email-${selectedLead.id}`}
                  className="text-xs !bg-green-600 hover:!bg-green-700 !text-white"
                >
                  Send Email
                </Button>
              )}
              <Button
                onClick={() => { leadgenFetch(`/pipeline/leads/${selectedLead.id}`, { method: "DELETE" }).then(() => { setLeadDetailOpen(false); setLeadsFetched(false); }); }}
                className="text-xs !bg-red-500/10 !text-red-500"
              >
                Delete Lead
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </ResponsiveLayout>

  );
}
