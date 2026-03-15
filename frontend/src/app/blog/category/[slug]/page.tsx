import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import BlogCard from "@/components/blog/BlogCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";

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
  description?: string;
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

async function getPostsByCategory(categorySlug: string, page = 1) {
  try {
    const res = await fetch(
      `${API_BASE}/blog/posts?category=${categorySlug}&page=${page}&limit=12`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return { posts: [], total: 0, total_pages: 1 };
    return res.json();
  } catch {
    return { posts: [], total: 0, total_pages: 1 };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  const name = category?.name || slug;

  return {
    title: `${name} — SoraiPixel Blog`,
    description: category?.description || `Browse articles about ${name} on the SoraiPixel blog.`,
    alternates: { canonical: `${SITE_URL}/blog/category/${slug}` },
    openGraph: {
      title: `${name} — SoraiPixel Blog`,
      description: category?.description || `Articles about ${name}`,
      url: `${SITE_URL}/blog/category/${slug}`,
      siteName: "SoraiPixel",
      type: "website",
    },
  };
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = parseInt(sp.page || "1", 10);

  const [categories, postsData] = await Promise.all([
    getCategories(),
    getPostsByCategory(slug, page),
  ]);

  const category = categories.find((c) => c.slug === slug);
  const { posts, total_pages } = postsData as {
    posts: BlogPost[];
    total_pages: number;
  };

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <header className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 lg:px-12">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center">
              <Logo className="text-lg" />
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/blog"
                className="text-[13px] font-medium text-[#4a4a4a] hover:text-[#0a0a0a] transition-colors"
              >
                All Posts
              </Link>
              <Link
                href="/jewelry"
                className="px-5 py-2 bg-[#0a0a0a] text-white text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all"
              >
                Start Creating
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-5 md:px-8 lg:px-12 py-12 md:py-20">
        <div className="text-center mb-10 md:mb-14">
          <Link
            href="/blog"
            className="text-[11px] font-semibold text-[#8b7355] tracking-[0.12em] uppercase mb-3 inline-block hover:underline"
          >
            &larr; Back to Blog
          </Link>
          <h1 className="font-display font-bold text-[#0a0a0a] uppercase tracking-[-0.02em] text-[2rem] sm:text-[2.75rem] leading-[0.95]">
            {category?.name || slug}
          </h1>
          {category?.description && (
            <p className="mt-4 text-[#8c8c8c] text-[15px] max-w-lg mx-auto leading-relaxed">
              {category.description}
            </p>
          )}
        </div>

        {/* Category nav */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <Link
              href="/blog"
              className="px-4 py-2 text-[13px] font-medium text-[#4a4a4a] rounded-full hover:bg-[#0a0a0a]/5 transition-colors"
            >
              All
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/blog/category/${cat.slug}`}
                className={`px-4 py-2 text-[13px] font-semibold rounded-full transition-colors ${
                  cat.slug === slug
                    ? "text-[#0a0a0a] bg-[#0a0a0a]/5"
                    : "text-[#4a4a4a] hover:bg-[#0a0a0a]/5"
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

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
            <p className="text-[#8c8c8c] text-lg">
              No posts in this category yet.
            </p>
            <Link
              href="/blog"
              className="inline-flex mt-4 text-[#8b7355] text-sm font-semibold hover:underline"
            >
              Browse all posts
            </Link>
          </div>
        )}

        {total_pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-12">
            {page > 1 && (
              <Link
                href={`/blog/category/${slug}?page=${page - 1}`}
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
                href={`/blog/category/${slug}?page=${page + 1}`}
                className="px-5 py-2.5 bg-[#0a0a0a] text-white text-[13px] font-semibold rounded-full hover:bg-[#1a1a1a] transition-all"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
