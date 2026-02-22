import Link from "next/link";

interface BlogCardProps {
  title: string;
  slug: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  category_name?: string | null;
  category_slug?: string | null;
  published_at?: string | null;
  tags?: string[];
}

export default function BlogCard({
  title,
  slug,
  excerpt,
  cover_image_url,
  category_name,
  category_slug,
  published_at,
}: BlogCardProps) {
  const formattedDate = published_at
    ? new Date(published_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Link
      href={`/blog/${slug}`}
      className="group block rounded-2xl overflow-hidden border border-[#e8e5df] bg-white hover:shadow-lg hover:border-[#c4a67d]/30 transition-all duration-300"
    >
      {/* Cover image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#f7f7f5]">
        {cover_image_url ? (
          <img
            src={cover_image_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#e8e5df"
              strokeWidth="1"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        {category_name && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[11px] font-semibold text-[#8b7355] tracking-wide uppercase">
            {category_name}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6">
        {formattedDate && (
          <p className="text-[11px] font-medium text-[#8c8c8c] tracking-wide uppercase mb-2">
            {formattedDate}
          </p>
        )}
        <h3 className="font-display font-bold text-[#0a0a0a] text-[17px] sm:text-[19px] tracking-tight leading-snug group-hover:text-[#8b7355] transition-colors duration-200 line-clamp-2">
          {title}
        </h3>
        {excerpt && (
          <p className="mt-2.5 text-[#8c8c8c] text-[14px] leading-relaxed line-clamp-2">
            {excerpt}
          </p>
        )}
        <div className="mt-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#8b7355] group-hover:gap-2.5 transition-all duration-200">
          Read Article
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
