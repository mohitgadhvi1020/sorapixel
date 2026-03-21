const SERPAPI_BASE = "https://serpapi.com/search.json";

export interface SerpApiResult {
  title: string;
  place_id?: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  type?: string;
  gps_coordinates?: { latitude: number; longitude: number };
}

export interface SerpApiResponse {
  local_results?: SerpApiResult[];
  search_metadata?: { status: string };
}

export async function searchGoogleMaps(
  query: string,
  location: string,
  start = 0
): Promise<SerpApiResult[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey || apiKey === "your-serpapi-key") {
    return [];
  }

  const searchQuery = location ? `${query} in ${location}` : query;

  const params = new URLSearchParams({
    engine: "google_maps",
    type: "search",
    q: searchQuery,
    api_key: apiKey,
    start: String(start),
  });

  const res = await fetch(`${SERPAPI_BASE}?${params}`);
  if (!res.ok) {
    throw new Error(`SerpAPI error: ${res.status}`);
  }

  const data: SerpApiResponse = await res.json();
  return (data.local_results || []).map((r) => ({
    title: r.title,
    place_id: r.place_id,
    address: r.address,
    phone: r.phone,
    website: r.website,
    rating: r.rating,
    reviews: r.reviews,
    type: r.type,
    gps_coordinates: r.gps_coordinates,
  }));
}
