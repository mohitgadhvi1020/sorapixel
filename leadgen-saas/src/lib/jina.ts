const JINA_BASE = "https://r.jina.ai";

export interface JinaResult {
  content: string;
  url: string;
  title: string;
}

export async function scrapeUrl(url: string): Promise<JinaResult> {
  const targetUrl = url.startsWith("http") ? url : `https://${url}`;
  const res = await fetch(`${JINA_BASE}/${targetUrl}`, {
    headers: {
      Accept: "text/markdown",
      "X-Return-Format": "markdown",
    },
  });

  if (!res.ok) {
    throw new Error(`Jina Reader failed for ${targetUrl}: ${res.status}`);
  }

  const content = await res.text();
  return {
    content: content.slice(0, 50_000),
    url: targetUrl,
    title: extractTitle(content),
  };
}

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || "";
}
