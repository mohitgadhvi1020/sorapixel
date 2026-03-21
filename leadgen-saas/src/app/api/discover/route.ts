import { NextRequest } from "next/server";
import { searchGoogleMaps } from "@/lib/serpapi";
import { scrapeUrl } from "@/lib/jina";
import { researchProspect } from "@/lib/ai";
import { findEmailsByDomain, getBestEmail } from "@/lib/hunter";

export const dynamic = "force-dynamic";

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

interface EnrichedProspect {
  company_name: string;
  website: string;
  phone: string;
  address: string;
  industry: string;
  rating: number;
  reviews: number;
  place_id: string;
  email: string;
  email_confidence: string;
  research_summary: string;
  research_data: Record<string, unknown>;
  score: number;
  source: string;
}

function scoreProspect(p: EnrichedProspect): number {
  let score = 0;
  if (p.email) score += 30;
  if (p.website) score += 15;
  if (p.phone) score += 10;
  if (p.rating >= 4.0) score += 15;
  else if (p.rating >= 3.0) score += 8;
  if (p.reviews >= 50) score += 15;
  else if (p.reviews >= 10) score += 8;
  if (p.research_summary) score += 15;
  return Math.min(score, 100);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { query, location, limit = 20, research_depth = "top10" } = body;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Step 1: Search Google Maps
        controller.enqueue(
          encoder.encode(
            sseEvent({
              step: "searching",
              message: `Searching for "${query}" in ${location || "all locations"}...`,
            })
          )
        );

        const pages = Math.ceil(Math.min(limit, 60) / 20);
        const allResults: EnrichedProspect[] = [];

        for (let page = 0; page < pages; page++) {
          const results = await searchGoogleMaps(query, location, page * 20);

          for (const r of results) {
            allResults.push({
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
            });
          }

          controller.enqueue(
            encoder.encode(
              sseEvent({
                step: "found",
                message: `Found ${allResults.length} businesses so far...`,
                count: allResults.length,
              })
            )
          );

          if (results.length < 20) break;
        }

        if (allResults.length === 0) {
          controller.enqueue(
            encoder.encode(
              sseEvent({
                step: "no_results",
                message:
                  "No businesses found. Try a different search query or location.",
              })
            )
          );
          controller.close();
          return;
        }

        // Step 2: Research top prospects
        const researchCount =
          research_depth === "all"
            ? allResults.length
            : Math.min(10, allResults.length);

        controller.enqueue(
          encoder.encode(
            sseEvent({
              step: "researching",
              message: `Researching top ${researchCount} prospects...`,
            })
          )
        );

        for (let i = 0; i < researchCount; i++) {
          const prospect = allResults[i];

          if (prospect.website) {
            try {
              const scraped = await scrapeUrl(prospect.website);
              const research = await researchProspect(
                scraped.content,
                prospect.company_name,
                prospect.industry
              );
              prospect.research_summary = research.summary;
              prospect.research_data = research as unknown as Record<
                string,
                unknown
              >;
            } catch {
              // Skip research for this prospect
            }
          }

          controller.enqueue(
            encoder.encode(
              sseEvent({
                step: "researched",
                message: `Researched ${i + 1}/${researchCount}: ${prospect.company_name}`,
                progress: Math.round(((i + 1) / researchCount) * 100),
              })
            )
          );
        }

        // Step 3: Email enrichment for prospects with websites
        const enrichCount = Math.min(
          allResults.filter((p) => p.website).length,
          20
        );

        if (enrichCount > 0) {
          controller.enqueue(
            encoder.encode(
              sseEvent({
                step: "enriching",
                message: `Finding emails for ${enrichCount} prospects...`,
              })
            )
          );

          let enriched = 0;
          for (const prospect of allResults) {
            if (!prospect.website || enriched >= enrichCount) continue;

            try {
              const hunterResult = await findEmailsByDomain(prospect.website);
              const best = getBestEmail(hunterResult);
              if (best) {
                prospect.email = best.email;
                prospect.email_confidence = best.confidence;
              }
            } catch {
              // Skip enrichment for this prospect
            }

            enriched++;
            controller.enqueue(
              encoder.encode(
                sseEvent({
                  step: "enriched",
                  message: `Enriched ${enriched}/${enrichCount}`,
                  progress: Math.round((enriched / enrichCount) * 100),
                })
              )
            );
          }
        }

        // Step 4: Score all prospects
        for (const prospect of allResults) {
          prospect.score = scoreProspect(prospect);
        }

        allResults.sort((a, b) => b.score - a.score);

        controller.enqueue(
          encoder.encode(
            sseEvent({
              step: "complete",
              message: `Discovery complete! Found ${allResults.length} prospects.`,
              prospects: allResults,
              search_query: `${query} in ${location}`,
            })
          )
        );
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            sseEvent({
              step: "error",
              message: `Discovery error: ${e instanceof Error ? e.message : "unknown error"}`,
            })
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
