import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export const metadata = {
  title: 'Privacy Policy — Orbstera',
  description: 'How Orbstera handles your data when you use our presentation platform.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FDFCF9] text-neutral-900">
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
        <h1
          className="text-3xl font-semibold tracking-tight text-neutral-950"
          style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
        >
          Privacy policy
        </h1>
        <p className="mt-2 text-sm text-neutral-500">Last updated: May 11, 2026</p>
        <div className="mt-12 space-y-6 text-sm leading-relaxed text-neutral-600">
          <p>
            Orbstera (&quot;we&quot;, &quot;us&quot;) provides an AI-assisted presentation product. This page summarizes how we treat
            information you provide when you use the website and editor. For legal certainty in your jurisdiction,
            contact us and we will provide the full policy your counsel may require.
          </p>
          <p>
            <strong className="text-neutral-900">Account &amp; authentication.</strong> If you sign in with email or a
            social provider, our authentication partner (Supabase) processes credentials according to their terms. We
            store profile and usage metadata needed to run subscriptions and quotas.
          </p>
          <p>
            <strong className="text-neutral-900">Content you create.</strong> Presentations you save may be stored in
            your configured cloud storage (for example Cloudflare R2) under your account namespace. We do not sell your
            slide content to third parties.
          </p>
          <p>
            <strong className="text-neutral-900">AI providers.</strong> When you use generation features, prompts and
            context are sent to model providers (such as OpenRouter and connected model hosts) under their respective
            policies. Do not submit secrets or regulated health or financial data you are not permitted to share.
          </p>
          <p>
            <strong className="text-neutral-900">Contact.</strong>{' '}
            <Link href="/contact" className="font-medium text-primary underline-offset-4 hover:underline">
              Contact us
            </Link>{' '}
            for data requests or deletion where applicable.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
