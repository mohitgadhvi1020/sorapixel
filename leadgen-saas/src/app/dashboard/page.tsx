"use client";

import Link from "next/link";
import {
  Brain, Users, FileText, ArrowRight, Globe, Compass,
  Sparkles, Target, Building2, Mail, CheckCircle2
} from "lucide-react";

export default function DashboardPage() {
  const hasBrain = false;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold mb-1">Welcome to ReachWise</h1>
        <p className="text-text-secondary text-sm">
          Your AI outbound research copilot. Follow the steps below to get started.
        </p>
      </div>

      {/* Getting Started Steps */}
      {!hasBrain && (
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
                done: false,
              },
              {
                step: "2",
                title: "Discover Prospects",
                description: "Search for businesses matching your ICP. AI researches and enriches each one.",
                icon: Compass,
                href: "/dashboard/discover",
                color: "bg-secondary/10 text-secondary",
                done: false,
              },
              {
                step: "3",
                title: "Review Drafts",
                description: "AI generates personalized outreach emails. Review, edit, and send.",
                icon: FileText,
                href: "/dashboard/drafts",
                color: "bg-accent/10 text-accent",
                done: false,
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
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Company Brain", value: "Not Set", icon: Brain, color: "text-primary", bg: "bg-primary/10" },
          { label: "Prospects", value: "0", icon: Users, color: "text-secondary", bg: "bg-secondary/10" },
          { label: "Drafts Ready", value: "0", icon: FileText, color: "text-accent", bg: "bg-accent/10" },
          { label: "Emails Sent", value: "0", icon: Mail, color: "text-info", bg: "bg-info/10" },
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
              <span className="text-sm font-semibold">Onboard Your Business</span>
            </Link>
            <Link href="/dashboard/discover"
              className="flex items-center gap-3 p-3 rounded-xl bg-surface-secondary hover:bg-surface-tertiary transition-colors border border-border/50">
              <Target className="w-5 h-5 text-secondary" />
              <span className="text-sm font-medium">Discover Prospects</span>
            </Link>
            <Link href="/dashboard/drafts"
              className="flex items-center gap-3 p-3 rounded-xl bg-surface-secondary hover:bg-surface-tertiary transition-colors border border-border/50">
              <FileText className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium">Review Drafts</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-card border border-border/30">
          <h3 className="text-lg font-bold mb-4">How ReachWise Works</h3>
          <div className="space-y-4">
            {[
              { icon: Globe, label: "Onboard", desc: "AI scrapes your website and reads your files to build a company brain" },
              { icon: Compass, label: "Discover", desc: "Find prospects via Google Maps, research their websites, enrich emails" },
              { icon: Sparkles, label: "Draft", desc: "AI writes personalized emails using both your context and prospect research" },
              { icon: Building2, label: "Review", desc: "Human-in-the-loop: edit, approve, and send with confidence" },
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
