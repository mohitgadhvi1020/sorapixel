"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { safeFetch } from "@/lib/safe-fetch";
import type { ListingAttributes } from "@/lib/listing-prompt";
import { LISTING_PRICING } from "@/lib/token-pricing";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";

/* ─── Types ──────────────────────────────────────────────── */

type Phase = "upload" | "processing" | "done" | "history";

interface BatchItem {
  localId: string;
  dbId?: string;
  file: File;
  previewUrl: string;
  status: "pending" | "processing" | "completed" | "failed";
  title: string;
  description: string;
  metaDescription: string;
  altText: string;
  attributes: ListingAttributes;
  error?: string;
}

interface Toast {
  id: number;
  message: string;
  type: "error" | "warning" | "success" | "info";
}

interface ApiItem {
  id?: string;
  title: string;
  description: string;
  metaDescription: string;
  altText: string;
  attributes: ListingAttributes;
  storagePath?: string;
}

interface HistoryItem {
  id: string;
  batchId: string;
  batchDescription: string;
  imageUrl: string;
  filename: string;
  title: string;
  description: string;
  metaDescription: string;
  altText: string;
  attributes: ListingAttributes;
  status: string;
  createdAt: string;
}

/* ─── Helpers ────────────────────────────────────────────── */

const MAX_FILES = 40;

const EMPTY_ATTRS: ListingAttributes = {
  jewelryMaterial: "Metal",
  gemstoneType: "",
  collection: "",
  occasion: "",
  material: "",
  stone: "",
  closure: "",
};

function genLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/* ─── Page ───────────────────────────────────────────────── */

