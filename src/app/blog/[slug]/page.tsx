import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BLOG_POSTS, getPostBySlug } from '@/content/blog-posts';

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: 'Journal — Orbstera' };
  return {
    title: `${post.title} — Orbstera Journal`,
    description: post.excerpt,
  };
}

export default function BlogArticlePage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-[#FDFCF9] text-neutral-900">
      <Navbar />
      <article className="mx-auto max-w-2xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
        <Link
          href="/blog"
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary hover:underline"
        >
          Journal
        </Link>
        <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400">
          {post.date} · {post.readMinutes} min read
        </p>
        <h1
          className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-4xl"
          style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
        >
          {post.title}
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-neutral-600">{post.excerpt}</p>
        <div className="mt-12 space-y-6 border-t border-neutral-200/90 pt-12">
          {post.body.map((para, i) => (
            <p key={i} className="text-[15px] leading-[1.75] text-neutral-700">
              {para}
            </p>
          ))}
        </div>
        <div className="mt-16 border-t border-neutral-200/90 pt-10">
          <Link href="/blog" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Back to all articles
          </Link>
        </div>
      </article>
      <Footer />
    </div>
  );
}
