import { Navbar } from '@/components/layout/Navbar';
import { Pricing } from '@/components/landing/Pricing';

export const metadata = {
  title: 'Pricing — Orbstera',
  description: 'Fair, student-friendly pricing for AI-powered presentations. Start free, upgrade when you need more power.',
};

export default function PricingPage() {
  return (
    <div className="min-h-dvh bg-background w-full max-w-[100vw] overflow-x-clip">
      <Navbar />
      <main className="pt-[max(5.5rem,env(safe-area-inset-top)+4.5rem)] sm:pt-24 px-3 sm:px-4 w-full min-w-0">
        <Pricing />
      </main>
    </div>
  );
}
