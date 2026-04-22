/* ═══════════════════════════════════════════════════════════════════════
   Social Media Discovery — Ported from leadgen
   Finds Instagram, Facebook, Twitter, LinkedIn, TikTok, YouTube, Pinterest
   ═══════════════════════════════════════════════════════════════════════ */

import type { SocialProfiles } from "./types";

const PLATFORM_PATTERNS: Record<string, RegExp[]> = {
  instagram: [
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)\/?/gi,
  ],
  facebook: [
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/([a-zA-Z0-9_.]+)\/?/gi,
    /(?:https?:\/\/)?(?:www\.)?fb\.com\/([a-zA-Z0-9_.]+)\/?/gi,
  ],
  twitter: [
    /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9_]+)\/?/gi,
  ],
  linkedin: [
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_-]+)\/?/gi,
  ],
  tiktok: [
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9_.]+)\/?/gi,
  ],
  youtube: [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:@|c\/|channel\/)([a-zA-Z0-9_-]+)\/?/gi,
  ],
  pinterest: [
    /(?:https?:\/\/)?(?:www\.)?pinterest\.com\/([a-zA-Z0-9_]+)\/?/gi,
  ],
};

const SKIP_HANDLES = new Set([
  "instagram", "explore", "reel", "stories", "accounts", "p",
  "help", "privacy", "terms", "about", "api", "press", "legal",
  "share", "sharer", "intent", "hashtag", "login", "signup",
  "facebook", "twitter", "linkedin", "tiktok", "youtube",
]);

const PLATFORM_URLS: Record<string, string> = {
  instagram: "https://instagram.com/",
  facebook: "https://facebook.com/",
  twitter: "https://x.com/",
  linkedin: "https://linkedin.com/company/",
  tiktok: "https://tiktok.com/@",
  youtube: "https://youtube.com/@",
  pinterest: "https://pinterest.com/",
};

function extractHandles(html: string): SocialProfiles {
  const profiles: SocialProfiles = {};

  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    for (const regex of patterns) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(html)) !== null) {
        const handle = match[1]?.toLowerCase().replace(/[^a-z0-9_.-]/g, "");
        if (handle && handle.length >= 2 && !SKIP_HANDLES.has(handle)) {
          const key = platform as keyof SocialProfiles;
          if (!profiles[key]) {
            profiles[key] = {
              handle,
              url: `${PLATFORM_URLS[platform]}${handle}`,
            };
          }
          break;
        }
      }
    }
  }

  return profiles;
}

/** Scrape a website to find social media profiles */
export async function discoverSocials(websiteUrl: string): Promise<SocialProfiles> {
  if (!websiteUrl) return {};

  const baseUrl = websiteUrl.startsWith("http")
    ? websiteUrl
    : `https://${websiteUrl}`;

  const paths = ["", "/about", "/about-us", "/contact", "/contact-us"];
  const allProfiles: SocialProfiles = {};

  for (const path of paths) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ReachWise/1.0)" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;

      const html = await res.text();
      const found = extractHandles(html);

      for (const [platform, data] of Object.entries(found)) {
        const key = platform as keyof SocialProfiles;
        if (!allProfiles[key]) {
          allProfiles[key] = data;
        }
      }

      // If we already found most profiles, stop
      if (Object.keys(allProfiles).length >= 4) break;
    } catch {
      continue;
    }
  }

  return allProfiles;
}

/** Discover socials for multiple prospects in parallel */
export async function discoverSocialsBatch(
  prospects: { website: string }[],
  concurrency = 5
): Promise<SocialProfiles[]> {
  const results: SocialProfiles[] = new Array(prospects.length).fill({});
  const queue = prospects.map((p, i) => ({ ...p, index: i }));

  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      try {
        results[item.index] = await discoverSocials(item.website);
      } catch {
        results[item.index] = {};
      }
    }
  });

  await Promise.all(workers);
  return results;
}
