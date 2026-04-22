/* ═══════════════════════════════════════════════════════════════════════
   Lead Scoring — Enhanced scoring from leadgen
   Score Range: 0-100
   ═══════════════════════════════════════════════════════════════════════ */

import type { Prospect, SocialProfiles } from "./types";

export interface ScoreBreakdown {
  total: number;
  label: "excellent" | "good" | "medium" | "low";
  factors: { name: string; points: number; reason: string }[];
}

export function scoreProspect(prospect: Prospect): ScoreBreakdown {
  const factors: { name: string; points: number; reason: string }[] = [];

  // Email (0-25)
  if (prospect.email) {
    const isPersonal = !isGenericEmail(prospect.email);
    const pts = isPersonal ? 25 : 10;
    factors.push({
      name: "email",
      points: pts,
      reason: isPersonal ? "Personal decision-maker email" : "Generic company email",
    });
  }

  // Contact name (0-10)
  if (prospect.contact_name) {
    factors.push({ name: "contact_name", points: 10, reason: "Has contact name" });
  }

  // Phone (0-5)
  if (prospect.phone) {
    factors.push({ name: "phone", points: 5, reason: "Has phone number" });
  }

  // Website (0-5)
  if (prospect.website) {
    factors.push({ name: "website", points: 5, reason: "Has website" });
  }

  // Rating (0-15)
  if (prospect.rating > 0) {
    let pts = 3;
    let reason = "Low rating";
    if (prospect.rating >= 3.5 && prospect.rating <= 4.8) {
      pts = 15;
      reason = "Strong rating (3.5-4.8)";
    } else if (prospect.rating >= 3.0) {
      pts = 10;
      reason = "Decent rating (3.0-3.5)";
    } else if (prospect.rating > 4.8) {
      pts = 8;
      reason = "Very high rating (may be large chain)";
    }
    factors.push({ name: "rating", points: pts, reason });
  }

  // Reviews (0-10)
  if (prospect.reviews > 0) {
    let pts = 2;
    let reason = "Very few reviews";
    if (prospect.reviews >= 5 && prospect.reviews <= 500) {
      pts = 10;
      reason = "Good review count (5-500)";
    } else if (prospect.reviews <= 2000) {
      pts = 5;
      reason = "Many reviews (may be larger business)";
    }
    factors.push({ name: "reviews", points: pts, reason });
  }

  // Social presence (0-10)
  const socials = prospect.socials;
  if (socials) {
    const count = Object.keys(socials).length;
    if (socials.instagram) {
      factors.push({ name: "instagram", points: 5, reason: "Has Instagram" });
    }
    if (count >= 3) {
      factors.push({ name: "social_presence", points: 5, reason: `${count} social profiles found` });
    } else if (count >= 1) {
      factors.push({ name: "social_presence", points: 2, reason: `${count} social profile(s)` });
    }
  }

  // Research data (0-15)
  if (prospect.research_summary) {
    factors.push({ name: "research", points: 15, reason: "Website researched by AI" });
  }

  const total = Math.min(100, factors.reduce((sum, f) => sum + f.points, 0));
  let label: ScoreBreakdown["label"] = "low";
  if (total >= 70) label = "excellent";
  else if (total >= 50) label = "good";
  else if (total >= 30) label = "medium";

  return { total, label, factors };
}

const GENERIC_PREFIXES = new Set([
  "info", "hello", "contact", "support", "sales", "admin",
  "team", "billing", "help", "care", "service", "office",
  "mail", "general", "enquiry", "inquiry", "newsletter",
  "noreply", "no-reply", "shipping", "orders",
]);

function isGenericEmail(email: string): boolean {
  const prefix = email.split("@")[0]?.toLowerCase();
  return GENERIC_PREFIXES.has(prefix);
}
