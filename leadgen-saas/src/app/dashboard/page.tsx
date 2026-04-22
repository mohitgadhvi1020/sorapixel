"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Brain, Users, FileText, ArrowRight, Globe, Compass,
  Sparkles, Target, Building2, Mail, CheckCircle2, Megaphone,
  Send
} from "lucide-react";

interface Stats {
  has_brain: boolean;
  brain_name: string | null;
  prospects_count: number;
  drafts_count: number;
  emails_sent: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {});
  }, []);

  const hasBrain = stats?.has_brain || false;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold mb-1">Welcome to ReachWise</h1>
        <p className="text-text-secondary text-sm">
          Your AI outbound research copilot. Follow the steps below to get started.
        </p>
      </div>

      {/* Getting Started Steps */}
      <div className="bg-white rounded-2xl shadow-card border border-border/30 p-6">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Getting Started
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "1",
              title: "Onboard Your Business",
              description: "Enter your website URL and upload assets. AI builds your company brain.",
              icon: Globe,
              href: "/dashboard/onboard",
              color: "bg-primary/10 text-primary",
              done: hasBrain,
            },
            {
              step: "2",
              title: "Discover Prospects",
              description: "Search for businesses matching your ICP. AI researches, finds emails & socials.",
              icon: Compass,
              href: "/dashboard/discover",
              color: "bg-secondary/10 text-secondary",
              done: (stats?.prospects_count || 0) > 0,
            },
            {
              step: "3",
              title: "Draft & Send Emails",
              description: "AI generates personalized outreach emails. Review, edit, and send.",
              icon: FileText,
              href: "/dashboard/drafts",
              color: "bg-accent/10 text-accent",
              done: (stats?.emails_sent || 0) > 0,
            },
          ].map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className="group relative p-6 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-card-hover transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center`}>
                  <item.icon className="w-5 h-5" />
                </div>
                {item.done ? (
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                ) : (
                  <span className="text-xs font-bold text-text-tertiary bg-surface-tertiary w-6 h-6 rounded-full flex items-center justify-center">
                    {item.step}
                  </span>
                )}
              </div>
              <h4 className="font-bold mb-2">{item.title}</h4>
              <p className="text-sm text-text-secondary">{item.description}</p>
              <ArrowRight className="w-4 h-4 text-text-tertiary absolute top-6 right-6 group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Company Brain", value: stats?.brain_name || "Not Set", icon: Brain, color: "text-primary", bg: "bg-primary/10" },
          { label: "Prospects", value: String(stats?.prospects_count || 0), icon: Users, color: "text-secondary", bg: "bg-secondary/10" },
          { label: "Drafts Ready", value: String(stats?.drafts_count || 0), icon: FileText, color: "text-accent", bg: "bg-accent/10" },
          { label: "Emails Sent", value: String(stats?.emails_sent || 0), icon: Mail, color: "text-info", bg: "bg-info/10" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/30">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm text-text-secondary mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-card border border-border/30">
          <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/dashboard/onboard"
              className="flex items-center gap-3 p-3 rounded-xl bg-gradient-primary text-white hover:opacity-90 transition-opacity">
              <Globe className="w-5 h-5" />
              <span className="text-sm font-semibold">{hasBrain ? "Update Company Brain" : "Onboard Your Business"}</span>
            </Link>
            <Link href="/dashboard/discover"
              className="flex items-center gap-3 p-3 rounded-xl bg-surface-secondary hover:bg-surface-tertiary transition-colors border border-border/50">
              <Target className="w-5 h-5 text-secondary" />
              <span className="text-sm font-medium">Discover Prospects</span>
            </Link>
            <Link href="/dashboard/campaigns"
              className="flex items-center gap-3 p-3 rounded-xl bg-surface-secondary hover:bg-surface-tertiary transition-colors border border-border/50">
              <Megaphone className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium">Manage Campaigns</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-card border border-border/30">
          <h3 className="text-lg font-bold mb-4">How ReachWise Works</h3>
          <div className="space-y-4">
            {[
              { icon: Globe, label: "Onboard", desc: "AI scrapes your website and reads your files to build a company brain" },
              { icon: Compass, label: "Discover", desc: "Find prospects via Google Maps/Places, research websites, find emails & socials" },
              { icon: Sparkles, label: "Draft", desc: "AI writes personalized emails using your context and prospect research" },
              { icon: Send, label: "Send", desc: "Review, edit, and send emails directly — track opens and replies" },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-secondary flex items-center justify-center flex-shrink-0">
                  <step.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{step.label}</p>
                  <p className="text-xs text-text-secondary">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
