const HUNTER_BASE = "https://api.hunter.io/v2";

export interface HunterEmail {
  value: string;
  type: string | null;
  confidence: number;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
}

export interface HunterResult {
  emails: HunterEmail[];
  domain: string;
  organization: string | null;
}

export async function findEmailsByDomain(
  domain: string
): Promise<HunterResult> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey || apiKey === "your-hunter-api-key") {
    return { emails: [], domain, organization: null };
  }

  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  const params = new URLSearchParams({
    domain: cleanDomain,
    api_key: apiKey,
  });

  const res = await fetch(`${HUNTER_BASE}/domain-search?${params}`);
  if (!res.ok) {
    if (res.status === 429) {
      return { emails: [], domain: cleanDomain, organization: null };
    }
    throw new Error(`Hunter.io error: ${res.status}`);
  }

  const data = await res.json();
  const results = data?.data;

  return {
    emails: (results?.emails || []).map((e: Record<string, unknown>) => ({
      value: e.value as string,
      type: e.type as string | null,
      confidence: e.confidence as number,
      first_name: e.first_name as string | null,
      last_name: e.last_name as string | null,
      position: e.position as string | null,
    })),
    domain: cleanDomain,
    organization: results?.organization || null,
  };
}

export function getBestEmail(result: HunterResult): {
  email: string;
  confidence: string;
} | null {
  if (!result.emails.length) return null;

  const sorted = [...result.emails].sort(
    (a, b) => b.confidence - a.confidence
  );
  const best = sorted[0];

  let confidence: string = "low";
  if (best.confidence >= 80) confidence = "high";
  else if (best.confidence >= 50) confidence = "medium";

  return { email: best.value, confidence };
}
