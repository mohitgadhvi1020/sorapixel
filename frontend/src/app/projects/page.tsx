"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/providers/AppProvider";
import { useRouter } from "next/navigation";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";

interface SessionCard {
  id: string;
  title: string;
  jewelry_type: string;
  background: string;
  quality: string;
  original_image_url: string;
  status: string;
  created_at: string;
  action_count: number;
}

interface SessionAction {
  action_type: string;
  quality: string;
  tokens_used: number;
  output_images: Array<{ label: string; url: string }>;
  output_text: Record<string, unknown> | null;
  created_at: string;
}

interface SessionDetail {
  id: string;
  title: string;
  jewelry_type: string;
  original_image_url: string;
  actions: SessionAction[];
}

interface ProjectImage {
  label: string;
  storage_path: string;
  url: string;
  size: number;
}

interface ProjectCard {
  id: string;
  title: string;
  project_type: string;
  metadata: {
    background?: string;
    category?: string;
    quality?: string;
    session_id?: string;
    images?: ProjectImage[];
  };
  thumbnail_url: string;
  created_at: string;
}

type Tab = "all" | "jewelry" | "studio";

export default function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionCard[]>([]);
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  const [previewSession, setPreviewSession] = useState<SessionDetail | null>(null);
  const [previewProject, setPreviewProject] = useState<ProjectCard | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const [sessData, projData] = await Promise.all([
          api.get<{ sessions: SessionCard[] }>("/sessions?limit=50"),
          api.get<{ projects: ProjectCard[] }>("/projects?limit=50"),
        ]);
        setSessions(sessData.sessions || []);
        setProjects(projData.projects || []);
      } catch {
        setSessions([]);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  async function openSessionPreview(id: string) {
    setPreviewLoading(true);
    try {
      const data = await api.get<SessionDetail>(`/sessions/${id}`);
      setPreviewSession(data);
    } catch {
      // ignore
    } finally {
      setPreviewLoading(false);
    }
  }

  function openProjectPreview(p: ProjectCard) {
    setPreviewProject(p);
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  const jewelryProjects = projects.filter((p) => p.project_type?.startsWith("jewelry"));
  const studioProjects = projects.filter((p) => !p.project_type?.startsWith("jewelry"));

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All", count: sessions.length + projects.length },
    { key: "jewelry", label: "Jewelry", count: sessions.length + jewelryProjects.length },
    { key: "studio", label: "Product Studio", count: studioProjects.length },
  ];

  const showSessions = activeTab === "all" || activeTab === "jewelry";
  const showProjects = activeTab === "all" || activeTab === "studio" || activeTab === "jewelry";

  const filteredProjects = activeTab === "jewelry" ? jewelryProjects : activeTab === "studio" ? studioProjects : projects;
  const totalItems = (showSessions ? sessions.length : 0) + (showProjects ? filteredProjects.length : 0);

  if (authLoading) {
    return (
      <ResponsiveLayout title="My Creations">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#c4a67d] border-t-transparent rounded-full animate-spin" />
        </div>
      </ResponsiveLayout>
    );
  }

  if (!user) {
    return (
      <ResponsiveLayout title="My Creations">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-[rgba(255,255,255,0.5)] text-sm mb-4">Sign in to view your creations</p>
          <button
            onClick={() => router.push("/login?redirect=/projects")}
            className="px-5 py-2.5 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-sm font-semibold rounded-full"
          >
            Sign In
          </button>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout title="My Creations">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white font-display">My Creations</h1>
          <p className="text-sm text-[rgba(255,255,255,0.5)] mt-1">
            Your generated images — jewelry sessions and product studio shots.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-[rgba(255,255,255,0.04)] rounded-xl w-fit border border-[rgba(255,255,255,0.06)]">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                activeTab === t.key
                  ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white shadow-[0_2px_8px_rgba(196,166,125,0.3)]"
                  : "text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-[10px] ${activeTab === t.key ? "text-white/70" : "text-[rgba(255,255,255,0.3)]"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[rgba(196,166,125,0.2)] border-t-[#c4a67d] rounded-full animate-spin" />
          </div>
        ) : totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(196,166,125,0.08)] flex items-center justify-center mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-1">No creations yet</p>
            <p className="text-[rgba(255,255,255,0.4)] text-sm mb-4">
              {activeTab === "studio"
                ? "Head to Product Studio to create your first shot."
                : activeTab === "jewelry"
                ? "Head to Jewelry Studio to create your first masterpiece."
                : "Create your first image in the Jewelry or Product Studio."}
            </p>
            <div className="flex gap-3">
              {(activeTab === "all" || activeTab === "jewelry") && (
                <button
                  onClick={() => router.push("/jewelry")}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-sm font-semibold rounded-full"
                >
                  Jewelry Studio
                </button>
              )}
              {(activeTab === "all" || activeTab === "studio") && (
                <button
                  onClick={() => router.push("/studio")}
                  className="px-5 py-2.5 bg-[rgba(255,255,255,0.06)] text-white text-sm font-semibold rounded-full border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                >
                  Product Studio
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Projects (Studio + Jewelry) */}
            {showProjects &&
              filteredProjects.map((p) => {
                const isJewelry = p.project_type?.startsWith("jewelry");
                return (
                <div
                  key={`proj-${p.id}`}
                  className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(196,166,125,0.3)] transition-all duration-200 overflow-hidden group cursor-pointer"
                  onClick={() => isJewelry ? router.push(p.metadata?.session_id ? `/jewelry?session=${p.metadata.session_id}` : "/jewelry") : openProjectPreview(p)}
                >
                  <div className="aspect-square bg-[rgba(0,0,0,0.3)] overflow-hidden relative">
                    {p.thumbnail_url ? (
                      <img
                        src={p.thumbnail_url}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className={`text-[8px] font-bold text-white px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm ${isJewelry ? "bg-[rgba(196,166,125,0.85)]" : "bg-[rgba(59,130,246,0.85)]"}`}>
                        {isJewelry ? "Jewelry" : "Studio"}
                      </span>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      {p.metadata?.quality === "pro" && (
                        <span className="text-[8px] font-bold bg-gradient-to-r from-[#c4a67d] to-[#d4b88f] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Pro
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white truncate">{p.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-[rgba(255,255,255,0.4)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 rounded-full capitalize">
                          {p.metadata?.background || p.metadata?.category || "auto"}
                        </span>
                        <span className="text-[10px] text-[rgba(255,255,255,0.3)]">
                          {(p.metadata?.images || []).length} image{(p.metadata?.images || []).length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-[rgba(255,255,255,0.3)]">{formatDate(p.created_at)}</p>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(isJewelry ? (p.metadata?.session_id ? `/jewelry?session=${p.metadata.session_id}` : "/jewelry") : "/studio");
                        }}
                        className={`flex-1 px-3 py-2 text-white text-xs font-semibold rounded-xl active:scale-[0.97] transition-all ${isJewelry ? "bg-gradient-to-r from-[#8b7355] to-[#c4a67d] hover:shadow-[0_4px_16px_rgba(196,166,125,0.3)]" : "bg-gradient-to-r from-[#3b82f6] to-[#6366f1] hover:shadow-[0_4px_16px_rgba(99,102,241,0.3)]"}`}
                      >
                        {isJewelry ? "Open Jewelry" : "Open Studio"}
                      </button>
                      {!isJewelry && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openProjectPreview(p);
                          }}
                          className="px-3 py-2 bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)] text-xs font-semibold rounded-xl hover:bg-[rgba(255,255,255,0.1)] hover:text-white transition-all border border-[rgba(255,255,255,0.08)]"
                        >
                          Preview
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}

            {/* Jewelry Sessions */}
            {showSessions &&
              sessions.map((s) => (
                <div
                  key={`sess-${s.id}`}
                  className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(196,166,125,0.3)] transition-all duration-200 overflow-hidden group"
                >
                  <div className="aspect-square bg-[rgba(0,0,0,0.3)] overflow-hidden relative">
                    {s.original_image_url ? (
                      <img
                        src={s.original_image_url}
                        alt={s.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="text-[8px] font-bold bg-[rgba(196,166,125,0.85)] text-white px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
                        Jewelry
                      </span>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      {s.quality === "pro" && (
                        <span className="text-[8px] font-bold bg-gradient-to-r from-[#c4a67d] to-[#d4b88f] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Pro
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white truncate">{s.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-[rgba(255,255,255,0.4)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 rounded-full capitalize">
                          {s.jewelry_type}
                        </span>
                        <span className="text-[10px] text-[rgba(255,255,255,0.3)]">
                          {s.action_count} action{s.action_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-[rgba(255,255,255,0.3)]">{formatDate(s.created_at)}</p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/jewelry?session=${s.id}`)}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-xs font-semibold rounded-xl hover:shadow-[0_4px_16px_rgba(196,166,125,0.3)] active:scale-[0.97] transition-all"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => openSessionPreview(s.id)}
                        className="px-3 py-2 bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)] text-xs font-semibold rounded-xl hover:bg-[rgba(255,255,255,0.1)] hover:text-white transition-all border border-[rgba(255,255,255,0.08)]"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Session Preview modal (Jewelry) */}
      {(previewSession || previewLoading) && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setPreviewSession(null); setPreviewLoading(false); }}
        >
          <div
            className="bg-[#0f0f0f] rounded-2xl border border-[rgba(255,255,255,0.1)] max-w-3xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {previewLoading && !previewSession ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-[rgba(196,166,125,0.2)] border-t-[#c4a67d] rounded-full animate-spin" />
              </div>
            ) : previewSession ? (
              <div>
                <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.08)]">
                  <div>
                    <h3 className="text-lg font-bold text-white">{previewSession.title}</h3>
                    <span className="text-[10px] text-[rgba(255,255,255,0.4)] capitalize">{previewSession.jewelry_type}</span>
                  </div>
                  <button
                    onClick={() => setPreviewSession(null)}
                    className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center hover:bg-[rgba(255,255,255,0.12)] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {previewSession.original_image_url && (
                  <div className="p-5 border-b border-[rgba(255,255,255,0.06)]">
                    <p className="text-[10px] font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-2">Original</p>
                    <img
                      src={previewSession.original_image_url}
                      alt="Original"
                      className="w-32 h-32 object-cover rounded-xl border border-[rgba(255,255,255,0.1)] cursor-pointer hover:border-[rgba(196,166,125,0.3)] transition-colors"
                      onClick={() => setLightboxUrl(previewSession.original_image_url)}
                    />
                  </div>
                )}

                <div className="p-5 space-y-5">
                  {previewSession.actions.length === 0 ? (
                    <p className="text-sm text-[rgba(255,255,255,0.4)] text-center py-6">No generated content yet.</p>
                  ) : (
                    previewSession.actions.map((action, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#c4a67d] uppercase tracking-wider bg-[rgba(196,166,125,0.1)] px-2 py-0.5 rounded-full">
                            {action.action_type.replace("_", " ")}
                          </span>
                          {action.quality === "pro" && (
                            <span className="text-[8px] font-bold bg-gradient-to-r from-[#c4a67d] to-[#d4b88f] text-white px-1.5 py-0.5 rounded-full uppercase">
                              Pro
                            </span>
                          )}
                          <span className="text-[10px] text-[rgba(255,255,255,0.3)]">
                            {action.tokens_used > 0 ? `${action.tokens_used} tokens` : "Free"}
                          </span>
                        </div>
                        {action.output_images && action.output_images.length > 0 && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {action.output_images.map((img, j) => (
                              <div
                                key={j}
                                className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)] hover:border-[rgba(196,166,125,0.3)] cursor-pointer transition-colors relative group"
                                onClick={() => setLightboxUrl(img.url)}
                              >
                                <img src={img.url} alt={img.label} className="w-full aspect-square object-cover" />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-4">
                                  <span className="text-[8px] font-semibold text-white/80 line-clamp-1">{img.label}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {action.output_text && (
                          <div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-3 border border-[rgba(255,255,255,0.06)]">
                            <pre className="text-xs text-[rgba(255,255,255,0.6)] whitespace-pre-wrap font-mono">
                              {JSON.stringify(action.output_text, null, 2).slice(0, 500)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="p-5 border-t border-[rgba(255,255,255,0.08)]">
                  <button
                    onClick={() => {
                      setPreviewSession(null);
                      router.push(`/jewelry?session=${previewSession.id}`);
                    }}
                    className="w-full px-4 py-3 bg-gradient-to-r from-[#8b7355] to-[#c4a67d] text-white text-sm font-semibold rounded-xl hover:shadow-[0_4px_16px_rgba(196,166,125,0.3)] active:scale-[0.97] transition-all"
                  >
                    Open in Jewelry Studio
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Project Preview modal (Studio) */}
      {previewProject && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewProject(null)}
        >
          <div
            className="bg-[#0f0f0f] rounded-2xl border border-[rgba(255,255,255,0.1)] max-w-3xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.08)]">
              <div>
                <h3 className="text-lg font-bold text-white">{previewProject.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[8px] font-bold bg-[rgba(59,130,246,0.85)] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Studio
                  </span>
                  {previewProject.metadata?.quality === "pro" && (
                    <span className="text-[8px] font-bold bg-gradient-to-r from-[#c4a67d] to-[#d4b88f] text-white px-1.5 py-0.5 rounded-full uppercase">
                      Pro
                    </span>
                  )}
                  <span className="text-[10px] text-[rgba(255,255,255,0.4)] capitalize">
                    BG: {previewProject.metadata?.background || "auto"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewProject(null)}
                className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center hover:bg-[rgba(255,255,255,0.12)] transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="p-5">
              <p className="text-[10px] font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-wider mb-3">Generated Images</p>
              {(previewProject.metadata?.images || []).length === 0 ? (
                <p className="text-sm text-[rgba(255,255,255,0.4)] text-center py-6">No images found.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(previewProject.metadata?.images || []).map((img, j) => (
                    <div
                      key={j}
                      className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)] hover:border-[rgba(59,130,246,0.4)] cursor-pointer transition-colors relative group"
                      onClick={() => img.url && setLightboxUrl(img.url)}
                    >
                      {img.url ? (
                        <img src={img.url} alt={img.label} className="w-full aspect-square object-cover" />
                      ) : (
                        <div className="w-full aspect-square bg-[rgba(255,255,255,0.03)] flex items-center justify-center">
                          <span className="text-[10px] text-[rgba(255,255,255,0.3)]">No preview</span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-5">
                        <span className="text-[9px] font-semibold text-white/80 line-clamp-1">{img.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 pt-0 flex items-center justify-between text-[10px] text-[rgba(255,255,255,0.3)]">
              <span>{formatDate(previewProject.created_at)}</span>
              {previewProject.metadata?.category && (
                <span className="capitalize">{previewProject.metadata.category}</span>
              )}
            </div>

            <div className="p-5 border-t border-[rgba(255,255,255,0.08)]">
              <button
                onClick={() => {
                  setPreviewProject(null);
                  router.push("/studio");
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-[#3b82f6] to-[#6366f1] text-white text-sm font-semibold rounded-xl hover:shadow-[0_4px_16px_rgba(99,102,241,0.3)] active:scale-[0.97] transition-all"
              >
                Open Product Studio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center hover:bg-[rgba(255,255,255,0.2)] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <img
              src={lightboxUrl}
              alt="Preview"
              className="w-full object-contain max-h-[85vh] rounded-2xl border border-[rgba(255,255,255,0.1)]"
            />
          </div>
        </div>
      )}
    </ResponsiveLayout>
  );
}
