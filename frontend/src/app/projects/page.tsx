"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { shareToWhatsApp, downloadImage } from "@/lib/share";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

interface MetaImage {
  label: string;
  storage_path: string;
}

interface Project {
  id: string;
  title: string;
  project_type: string;
  metadata: { images?: MetaImage[];[key: string]: unknown };
  created_at: string;
}

function storageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/sorapixel-images/${path}`;
}

export default function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"photoshoot" | "catalogue">("photoshoot");
  const [projects, setProjects] = useState<Project[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    loadCredits();
  }, [authLoading, user, router]);

  useEffect(() => { loadProjects(); }, [tab]);

  async function loadProjects() {
    setLoadingProjects(true);
    try {
      const data = await api.get<{ projects: Project[] }>(`/projects/?project_type=${tab}`);
      setProjects(data.projects || []);
    } catch { setProjects([]); }
    setLoadingProjects(false);
  }

  async function loadCredits() {
    try {
      const data = await api.get<{ token_balance: number }>("/credits/balance");
      setCredits(data.token_balance);
    } catch { /* silent */ }
  }

  async function handleDownload(imgUrl: string, label: string) {
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = (reader.result as string).split(",")[1];
        downloadImage(b64, `sorapixel-${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`);
      };
      reader.readAsDataURL(blob);
    } catch {
      window.open(imgUrl, "_blank");
    }
  }

  async function handleWhatsApp(imgUrl: string, label: string) {
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = (reader.result as string).split(",")[1];
        shareToWhatsApp(b64, `sorapixel-${label.toLowerCase().replace(/\s+/g, "-")}.png`);
      };
      reader.readAsDataURL(blob);
    } catch {
      const text = encodeURIComponent("Check out this image I created with SoraPixel!");
      window.open(`https://wa.me/?text=${text}`, "_blank");
    }
  }

  return (
    <ResponsiveLayout title="Projects">
      <div className="space-y-8">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              My Projects
            </h2>
            <p className="text-[rgba(255,255,255,0.5)] text-sm mt-1">
              All your generated images in one place.
            </p>
          </div>
          {credits !== null && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.04)] rounded-xl border border-[rgba(255,255,255,0.08)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v12M8 10h8" />
                </svg>
                <span className="text-sm font-semibold text-white">{credits} images left</span>
              </div>
              <Button variant="accent" size="sm" onClick={() => router.push("/pricing")}>
                Buy More
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[rgba(255,255,255,0.06)]">
          {(["photoshoot", "catalogue"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-5 py-2.5 text-sm font-medium transition-all duration-250 capitalize ${tab === t ? "text-white" : "text-[rgba(255,255,255,0.4)] hover:text-white"
                }`}
            >
              {t}
              {tab === t && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#FF6A00] to-[#FF8A3D] rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Projects grid */}
        {loadingProjects ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-[rgba(255,106,0,0.2)] border-t-[#FF6A00] rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <Card padding="lg" className="text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[rgba(255,106,0,0.1)] flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="1.5" strokeLinecap="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">No {tab} projects yet</h3>
            <p className="text-sm text-[rgba(255,255,255,0.5)] mt-2 mb-6">
              Start creating to see your images here.
            </p>
            <Button onClick={() => router.push("/create")} size="lg">
              Create Your First
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(proj => (
              <Card key={proj.id} padding="none" hover>
                {/* Project images */}
                {proj.metadata?.images && proj.metadata.images.length > 0 ? (
                  <div className="relative group">
                    {proj.metadata.images.slice(0, 1).map((img, idx) => {
                      const imgUrl = storageUrl(img.storage_path);
                      return (
                        <div key={idx} className="relative">
                          <img src={imgUrl} alt={img.label} className="w-full aspect-square object-cover rounded-t-[20px]" loading="lazy" />
                          {/* Gradient overlay on hover */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[20px]" />
                          <span className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-lg font-medium">{img.label}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="aspect-square bg-[rgba(255,255,255,0.04)] rounded-t-[20px] flex items-center justify-center">
                    <p className="text-[rgba(255,255,255,0.3)] text-sm">No images</p>
                  </div>
                )}

                {/* Project info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white truncate pr-2">{proj.title}</h3>
                    <span className="text-[10px] text-[rgba(255,255,255,0.3)] whitespace-nowrap">{new Date(proj.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Image count + thumbnails */}
                  {proj.metadata?.images && proj.metadata.images.length > 1 && (
                    <div className="flex gap-1.5 mb-3">
                      {proj.metadata.images.slice(1, 4).map((img, idx) => (
                        <div key={idx} className="w-10 h-10 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.08)]">
                          <img src={storageUrl(img.storage_path)} alt={img.label} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ))}
                      {proj.metadata.images.length > 4 && (
                        <div className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                          <span className="text-[10px] text-[rgba(255,255,255,0.4)] font-medium">+{proj.metadata.images.length - 4}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {proj.metadata?.images && proj.metadata.images.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleWhatsApp(storageUrl(proj.metadata.images![0].storage_path), proj.metadata.images![0].label)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                        Share
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDownload(storageUrl(proj.metadata.images![0].storage_path), proj.metadata.images![0].label)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                        Download
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
}
