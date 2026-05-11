import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export const metadata = {
  title: 'About — Orbstera',
  description: 'Orbstera builds cinematic, AI-native presentation workflows for teams who ship narratives, not templates.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FDFCF9] text-neutral-900">
      <Navbar />
      <main>
        <section className="border-b border-neutral-200/80 bg-gradient-to-b from-white to-[#FDFCF9] px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Company</p>
            <h1
              className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-5xl"
              style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
            >
              We believe decks should feel inevitable, not improvised.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-neutral-600">
              Orbstera is a presentation studio in software form: structure, motion, and imagery orchestrated around
              your story—so you spend time on what you will say in the room, not on wrestling layouts.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl space-y-12 px-5 py-16 sm:px-8 sm:py-24">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-neutral-950">Mission</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
              Give every builder, founder, and creative director a faster path from idea to a deck that matches the
              ambition of the product behind it—without flattening taste into generic slides.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-neutral-950">Principles</h2>
            <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-neutral-600">
              <li className="border-l-2 border-primary/30 pl-4">Narrative before decoration.</li>
              <li className="border-l-2 border-primary/30 pl-4">Motion that respects attention.</li>
              <li className="border-l-2 border-primary/30 pl-4">Your voice, amplified—not replaced.</li>
            </ul>
          </div>
          <div className="border border-neutral-200 bg-white p-8">
            <h2 className="text-xl font-semibold tracking-tight text-neutral-950">Build with us</h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              Ready to try the editor? Start from a single prompt or refine an existing deck in{' '}
              <Link href="/editor" className="font-medium text-primary underline-offset-4 hover:underline">
                the studio
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
