/* ═══════════════════════════════════════════════════════════════════════
   Google Places API (New) — Direct integration from leadgen
   ═══════════════════════════════════════════════════════════════════════ */

const PLACES_BASE = "https://places.googleapis.com/v1/places:searchText";

export interface PlacesResult {
  title: string;
  place_id: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviews: number;
  types: string[];
}

export async function searchGooglePlaces(
  query: string,
  location: string,
  maxResults = 20
): Promise<PlacesResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || apiKey.startsWith("your-")) return [];

  const textQuery = location ? `${query} in ${location}` : query;

  const res = await fetch(PLACES_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.displayName,places.id,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.types",
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount: Math.min(maxResults, 20),
      languageCode: "en",
    }),
  });

  if (!res.ok) return [];

  const data = await res.json();
  const places = data.places || [];

  return places.map(
    (p: Record<string, unknown> & { displayName?: { text?: string } }) => ({
      title: p.displayName?.text || "",
      place_id: (p.id as string) || "",
      address: (p.formattedAddress as string) || "",
      phone: (p.nationalPhoneNumber as string) || "",
      website: (p.websiteUri as string) || "",
      rating: (p.rating as number) || 0,
      reviews: (p.userRatingCount as number) || 0,
      types: (p.types as string[]) || [],
    })
  );
}

/** Run multiple queries to get more results */
export async function searchGooglePlacesMulti(
  queries: string[],
  location: string,
  maxPerQuery = 20
): Promise<PlacesResult[]> {
  const seen = new Set<string>();
  const results: PlacesResult[] = [];

  for (const query of queries) {
    const batch = await searchGooglePlaces(query, location, maxPerQuery);
    for (const r of batch) {
      const key = r.website || r.title;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(r);
      }
    }
  }

  return results;
}
