import { GoogleGenAI } from "@google/genai";

function getClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "your-gemini-api-key") {
    throw new Error("GEMINI_API_KEY not configured");
  }
  return new GoogleGenAI({ apiKey: key });
}

// ── Company Brain Extraction ────────────────────────────────────────────

export interface CompanyBrain {
  company_name: string;
  services: string[];
  industries_served: string[];
  target_customers: string;
  usp: string;
  proof_points: string[];
  tone: string;
}

export async function extractCompanyBrain(
  websiteContent: string,
  fileContent?: string
): Promise<CompanyBrain> {
  const ai = getClient();

  const combinedContent = [
    websiteContent ? `WEBSITE CONTENT:\n${websiteContent}` : "",
    fileContent ? `UPLOADED DOCUMENT CONTENT:\n${fileContent}` : "",
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");

  const res = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Analyze the following company content and extract a structured company profile. Be specific and factual — only include information that is clearly stated or strongly implied.

${combinedContent}

Return a JSON object with exactly these fields:
{
  "company_name": "the company name",
  "services": ["list of specific services or products they offer"],
  "industries_served": ["industries or verticals they serve"],
  "target_customers": "description of their ideal customer",
  "usp": "their unique selling proposition or key differentiator",
  "proof_points": ["case studies, testimonials, stats, or notable clients mentioned"],
  "tone": "their communication style in 2-3 words, e.g. 'professional and friendly' or 'technical and authoritative'"
}

Return ONLY valid JSON, no markdown fences.`,
          },
        ],
      },
    ],
  });

  const text = res.text?.trim() || "{}";
  const cleaned = text.replace(/^```json?\s*/i, "").replace(/```\s*$/, "");

  try {
    return JSON.parse(cleaned) as CompanyBrain;
  } catch {
    return {
      company_name: "",
      services: [],
      industries_served: [],
      target_customers: "",
      usp: "",
      proof_points: [],
      tone: "",
    };
  }
}

// ── Prospect Research ───────────────────────────────────────────────────

export interface ProspectResearch {
  summary: string;
  services: string[];
  target_market: string;
  size_signals: string;
  potential_pain_points: string[];
  recent_activity: string;
}

export async function researchProspect(
  websiteContent: string,
  businessName: string,
  businessType?: string
): Promise<ProspectResearch> {
  const ai = getClient();

  const res = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Analyze this company's website content and create a research profile for sales outreach purposes.

BUSINESS NAME: ${businessName}
BUSINESS TYPE: ${businessType || "Unknown"}

WEBSITE CONTENT:
${websiteContent.slice(0, 15_000)}

Return a JSON object with exactly these fields:
{
  "summary": "2-3 sentence summary of what this company does",
  "services": ["their main services or products"],
  "target_market": "who they serve",
  "size_signals": "any indicators of company size (team size, locations, revenue hints)",
  "potential_pain_points": ["2-3 likely business challenges they might face"],
  "recent_activity": "any recent news, launches, or changes mentioned on the site"
}

Return ONLY valid JSON, no markdown fences.`,
          },
        ],
      },
    ],
  });

  const text = res.text?.trim() || "{}";
  const cleaned = text.replace(/^```json?\s*/i, "").replace(/```\s*$/, "");

  try {
    return JSON.parse(cleaned) as ProspectResearch;
  } catch {
    return {
      summary: "",
      services: [],
      target_market: "",
      size_signals: "",
      potential_pain_points: [],
      recent_activity: "",
    };
  }
}

// ── Personalized Email Draft ────────────────────────────────────────────

export interface EmailDraft {
  subject: string;
  body: string;
  personalization_reason: string;
  confidence: "high" | "medium" | "low";
}

export async function generateEmailDraft(
  companyBrain: CompanyBrain,
  prospectData: {
    company_name: string;
    industry?: string;
    research_summary?: string;
    research_data?: ProspectResearch;
    email?: string;
    website?: string;
  }
): Promise<EmailDraft> {
  const ai = getClient();

  const res = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are writing a cold outreach email for a B2B service business. The email should feel human, specific, and relevant — not templated.

SENDER COMPANY:
- Name: ${companyBrain.company_name}
- Services: ${companyBrain.services.join(", ")}
- Industries served: ${companyBrain.industries_served.join(", ")}
- USP: ${companyBrain.usp}
- Proof points: ${companyBrain.proof_points.join("; ")}
- Tone: ${companyBrain.tone}

PROSPECT COMPANY:
- Name: ${prospectData.company_name}
- Industry: ${prospectData.industry || "Unknown"}
- Website: ${prospectData.website || "N/A"}
- Research summary: ${prospectData.research_summary || "No research available"}
${prospectData.research_data ? `- Their services: ${prospectData.research_data.services?.join(", ") || "Unknown"}
- Their pain points: ${prospectData.research_data.potential_pain_points?.join(", ") || "Unknown"}
- Size signals: ${prospectData.research_data.size_signals || "Unknown"}` : ""}

Write a personalized cold email that:
1. Opens with something specific about the prospect (not generic flattery)
2. Connects their situation to the sender's relevant service
3. Is concise (3-5 sentences in the body)
4. Sounds human and conversational, matching the sender's tone
5. Ends with a soft, low-pressure CTA
6. Does NOT use placeholder brackets like [Name] — write it ready to send

Return a JSON object:
{
  "subject": "email subject line",
  "body": "full email body text",
  "personalization_reason": "1 sentence explaining why this angle was chosen",
  "confidence": "high" or "medium" or "low" based on how much prospect data was available
}

Return ONLY valid JSON, no markdown fences.`,
          },
        ],
      },
    ],
  });

  const text = res.text?.trim() || "{}";
  const cleaned = text.replace(/^```json?\s*/i, "").replace(/```\s*$/, "");

  try {
    return JSON.parse(cleaned) as EmailDraft;
  } catch {
    return {
      subject: "",
      body: "",
      personalization_reason: "Failed to generate draft",
      confidence: "low",
    };
  }
}

// ── ICP Suggestions ─────────────────────────────────────────────────────

export async function suggestICP(
  companyBrain: CompanyBrain
): Promise<string[]> {
  const ai = getClient();

  const res = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Based on this company profile, suggest 5 specific types of businesses they should target for outbound sales. Be specific (e.g. "dental clinics in metro cities" not just "healthcare").

Company: ${companyBrain.company_name}
Services: ${companyBrain.services.join(", ")}
Industries: ${companyBrain.industries_served.join(", ")}
Target customers: ${companyBrain.target_customers}

Return a JSON array of 5 strings. Return ONLY valid JSON, no markdown fences.`,
          },
        ],
      },
    ],
  });

  const text = res.text?.trim() || "[]";
  const cleaned = text.replace(/^```json?\s*/i, "").replace(/```\s*$/, "");

  try {
    return JSON.parse(cleaned) as string[];
  } catch {
    return [];
  }
}

// ── PDF Content Extraction ──────────────────────────────────────────────

export async function extractPdfContent(
  base64Data: string,
  mimeType: string
): Promise<string> {
  const ai = getClient();

  const res = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: "Extract all text content from this document. Include headings, descriptions, product names, services, pricing, testimonials, and any other relevant business information. Return the extracted text as plain text, well organized with sections.",
          },
        ],
      },
    ],
  });

  return res.text || "";
}
