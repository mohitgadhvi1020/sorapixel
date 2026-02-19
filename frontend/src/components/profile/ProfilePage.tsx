"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import type { User, Category } from "@/lib/types";

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    company_name: "",
    business_address: "",
    business_website: "",
    email: "",
    apply_branding: false,
    category_id: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const [profileData, catData] = await Promise.all([
          api.get<User>("/users/me"),
          api.get<{ categories: Category[] }>("/feed/categories"),
        ]);
        setProfile(profileData);
        setCategories(catData.categories);
        setForm({
          name: profileData.name || "",
          company_name: profileData.company_name || "",
          business_address: profileData.business_address || "",
          business_website: profileData.business_website || "",
          email: profileData.email || "",
          apply_branding: profileData.apply_branding,
          category_id: profileData.category_id || "",
        });
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await api.put("/users/me", form);
      setMessage("Profile saved!");
      refreshUser();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/users/me/logo`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("sp_access_token")}` },
          body: formData,
        }
      );
      const data = await resp.json();
      if (data.success) {
        setProfile((p) => p ? { ...p, business_logo_url: data.logo_url } : p);
        setMessage("Logo uploaded!");
      }
    } catch {
      setMessage("Failed to upload logo");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center">
        <button onClick={() => router.back()} className="text-gray-600 mr-4">
          ← 
        </button>
        <h1 className="text-xl font-bold">Profile</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Business Logo */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">Business Logo</label>
          <div className="flex items-center gap-4">
            {profile?.business_logo_url ? (
              <img src={profile.business_logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-2xl">
                +
              </div>
            )}
            <label className="cursor-pointer text-pink-500 text-sm font-medium">
              Upload Logo
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Name */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">Name *</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Enter your name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-pink-400"
          />
        </div>

        {/* Business Name */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">Business Name *</label>
          <input
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            placeholder="Enter your business name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-pink-400"
          />
        </div>

        {/* Apply Branding Toggle */}
        <div className="bg-white rounded-xl p-4 flex items-center justify-between">
          <span className="font-medium">Apply Branding</span>
          <button
            onClick={() => setForm({ ...form, apply_branding: !form.apply_branding })}
            className={`w-12 h-6 rounded-full transition-colors ${form.apply_branding ? "bg-pink-500" : "bg-gray-300"}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${form.apply_branding ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* Phone (read-only) */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">Mobile Number</label>
          <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
            <span className="text-gray-500 mr-2">+91</span>
            <span className="text-gray-700">{profile?.phone || user?.phone}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Login number cannot be changed</p>
        </div>

        {/* Business Address */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">Business Address</label>
          <input
            value={form.business_address}
            onChange={(e) => setForm({ ...form, business_address: e.target.value })}
            placeholder="Enter Business Address"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-pink-400"
          />
        </div>

        {/* Business Website */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">Business Website URL</label>
          <input
            value={form.business_website}
            onChange={(e) => setForm({ ...form, business_website: e.target.value })}
            placeholder="Enter Business Website URL"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-pink-400"
          />
        </div>

        {/* Email */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">Email Address</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Enter Business Email Address"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-pink-400"
          />
        </div>

        {/* Category Selection */}
        <div className="bg-white rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-pink-400"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {message && (
          <div className={`rounded-lg px-4 py-2 text-sm ${message.includes("Failed") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
            {message}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-xl transition-colors"
        >
          {saving ? "Saving..." : "Save"}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full border border-red-300 text-red-500 font-medium py-3 rounded-xl mt-4"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
