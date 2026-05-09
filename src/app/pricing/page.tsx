import { Navbar } from '@/components/layout/Navbar';
import { Pricing } from '@/components/landing/Pricing';

export const metadata = {
  title: 'Pricing — Orvixes AI',
  description: 'Fair, student-friendly pricing for AI-powered presentations. Start free, upgrade when you need more power.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#030303]">
      <Navbar />
      <main className="pt-24">
        <Pricing />
      </main>
    </div>
  );
}
