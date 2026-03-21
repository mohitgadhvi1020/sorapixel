"use client";

import { useState } from "react";
import {
  Settings, User, Bell, Shield, CreditCard, Save, CheckCircle2, Globe, Mail
} from "lucide-react";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"profile" | "notifications" | "billing">("profile");

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-text-secondary text-sm">Manage your account preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-secondary rounded-xl border border-border/50 w-fit">
        {[
          { id: "profile" as const, label: "Profile", icon: User },
          { id: "notifications" as const, label: "Notifications", icon: Bell },
          { id: "billing" as const, label: "Billing", icon: CreditCard },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? "bg-white text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Profile */}
      {tab === "profile" && (
        <div className="bg-white rounded-2xl shadow-card border border-border/30 p-6 space-y-5">
          <h3 className="text-lg font-bold flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Account Profile</h3>
          <div className="flex items-center gap-5 pb-5 border-b border-border-light">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-white text-xl font-bold">
              M
            </div>
            <div>
              <p className="font-semibold text-lg">Mohit G.</p>
              <p className="text-sm text-text-secondary">mohit@company.com</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <input type="text" defaultValue="Mohit G." className="w-full px-4 py-3 rounded-xl border border-border bg-surface-secondary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input type="email" defaultValue="mohit@company.com" className="w-full px-4 py-3 rounded-xl border border-border bg-surface-secondary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Company</label>
              <input type="text" defaultValue="Acme Inc." className="w-full px-4 py-3 rounded-xl border border-border bg-surface-secondary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Timezone</label>
              <select defaultValue="UTC+5:30" className="w-full px-4 py-3 rounded-xl border border-border bg-surface-secondary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm">
                <option>UTC-8 (Pacific)</option>
                <option>UTC-5 (Eastern)</option>
                <option>UTC+0 (London)</option>
                <option>UTC+1 (Europe)</option>
                <option value="UTC+5:30">UTC+5:30 (India)</option>
                <option>UTC+8 (Singapore)</option>
              </select>
            </div>
          </div>
          <button onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-opacity">
            {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      )}

      {/* Notifications */}
      {tab === "notifications" && (
        <div className="bg-white rounded-2xl shadow-card border border-border/30 p-6 space-y-5">
          <h3 className="text-lg font-bold flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> Notification Preferences</h3>
          {[
            { label: "Email when new leads are generated", defaultChecked: true },
            { label: "Email when campaign completes", defaultChecked: true },
            { label: "Email on lead reply", defaultChecked: true },
            { label: "Weekly summary report", defaultChecked: false },
            { label: "Product updates and tips", defaultChecked: false },
          ].map((pref, i) => (
            <label key={i} className="flex items-center justify-between py-3 border-b border-border-light cursor-pointer">
              <span className="text-sm">{pref.label}</span>
              <input type="checkbox" defaultChecked={pref.defaultChecked} className="w-5 h-5 rounded accent-primary" />
            </label>
          ))}
        </div>
      )}

      {/* Billing */}
      {tab === "billing" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-card border border-border/30 p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><CreditCard className="w-5 h-5 text-primary" /> Current Plan</h3>
            <div className="p-5 rounded-xl bg-gradient-primary text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold">Pro Plan</span>
                <span className="text-sm bg-white/20 px-3 py-1 rounded-full">Active</span>
              </div>
              <p className="text-2xl font-bold mb-1">$149<span className="text-sm font-normal text-white/70">/month</span></p>
              <p className="text-sm text-white/70">1,000 leads • 500 emails • All sources</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-card border border-border/30 p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Shield className="w-5 h-5 text-primary" /> Usage This Month</h3>
            <div className="space-y-4">
              {[
                { label: "Leads Generated", used: 487, total: 1000 },
                { label: "Emails Sent", used: 312, total: 500 },
                { label: "AI Credits", used: 847, total: 1000 },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-text-secondary">{item.label}</span>
                    <span className="font-semibold">{item.used} / {item.total}</span>
                  </div>
                  <div className="w-full bg-surface-tertiary rounded-full h-2">
                    <div className="bg-gradient-primary h-2 rounded-full" style={{ width: `${(item.used / item.total) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