export default function BatchListingPage() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [batchId] = useState(() => crypto.randomUUID());
  const [batchDescription, setBatchDescription] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const cancelRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Shopify integration
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopifyStoreUrl, setShopifyStoreUrl] = useState("");
  const [shopifyInputUrl, setShopifyInputUrl] = useState("");
  const [shopifyInputClientId, setShopifyInputClientId] = useState("");
  const [shopifyInputClientSecret, setShopifyInputClientSecret] = useState("");
  const [shopifyConnecting, setShopifyConnecting] = useState(false);
  const [shopifyShowForm, setShopifyShowForm] = useState(false);
  const [pushingToShopify, setPushingToShopify] = useState<string | null>(null);
  const [pushedToShopify, setPushedToShopify] = useState<Set<string>>(new Set());
  const [pushingAll, setPushingAll] = useState(false);

  // Toast
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const showToast = useCallback((message: string, type: Toast["type"] = "error") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      type === "error" ? 8000 : 5000
    );
  }, []);

  // Fetch Shopify connection status + handle OAuth redirect
  const fetchShopifyStatus = useCallback(() => {
    safeFetch<{ connected: boolean; storeUrl: string }>("/api/shopify/credentials")
      .then((d) => {
        setShopifyConnected(d.connected);
        setShopifyStoreUrl(d.storeUrl || "");
      })
      .catch(() => { });
  }, []);
  useEffect(() => {
    fetchShopifyStatus();
    const params = new URLSearchParams(window.location.search);
    if (params.get("shopify_connected") === "true") {
      showToast("Shopify store connected successfully!", "success");
      fetchShopifyStatus();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("shopify_error")) {
      showToast(params.get("shopify_error") || "Shopify connection failed", "error");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [fetchShopifyStatus, showToast]);

  // Connect Shopify via OAuth
  const connectShopify = useCallback(async () => {
    if (!shopifyInputUrl.trim()) {
      showToast("Please enter your Shopify store URL", "warning");
      return;
    }
    if (!shopifyInputClientId.trim() || !shopifyInputClientSecret.trim()) {
      showToast("Please enter both Client ID and Client Secret from your Shopify app", "warning");
      return;
    }
    setShopifyConnecting(true);
    try {
      const result = await safeFetch<{ authUrl?: string; error?: string }>(
        "/api/shopify/auth",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeUrl: shopifyInputUrl.trim(),
            clientId: shopifyInputClientId.trim(),
            clientSecret: shopifyInputClientSecret.trim(),
          }),
        }
      );
      if (result.authUrl) {
        window.location.href = result.authUrl;
      } else {
        showToast(result.error || "Failed to initiate Shopify connection", "error");
        setShopifyConnecting(false);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to connect to Shopify", "error");
      setShopifyConnecting(false);
    }
  }, [shopifyInputUrl, shopifyInputClientId, shopifyInputClientSecret, showToast]);

  // Push single item to Shopify
  const pushToShopify = useCallback(async (localId: string) => {
    if (!shopifyConnected) {
      showToast("Connect your Shopify store first (scroll up to the Shopify Integration section)", "warning");
      return;
    }
    const item = items.find((i) => i.localId === localId);
    if (!item || item.status !== "completed" || pushingToShopify) return;

    setPushingToShopify(localId);
    try {
      const base64 = await readFileAsBase64(item.file);
      const result = await safeFetch<{ success?: boolean; product?: { adminUrl: string }; error?: string }>(
        "/api/shopify/push",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: item.title,
            description: item.description,
            metaDescription: item.metaDescription,
            altText: item.altText,
            attributes: item.attributes,
            imageUrl: base64,
          }),
        }
      );
      if (result.success) {
        setPushedToShopify((prev) => new Set(prev).add(localId));
        showToast("Product added to Shopify as draft!", "success");
      } else {
        showToast(result.error || "Failed to push to Shopify", "error");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to push to Shopify", "error");
    } finally {
      setPushingToShopify(null);
    }
  }, [items, shopifyConnected, pushingToShopify, showToast]);

  // Push all completed items to Shopify
  const pushAllToShopify = useCallback(async () => {
    const completed = items.filter((i) => i.status === "completed" && !pushedToShopify.has(i.localId));
    if (completed.length === 0) return;
    setPushingAll(true);
    for (const item of completed) {
      await pushToShopify(item.localId);
    }
    setPushingAll(false);
    showToast(`Finished pushing ${completed.length} product(s) to Shopify`, "success");
  }, [items, pushedToShopify, pushToShopify, showToast]);

  // Token balance
  const COST_PER_IMAGE = LISTING_PRICING.costPerImage;
  const COST_PER_REGEN = LISTING_PRICING.costPerRegen;
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const fetchTokenBalance = useCallback(() => {
    safeFetch<{ balance: number; costPerImage: number; costPerRegen: number }>("/api/listing-tokens")
      .then((d) => setTokenBalance(d.balance))
      .catch(() => { });
  }, []);
  useEffect(() => { fetchTokenBalance(); }, [fetchTokenBalance]);

  // History
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySelected, setHistorySelected] = useState<HistoryItem | null>(null);
  const HISTORY_LIMIT = 30;

  const fetchHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const data = await safeFetch<{
        items: HistoryItem[];
        total: number;
        page: number;
      }>(`/api/batch-listing/history?page=${page}&limit=${HISTORY_LIMIT}`);
      setHistoryItems(data.items || []);
      setHistoryTotal(data.total || 0);
      setHistoryPage(page);
    } catch {
      showToast("Failed to load history", "error");
    } finally {
      setHistoryLoading(false);
    }
  }, [showToast]);

  const openHistory = useCallback(() => {
    setPhase("history");
    fetchHistory(1);
  }, [fetchHistory]);

  // Warn before unload during processing
  useEffect(() => {
    if (phase !== "processing") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  /* ─── File Selection ─────────────────────────────────────── */

  const handleFilesSelected = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const remaining = MAX_FILES - items.length;
      if (remaining <= 0) {
        showToast(`Maximum ${MAX_FILES} images allowed`, "warning");
        return;
      }

      const accepted = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, remaining);

      if (accepted.length === 0) return;

      const newItems: BatchItem[] = accepted.map((f) => ({
        localId: genLocalId(),
        file: f,
        previewUrl: URL.createObjectURL(f),
        status: "pending" as const,
        title: "",
        description: "",
        metaDescription: "",
        altText: "",
        attributes: { ...EMPTY_ATTRS },
      }));

      setItems((prev) => [...prev, ...newItems]);

      if (accepted.length < files.length) {
        const skipped = files.length - accepted.length;
        showToast(`${skipped} file(s) skipped (limit is ${MAX_FILES} images)`, "info");
      }
    },
    [items.length, showToast]
  );

  const removeItem = useCallback((localId: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.localId === localId);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.localId !== localId);
    });
    setSelectedId((prev) => (prev === localId ? null : prev));
  }, []);

  const clearAll = useCallback(() => {
    items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setItems([]);
    setSelectedId(null);
  }, [items]);

  /* ─── Update helpers ─────────────────────────────────────── */

  const saveTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  const saveToDb = useCallback(async (item: BatchItem) => {
    if (!item.dbId) return;
    setSavingId(item.localId);
    try {
      await safeFetch("/api/batch-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "save",
          itemId: item.dbId,
          title: item.title,
          description: item.description,
          metaDescription: item.metaDescription,
          altText: item.altText,
          attributes: item.attributes,
        }),
      });
      setSavedId(item.localId);
      setTimeout(() => setSavedId((prev) => (prev === item.localId ? null : prev)), 2000);
    } catch (err) {
      console.error("Auto-save failed:", err);
    } finally {
      setSavingId((prev) => (prev === item.localId ? null : prev));
    }
  }, []);

  const updateItem = useCallback(
    (localId: string, updates: Partial<BatchItem>) => {
      setItems((prev) => {
        const updated = prev.map((i) => (i.localId === localId ? { ...i, ...updates } : i));
        const item = updated.find((i) => i.localId === localId);
        if (item && item.dbId && item.status === "completed") {
          if (saveTimerRef.current[localId]) clearTimeout(saveTimerRef.current[localId]);
          saveTimerRef.current[localId] = setTimeout(() => {
            saveToDb(item);
            delete saveTimerRef.current[localId];
          }, 1500);
        }
        return updated;
      });
    },
    [saveToDb]
  );

  /* ─── Process All ────────────────────────────────────────── */

  const processAll = useCallback(async () => {
    if (items.length === 0) return;

    const pendingCount = items.filter((i) => i.status !== "completed").length;
    const tokensNeeded = pendingCount * COST_PER_IMAGE;
    if (tokenBalance !== null && tokenBalance < tokensNeeded) {
      showToast(
        `Not enough tokens. You need ${tokensNeeded} tokens (${pendingCount} images × ${COST_PER_IMAGE}) but have ${tokenBalance}. Please contact admin.`,
        "error"
      );
      return;
    }

    setPhase("processing");
    cancelRef.current = false;
    abortRef.current = new AbortController();
    setProcessedCount(0);

    for (let i = 0; i < items.length; i++) {
      if (cancelRef.current) break;

      const item = items[i];
      if (item.status === "completed") {
        setProcessedCount(i + 1);
        continue;
      }

      updateItem(item.localId, { status: "processing", error: undefined });

      try {
        const base64 = await readFileAsBase64(item.file);

        if (cancelRef.current) {
          updateItem(item.localId, { status: "failed", error: "Cancelled" });
          break;
        }

        const result = await safeFetch<{
          success: boolean;
          balance?: number;
          item?: ApiItem;
          error?: string;
          code?: string;
        }>("/api/batch-listing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "generate",
            imageBase64: base64,
            filename: item.file.name,
            batchId,
            batchDescription,
          }),
          signal: abortRef.current?.signal,
        });

        if (!result.success || !result.item) {
          if (result.code === "INSUFFICIENT_TOKENS") {
            updateItem(item.localId, { status: "failed", error: "Insufficient tokens" });
            showToast("Ran out of listing tokens. Remaining images skipped.", "error");
            if (typeof result.balance === "number") setTokenBalance(result.balance);
            break;
          }
          throw new Error(result.error || "Generation failed");
        }

        if (typeof result.balance === "number") setTokenBalance(result.balance);

        updateItem(item.localId, {
          status: "completed",
          dbId: result.item.id,
          title: result.item.title,
          description: result.item.description,
          metaDescription: result.item.metaDescription,
          altText: result.item.altText,
          attributes: result.item.attributes,
        });
      } catch (err) {
        if (cancelRef.current) {
          updateItem(item.localId, { status: "failed", error: "Cancelled" });
          break;
        }
        const msg = err instanceof Error ? err.message : "Failed";
        updateItem(item.localId, { status: "failed", error: msg });
      }

      setProcessedCount(i + 1);
    }

    setItems((prev) =>
      prev.map((it) => (it.status === "processing" ? { ...it, status: "failed", error: "Cancelled" } : it))
    );
    abortRef.current = null;
    setPhase("done");
  }, [items, batchId, batchDescription, updateItem, tokenBalance, showToast]);

  const cancelProcessing = useCallback(() => {
    cancelRef.current = true;
    abortRef.current?.abort();
  }, []);

  /* ─── Regenerate Single ──────────────────────────────────── */

  const regenerateItem = useCallback(
    async (localId: string) => {
      const item = items.find((i) => i.localId === localId);
      if (!item || regeneratingId) return;

      if (tokenBalance !== null && tokenBalance < COST_PER_REGEN) {
        showToast(`Not enough tokens to regenerate (need ${COST_PER_REGEN}, have ${tokenBalance}).`, "error");
        return;
      }

      setRegeneratingId(localId);
      updateItem(localId, { error: undefined });

      try {
        const base64 = await readFileAsBase64(item.file);

        const result = await safeFetch<{
          success: boolean;
          balance?: number;
          item?: ApiItem;
          error?: string;
          code?: string;
        }>("/api/batch-listing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "regenerate",
            itemId: item.dbId,
            imageBase64: base64,
            batchDescription,
          }),
        });

        if (!result.success || !result.item) {
          if (result.code === "INSUFFICIENT_TOKENS") {
            showToast("Insufficient listing tokens. Contact admin to add more.", "error");
            if (typeof result.balance === "number") setTokenBalance(result.balance);
            return;
          }
          throw new Error(result.error || "Regeneration failed");
        }

        if (typeof result.balance === "number") setTokenBalance(result.balance);

        updateItem(localId, {
          title: result.item.title,
          description: result.item.description,
          metaDescription: result.item.metaDescription,
          altText: result.item.altText,
          attributes: result.item.attributes,
        });

        showToast("Listing regenerated successfully", "success");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Regeneration failed";
        showToast(msg, "error");
      } finally {
        setRegeneratingId(null);
      }
    },
    [items, regeneratingId, batchDescription, updateItem, showToast]
  );

  /* ─── Retry Failed ──────────────────────────────────────── */

  const retryFailed = useCallback(async () => {
    const failed = items.filter((i) => i.status === "failed");
    if (failed.length === 0) return;

    setPhase("processing");
    cancelRef.current = false;

    for (const item of failed) {
      if (cancelRef.current) break;

      updateItem(item.localId, { status: "processing", error: undefined });

      try {
        const base64 = await readFileAsBase64(item.file);
        const result = await safeFetch<{
          success: boolean;
          item?: ApiItem;
          error?: string;
        }>("/api/batch-listing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "generate",
            imageBase64: base64,
            filename: item.file.name,
            batchId,
            batchDescription,
          }),
        });

        if (!result.success || !result.item) {
          throw new Error(result.error || "Generation failed");
        }

        updateItem(item.localId, {
          status: "completed",
          dbId: result.item.id,
          title: result.item.title,
          description: result.item.description,
          metaDescription: result.item.metaDescription,
          altText: result.item.altText,
          attributes: result.item.attributes,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed";
        updateItem(item.localId, { status: "failed", error: msg });
      }
    }

    setPhase("done");
  }, [items, batchId, batchDescription, updateItem]);

  /* ─── Export CSV ─────────────────────────────────────────── */

  const exportCSV = useCallback(() => {
    const completed = items.filter((i) => i.status === "completed");
    if (completed.length === 0) return;

    const headers = [
      "Filename",
      "Title",
      "Description",
      "Jewelry Material",
      "Gemstone Type",
      "Collection",
      "Occasion",
      "Material (Detail)",
      "Stone (Detail)",
      "Closure",
      "Meta Description",
      "Image Alt Text",
    ];

    const rows = completed.map((i) => [
      i.file.name,
      i.title,
      stripHtml(i.description),
      i.attributes.jewelryMaterial,
      i.attributes.gemstoneType,
      i.attributes.collection,
      i.attributes.occasion,
      i.attributes.material,
      i.attributes.stone,
      i.attributes.closure,
      i.metaDescription,
      i.altText,
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-listings-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [items]);

  /* ─── Copy ──────────────────────────────────────────────── */

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }, []);

  /* ─── Select + scroll ──────────────────────────────────── */

  const selectItem = useCallback((localId: string) => {
    setSelectedId((prev) => {
      const next = prev === localId ? null : localId;
      if (next) {
        setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
      return next;
    });
  }, []);

  /* ─── Start Over ────────────────────────────────────────── */

  const startOver = useCallback(() => {
    items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setItems([]);
    setSelectedId(null);
    setPhase("upload");
    setProcessedCount(0);
    cancelRef.current = false;
    setBatchDescription("");
  }, [items]);

  /* ─── Derived state ─────────────────────────────────────── */

  const completedCount = items.filter((i) => i.status === "completed").length;
  const failedCount = items.filter((i) => i.status === "failed").length;
  const selectedItem = items.find((i) => i.localId === selectedId) || null;
  const isProcessing = phase === "processing";

  /* ─── Drop zone handlers ────────────────────────────────── */

  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFilesSelected(e.dataTransfer.files);
    },
    [handleFilesSelected]
  );

  /* ─── Render ────────────────────────────────────────────── */

  return (
    <ResponsiveLayout title="Bulk Listings">
      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90vw] max-w-md pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg border text-[13px] font-medium animate-slide-up-sm flex items-start gap-3 ${toast.type === "error"
                ? "bg-[rgba(239,68,68,0.12)] border-[rgba(239,68,68,0.3)] text-[#EF4444]"
                : toast.type === "warning"
                  ? "bg-[rgba(245,158,11,0.12)] border-[rgba(245,158,11,0.3)] text-[#F59E0B]"
                  : toast.type === "success"
                    ? "bg-[rgba(16,185,129,0.12)] border-[rgba(16,185,129,0.3)] text-[#10B981]"
                    : "bg-[rgba(59,130,246,0.12)] border-[rgba(59,130,246,0.3)] text-blue-400"
                }`}
            >
              <span className="flex-shrink-0 mt-0.5">
                {toast.type === "error" ? "✕" : toast.type === "warning" ? "⚠" : toast.type === "success" ? "✓" : "ℹ"}
              </span>
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="flex-shrink-0 ml-1 text-current opacity-50 hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Phase-specific action bar */}
      <div className="flex items-center justify-end gap-3 mb-6">
        {phase !== "history" && (
          <button
            onClick={openHistory}
            className="px-4 py-2 text-[13px] font-medium text-[rgba(255,255,255,0.7)] rounded-xl hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all duration-200"
          >
            History
          </button>
        )}
        {phase !== "upload" && (
          <button
            onClick={startOver}
            className="px-4 py-2 text-[13px] font-medium text-[rgba(255,255,255,0.7)] rounded-xl hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all duration-200"
          >
            {phase === "history" ? "New Batch" : "Start over"}
          </button>
        )}
      </div>

      {/* ═══ UPLOAD PHASE ═══ */}
      {phase === "upload" && (
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
          {/* Title */}
          <div className="text-center">
            <span className="text-[11px] sm:text-xs font-semibold text-[#d4b88f] tracking-[0.12em] uppercase mb-3 block">
              Batch Processing
            </span>
            <h1 className="font-display font-bold text-white text-[1.75rem] sm:text-[2.5rem] uppercase tracking-[-0.02em] leading-[0.95]">
              Bulk Listing Generator
            </h1>
            <p className="text-[14px] sm:text-base text-[rgba(255,255,255,0.4)] mt-3 max-w-md mx-auto">
              Upload up to {MAX_FILES} jewelry images — we&apos;ll auto-generate Shopify-ready titles &amp; descriptions for each
            </p>
            {tokenBalance !== null && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#c4a67d]" />
                <span className="text-[13px] font-semibold text-white">{tokenBalance}</span>
                <span className="text-[12px] text-[rgba(255,255,255,0.4)]">tokens available</span>
                <span className="text-[11px] text-[rgba(255,255,255,0.25)]">({COST_PER_IMAGE} per image)</span>
              </div>
            )}
          </div>

          {/* Batch Description Input */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-5">
            <label className="block text-[11px] font-semibold text-[#d4b88f] uppercase tracking-[0.12em] mb-2">
              What type of product is in this batch? *
            </label>
            <input
              type="text"
              value={batchDescription}
              onChange={(e) => setBatchDescription(e.target.value)}
              placeholder="e.g., Bracelet, Anklet, Necklace, Earrings, Ring..."
              className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-[15px] text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:ring-2 focus:ring-[rgba(196,166,125,0.15)] focus:border-[#c4a67d] transition-all duration-200"
            />
            <p className="text-[11px] text-[rgba(255,255,255,0.4)] mt-2">
              This ensures the AI correctly identifies the product type. All images in this batch should be the same type of product.
            </p>
          </div>

          {/* Shopify Connection */}
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-[#d4b88f] uppercase tracking-[0.12em]">
                Shopify Integration
              </label>
              {shopifyConnected && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)] rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                  <span className="text-[11px] font-medium text-[#10B981]">Connected</span>
                </span>
              )}
            </div>

            {shopifyConnected && !shopifyShowForm ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-white">
                    Connected to <span className="font-semibold">{shopifyStoreUrl}</span>
                  </p>
                  <button
                    onClick={() => setShopifyShowForm(true)}
                    className="text-[11px] text-[rgba(255,255,255,0.4)] hover:text-[#d4b88f] underline transition-colors"
                  >
                    Change
                  </button>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.15)] rounded-lg">
                  <svg className="w-3 h-3 text-[#10B981] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-[10px] text-[#10B981]">
                    Your Shopify connection is secure and encrypted. Only product management access is used.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-[rgba(255,255,255,0.4)]">
                  Connect your Shopify store to push listings directly. Enter your store URL and app credentials — you&apos;ll be redirected to Shopify to approve.
                </p>
                <div className="flex items-center gap-2 px-3 py-2 bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.15)] rounded-lg">
                  <svg className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-[10px] text-[#10B981] leading-relaxed">
                    Your Shopify credentials are securely encrypted and stored. We only request access to manage products — no other store data is accessed.
                  </p>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={shopifyInputUrl}
                    onChange={(e) => setShopifyInputUrl(e.target.value)}
                    placeholder="mystore.myshopify.com"
                    className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:ring-2 focus:ring-[rgba(196,166,125,0.15)] focus:border-[#c4a67d] transition-all"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={shopifyInputClientId}
                      onChange={(e) => setShopifyInputClientId(e.target.value)}
                      placeholder="Client ID"
                      className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:ring-2 focus:ring-[rgba(196,166,125,0.15)] focus:border-[#c4a67d] transition-all"
                    />
                    <input
                      type="password"
                      value={shopifyInputClientSecret}
                      onChange={(e) => setShopifyInputClientSecret(e.target.value)}
                      placeholder="Client Secret"
                      className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-[13px] text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:ring-2 focus:ring-[rgba(196,166,125,0.15)] focus:border-[#c4a67d] transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-[rgba(255,255,255,0.3)] leading-relaxed">
                    Find these in your Shopify Dev Dashboard under your app&apos;s Settings &gt; Credentials. Make sure your app has <span className="text-[rgba(255,255,255,0.5)]">read_products</span> and <span className="text-[rgba(255,255,255,0.5)]">write_products</span> scopes, and add <span className="text-[rgba(255,255,255,0.5)] font-mono break-all">{process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com"}/api/shopify/callback</span> as a redirect URL.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={connectShopify}
                    disabled={shopifyConnecting}
                    className="px-5 py-2.5 bg-[#96bf48] text-white rounded-lg font-semibold text-[13px] hover:bg-[#7ba33a] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {shopifyConnecting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Redirecting to Shopify...
                      </span>
                    ) : (
                      "Connect Shopify"
                    )}
                  </button>
                  {shopifyShowForm && shopifyConnected && (
                    <button
                      onClick={() => setShopifyShowForm(false)}
                      className="text-[12px] text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)] transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-14 text-center transition-all duration-300 cursor-pointer ${isDragging
              ? "border-[#c4a67d] bg-[rgba(196,166,125,0.08)] scale-[1.01]"
              : "border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)] hover:bg-[rgba(196,166,125,0.05)]"
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => { handleFilesSelected(e.target.files); e.target.value = ""; }}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${isDragging ? "bg-[#c4a67d] text-white scale-110" : "bg-[rgba(196,166,125,0.1)] text-[#d4b88f]"
                }`}>
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm sm:text-base font-semibold text-white">
                  <span className="hidden sm:inline">Drop your jewelry images here</span>
                  <span className="sm:hidden">Tap to upload jewelry images</span>
                </p>
                <p className="text-xs sm:text-sm text-[rgba(255,255,255,0.4)] mt-1">
                  Select up to {MAX_FILES} images at once — PNG, JPG, WebP
                </p>
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => { handleFilesSelected(e.target.files); e.target.value = ""; }}
                className="hidden"
              />
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); cameraInputRef.current?.click(); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#c4a67d] bg-[rgba(196,166,125,0.1)] hover:bg-[rgba(196,166,125,0.2)] transition-all md:hidden"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Take Photo
              </button>
            </div>
          </div>

          {/* Selected Files Preview */}
          {items.length > 0 && (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-white">
                  {items.length} image{items.length > 1 ? "s" : ""} selected
                  <span className="text-[rgba(255,255,255,0.4)] font-normal ml-2">
                    ({MAX_FILES - items.length} remaining)
                  </span>
                </p>
                <button
                  onClick={clearAll}
                  className="text-[12px] font-medium text-[rgba(255,255,255,0.4)] hover:text-[#EF4444] transition-colors"
                >
                  Clear all
                </button>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {items.map((item) => (
                  <div key={item.localId} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)]">
                      <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeItem(item.localId); }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[rgba(255,255,255,0.15)] text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-[#EF4444]"
                    >
                      ×
                    </button>
                    <p className="text-[9px] text-[rgba(255,255,255,0.4)] mt-1 truncate text-center">{item.file.name}</p>
                  </div>
                ))}

                {items.length < MAX_FILES && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)] flex items-center justify-center transition-all duration-200"
                  >
                    <svg className="w-5 h-5 text-[rgba(255,255,255,0.4)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Generate Button */}
              <div className="flex flex-col items-center gap-3 pt-4">
                {tokenBalance !== null && tokenBalance < items.length * COST_PER_IMAGE && (
                  <p className="text-[13px] text-[#EF4444] font-medium">
                    Need {items.length * COST_PER_IMAGE} tokens ({items.length} × {COST_PER_IMAGE}) — you have {tokenBalance}. Contact admin to add more.
                  </p>
                )}
                {!batchDescription.trim() && (
                  <p className="text-[13px] text-[#F59E0B] font-medium">
                    Please specify the product type above before generating.
                  </p>
                )}
                <button
                  onClick={processAll}
                  disabled={!batchDescription.trim() || (tokenBalance !== null && tokenBalance < items.length * COST_PER_IMAGE)}
                  className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-[#c4a67d] to-[#d4b88f] text-white rounded-full font-semibold text-[15px] hover:from-[#d4b88f] hover:to-[#c4a67d] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Listings for {items.length} Image{items.length > 1 ? "s" : ""} ({items.length * COST_PER_IMAGE} tokens)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ PROCESSING + RESULTS ═══ */}
      {(phase === "processing" || phase === "done") && (
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div className="text-center">
            <span className="text-[11px] sm:text-xs font-semibold text-[#d4b88f] tracking-[0.12em] uppercase mb-3 block">
              {isProcessing ? "Processing" : "Results"}
            </span>
            <h1 className="font-display font-bold text-white text-2xl sm:text-[2.5rem] uppercase tracking-[-0.02em] leading-[0.95]">
              {isProcessing
                ? `Generating ${processedCount} of ${items.length}...`
                : `${completedCount} Listing${completedCount !== 1 ? "s" : ""} Generated`}
            </h1>
            {batchDescription.trim() && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-[rgba(196,166,125,0.1)] border border-[rgba(196,166,125,0.2)] rounded-full">
                <span className="text-[11px] text-[rgba(255,255,255,0.4)]">Product type:</span>
                <span className="text-[12px] font-semibold text-[#d4b88f]">{batchDescription.trim()}</span>
              </div>
            )}
            {failedCount > 0 && phase === "done" && (
              <p className="text-[13px] text-[#EF4444] mt-2">
                {failedCount} failed —{" "}
                <button onClick={retryFailed} className="underline font-medium hover:text-[#EF4444]">
                  Retry failed
                </button>
              </p>
            )}
            {tokenBalance !== null && phase === "done" && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-[rgba(196,166,125,0.1)] rounded-full">
                <span className="text-[12px] font-semibold text-[#d4b88f]">{tokenBalance} tokens remaining</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="max-w-lg mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-medium text-[rgba(255,255,255,0.7)]">
                  {processedCount} / {items.length} complete
                </span>
                <button
                  onClick={cancelProcessing}
                  className="text-[12px] font-medium text-[#EF4444] hover:text-[#EF4444]/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-[rgba(255,255,255,0.08)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#c4a67d] to-[#d4b88f] transition-all duration-500 ease-out"
                  style={{ width: `${(processedCount / items.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Bar (done phase) */}
          {phase === "done" && completedCount > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <button
                onClick={exportCSV}
                className="px-6 py-3 bg-gradient-to-r from-[#c4a67d] to-[#d4b88f] text-white rounded-full font-semibold text-[13px] hover:from-[#d4b88f] hover:to-[#c4a67d] transition-all duration-200 active:scale-[0.98]"
              >
                Export CSV ({completedCount})
              </button>
              <button
                onClick={pushAllToShopify}
                disabled={pushingAll || pushedToShopify.size >= completedCount}
                className="px-6 py-3 bg-[#96bf48] text-white rounded-full font-semibold text-[13px] hover:bg-[#7ba33a] transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pushingAll ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Pushing to Shopify...
                  </span>
                ) : pushedToShopify.size >= completedCount ? (
                  "All Pushed to Shopify ✓"
                ) : (
                  `Push All to Shopify (${completedCount - pushedToShopify.size})`
                )}
              </button>
              <button
                onClick={startOver}
                className="px-6 py-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-white rounded-full font-medium text-[13px] hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.14)] transition-all duration-200 active:scale-[0.97]"
              >
                Start New Batch
              </button>
            </div>
          )}

          {/* Results Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item, idx) => (
              <ItemCard
                key={item.localId}
                item={item}
                index={idx}
                isSelected={selectedId === item.localId}
                isRegenerating={regeneratingId === item.localId}
                isPushingToShopify={pushingToShopify === item.localId}
                isPushedToShopify={pushedToShopify.has(item.localId)}
                shopifyConnected={shopifyConnected}
                onSelect={() => selectItem(item.localId)}
                onRegenerate={() => regenerateItem(item.localId)}
                onPushToShopify={() => pushToShopify(item.localId)}
              />
            ))}
          </div>

          {/* Detail Panel */}
          {selectedItem && selectedItem.status === "completed" && (
            <div ref={detailRef}>
              <DetailPanel
                item={selectedItem}
                isRegenerating={regeneratingId === selectedItem.localId}
                isSaving={savingId === selectedItem.localId}
                isSaved={savedId === selectedItem.localId}
                copiedField={copiedField}
                shopifyConnected={shopifyConnected}
                isPushingToShopify={pushingToShopify === selectedItem.localId}
                isPushedToShopify={pushedToShopify.has(selectedItem.localId)}
                onUpdate={(updates) => updateItem(selectedItem.localId, updates)}
                onRegenerate={() => regenerateItem(selectedItem.localId)}
                onPushToShopify={() => pushToShopify(selectedItem.localId)}
                onCopy={copyToClipboard}
                onClose={() => setSelectedId(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* ═══ HISTORY PHASE ═══ */}
      {phase === "history" && (
        <div className="space-y-8 animate-fade-in">
          <div className="text-center">
            <span className="text-[11px] sm:text-xs font-semibold text-[#d4b88f] tracking-[0.12em] uppercase mb-3 block">
              History
            </span>
            <h1 className="font-display font-bold text-white text-2xl sm:text-[2.5rem] uppercase tracking-[-0.02em] leading-[0.95]">
              Previous Listings
            </h1>
            <p className="text-[14px] sm:text-base text-[rgba(255,255,255,0.4)] mt-2 max-w-md mx-auto">
              {historyTotal > 0 ? `${historyTotal} listing${historyTotal !== 1 ? "s" : ""} generated` : "No listings yet"}
            </p>
          </div>

          {historyLoading && (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-[rgba(255,255,255,0.08)] border-t-[#c4a67d] rounded-full animate-spin" />
            </div>
          )}

          {!historyLoading && historyItems.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[rgba(255,255,255,0.4)] text-sm">No previous listings found. Generate your first batch to see them here.</p>
              <button onClick={startOver} className="mt-4 px-6 py-3 bg-gradient-to-r from-[#c4a67d] to-[#d4b88f] text-white rounded-full font-semibold text-[13px] hover:from-[#d4b88f] hover:to-[#c4a67d] transition-all duration-200">
                Create New Batch
              </button>
            </div>
          )}

          {!historyLoading && historyItems.length > 0 && (() => {
            const grouped: { batchId: string; batchDescription: string; items: HistoryItem[]; createdAt: string }[] = [];
            const batchMap = new Map<string, number>();
            for (const hi of historyItems) {
              const idx = batchMap.get(hi.batchId);
              if (idx !== undefined) {
                grouped[idx].items.push(hi);
              } else {
                batchMap.set(hi.batchId, grouped.length);
                grouped.push({
                  batchId: hi.batchId,
                  batchDescription: hi.batchDescription || "",
                  items: [hi],
                  createdAt: hi.createdAt,
                });
              }
            }

            return (
              <>
                <div className="space-y-8">
                  {grouped.map((group) => (
                    <div key={group.batchId} className="space-y-3">
                      {/* Batch Header */}
                      <div className="flex items-center gap-3 px-1">
                        <div className="flex items-center gap-2">
                          {group.batchDescription ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(196,166,125,0.1)] border border-[rgba(196,166,125,0.2)] rounded-full">
                              <span className="w-2 h-2 rounded-full bg-[#c4a67d]" />
                              <span className="text-[13px] font-semibold text-[#d4b88f]">{group.batchDescription}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-full">
                              <span className="text-[13px] font-medium text-[rgba(255,255,255,0.4)]">Uncategorized Batch</span>
                            </span>
                          )}
                          <span className="text-[11px] text-[rgba(255,255,255,0.25)]">
                            {group.items.length} item{group.items.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <span className="text-[10px] text-[rgba(255,255,255,0.25)]">
                          {new Date(group.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>

                      {/* Batch Items Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.items.map((hi) => (
                          <div
                            key={hi.id}
                            onClick={() => setHistorySelected(historySelected?.id === hi.id ? null : hi)}
                            className={`rounded-[20px] border bg-[rgba(255,255,255,0.04)] overflow-hidden transition-all duration-200 cursor-pointer ${historySelected?.id === hi.id
                              ? "border-[#c4a67d] ring-2 ring-[rgba(196,166,125,0.15)] shadow-md"
                              : "border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)] hover:shadow-md"
                              }`}
                          >
                            <div className="flex gap-3 p-3">
                              <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)]">
                                {hi.imageUrl ? (
                                  <img src={hi.imageUrl} alt={hi.filename} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[rgba(255,255,255,0.25)] text-[10px]">No image</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-[rgba(255,255,255,0.4)] truncate mb-1">{hi.filename}</p>
                                <p className="text-[13px] font-semibold text-white line-clamp-1 leading-tight">{hi.title || "Untitled"}</p>
                                <p className="text-[11px] text-[rgba(255,255,255,0.4)] line-clamp-2 mt-1 leading-snug">
                                  {hi.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120)}
                                </p>
                                <p className="text-[10px] text-[rgba(255,255,255,0.25)] mt-1.5">
                                  {new Date(hi.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {historyTotal > HISTORY_LIMIT && (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => fetchHistory(historyPage - 1)}
                      disabled={historyPage <= 1}
                      className="px-4 py-2 text-[13px] font-medium text-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg hover:bg-[rgba(196,166,125,0.1)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Previous
                    </button>
                    <span className="text-[13px] text-[rgba(255,255,255,0.4)]">
                      Page {historyPage} of {Math.ceil(historyTotal / HISTORY_LIMIT)}
                    </span>
                    <button
                      onClick={() => fetchHistory(historyPage + 1)}
                      disabled={historyPage >= Math.ceil(historyTotal / HISTORY_LIMIT)}
                      className="px-4 py-2 text-[13px] font-medium text-[rgba(255,255,255,0.7)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg hover:bg-[rgba(196,166,125,0.1)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            );
          })()}

          {/* History Detail Panel */}
          {historySelected && (
            <HistoryDetailPanel
              item={historySelected}
              shopifyConnected={shopifyConnected}
              onClose={() => setHistorySelected(null)}
            />
          )}
        </div>
      )}
    </ResponsiveLayout>
  );
}

/* ─── Item Card Component ────────────────────────────────── */

function ItemCard({
  item,
  index,
  isSelected,
  isRegenerating,
  isPushingToShopify,
  isPushedToShopify,
  onSelect,
  onRegenerate,
  onPushToShopify,
}: {
  item: BatchItem;
  index: number;
  isSelected: boolean;
  isRegenerating: boolean;
  isPushingToShopify: boolean;
  isPushedToShopify: boolean;
  shopifyConnected: boolean;
  onSelect: () => void;
  onRegenerate: () => void;
  onPushToShopify: () => void;
}) {
  const isPending = item.status === "pending";
  const isProcessing = item.status === "processing" || isRegenerating;
  const isCompleted = item.status === "completed";
  const isFailed = item.status === "failed";

  return (
    <div
      onClick={isCompleted ? onSelect : undefined}
      className={`rounded-[20px] border bg-[rgba(255,255,255,0.04)] overflow-hidden transition-all duration-200 ${isSelected
        ? "border-[#c4a67d] ring-2 ring-[rgba(196,166,125,0.15)] shadow-md"
        : isCompleted
          ? "border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.14)] hover:shadow-md cursor-pointer"
          : "border-[rgba(255,255,255,0.08)]"
        } ${isPending ? "opacity-50" : ""}`}
    >
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)]">
          <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Index + filename */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-white bg-[#c4a67d] rounded px-1.5 py-0.5">
              #{index + 1}
            </span>
            <span className="text-[10px] text-[rgba(255,255,255,0.4)] truncate">{item.file.name}</span>
          </div>

          {isProcessing && (
            <div className="flex items-center gap-2 mt-3">
              <div className="w-4 h-4 border-2 border-[#c4a67d] border-t-transparent rounded-full animate-spin" />
              <span className="text-[12px] text-[#d4b88f] font-medium">
                {isRegenerating ? "Regenerating..." : "Generating listing..."}
              </span>
            </div>
          )}

          {isPending && (
            <p className="text-[12px] text-[rgba(255,255,255,0.25)] mt-3">Waiting...</p>
          )}

          {isFailed && (
            <div className="mt-1">
              <p className="text-[11px] text-[#EF4444] font-medium line-clamp-2">{item.error || "Failed"}</p>
            </div>
          )}

          {isCompleted && !isRegenerating && (
            <div className="mt-0.5">
              <p className="text-[13px] font-semibold text-white line-clamp-1 leading-tight">
                {item.title}
              </p>
              <p className="text-[11px] text-[rgba(255,255,255,0.4)] line-clamp-2 mt-1 leading-snug">
                {stripHtml(item.description)}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {isCompleted && !isRegenerating && (
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
              className="p-2 text-[rgba(255,255,255,0.4)] hover:text-[#d4b88f] hover:bg-[rgba(196,166,125,0.1)] rounded-lg transition-all duration-200"
              title="Regenerate listing"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onPushToShopify(); }}
              disabled={isPushingToShopify || isPushedToShopify}
              className={`p-2 rounded-lg transition-all duration-200 ${isPushedToShopify
                ? "text-[#10B981] bg-[rgba(16,185,129,0.12)]"
                : "text-[rgba(255,255,255,0.4)] hover:text-[#96bf48] hover:bg-[rgba(150,191,72,0.1)]"
                } disabled:cursor-not-allowed`}
              title={isPushedToShopify ? "Added to Shopify" : "Add to Shopify"}
            >
              {isPushingToShopify ? (
                <div className="w-4 h-4 border-2 border-[#96bf48] border-t-transparent rounded-full animate-spin" />
              ) : isPushedToShopify ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.337 3.415a1.71 1.71 0 0 0-1.665-1.287 1.69 1.69 0 0 0-.152.007l-.039.003-.066.01a1.57 1.57 0 0 0-.142.033c-.037.012-.061.015-.073.015h-.004l-.068-.025-.04-.02a2.93 2.93 0 0 0-.21-.088 3.06 3.06 0 0 0-.932-.186l-.084-.001c-1.12 0-2.071.773-2.34 1.856a4.2 4.2 0 0 0-.117.648l-.012.1-.012.14c-.002.016-.003.09-.003.165v.017l-.07.001c-.582.022-1.044.494-1.06 1.084l-.002.064v.01l-.397 6.405a1.59 1.59 0 0 0 .426 1.165c.29.306.687.48 1.1.48h.034l5.882-.158a1.57 1.57 0 0 0 1.493-1.597l-.003-.048-.403-6.405-.001-.01a1.09 1.09 0 0 0-1.023-1.068l-.046-.003h-.091l.006-.158c.002-.039.002-.124.002-.17v-.033A5 5 0 0 0 15 4.1a2 2 0 0 0-.012-.094l-.02-.118-.025-.116a2 2 0 0 0-.035-.12l-.008-.025a2 2 0 0 0-.072-.186l-.013-.029zm-3.45.398h.044a2 2 0 0 1 .64.131l.04.016.03.014.034.018c.075.042.123.08.147.102.037.034.21.222.21.434 0 .04 0 .096-.041.18a.76.76 0 0 1-.062.109l-.028.038a.7.7 0 0 1-.106.104 1.3 1.3 0 0 1-.132.09l-.025.015-.048.024-.05.019c-.035.013-.095.03-.18.036h-.01a.7.7 0 0 1-.09.003h-.016a.8.8 0 0 1-.2-.035l-.035-.012a1 1 0 0 1-.069-.03l-.04-.021-.014-.009a.8.8 0 0 1-.134-.099l-.03-.03a.7.7 0 0 1-.098-.128.5.5 0 0 1-.055-.15.5.5 0 0 1-.01-.098v-.007c0-.152.076-.35.228-.494a1.4 1.4 0 0 1 .293-.206l.045-.025-.005.006z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Detail Panel Component ─────────────────────────────── */

function DetailPanel({
  item,
  isRegenerating,
  isSaving,
  isSaved,
  copiedField,
  isPushingToShopify,
  isPushedToShopify,
  onUpdate,
  onRegenerate,
  onPushToShopify,
  onCopy,
  onClose,
}: {
  item: BatchItem;
  isRegenerating: boolean;
  isSaving: boolean;
  isSaved: boolean;
  copiedField: string | null;
  shopifyConnected: boolean;
  isPushingToShopify: boolean;
  isPushedToShopify: boolean;
  onUpdate: (updates: Partial<BatchItem>) => void;
  onRegenerate: () => void;
  onPushToShopify: () => void;
  onCopy: (text: string, field: string) => void;
  onClose: () => void;
}) {
  const fieldKey = (f: string) => `${item.localId}-${f}`;
  const [showFullImage, setShowFullImage] = useState(false);

  return (
    <div className="bg-[rgba(255,255,255,0.04)] rounded-[20px] border border-[rgba(255,255,255,0.08)] p-5 sm:p-8 space-y-5 animate-scale-in">
      {/* Full-size image lightbox */}
      {showFullImage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in"
          onClick={() => setShowFullImage(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div
            className="relative z-10 flex flex-col items-center gap-4 p-4 max-w-[95vw] max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.5)] bg-white/5 ring-1 ring-white/10">
              <img
                src={item.previewUrl}
                alt={item.file.name}
                className="max-w-[90vw] max-h-[82vh] object-contain"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/70 text-[13px] font-medium">{item.file.name}</span>
              <button
                onClick={() => setShowFullImage(false)}
                className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-[13px] font-semibold rounded-full backdrop-blur-sm ring-1 ring-white/20 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-56 h-56 sm:w-72 sm:h-72 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.08)] flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-[rgba(196,166,125,0.3)] transition-all duration-200"
            onClick={() => setShowFullImage(true)}
          >
            <img src={item.previewUrl} alt={item.file.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-[#d4b88f] tracking-[0.12em] uppercase block mb-1">
              Editing Listing
            </span>
            <p className="text-[13px] font-medium text-white">{item.file.name}</p>
            {isSaving && (
              <span className="flex items-center gap-1.5 text-[11px] text-[rgba(255,255,255,0.4)] mt-1">
                <span className="w-2.5 h-2.5 border-2 border-[#c4a67d] border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            )}
            {!isSaving && isSaved && (
              <span className="flex items-center gap-1.5 text-[11px] text-[#10B981] mt-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Saved to database
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPushToShopify}
            disabled={isPushingToShopify || isPushedToShopify}
            className={`px-4 py-2 rounded-full font-semibold text-[12px] transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed ${isPushedToShopify
              ? "bg-[rgba(16,185,129,0.12)] text-[#10B981] border border-[rgba(16,185,129,0.3)]"
              : "bg-[#96bf48] text-white hover:bg-[#7ba33a]"
              } disabled:opacity-60`}
          >
            {isPushingToShopify ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Pushing...
              </span>
            ) : isPushedToShopify ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Added to Shopify
              </span>
            ) : (
              "Add to Shopify"
            )}
          </button>
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="px-4 py-2 bg-gradient-to-r from-[#c4a67d] to-[#d4b88f] text-white rounded-full font-semibold text-[12px] hover:from-[#d4b88f] hover:to-[#c4a67d] transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
          >
            {isRegenerating ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Regenerating...
              </span>
            ) : (
              "Regenerate"
            )}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-2 text-[13px] font-medium text-[rgba(255,255,255,0.7)] rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold text-[#d4b88f] uppercase tracking-[0.1em]">Product Title</span>
          <CopyButton
            field={fieldKey("title")}
            copiedField={copiedField}
            onCopy={() => onCopy(item.title, fieldKey("title"))}
          />
        </div>
        <input
          type="text"
          value={item.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-sm sm:text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-[rgba(196,166,125,0.15)] focus:border-[#c4a67d] transition-all duration-200"
        />
        <p className="text-[10px] text-[rgba(255,255,255,0.25)] mt-1.5 tracking-wide">{item.title.length} / 65 characters</p>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold text-[#d4b88f] uppercase tracking-[0.1em]">Description (HTML)</span>
          <CopyButton
            field={fieldKey("desc")}
            copiedField={copiedField}
            onCopy={() => onCopy(item.description, fieldKey("desc"))}
            label="Copy HTML"
          />
        </div>
        <div
          className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-white leading-relaxed mb-2.5 prose prose-sm prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: item.description }}
        />
        <details className="group">
          <summary className="text-[11px] text-[rgba(255,255,255,0.4)] cursor-pointer font-medium hover:text-[#d4b88f] transition-colors uppercase tracking-[0.06em]">
            Edit HTML source
          </summary>
          <textarea
            value={item.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={6}
            className="w-full mt-2 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-xs font-mono text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-[rgba(196,166,125,0.15)] focus:border-[#c4a67d] transition-all duration-200 resize-y"
          />
        </details>
      </div>

      {/* Category Metafields */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[11px] font-semibold text-[#d4b88f] uppercase tracking-[0.1em]">Category Metafields</span>
            <span className="text-[10px] text-[rgba(255,255,255,0.25)] ml-2">Shopify taxonomy</span>
          </div>
          <CopyButton
            field={fieldKey("cat-attrs")}
            copiedField={copiedField}
            onCopy={() => {
              const a = item.attributes;
              const text = [
                `Jewelry Material: ${a.jewelryMaterial}`,
                `Gemstone Type: ${a.gemstoneType}`,
              ].join("\n");
              onCopy(text, fieldKey("cat-attrs"));
            }}
            label="Copy All"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(
            [
              ["jewelryMaterial", "Jewelry Material"],
              ["gemstoneType", "Gemstone Type"],
            ] as [keyof ListingAttributes, string][]
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-[10px] font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-[0.08em] mb-1.5">
                {label}
              </label>
              <input
                type="text"
                value={item.attributes[key]}
                onChange={(e) =>
                  onUpdate({
                    attributes: { ...item.attributes, [key]: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[rgba(196,166,125,0.15)] focus:border-[#c4a67d] transition-all duration-200"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Product Metafields */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[11px] font-semibold text-[#d4b88f] uppercase tracking-[0.1em]">Product Metafields</span>
            <span className="text-[10px] text-[rgba(255,255,255,0.25)] ml-2">Custom fields</span>
          </div>
          <CopyButton
            field={fieldKey("prod-attrs")}
            copiedField={copiedField}
            onCopy={() => {
              const a = item.attributes;
              const text = [
                `Collection: ${a.collection}`,
                `Occasion: ${a.occasion}`,
              ].join("\n");
              onCopy(text, fieldKey("prod-attrs"));
            }}
            label="Copy All"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {(
            [
              ["collection", "Collection"],
              ["occasion", "Occasion"],
            ] as [keyof ListingAttributes, string][]
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-[10px] font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-[0.08em] mb-1.5">
                {label}
              </label>
              <input
                type="text"
                value={item.attributes[key]}
                onChange={(e) =>
                  onUpdate({
                    attributes: { ...item.attributes, [key]: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[rgba(196,166,125,0.15)] focus:border-[#c4a67d] transition-all duration-200"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Meta Description */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold text-[#d4b88f] uppercase tracking-[0.1em]">Meta Description</span>
          <CopyButton
            field={fieldKey("meta")}
            copiedField={copiedField}
            onCopy={() => onCopy(item.metaDescription, fieldKey("meta"))}
          />
        </div>
        <textarea
          value={item.metaDescription}
          onChange={(e) => onUpdate({ metaDescription: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-sm text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-[rgba(196,166,125,0.15)] focus:border-[#c4a67d] transition-all duration-200 resize-none"
        />
        <p className="text-[10px] text-[rgba(255,255,255,0.25)] mt-1.5 tracking-wide">{item.metaDescription.length} / 155 characters</p>
      </div>

      {/* Image Alt Text */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold text-[#d4b88f] uppercase tracking-[0.1em]">Image Description (Alt Text)</span>
          <CopyButton
            field={fieldKey("alt")}
            copiedField={copiedField}
            onCopy={() => onCopy(item.altText, fieldKey("alt"))}
          />
        </div>
        <input
          type="text"
          value={item.altText}
          onChange={(e) => onUpdate({ altText: e.target.value })}
          className="w-full rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[rgba(196,166,125,0.15)] focus:border-[#c4a67d] transition-all duration-200"
        />
        <p className="text-[10px] text-[rgba(255,255,255,0.25)] mt-1.5 tracking-wide">{item.altText.length} / 125 characters</p>
      </div>

      {/* Copy Entire Listing */}
      <button
        onClick={() => {
          const a = item.attributes;
          const full = [
            `Title: ${item.title}`,
            "",
            "Description (HTML):",
            item.description,
            "",
            "Category Metafields:",
            `  Jewelry Material: ${a.jewelryMaterial}`,
            `  Gemstone Type: ${a.gemstoneType}`,
            "",
            "Product Metafields:",
            `  Collection: ${a.collection}`,
            `  Occasion: ${a.occasion}`,
            "",
            `Meta Description: ${item.metaDescription}`,
            "",
            `Image Alt Text: ${item.altText}`,
          ].join("\n");
          onCopy(full, fieldKey("all"));
        }}
        className={`w-full py-3.5 rounded-full font-semibold text-[13px] transition-all duration-200 active:scale-[0.98] ${copiedField === fieldKey("all")
          ? "bg-[rgba(16,185,129,0.12)] text-[#10B981] border border-[rgba(16,185,129,0.3)]"
          : "bg-gradient-to-r from-[#c4a67d] to-[#d4b88f] text-white hover:from-[#d4b88f] hover:to-[#c4a67d]"
          }`}
      >
        {copiedField === fieldKey("all") ? "All Copied to Clipboard!" : "Copy Entire Listing"}
      </button>
    </div>
  );
}

/* ─── Copy Button ────────────────────────────────────────── */

function CopyButton({
  field,
  copiedField,
  onCopy,
  label,
}: {
  field: string;
  copiedField: string | null;
  onCopy: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onCopy}
      className={`text-[11px] font-semibold px-3 py-1 rounded-full transition-all duration-200 ${copiedField === field
        ? "bg-[rgba(16,185,129,0.12)] text-[#10B981]"
        : "text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.08)]"
        }`}
    >
      {copiedField === field ? "Copied!" : label || "Copy"}
    </button>
  );
}

/* ─── History Detail Panel ───────────────────────────────── */

function HistoryDetailPanel({
  item,
  shopifyConnected,
  onClose,
}: {
  item: HistoryItem;
  shopifyConnected: boolean;
  onClose: () => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const [pushingToShopify, setPushingToShopify] = useState(false);
  const [pushedToShopify, setPushedToShopify] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const pushToShopify = useCallback(async () => {
    if (!shopifyConnected || pushingToShopify || pushedToShopify) return;
    setPushingToShopify(true);
    setPushError(null);
    try {
      const result = await safeFetch<{ success?: boolean; error?: string }>(
        "/api/shopify/push",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: item.title,
            description: item.description,
            metaDescription: item.metaDescription,
            altText: item.altText,
            attributes: item.attributes,
            imageUrl: item.imageUrl || undefined,
          }),
        }
      );
      if (result.success) {
        setPushedToShopify(true);
      } else {
        setPushError(result.error || "Failed to push to Shopify");
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Failed to push to Shopify");
    } finally {
      setPushingToShopify(false);
    }
  }, [item, shopifyConnected, pushingToShopify, pushedToShopify]);

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    });
  }, []);

  const a = item.attributes;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto bg-[#141414] rounded-[20px] border border-[rgba(255,255,255,0.1)] p-5 sm:p-8 space-y-5 shadow-[0_25px_60px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
      {/* Lightbox */}
      {showFullImage && item.imageUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in" onClick={() => setShowFullImage(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div className="relative z-10 flex flex-col items-center gap-4 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.5)] bg-white/5 ring-1 ring-white/10">
              <img src={item.imageUrl} alt={item.filename} className="max-w-[90vw] max-h-[82vh] object-contain" />
            </div>
            <button onClick={() => setShowFullImage(false)} className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-[13px] font-semibold rounded-full backdrop-blur-sm ring-1 ring-white/20 transition-all duration-200">Close</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {item.imageUrl && (
            <div
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.08)] flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-[rgba(196,166,125,0.3)] transition-all duration-200"
              onClick={() => setShowFullImage(true)}
            >
              <img src={item.imageUrl} alt={item.filename} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <span className="text-[11px] font-semibold text-[#d4b88f] tracking-[0.12em] uppercase block mb-1">Saved Listing</span>
            <p className="text-[13px] font-medium text-white">{item.filename}</p>
            <p className="text-[11px] text-[rgba(255,255,255,0.25)] mt-1">
              {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {shopifyConnected && (
            <button
              onClick={pushToShopify}
              disabled={pushingToShopify || pushedToShopify}
              className={`px-4 py-2 rounded-full font-semibold text-[12px] transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed ${pushedToShopify
                ? "bg-[rgba(16,185,129,0.12)] text-[#10B981] border border-[rgba(16,185,129,0.3)]"
                : "bg-[#96bf48] text-white hover:bg-[#7ba33a]"
                } disabled:opacity-60`}
            >
              {pushingToShopify ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Pushing...
                </span>
              ) : pushedToShopify ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Added to Shopify
                </span>
              ) : (
                "Add to Shopify"
              )}
            </button>
          )}
          <button onClick={onClose} className="p-2 text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] rounded-lg transition-all duration-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {pushError && (
        <div className="px-3 py-2 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg">
          <p className="text-[11px] text-[#EF4444]">{pushError}</p>
        </div>
      )}

      {/* Title */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-[#d4b88f] uppercase tracking-[0.1em]">Product Title</span>
          <CopyButton field="h-title" copiedField={copiedField} onCopy={() => copyToClipboard(item.title, "h-title")} />
        </div>
        <p className="text-sm sm:text-base font-medium text-white">{item.title}</p>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-[#d4b88f] uppercase tracking-[0.1em]">Description</span>
          <CopyButton field="h-desc" copiedField={copiedField} onCopy={() => copyToClipboard(item.description, "h-desc")} label="Copy HTML" />
        </div>
        <div
          className="text-sm text-white leading-relaxed prose prose-sm prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: item.description }}
        />
      </div>

      {/* Category Metafields */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-[#d4b88f] uppercase tracking-[0.1em]">Category Metafields</span>
          <CopyButton
            field="h-cat"
            copiedField={copiedField}
            onCopy={() => copyToClipboard(`Jewelry Material: ${a.jewelryMaterial}\nGemstone Type: ${a.gemstoneType}`, "h-cat")}
            label="Copy"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><p className="text-[10px] font-semibold text-[rgba(255,255,255,0.4)] uppercase mb-1">Jewelry Material</p><p className="text-sm text-white">{a.jewelryMaterial || "—"}</p></div>
          <div><p className="text-[10px] font-semibold text-[rgba(255,255,255,0.4)] uppercase mb-1">Gemstone Type</p><p className="text-sm text-white">{a.gemstoneType || "—"}</p></div>
        </div>
      </div>

      {/* Product Metafields */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-[#d4b88f] uppercase tracking-[0.1em]">Product Metafields</span>
          <CopyButton
            field="h-prod"
            copiedField={copiedField}
            onCopy={() => copyToClipboard(`Collection: ${a.collection}\nOccasion: ${a.occasion}`, "h-prod")}
            label="Copy"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><p className="text-[10px] font-semibold text-[rgba(255,255,255,0.4)] uppercase mb-1">Collection</p><p className="text-sm text-white">{a.collection || "—"}</p></div>
          <div><p className="text-[10px] font-semibold text-[rgba(255,255,255,0.4)] uppercase mb-1">Occasion</p><p className="text-sm text-white">{a.occasion || "—"}</p></div>
        </div>
      </div>

      {/* Meta Description */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-[#d4b88f] uppercase tracking-[0.1em]">Meta Description</span>
          <CopyButton field="h-meta" copiedField={copiedField} onCopy={() => copyToClipboard(item.metaDescription, "h-meta")} />
        </div>
        <p className="text-sm text-white leading-relaxed">{item.metaDescription}</p>
      </div>

      {/* Alt Text */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-[#d4b88f] uppercase tracking-[0.1em]">Image Alt Text</span>
          <CopyButton field="h-alt" copiedField={copiedField} onCopy={() => copyToClipboard(item.altText, "h-alt")} />
        </div>
        <p className="text-sm text-white">{item.altText}</p>
      </div>

      {/* Copy All */}
      <button
        onClick={() => {
          const full = [
            `Title: ${item.title}`,
            "",
            "Description (HTML):",
            item.description,
            "",
            "Category Metafields:",
            `  Jewelry Material: ${a.jewelryMaterial}`,
            `  Gemstone Type: ${a.gemstoneType}`,
            "",
            "Product Metafields:",
            `  Collection: ${a.collection}`,
            `  Occasion: ${a.occasion}`,
            "",
            `Meta Description: ${item.metaDescription}`,
            "",
            `Image Alt Text: ${item.altText}`,
          ].join("\n");
          copyToClipboard(full, "h-all");
        }}
        className={`w-full py-3.5 rounded-full font-semibold text-[13px] transition-all duration-200 active:scale-[0.98] ${copiedField === "h-all"
          ? "bg-[rgba(16,185,129,0.12)] text-[#10B981] border border-[rgba(16,185,129,0.3)]"
          : "bg-gradient-to-r from-[#c4a67d] to-[#d4b88f] text-white hover:from-[#d4b88f] hover:to-[#c4a67d]"
          }`}
      >
        {copiedField === "h-all" ? "All Copied to Clipboard!" : "Copy Entire Listing"}
      </button>
      </div>
    </div>
  );
}
