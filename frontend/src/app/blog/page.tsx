import type { Metadata } from "next";
import Link from "next/link";
import BlogCard from "@/components/blog/BlogCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sorapixel.com";

export const metadata: Metadata = {
  title: "Blog — SoraPixel | AI Jewelry Photography Tips & Guides",
  description:
    "Expert tips on jewelry photography, e-commerce product imagery, and AI-powered photo editing. Learn how to create studio-quality jewelry photos.",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: "Blog — SoraPixel",
    description: "Expert tips on jewelry photography and AI-powered product imagery.",
    url: `${SITE_URL}/blog`,
    siteName: "SoraPixel",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  cover_image_url?: string;
  category_id?: string;
  tags?: string[];
  published_at?: string;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

async function getPosts(page = 1) {
  try {
    const res = await fetch(`${API_BASE}/blog/posts?page=${page}&limit=12`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { posts: [], total: 0, total_pages: 1 };
    return res.json();
  } catch {
    return { posts: [], total: 0, total_pages: 1 };
  }
}

async function getCategories(): Promise<BlogCategory[]> {
  try {
    const res = await fetch(`${API_BASE}/blog/categories`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.categories || [];
  } catch {
    return [];
  }
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const [postsData, categories] = await Promise.all([getPosts(page), getCategories()]);
  const { posts, total_pages } = postsData as {
    posts: BlogPost[];
    total_pages: number;
  };

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      {/* Header */}
      <header className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 lg:px-12">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0a0a0a] flex items-center justify-center">
                <span className="text-white text-xs font-bold">SP</span>
              </div>
              <span className="font-display font-bold text-[15px] tracking-tight text-[#0a0a0a]">
                SoraPixel
              </span>
            </Link>
            <Link
              href="/jewelry"
              className="px-5 py-2 bg-[#0a0a0a] text-white text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all"
            >
              Start Creating
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-5 md:px-8 lg:px-12 py-12 md:py-20">
        {/* Page title */}
        <div className="text-center mb-10 md:mb-14">
          <span className="text-[11px] sm:text-xs font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 block">
            Our Blog
          </span>
          <h1 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[2rem] sm:text-[2.75rem] md:text-[3.5rem] leading-[0.95]">
            Jewelry Photography
            <br />
            <span className="text-[#8b7355]">Tips & Guides</span>
          </h1>
          <p className="mt-4 text-[#8c8c8c] text-[15px] max-w-lg mx-auto leading-relaxed">
            Expert insights on product photography, e-commerce imagery, and leveraging AI to create stunning visuals for your jewelry brand.
          </p>
        </div>

        {/* Category filters */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <Link
              href="/blog"
              className="px-4 py-2 text-[13px] font-semibold text-[#0a0a0a] bg-[#0a0a0a]/5 rounded-full hover:bg-[#0a0a0a]/10 transition-colors"
            >
              All
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/blog/category/${cat.slug}`}
                className="px-4 py-2 text-[13px] font-medium text-[#4a4a4a] rounded-full hover:bg-[#0a0a0a]/5 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        {/* Posts grid */}
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {posts.map((post: BlogPost) => {
              const cat = post.category_id ? categoryMap.get(post.category_id) : null;
              return (
                <BlogCard
                  key={post.id}
                  title={post.title}
                  slug={post.slug}
                  excerpt={post.excerpt}
                  cover_image_url={post.cover_image_url}
                  category_name={cat?.name}
                  category_slug={cat?.slug}
                  published_at={post.published_at}
                  tags={post.tags}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-[#8c8c8c] text-lg">No posts yet. Check back soon!</p>
          </div>
        )}

        {/* Pagination */}
        {total_pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-12">
            {page > 1 && (
              <Link
                href={`/blog?page=${page - 1}`}
                className="px-5 py-2.5 border border-[#e8e5df] text-[#4a4a4a] text-[13px] font-medium rounded-full hover:border-[#0a0a0a] hover:text-[#0a0a0a] transition-all"
              >
                Previous
              </Link>
            )}
            <span className="text-[13px] text-[#8c8c8c]">
              Page {page} of {total_pages}
            </span>
            {page < total_pages && (
              <Link
                href={`/blog?page=${page + 1}`}
                className="px-5 py-2.5 bg-[#0a0a0a] text-white text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <section className="bg-[#0a0a0a]">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 lg:px-12 py-16 md:py-20 text-center">
          <h2 className="font-display font-bold text-white uppercase tracking-[-0.02em] text-[1.5rem] sm:text-[2rem] leading-tight mb-4">
            Ready to Transform Your
            <br />
            <span className="text-[#c4a67d]">Jewelry Photography?</span>
          </h2>
          <p className="text-white/40 text-[14px] max-w-md mx-auto mb-8">
            Start creating studio-quality jewelry images with AI. No photographer needed.
          </p>
          <Link
            href="/jewelry"
            className="inline-flex px-8 py-3.5 bg-white text-[#0a0a0a] text-[14px] font-semibold rounded-full hover:bg-white/90 transition-all active:scale-[0.97]"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}
