import { Footer } from '@/components/layout/Footer';
import { BlogIndex } from '@/components/blog/BlogIndex';

export const metadata = {
  title: 'Journal — Orbstera',
  description:
    'Essays on narrative, motion, and presentation craft from the Orbstera team.',
  openGraph: {
    title: 'Orbstera Journal',
    description: 'Ideas for decks that win the room.',
    type: 'website',
  },
};

export default function BlogPage() {
  return (
    <div className="min-h-dvh bg-[#FAFAF8] text-neutral-900">
      <BlogIndex />
      <Footer />
    </div>
  );
}
