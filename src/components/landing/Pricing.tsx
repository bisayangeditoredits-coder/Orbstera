"use client";

import { Check, X, Crown, Zap, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: null,
    description: 'Start building presentations instantly — no credit card required.',
    badge: null,
    icon: <Sparkles size={20} className="text-white/40" />,
    features: [
      { text: '3 AI-generated presentations per month', included: true },
      { text: 'Maximum 5 slides per presentation', included: true },
      { text: 'Standard AI model (Llama 3.3)', included: true },
      { text: 'PPTX export with watermark', included: true },
      { text: 'Basic slide templates', included: true },
      { text: 'Voice Protocol (Hands-free generation)', included: true },
      { text: 'AI Magic Edit (inline editing)', included: false },
      { text: 'Fast & Elite AI intelligence modes', included: false },
      { text: 'Claude 3.5 Sonnet / DeepSeek R1', included: false },
    ],
    buttonText: 'Get Started Free',
    href: '/login',
    popular: false,
    planId: 'free',
  },
  {
    name: 'Student Pro',
    price: '$5',
    period: '/month',
    description: 'The best value for students, freelancers & emerging creators who need real power.',
    badge: 'Most Popular',
    icon: <Crown size={20} className="text-amber-400" />,
    features: [
      { text: '30 AI presentations per month', included: true },
      { text: 'Up to 25 slides per presentation', included: true },
      { text: 'Elite AI model (Claude 3.5 Sonnet)', included: true },
      { text: 'PPTX export — no watermark', included: true },
      { text: 'All premium templates & themes', included: true },
      { text: 'AI Magic Edit (inline text editing)', included: true },
      { text: 'Fast & Elite intelligence modes', included: true },
      { text: 'Priority generation speed', included: true },
    ],
    buttonText: 'Upgrade Now',
    href: '#',
    popular: true,
    planId: 'student_pro',
  },
  {
    name: 'Creator Pro',
    price: '$19',
    period: '/month',
    description: 'Built for agencies, teachers & power users who live and breathe presentations.',
    badge: 'Best Value',
    icon: <Zap size={20} className="text-purple-400" />,
    features: [
      { text: '100 AI presentations per month', included: true },
      { text: 'Up to 40 slides per presentation', included: true },
      { text: 'Elite AI: Claude 3.5 + DeepSeek R1', included: true },
      { text: 'PPTX export — no watermark, custom branding', included: true },
      { text: 'All templates + cinematic AI images', included: true },
      { text: 'AI Magic Edit (inline text editing)', included: true },
      { text: 'All 3 intelligence modes unlocked', included: true },
      { text: 'Priority support', included: true },
    ],
    buttonText: 'Upgrade Now',
    href: '#',
    popular: false,
    planId: 'creator_pro',
  },
];

export function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (tier: any) => {
    if (tier.planId === 'free') return;
    
    // Check if user is logged in (you can also pass user as a prop to this component)
    setLoading(tier.planId);
    try {
      const res = await fetch('/api/dodo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: tier.planId }),
      });
      
      if (res.status === 401) {
        window.location.href = '/login?next=#pricing';
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Checkout failed');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert('Checkout error: ' + (err.message || 'Network error or server is down'));
    } finally {
      setLoading(null);
    }
  };

  return (
    <section id="pricing" className="w-full py-32 px-6 bg-[#F8FAFC] text-slate-900 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-black mb-6 text-slate-900">Fair Pricing, Real Power.</h2>
          <p className="text-slate-500 text-lg">Choose the plan that fits your vision.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier, i) => (
            <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-xl font-bold mb-4">{tier.name}</h3>
              <div className="text-4xl font-black mb-6">{tier.price}<span className="text-sm text-slate-400">{tier.period}</span></div>
              <ul className="space-y-4 mb-8 flex-1">
                {tier.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-slate-600">
                    {f.included ? <Check size={16} className="text-green-500" /> : <X size={16} className="text-slate-300" />}
                    {f.text}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => tier.planId === 'free' ? window.location.href = tier.href : handleCheckout(tier)}
                disabled={loading === tier.planId}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-colors"
              >
                {loading === tier.planId ? 'Loading...' : tier.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
