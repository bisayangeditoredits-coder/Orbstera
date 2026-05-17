"use client";

import { Check, X, Crown, Zap, Sparkles, ArrowRight, ShieldCheck, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase';

const tiers = [
  {
    name: 'Free',
    prices: { USD: '$0', PHP: '₱0' },
    period: null,
    description: 'Start building presentations instantly — no credit card required.',
    badge: null,
    icon: "/3d_icons/Pencil.png",
    features: [
      { text: '~100 credits/month (~1 small AI deck)', included: true },
      { text: 'Maximum 5 slides per presentation', included: true },
      { text: 'Automatic cinematic layout & motion', included: true },
      { text: 'PPTX export with watermark', included: true },
      { text: 'Basic slide templates', included: true },
      { text: 'Voice Protocol (Hands-free generation)', included: true },
      { text: 'AI Magic Edit (inline editing)', included: false },
      { text: 'Higher monthly generation limits', included: false },
      { text: 'Longer decks (25+ slides)', included: false },
    ],
    href: '/login',
    popular: false,
    planId: 'free',
  },
  {
    name: 'Student Pro',
    prices: { USD: '$5', PHP: '₱285' },
    period: '/month',
    description: 'The best value for students, freelancers & emerging creators who need real power.',
    badge: 'Most Popular',
    icon: "/3d_icons/Graduation Hat.png",
    features: [
      { text: '~1,400 credits/month (~10 AI decks with imagery)', included: true },
      { text: 'Up to 25 slides per presentation', included: true },
      { text: 'Premium automatic AI orchestration', included: true },
      { text: 'PPTX export — no watermark', included: true },
      { text: 'All premium templates & themes', included: true },
      { text: 'AI Magic Edit (inline text editing)', included: true },
      { text: 'Cinematic slide imagery generated in the background', included: true },
      { text: 'Priority generation speed', included: true },
    ],
    href: '#',
    popular: true,
    planId: 'student_pro',
  },
  {
    name: 'Creator Pro',
    prices: { USD: '$19', PHP: '₱1,080' },
    period: '/month',
    description: 'Built for agencies, teachers & power users who live and breathe presentations.',
    badge: 'Best Value',
    icon: "/3d_icons/Trophy.png",
    features: [
      { text: '~5,500 credits/month (~23 premium Creator decks)', included: true },
      { text: 'Up to 40 slides per presentation', included: true },
      { text: 'Maximum quality automatic orchestration', included: true },
      { text: 'PPTX export — no watermark, custom branding', included: true },
      { text: 'All templates + cinematic AI images', included: true },
      { text: 'AI Magic Edit (inline text editing)', included: true },
      { text: 'Highest priority rendering queue', included: true },
      { text: 'Priority support', included: true },
    ],
    href: '#',
    popular: false,
    planId: 'creator_pro',
  },
];

export function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'PHP'>('USD');
  const [currentPlan, setCurrentPlan] = useState<string>('free');

  useEffect(() => {
    async function fetchUserPlan() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
          if (profile?.plan) {
            setCurrentPlan(profile.plan.toLowerCase());
          }
        }
      } catch (err) {
        console.error('Error fetching plan', err);
      }
    }
    fetchUserPlan();
  }, []);

  const handleCheckout = async (tier: any) => {
    if (tier.planId === 'free') return;
    
    setLoading(tier.planId);
    try {
      const res = await fetch('/api/dodo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: tier.planId }),
      });
      
      if (res.status === 401) {
        window.location.href = '/login?next=/pricing';
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
    <section id="pricing" className="w-full py-16 sm:py-24 md:py-32 px-4 sm:px-6 bg-[#F8FAFC] text-slate-900 relative overflow-x-clip">
      {/* Background */}
      <div 
        className="absolute top-0 left-0 right-0 h-full z-0 pointer-events-none overflow-hidden"
        style={{ 
          maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)', 
          WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' 
        }}
      >
        <div className="absolute inset-0 md:hidden bg-gradient-to-br from-[#E8F4FF] via-[#F8FAFC] to-white" aria-hidden />
        <div className="absolute inset-0 w-full h-full opacity-60 mix-blend-multiply hidden md:block">
           {/* @ts-ignore */}
           <lottie-player
             src="/Background gradient.json"
             background="transparent"
             speed="0.5"
             style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.1)' }}
             loop
             autoplay
             preserveAspectRatio="xMidYMid slice"
           />
        </div>
      </div>
      <div className="max-w-7xl mx-auto relative z-10 w-full min-w-0">
        <div className="text-center mb-12 sm:mb-20 px-1">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 sm:mb-6 text-slate-900 text-balance">Fair Pricing, Real Power.</h2>
          <p className="text-slate-500 text-base sm:text-lg mb-8">Choose the plan that fits your vision.</p>
          
          {/* Currency Toggle */}
          <div className="inline-flex items-center gap-1 bg-white border border-slate-200 p-1.5 rounded-full shadow-sm">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${currency === 'USD' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('PHP')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${currency === 'PHP' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              PHP (₱)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
          {tiers.map((tier, i) => {
            const isCurrentPlan = currentPlan === tier.planId;
            const displayPrice = tier.prices[currency];

            return (
              <div key={i} className={`bg-white p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] border ${isCurrentPlan ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'} shadow-sm flex flex-col min-w-0 relative overflow-hidden`}>
                
                {isCurrentPlan && (
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-primary" />
                )}

                <div className="mb-8 flex justify-between items-start">
                  <div className="w-24 h-24 rounded-[32px] bg-white/40 backdrop-blur-xl border border-white/60 flex items-center justify-center p-4 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] relative group/icon overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent pointer-events-none" />
                    <img 
                      src={tier.icon} 
                      alt={tier.name} 
                      className="w-full h-full object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.12)] relative z-10 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3" 
                    />
                  </div>
                  {tier.badge && !isCurrentPlan && (
                    <span className="text-[10px] uppercase tracking-widest font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                      {tier.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold mb-2">
                  {tier.name}
                </h3>
                
                <div className="text-4xl font-black mb-6">
                  {displayPrice}<span className="text-sm text-slate-400">{tier.period}</span>
                </div>
                
                <ul className="space-y-4 mb-8 flex-1">
                  {tier.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-600">
                      {f.included ? <Check size={16} className="text-green-500" /> : <X size={16} className="text-slate-300" />}
                      {f.text}
                    </li>
                  ))}
                </ul>
                
                {isCurrentPlan ? (
                  <button 
                    disabled
                    className="w-full py-4 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl font-bold flex items-center justify-center gap-2"
                  >
                    <ShieldCheck size={18} />
                    Your Current Plan
                  </button>
                ) : (
                  <button 
                    onClick={() => tier.planId === 'free' ? window.location.href = tier.href : handleCheckout(tier)}
                    disabled={loading === tier.planId}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-colors"
                  >
                    {loading === tier.planId ? 'Loading...' : tier.planId === 'free' ? 'Get Started Free' : 'Upgrade Now'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
