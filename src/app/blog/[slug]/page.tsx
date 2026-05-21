import { notFound } from 'next/navigation';
import { Footer } from '@/components/layout/Footer';
import { BlogArticle } from '@/components/blog/BlogArticle';
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
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      images: [{ url: post.image, alt: post.imageAlt }],
    },
  };
}

export default function BlogArticlePage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <div className="min-h-dvh bg-[#FAFAF8] text-neutral-900">
      <BlogArticle post={post} />
      <Footer />
    </div>
  );
}
