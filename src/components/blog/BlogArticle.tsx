import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock } from '@/components/icons/lucide';
import type { BlogPost } from '@/content/blog-posts';
import { BLOG_POSTS, formatBlogDate } from '@/content/blog-posts';
import { BlogImage } from './BlogImage';
import { BlogCard } from './BlogCard';

export function BlogArticle({ post }: { post: BlogPost }) {
  const others = BLOG_POSTS.filter((p) => p.slug !== post.slug)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 2);

  return (
    <>
      <header className="relative min-h-[52vh] sm:min-h-[58vh] overflow-hidden bg-neutral-950">
        <BlogImage
          src={post.image}
          alt={post.imageAlt}
          priority
          sizes="100vw"
          className="opacity-90"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-neutral-950/20"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-neutral-950/80 via-transparent to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto flex h-full min-h-[52vh] sm:min-h-[58vh] max-w-4xl flex-col justify-end px-5 pb-12 pt-28 sm:px-8 sm:pb-16 sm:pt-32">
          <Link
            href="/blog"
            className="mb-8 inline-flex w-fit items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur-md transition hover:bg-white/20"
          >
            <ArrowLeft size={14} />
            Journal
          </Link>
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-300">
            {post.category}
          </span>
          <h1
            className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl lg:leading-[1.1]"
            style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
          >
            {post.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
            {post.excerpt}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-[13px] text-white/60">
            <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} />
              {post.readMinutes} min read
            </span>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-5 py-14 sm:px-8 sm:py-16 lg:py-20">
        <div className="space-y-7">
          {post.body.map((para, i) => (
            <p
              key={i}
              className="text-[17px] leading-[1.8] text-neutral-700 first:text-xl first:leading-relaxed first:text-neutral-800 first:font-medium"
            >
              {para}
            </p>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-3 border-t border-neutral-200/90 pt-10">
          <Link
            href="/editor"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover"
          >
            Try Orbstera
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            All articles
          </Link>
        </div>
      </article>

      {others.length > 0 && (
        <section className="border-t border-neutral-200/80 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
            <h2
              className="mb-8 text-xl font-semibold tracking-tight text-neutral-900"
              style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
            >
              Continue reading
            </h2>
            <div className="grid gap-8 sm:grid-cols-2">
              {others.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
