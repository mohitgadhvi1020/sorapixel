import { NextRequest } from "next/server";
import { scrapeUrl } from "@/lib/jina";
import { extractCompanyBrain, extractPdfContent } from "@/lib/ai";

export const dynamic = "force-dynamic";

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const websiteUrl = formData.get("website_url") as string | null;
  const files = formData.getAll("files") as File[];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let websiteContent = "";
        let fileContent = "";

        // Step 1: Scrape website
        if (websiteUrl) {
          controller.enqueue(
            encoder.encode(
              sseEvent({
                step: "scraping_website",
                message: `Scraping ${websiteUrl}...`,
              })
            )
          );

          try {
            const result = await scrapeUrl(websiteUrl);
            websiteContent = result.content;
            controller.enqueue(
              encoder.encode(
                sseEvent({
                  step: "website_scraped",
                  message: `Scraped ${result.title || websiteUrl} (${websiteContent.length} chars)`,
                })
              )
            );
          } catch (e) {
            controller.enqueue(
              encoder.encode(
                sseEvent({
                  step: "website_error",
                  message: `Could not scrape website: ${e instanceof Error ? e.message : "unknown error"}`,
                })
              )
            );
          }
        }

        // Step 2: Parse uploaded files
        if (files.length > 0) {
          controller.enqueue(
            encoder.encode(
              sseEvent({
                step: "parsing_files",
                message: `Processing ${files.length} uploaded file(s)...`,
              })
            )
          );

          const fileTexts: string[] = [];
          for (const file of files) {
            try {
              const buffer = await file.arrayBuffer();
              const base64 = Buffer.from(buffer).toString("base64");
              const text = await extractPdfContent(base64, file.type);
              fileTexts.push(`--- ${file.name} ---\n${text}`);
              controller.enqueue(
                encoder.encode(
                  sseEvent({
                    step: "file_parsed",
                    message: `Parsed ${file.name}`,
                  })
                )
              );
            } catch (e) {
              controller.enqueue(
                encoder.encode(
                  sseEvent({
                    step: "file_error",
                    message: `Could not parse ${file.name}: ${e instanceof Error ? e.message : "unknown error"}`,
                  })
                )
              );
            }
          }
          fileContent = fileTexts.join("\n\n");
        }

        if (!websiteContent && !fileContent) {
          controller.enqueue(
            encoder.encode(
              sseEvent({
                step: "error",
                message:
                  "No content to analyze. Please provide a website URL or upload files.",
              })
            )
          );
          controller.close();
          return;
        }

        // Step 3: Generate company brain
        controller.enqueue(
          encoder.encode(
            sseEvent({
              step: "generating_brain",
              message: "AI is analyzing your company...",
            })
          )
        );

        const brain = await extractCompanyBrain(websiteContent, fileContent);

        controller.enqueue(
          encoder.encode(
            sseEvent({
              step: "complete",
              message: "Company brain generated successfully!",
              brain,
              raw_website_content: websiteContent.slice(0, 5000),
              raw_file_content: fileContent.slice(0, 5000),
            })
          )
        );
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            sseEvent({
              step: "error",
              message: `Pipeline error: ${e instanceof Error ? e.message : "unknown error"}`,
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
