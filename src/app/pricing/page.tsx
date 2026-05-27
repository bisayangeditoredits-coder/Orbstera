// Navbar removed
import { Pricing } from '@/components/landing/Pricing';

export const metadata = {
  title: 'Pricing — Orbstera',
  description: 'Fair, student-friendly pricing for AI-powered presentations. Start free, upgrade when you need more power.',
};

export default function PricingPage() {
  return (
    <div className="min-h-dvh bg-background w-full max-w-[100vw] overflow-x-clip">
      {/* Navbar removed */}
      <main className="pt-8 sm:pt-12 px-3 sm:px-4 w-full min-w-0">
        <Pricing />
      </main>
    </div>
  );
}
