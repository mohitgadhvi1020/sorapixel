import type { Metadata } from "next";
import Link from "next/link";
import BlogRenderer from "@/components/blog/BlogRenderer";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";

export const revalidate = 60;

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: Record<string, unknown> | null;
  excerpt?: string;
  cover_image_url?: string;
  category_id?: string;
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  published_at?: string;
  updated_at?: string;
  author_id?: string;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${API_BASE}/blog/posts/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post Not Found — SoraiPixel" };

  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || "";
  const ogImage = post.og_image_url || post.cover_image_url;

  return {
    title: `${title} — SoraiPixel Blog`,
    description,
    alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/blog/${post.slug}`,
      siteName: "SoraiPixel",
      type: "article",
      publishedTime: post.published_at || undefined,
      modifiedTime: post.updated_at || undefined,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, categories] = await Promise.all([getPost(slug), getCategories()]);

  if (!post) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display font-bold text-[#0a0a0a] text-2xl mb-4">Post Not Found</h1>
          <Link href="/blog" className="text-[#8b7355] font-semibold text-sm hover:underline">
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const category = post.category_id
    ? categories.find((c) => c.id === post.category_id)
    : null;

  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_description || post.excerpt || "",
    ...(post.cover_image_url ? { image: post.cover_image_url } : {}),
    datePublished: post.published_at || post.updated_at,
    dateModified: post.updated_at || post.published_at,
    url: `${SITE_URL}/blog/${post.slug}`,
    publisher: {
      "@type": "Organization",
      name: "SoraiPixel",
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`,
    },
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Minimal header */}
      <header className="bg-white border-b border-[#e8e5df]">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 lg:px-12">
          <div className="flex items-center justify-between py-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#0a0a0a] flex items-center justify-center">
                <span className="text-white text-xs font-bold">SP</span>
              </div>
              <span className="font-display font-bold text-[15px] tracking-tight text-[#0a0a0a]">
                SoraiPixel
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/blog"
                className="text-[13px] font-medium text-[#4a4a4a] hover:text-[#0a0a0a] transition-colors"
              >
                Blog
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

      {/* Cover image */}
      {post.cover_image_url && (
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 lg:px-12 pt-8">
          <div className="rounded-2xl overflow-hidden aspect-[21/9] bg-[#e8e5df]">
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Article */}
      <article className="max-w-[760px] mx-auto px-5 md:px-8 py-10 md:py-16">
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {category && (
            <Link
              href={`/blog/category/${category.slug}`}
              className="px-3 py-1 bg-[#f5f0e8] text-[#8b7355] text-[11px] font-semibold tracking-wide uppercase rounded-full hover:bg-[#ece4d6] transition-colors"
            >
              {category.name}
            </Link>
          )}
          {formattedDate && (
            <span className="text-[12px] text-[#8c8c8c]">{formattedDate}</span>
          )}
        </div>

        <h1 className="font-display font-bold text-[#0a0a0a] tracking-[-0.02em] text-[1.75rem] sm:text-[2.25rem] md:text-[2.75rem] leading-[1.1] mb-6">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="text-[#8c8c8c] text-[17px] leading-relaxed mb-10 border-l-2 border-[#8b7355] pl-5">
            {post.excerpt}
          </p>
        )}

        {/* Rendered content */}
        <BlogRenderer content={post.content} />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-12 pt-6 border-t border-[#e8e5df] flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 bg-[#f7f7f5] border border-[#e8e5df] text-[#8c8c8c] text-[12px] font-medium rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </article>

      {/* CTA */}
      <section className="bg-[#0a0a0a]">
        <div className="max-w-[760px] mx-auto px-5 md:px-8 py-16 text-center">
          <h2 className="font-display font-bold text-white uppercase tracking-[-0.02em] text-[1.5rem] sm:text-[2rem] leading-tight mb-4">
            Try SoraiPixel <span className="text-[#c4a67d]">Free</span>
          </h2>
          <p className="text-white/40 text-[14px] max-w-md mx-auto mb-6">
            Transform your jewelry photos into studio-quality images in seconds.
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
