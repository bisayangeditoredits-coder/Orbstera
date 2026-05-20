import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';

export const metadata = {
  title: 'Refund Policy — Orbstera',
  description: 'Learn about Orbstera\'s refund policy for paid subscriptions.',
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-[#FDFCF9] text-neutral-900">
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
        <h1
          className="text-3xl font-semibold tracking-tight text-neutral-950"
          style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
        >
          Refund policy
        </h1>
        <p className="mt-2 text-sm text-neutral-500">Last updated: May 20, 2026</p>
        <div className="mt-12 space-y-6 text-sm leading-relaxed text-neutral-600">
          <p>
            At Orbstera, we want to ensure you are fully satisfied with our AI-powered presentation platform. 
            Because we use non-refundable third-party AI resources to generate slides, we handle refunds on a case-by-case basis.
          </p>
          <p>
            <strong className="text-neutral-900">14-Day Money-Back Guarantee.</strong> If you are unsatisfied with Orbstera for any reason, you may request a full refund within 14 days of your initial purchase, provided you have not generated more than 3 presentations on your account.
          </p>
          <p>
            <strong className="text-neutral-900">EU & UK Consumer Rights.</strong> If you reside in the European Union or the United Kingdom, you have a statutory right to cancel your subscription and request a refund within 14 days of purchase under local consumer protection laws. However, you agree that by generating presentations using our AI tools immediately after purchase, you are requesting immediate access to digital content, which may limit your right to a full refund if the service has been used.
          </p>
          <p>
            <strong className="text-neutral-900">How to request a refund.</strong> To request a refund, please contact us with your account email address and transaction details. We will process eligible refunds within 5-10 business days back to your original payment method.
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
