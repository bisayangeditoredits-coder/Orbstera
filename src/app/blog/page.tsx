import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BLOG_POSTS } from '@/content/blog-posts';

export const metadata = {
  title: 'Journal — Orbstera',
  description: 'Notes on narrative, motion, and building presentation software that respects your taste.',
};

export default function BlogPage() {
  const sorted = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="min-h-screen bg-[#FDFCF9] text-neutral-900">
      <Navbar />
      <main className="mx-auto max-w-4xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
        <header className="mb-16 border-b border-neutral-200/80 pb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Journal</p>
          <h1
            className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-neutral-950"
            style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
          >
            Writing on decks, delivery, and craft
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-600">
            Practical essays from the Orbstera team—how we think about structure, visuals, and the future of
            presentation software.
          </p>
        </header>

        <ul className="divide-y divide-neutral-200/90 border-t border-neutral-200/90">
          {sorted.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block py-10 transition hover:bg-white/60"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400">
                  {post.date} · {post.readMinutes} min read
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-950 group-hover:text-primary">
                  {post.title}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">{post.excerpt}</p>
                <span className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 group-hover:underline">
                  Read article
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
