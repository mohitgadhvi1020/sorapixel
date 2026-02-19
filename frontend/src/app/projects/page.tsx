"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"photoshoot" | "catalogue">("photoshoot");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    fetchProjects();
  }, [tab, authLoading, user, router]);

  async function fetchProjects() {
    setLoading(true);
    try {
      const data = await api.get<{ projects: Project[] }>(`/projects/?project_type=${tab}`);
      setProjects(data.projects);
    } catch {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">My Projects</h1>
        <button
          onClick={() => router.push("/profile")}
          className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-500 font-bold"
        >
          {user?.name?.[0] || "U"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-white">
        {(["photoshoot", "catalogue"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-center font-medium capitalize transition-colors ${
              tab === t
                ? "text-pink-500 border-b-2 border-pink-500"
                : "text-gray-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Credits bar */}
      <div className="bg-pink-500 text-white px-4 py-3 flex items-center justify-between">
        <span className="text-sm">
          <strong>{user?.token_balance || 0}</strong> images left
        </span>
        <button
          onClick={() => router.push("/pricing")}
          className="bg-white text-pink-500 px-4 py-1 rounded-full text-sm font-bold"
        >
          Buy More
        </button>
      </div>

      {/* Project Grid */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-2">No {tab} projects yet</p>
            <p className="text-sm">Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="bg-white rounded-xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                {project.images?.[0] && (
                  <div className="h-48 bg-gray-100 flex items-center justify-center">
                    <span className="text-gray-400">Image Preview</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-medium">{project.title}</h3>
                  <p className="text-sm text-gray-400">
                    {project.images?.length || 0} images &middot;{" "}
                    {new Date(project.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
