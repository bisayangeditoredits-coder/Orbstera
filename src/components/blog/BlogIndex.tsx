import Link from 'next/link';
import { ArrowRight, Sparkles } from '@/components/icons/lucide';
import { BLOG_POSTS } from '@/content/blog-posts';
import { BlogFeaturedCard, BlogCard } from './BlogCard';

export function BlogIndex() {
  const sorted = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
  const [featured, ...rest] = sorted;

  return (
    <>
      <section className="relative overflow-hidden border-b border-neutral-200/70">
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(59,130,246,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(14,165,233,0.12), transparent 50%)',
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-28 sm:px-8 sm:pb-20 sm:pt-32 lg:pt-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-primary/15 bg-primary/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <Sparkles size={14} strokeWidth={2} />
              Orbstera Journal
            </div>
            <h1
              className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]"
              style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
            >
              Ideas for decks that
              <span className="block text-primary">win the room</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg">
              Essays on narrative, motion, and building presentation software that respects your taste—written by the team behind Orbstera.
            </p>
            <Link
              href="/editor"
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(59,130,246,0.55)] transition hover:bg-primaryHover"
            >
              Start creating
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-16 lg:py-20">
        {featured && (
          <div className="mb-14 lg:mb-16">
            <BlogFeaturedCard post={featured} />
          </div>
        )}

        {rest.length > 0 && (
          <>
            <div className="mb-8 flex items-end justify-between gap-4 border-b border-neutral-200/80 pb-4">
              <h2
                className="text-xl font-semibold tracking-tight text-neutral-900"
                style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
              >
                Latest stories
              </h2>
              <span className="text-[12px] font-medium text-neutral-500">{sorted.length} articles</span>
            </div>
            <div className="grid gap-8 sm:grid-cols-2">
              {rest.map((post) => (
                <BlogCard key={post.slug} post={post} />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="border-t border-neutral-200/80 bg-neutral-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-center sm:px-8 sm:py-16">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/90">Ready when you are</p>
            <p className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              Turn your next idea into a keynote-ready deck
            </p>
          </div>
          <Link
            href="/editor"
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
          >
            Open editor
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
