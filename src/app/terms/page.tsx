import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export const metadata = {
  title: 'Terms of Service — Orbstera',
  description: 'Terms governing use of the Orbstera presentation platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FDFCF9] text-neutral-900">
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
        <h1
          className="text-3xl font-semibold tracking-tight text-neutral-950"
          style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
        >
          Terms of service
        </h1>
        <p className="mt-2 text-sm text-neutral-500">Last updated: May 11, 2026</p>
        <div className="mt-12 space-y-6 text-sm leading-relaxed text-neutral-600">
          <p>
            By accessing Orbstera you agree to use the service lawfully, respect third-party rights in materials you
            upload, and follow usage limits associated with your plan. We may update product behavior and these terms;
            continued use after changes constitutes acceptance where permitted by law.
          </p>
          <p>
            <strong className="text-neutral-900">Service availability.</strong> We strive for high uptime but do not
            guarantee uninterrupted access. AI features depend on external providers and may degrade or change without
            notice.
          </p>
          <p>
            <strong className="text-neutral-900">Acceptable use.</strong> You may not attempt to break, overload, or
            reverse engineer the service; scrape other users&apos; data; or use the product to generate unlawful or
            infringing content.
          </p>
          <p>
            <strong className="text-neutral-900">Billing.</strong> Paid plans are billed according to the checkout flow
            you complete with our payment processor. Cancellations and refunds follow the processor&apos;s rules and any
            offer terms shown at purchase.
          </p>
          <p>
            Questions?{' '}
            <Link href="/contact" className="font-medium text-primary underline-offset-4 hover:underline">
              Contact us
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
