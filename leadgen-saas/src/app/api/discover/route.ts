import { NextRequest } from "next/server";
import { searchGoogleMaps } from "@/lib/serpapi";
import { searchGooglePlaces } from "@/lib/google-places";
import { scrapeUrl } from "@/lib/jina";
import { researchProspect } from "@/lib/ai";
import { findEmailsByDomain, getBestEmail } from "@/lib/hunter";
import { discoverSocials } from "@/lib/social";
import { scoreProspect } from "@/lib/scoring";
import type { Prospect } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { query, location, limit = 20 } = body;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Multi-source search
        controller.enqueue(
          encoder.encode(sseEvent({ step: "searching", message: `Searching for "${query}" in ${location || "all locations"}...` }))
        );

        const allResults: Prospect[] = [];
        const seenDomains = new Set<string>();

        const addResult = (r: Prospect) => {
          const domain = r.website ? r.website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] : r.company_name;
          if (!seenDomains.has(domain)) {
            seenDomains.add(domain);
            allResults.push(r);
          }
        };

        // Try Google Places API first (direct)
        const placesResults = await searchGooglePlaces(query, location, Math.min(limit, 20));
        for (const r of placesResults) {
          addResult({
            company_name: r.title,
            website: r.website || "",
            phone: r.phone || "",
            address: r.address || "",
            industry: r.types?.[0] || "",
            rating: r.rating || 0,
            reviews: r.reviews || 0,
            place_id: r.place_id || "",
            email: "",
            email_confidence: "none",
            research_summary: "",
            research_data: {},
            score: 0,
            source: "google_places",
            status: "new",
          });
        }

        controller.enqueue(
          encoder.encode(sseEvent({ step: "found", message: `Found ${allResults.length} from Google Places...`, count: allResults.length }))
        );

        // Also try SerpAPI if we need more results
        if (allResults.length < limit) {
          const pages = Math.ceil(Math.min(limit - allResults.length, 40) / 20);
          for (let page = 0; page < pages; page++) {
            const serpResults = await searchGoogleMaps(query, location, page * 20);
            for (const r of serpResults) {
              addResult({
                company_name: r.title,
                website: r.website || "",
                phone: r.phone || "",
                address: r.address || "",
                industry: r.type || "",
                rating: r.rating || 0,
                reviews: r.reviews || 0,
                place_id: r.place_id || "",
                email: "",
                email_confidence: "none",
                research_summary: "",
                research_data: {},
                score: 0,
                source: "google_maps",
                status: "new",
              });
            }
            if (serpResults.length < 20) break;
          }
        }

        controller.enqueue(
          encoder.encode(sseEvent({ step: "found", message: `Total: ${allResults.length} businesses found`, count: allResults.length }))
        );

        if (allResults.length === 0) {
          controller.enqueue(encoder.encode(sseEvent({ step: "no_results", message: "No businesses found. Try a different search query or location." })));
          controller.close();
          return;
        }

        // Step 2: Research top prospects (websites)
        const researchCount = Math.min(10, allResults.length);
        controller.enqueue(encoder.encode(sseEvent({ step: "researching", message: `Researching top ${researchCount} prospects...` })));

        for (let i = 0; i < researchCount; i++) {
          const prospect = allResults[i];
          if (prospect.website) {
            try {
              const scraped = await scrapeUrl(prospect.website);
              const research = await researchProspect(scraped.content, prospect.company_name, prospect.industry);
              prospect.research_summary = research.summary;
              prospect.research_data = research as unknown as Record<string, unknown>;
            } catch { /* skip */ }
          }
          controller.enqueue(encoder.encode(sseEvent({
            step: "researched",
            message: `Researched ${i + 1}/${researchCount}: ${prospect.company_name}`,
            progress: Math.round(((i + 1) / researchCount) * 50),
          })));
        }

        // Step 3: Email enrichment
        const withWebsite = allResults.filter((p) => p.website);
        const enrichCount = Math.min(withWebsite.length, 20);

        if (enrichCount > 0) {
          controller.enqueue(encoder.encode(sseEvent({ step: "enriching", message: `Finding emails for ${enrichCount} prospects...` })));
          let enriched = 0;
          for (const prospect of withWebsite) {
            if (enriched >= enrichCount) break;
            try {
              const hunterResult = await findEmailsByDomain(prospect.website);
              const best = getBestEmail(hunterResult);
              if (best) {
                prospect.email = best.email;
                prospect.email_confidence = best.confidence;
              }
              // Also try to get contact name
              if (hunterResult.emails.length > 0) {
                const topEmail = hunterResult.emails[0];
                if (topEmail.first_name && topEmail.last_name) {
                  prospect.contact_name = `${topEmail.first_name} ${topEmail.last_name}`;
                }
              }
            } catch { /* skip */ }
            enriched++;
            controller.enqueue(encoder.encode(sseEvent({
              step: "enriched",
              message: `Enriched ${enriched}/${enrichCount}`,
              progress: 50 + Math.round((enriched / enrichCount) * 25),
            })));
          }
        }

        // Step 4: Social media discovery (top prospects)
        const socialCount = Math.min(10, withWebsite.length);
        if (socialCount > 0) {
          controller.enqueue(encoder.encode(sseEvent({ step: "finding_socials", message: `Finding social profiles for top ${socialCount} prospects...` })));
          for (let i = 0; i < socialCount; i++) {
            const prospect = withWebsite[i];
            try {
              prospect.socials = await discoverSocials(prospect.website);
            } catch { /* skip */ }
            controller.enqueue(encoder.encode(sseEvent({
              step: "socials_found",
              message: `Social discovery ${i + 1}/${socialCount}: ${prospect.company_name}${prospect.socials?.instagram ? ` (IG: @${prospect.socials.instagram.handle})` : ""}`,
              progress: 75 + Math.round(((i + 1) / socialCount) * 25),
            })));
          }
        }

        // Step 5: Score all prospects
        for (const prospect of allResults) {
          const result = scoreProspect(prospect);
          prospect.score = result.total;
        }
        allResults.sort((a, b) => b.score - a.score);

        controller.enqueue(encoder.encode(sseEvent({
          step: "complete",
          message: `Discovery complete! Found ${allResults.length} prospects.`,
          prospects: allResults,
          search_query: `${query} in ${location}`,
        })));
      } catch (e) {
        controller.enqueue(encoder.encode(sseEvent({
          step: "error",
          message: `Discovery error: ${e instanceof Error ? e.message : "unknown error"}`,
        })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
