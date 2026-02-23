import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  let blogRoutes: MetadataRoute.Sitemap = [];
  let categoryRoutes: MetadataRoute.Sitemap = [];

  try {
    const postsRes = await fetch(`${API_BASE}/blog/posts?limit=50`, {
      next: { revalidate: 3600 },
    });
    if (postsRes.ok) {
      const data = await postsRes.json();
      blogRoutes = (data.posts || []).map(
        (post: { slug: string; published_at?: string; updated_at?: string }) => ({
          url: `${SITE_URL}/blog/${post.slug}`,
          lastModified: post.updated_at || post.published_at || new Date().toISOString(),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        }),
      );
    }
  } catch {
    /* API unreachable during build -- skip */
  }

  try {
    const catsRes = await fetch(`${API_BASE}/blog/categories`, {
      next: { revalidate: 3600 },
    });
    if (catsRes.ok) {
      const data = await catsRes.json();
      categoryRoutes = (data.categories || []).map(
        (cat: { slug: string }) => ({
          url: `${SITE_URL}/blog/category/${cat.slug}`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.5,
        }),
      );
    }
  } catch {
    /* skip */
  }

  return [...staticRoutes, ...blogRoutes, ...categoryRoutes];
}
