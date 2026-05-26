import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { BlogPost } from '@/content/blog-posts';
import { formatBlogDate } from '@/content/blog-posts';
import { BlogImage } from './BlogImage';
import { cn } from '@/lib/cn';

export function BlogFeaturedCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group relative grid overflow-hidden rounded-lg border border-neutral-200/80 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.22)] transition-shadow duration-300 hover:shadow-[0_32px_70px_-24px_rgba(15,23,42,0.28)] lg:grid-cols-[1.15fr_1fr] min-h-[420px] lg:min-h-[480px]"
    >
      <div className="relative min-h-[260px] lg:min-h-full overflow-hidden">
        <BlogImage
          src={post.image}
          alt={post.imageAlt}
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-black/5 lg:to-black/40"
          aria-hidden
        />
        <span className="absolute left-4 top-4 rounded-md bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-800 shadow-sm">
          Featured
        </span>
      </div>

      <div className="flex flex-col justify-center p-8 lg:p-10 xl:p-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          {post.category}
        </p>
        <h2
          className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl lg:text-[2rem] lg:leading-[1.15] group-hover:text-primary transition-colors"
          style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
        >
          {post.title}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-neutral-600 line-clamp-3">
          {post.excerpt}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4 text-[12px] text-neutral-500">
          <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
          <span aria-hidden>Â·</span>
          <span>{post.readMinutes} min read</span>
        </div>
        <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
          Read story
          <ArrowUpRight
            size={16}
            className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </span>
      </div>
    </Link>
  );
}

export function BlogCard({ post, variant = 'default' }: { post: BlogPost; variant?: 'default' | 'wide' }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border border-neutral-200/80 bg-white transition-all duration-300',
        'hover:border-primary/25 hover:shadow-[0_20px_50px_-28px_rgba(59,130,246,0.35)]',
        variant === 'wide' && 'sm:flex-row sm:min-h-[220px]',
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden',
          variant === 'wide' ? 'sm:w-[42%] min-h-[200px] sm:min-h-full' : 'aspect-[16/10]',
        )}
      >
        <BlogImage
          src={post.image}
          alt={post.imageAlt}
          sizes={variant === 'wide' ? '(max-width: 640px) 100vw, 40vw' : '(max-width: 768px) 100vw, 33vw'}
          className="transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `linear-gradient(135deg, ${post.accent[0]}88, ${post.accent[2]}44)`,
          }}
          aria-hidden
        />
        <span className="absolute left-3 top-3 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
          {post.category}
        </span>
      </div>

      <div className={cn('flex flex-1 flex-col p-6', variant === 'wide' && 'sm:justify-center sm:p-8')}>
        <time
          dateTime={post.date}
          className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400"
        >
          {formatBlogDate(post.date)} Â· {post.readMinutes} min
        </time>
        <h3
          className="mt-2 text-lg font-semibold tracking-tight text-neutral-950 group-hover:text-primary transition-colors sm:text-xl"
          style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
        >
          {post.title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-600 line-clamp-2 sm:line-clamp-3">
          {post.excerpt}
        </p>
        <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
          Read
          <ArrowUpRight size={14} className="opacity-70 group-hover:opacity-100" />
        </span>
      </div>
    </Link>
  );
}
