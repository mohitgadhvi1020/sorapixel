/* ═══════════════════════════════════════════════════════════════════════
   ReachWise — Shared Types
   ═══════════════════════════════════════════════════════════════════════ */

export interface CompanyBrain {
  company_name: string;
  services: string[];
  industries_served: string[];
  target_customers: string;
  usp: string;
  proof_points: string[];
  tone: string;
}

export interface SocialProfiles {
  instagram?: { handle: string; url: string };
  facebook?: { handle: string; url: string };
  twitter?: { handle: string; url: string };
  linkedin?: { handle: string; url: string };
  tiktok?: { handle: string; url: string };
  youtube?: { handle: string; url: string };
  pinterest?: { handle: string; url: string };
}

export interface Prospect {
  id?: string;
  user_id?: string;
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
  research_data: Record<string, unknown>;
  score: number;
  source: string;
  status: string;
  place_id: string;
  search_query?: string;
  socials?: SocialProfiles;
  contact_name?: string;
  created_at?: string;
}

export interface EmailDraft {
  id?: string;
  user_id?: string;
  prospect_id?: string;
  prospect_name?: string;
  prospect_industry?: string;
  subject: string;
  body: string;
  personalization_reason: string;
  confidence: "high" | "medium" | "low";
  status: "draft" | "approved" | "sent";
  created_at?: string;
}

export interface Campaign {
  id?: string;
  user_id?: string;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  prospects_count: number;
  emails_sent: number;
  emails_opened: number;
  emails_replied: number;
  created_at?: string;
}
