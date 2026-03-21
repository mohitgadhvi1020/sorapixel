"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2, Mail, Phone, Star, Search, Filter, Download,
  ExternalLink, ArrowRight, Users
} from "lucide-react";

interface Prospect {
  company_name: string;
  website: string;
  phone: string;
  address: string;
  industry: string;
  rating: number;
  reviews: number;
  email: string;
  email_confidence: string;
  research_summary: string;
  score: number;
  status: string;
}

const DEMO_PROSPECTS: Prospect[] = [
  { company_name: "Bright Digital Agency", website: "brightdigital.com", phone: "+1-212-555-0101", address: "New York, US", industry: "Digital Marketing", rating: 4.8, reviews: 156, email: "hello@brightdigital.com", email_confidence: "high", research_summary: "Full-service digital agency specializing in SEO and PPC for e-commerce brands.", score: 85, status: "new" },
  { company_name: "GrowthStack Marketing", website: "growthstack.io", phone: "+1-415-555-0202", address: "San Francisco, US", industry: "Marketing Agency", rating: 4.6, reviews: 89, email: "team@growthstack.io", email_confidence: "high", research_summary: "B2B marketing agency focused on SaaS companies and startups.", score: 78, status: "new" },
  { company_name: "Pixel Perfect Studios", website: "pixelperfect.co", phone: "+44-20-555-0303", address: "London, UK", industry: "Web Design", rating: 4.9, reviews: 234, email: "info@pixelperfect.co", email_confidence: "medium", research_summary: "Award-winning web design studio serving enterprise clients.", score: 72, status: "new" },
  { company_name: "DataDriven Co", website: "datadriven.co", phone: "+1-312-555-0404", address: "Chicago, US", industry: "Analytics", rating: 4.4, reviews: 67, email: "", email_confidence: "none", research_summary: "Data analytics consultancy helping mid-market companies.", score: 55, status: "new" },
  { company_name: "CloudNine Solutions", website: "cloudnine.dev", phone: "+49-30-555-0505", address: "Berlin, Germany", industry: "IT Consulting", rating: 4.7, reviews: 112, email: "contact@cloudnine.dev", email_confidence: "medium", research_summary: "Cloud migration and DevOps consulting for European enterprises.", score: 68, status: "new" },
  { company_name: "Apex Creative", website: "apexcreative.agency", phone: "+971-4-555-0606", address: "Dubai, UAE", industry: "Branding Agency", rating: 4.5, reviews: 78, email: "hello@apexcreative.agency", email_confidence: "high", research_summary: "Luxury branding agency serving hospitality and real estate sectors.", score: 80, status: "new" },
];

export default function ProspectsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = DEMO_PROSPECTS.filter((p) => {
    const matchesSearch =
      p.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.industry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Prospects</h1>
          <p className="text-text-secondary text-sm">
            {DEMO_PROSPECTS.length} prospects discovered. Click a prospect to
            see research and generate drafts.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-secondary text-text-secondary font-medium rounded-xl border border-border hover:bg-surface-tertiary transition-colors text-sm">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <Link
            href="/dashboard/discover"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white font-medium rounded-xl text-sm hover:opacity-90 transition-opacity"
          >
            <Users className="w-4 h-4" />
            Find More
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search prospects..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-tertiary" />
          {["all", "new", "contacted", "replied"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                statusFilter === s
                  ? "bg-primary text-white"
                  : "bg-surface-secondary text-text-secondary hover:bg-surface-tertiary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-border/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-secondary text-text-secondary text-left">
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Industry</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Rating</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Research</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {filtered.map((p, i) => (
                <tr
                  key={i}
                  className="hover:bg-surface-secondary/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-card flex items-center justify-center border border-primary/10 flex-shrink-0">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{p.company_name}</p>
                        <p className="text-xs text-text-tertiary truncate">
                          {p.address}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {p.industry}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {p.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-accent" />
                          <span className="text-xs truncate max-w-[140px]">
                            {p.email}
                          </span>
                        </div>
                      )}
                      {p.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-text-tertiary" />
                          <span className="text-xs">{p.phone}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="font-medium">{p.rating}</span>
                      <span className="text-xs text-text-tertiary">
                        ({p.reviews})
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-border/50 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${p.score >= 70 ? "bg-accent" : p.score >= 40 ? "bg-amber-500" : "bg-gray-400"}`}
                          style={{ width: `${p.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">{p.score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-text-secondary line-clamp-2 max-w-[200px]">
                      {p.research_summary || "Not researched yet"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {p.website && (
                        <a
                          href={`https://${p.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg hover:bg-surface-tertiary transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-text-tertiary" />
                        </a>
                      )}
                      <Link
                        href={`/dashboard/prospects/${i}`}
                        className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-primary" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
