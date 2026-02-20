"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import ResponsiveLayout from "@/components/layout/ResponsiveLayout";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

interface Category { id: string; name: string; slug: string; }

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<"main" | "name" | "category" | "daily" | "settings">("main");
  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [applyBranding, setApplyBranding] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (user) {
      setName(user.contact_name || "");
      setBusinessName(user.company_name || "");
      setApplyBranding(user.apply_branding || false);
      setPhone(user.phone || "");
      setAddress(user.business_address || "");
      setWebsite(user.business_website || "");
      setEmail(user.email || "");
      setSelectedCategory(user.category_id || "");
      setLogoPreview(user.business_logo_url || null);
    }
    loadCategories();
  }, [authLoading, user, router]);

  async function loadCategories() {
    try {
      const data = await api.get<{ categories: Category[] }>("/feed/categories");
      setCategories(data.categories);
    } catch { /* silent */ }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await api.put("/users/me", {
        contact_name: name,
        company_name: businessName,
        apply_branding: applyBranding,
        business_address: address,
        business_website: website,
        email: email,
        category_id: selectedCategory || undefined,
      });
      setSection("main");
    } catch { /* silent */ }
    setSaving(false);
  }

  async function saveCategory() {
    setSaving(true);
    try {
      await api.put("/users/me", { category_id: selectedCategory });
      setSection("main");
    } catch { /* silent */ }
    setSaving(false);
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post("/users/me/logo", formData);
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } catch { /* silent */ }
  };

  if (section === "main") {
    return (
      <ResponsiveLayout title="Profile">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Profile</h2>
            <p className="text-text-secondary text-sm mt-1">Manage your account and business settings.</p>
          </div>

          <div className="space-y-2">
            <ProfileMenuItem
              label="Business Profile"
              description="Name, logo, contact details"
              onClick={() => setSection("name")}
            />
            <ProfileMenuItem
              label="Category"
              description="Product category selection"
              onClick={() => setSection("category")}
            />
            <ProfileMenuItem
              label="Daily Rewards"
              description="Claim free image credits"
              onClick={() => setSection("daily")}
            />
            <ProfileMenuItem
              label="Settings"
              description="Support, policies & more"
              onClick={() => setSection("settings")}
            />
          </div>

          <div className="pt-4">
            <button
              onClick={logout}
              className="text-error text-sm font-medium hover:text-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  if (section === "name") {
    return (
      <ResponsiveLayout title="Business Profile">
        <div className="max-w-xl mx-auto space-y-6 pb-24">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => setSection("main")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface transition-colors text-text-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <h2 className="text-xl font-semibold text-foreground">Business Profile</h2>
          </div>

          {/* Logo upload */}
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Business Logo</p>
            <label className="inline-block cursor-pointer">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-16 h-16 object-cover rounded-xl border border-border hover:border-accent/40 transition-colors" />
              ) : (
                <div className="w-16 h-16 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-text-secondary hover:border-border-hover transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>

          <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          <Input label="Business Name" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Your business name" />

          {/* Branding toggle */}
          <div className="flex items-center justify-between py-3">
            <p className="text-sm font-medium text-foreground">Apply Branding</p>
            <button
              onClick={() => setApplyBranding(!applyBranding)}
              className={`w-11 h-6 rounded-full transition-colors duration-200 ${applyBranding ? "bg-accent-dark" : "bg-border"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${applyBranding ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Mobile Number</label>
            <div className="flex items-center border border-border rounded-xl px-4 py-3 bg-surface">
              <span className="text-text-secondary mr-2 text-sm">+91</span>
              <span className="text-foreground text-sm">{phone}</span>
            </div>
            <p className="text-xs text-text-secondary">Login number cannot be changed</p>
          </div>

          <Input label="Business Address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter business address" />
          <Input label="Website" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourbusiness.com" />
          <Input label="Email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@business.com" />

          <div className="fixed bottom-0 left-0 right-0 lg:left-60 bg-white border-t border-border px-5 py-4 shadow-lg z-10">
            <div className="max-w-xl mx-auto">
              <Button onClick={saveProfile} loading={saving} fullWidth size="lg">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  if (section === "category") {
    return (
      <ResponsiveLayout title="Category">
        <div className="max-w-xl mx-auto space-y-6 pb-24">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => setSection("main")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface transition-colors text-text-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <h2 className="text-xl font-semibold text-foreground">Category Selection</h2>
          </div>

          <div className="space-y-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 text-left min-h-[52px] ${selectedCategory === cat.id
                  ? "border-accent bg-accent-light"
                  : "border-border hover:border-border-hover hover:bg-surface"
                  }`}
              >
                <p className="font-medium text-sm text-foreground">{cat.name}</p>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${selectedCategory === cat.id ? "border-accent" : "border-border"
                  }`}>
                  {selectedCategory === cat.id && <div className="w-2.5 h-2.5 rounded-full bg-accent" />}
                </div>
              </button>
            ))}
          </div>

          <div className="fixed bottom-0 left-0 right-0 lg:left-60 bg-white border-t border-border px-5 py-4 shadow-lg z-10">
            <div className="max-w-xl mx-auto">
              <Button onClick={saveCategory} loading={saving} fullWidth size="lg">
                Save
              </Button>
            </div>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  if (section === "daily") {
    return (
      <ResponsiveLayout title="Daily Rewards">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => setSection("main")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface transition-colors text-text-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          </div>
          <Card padding="lg" className="text-center">
            <div className="w-16 h-16 mx-auto bg-accent-lighter rounded-2xl flex items-center justify-center mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground">Daily Image Boost</h2>
            <p className="text-text-secondary text-sm mt-2 mb-6">
              Claim <span className="font-semibold text-foreground">2 free</span> image credits every day.
            </p>
            <Button
              onClick={async () => { try { await api.post("/credits/claim-daily", {}); } catch { } }}
              fullWidth
              variant="accent"
              size="lg"
            >
              Claim 2 Free Images
            </Button>
          </Card>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout title="Settings">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setSection("main")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface transition-colors text-text-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h2 className="text-xl font-semibold text-foreground">Settings</h2>
        </div>

        <div className="space-y-2">
          <a href="mailto:support@sorapixel.com">
            <Card hover padding="md" className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Support</p>
                <p className="text-xs text-text-secondary mt-0.5">Contact us for help</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </Card>
          </a>
          <Card padding="md" className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Refund Policy</p>
              <p className="text-xs text-text-secondary mt-0.5">View our refund policy</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          </Card>
          <Card padding="md" className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Privacy Policy</p>
              <p className="text-xs text-text-secondary mt-0.5">View our privacy policy</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          </Card>
        </div>
      </div>
    </ResponsiveLayout>
  );
}

function ProfileMenuItem({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return (
    <Card hover onClick={onClick} padding="md" className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-text-secondary mt-0.5">{description}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
    </Card>
  );
}
