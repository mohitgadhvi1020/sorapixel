/* ═══════════════════════════════════════════════════════════════════════
   ReachWise — Mock Data
   Demo data for the MVP before real API integration
   ═══════════════════════════════════════════════════════════════════════ */

export interface Prospect {
  id: string;
  company_name: string;
  website: string;
  email: string | null;
  phone: string | null;
  address: string;
  industry: string;
  rating: number;
  reviews: number;
  source: string;
  status: "new" | "contacted" | "replied" | "converted" | "archived";
  research_summary: string;
  email_confidence: "high" | "medium" | "low" | "none";
  score: number;
  created_at: string;
}

export interface Draft {
  id: string;
  prospect_name: string;
  prospect_industry: string;
  subject: string;
  body: string;
  personalization_reason: string;
  confidence: "high" | "medium" | "low";
  status: "draft" | "approved" | "sent";
  created_at: string;
}

export const DEMO_PROSPECTS: Prospect[] = [
  { id: "1", company_name: "Bright Digital Agency", website: "brightdigital.com", email: "hello@brightdigital.com", phone: "+1-212-555-0101", address: "New York, US", industry: "Digital Marketing", rating: 4.8, reviews: 156, source: "google_maps", status: "new", research_summary: "Full-service digital agency specializing in SEO and PPC for e-commerce brands.", email_confidence: "high", score: 85, created_at: "2026-03-17" },
  { id: "2", company_name: "GrowthStack Marketing", website: "growthstack.io", email: "team@growthstack.io", phone: "+1-415-555-0202", address: "San Francisco, US", industry: "Marketing Agency", rating: 4.6, reviews: 89, source: "google_maps", status: "new", research_summary: "B2B marketing agency focused on SaaS companies and startups.", email_confidence: "high", score: 78, created_at: "2026-03-17" },
  { id: "3", company_name: "Pixel Perfect Studios", website: "pixelperfect.co", email: "info@pixelperfect.co", phone: "+44-20-555-0303", address: "London, UK", industry: "Web Design", rating: 4.9, reviews: 234, source: "google_maps", status: "new", research_summary: "Award-winning web design studio serving enterprise clients.", email_confidence: "medium", score: 72, created_at: "2026-03-16" },
  { id: "4", company_name: "DataDriven Co", website: "datadriven.co", email: null, phone: "+1-312-555-0404", address: "Chicago, US", industry: "Analytics", rating: 4.4, reviews: 67, source: "google_maps", status: "new", research_summary: "Data analytics consultancy helping mid-market companies.", email_confidence: "none", score: 55, created_at: "2026-03-16" },
  { id: "5", company_name: "CloudNine Solutions", website: "cloudnine.dev", email: "contact@cloudnine.dev", phone: "+49-30-555-0505", address: "Berlin, Germany", industry: "IT Consulting", rating: 4.7, reviews: 112, source: "google_maps", status: "contacted", research_summary: "Cloud migration and DevOps consulting for European enterprises.", email_confidence: "medium", score: 68, created_at: "2026-03-15" },
  { id: "6", company_name: "Apex Creative", website: "apexcreative.agency", email: "hello@apexcreative.agency", phone: "+971-4-555-0606", address: "Dubai, UAE", industry: "Branding Agency", rating: 4.5, reviews: 78, source: "google_maps", status: "new", research_summary: "Luxury branding agency serving hospitality and real estate sectors.", email_confidence: "high", score: 80, created_at: "2026-03-15" },
];

export const DEMO_DRAFTS: Draft[] = [
  { id: "1", prospect_name: "Bright Digital Agency", prospect_industry: "Digital Marketing", subject: "Quick thought on scaling beyond referrals", body: "Hi team at Bright Digital,\n\nI noticed you recently launched an analytics dashboard — congrats on the expansion. As you scale beyond referrals into outbound, having a website that converts cold traffic becomes critical.\n\nWe've helped agencies like yours increase inbound conversion by 40% through targeted landing page optimization.\n\nWould it be worth a quick chat about your growth plans?", personalization_reason: "Referenced their recent product launch and common agency pain point of scaling beyond referrals.", confidence: "high", status: "draft", created_at: "2026-03-17" },
  { id: "2", prospect_name: "GrowthStack Marketing", prospect_industry: "Marketing Agency", subject: "Helping SaaS-focused agencies convert more", body: "Hi GrowthStack team,\n\nYour focus on B2B SaaS marketing caught my eye — it's a space where website performance directly impacts pipeline.\n\nWe specialize in building conversion-optimized sites for SaaS companies and the agencies that serve them. Our last agency partner saw a 35% lift in client demo requests.\n\nInterested in exploring this?", personalization_reason: "Targeted their SaaS specialization and connected it to website conversion optimization.", confidence: "high", status: "draft", created_at: "2026-03-17" },
  { id: "3", prospect_name: "CloudNine Solutions", prospect_industry: "IT Consulting", subject: "Your cloud consulting site could work harder", body: "Hi CloudNine team,\n\nCloud migration is a competitive space in Europe — I imagine standing out online matters a lot for your pipeline.\n\nWe build websites specifically for IT consultancies that need to convey technical credibility while driving enterprise inquiries.\n\nWould you be open to a 15-minute look at some quick wins?", personalization_reason: "Referenced their European market focus and the competitive nature of cloud consulting.", confidence: "medium", status: "draft", created_at: "2026-03-16" },
];

export const INDUSTRIES = [
  "Digital Marketing Agency",
  "Web Design Studio",
  "Software Development",
  "IT Consulting",
  "Branding Agency",
  "PR & Communications",
  "Accounting Firm",
  "Law Firm",
  "Dental Clinic",
  "Real Estate Agency",
  "Restaurant",
  "Fitness Studio",
  "Beauty Salon",
  "Architecture Firm",
  "Manufacturing",
  "Logistics & Shipping",
];

export function isApiConfigured(key: string): boolean {
  const val = typeof window === "undefined"
    ? process.env[key]
    : undefined;
  return !!val && !val.startsWith("your-");
}
