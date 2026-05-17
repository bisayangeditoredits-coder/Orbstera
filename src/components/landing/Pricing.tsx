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

interface PricingProps {
  isStandalone?: boolean;
}

export function Pricing({ isStandalone = false }: PricingProps) {
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
    <section id="pricing" className={`w-full ${isStandalone ? 'py-4 sm:py-6 md:py-8' : 'py-16 sm:py-24 md:py-32'} px-4 sm:px-6 bg-[#F8FAFC] text-slate-900 relative overflow-x-clip`}>
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
        <div className={`text-center ${isStandalone ? 'mb-6 sm:mb-8' : 'mb-12 sm:mb-20'} px-1`}>
          <h2 className={`${isStandalone ? 'text-2xl sm:text-3xl md:text-4xl' : 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl'} font-black mb-2 sm:mb-3 text-slate-900 text-balance`}>Fair Pricing, Real Power.</h2>
          <p className={`text-slate-500 ${isStandalone ? 'text-xs sm:text-sm mb-4 sm:mb-6' : 'text-base sm:text-lg mb-8'}`}>Choose the plan that fits your vision.</p>
          
          {/* Currency Toggle */}
          <div className="inline-flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-full shadow-sm">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors ${currency === 'USD' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('PHP')}
              className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors ${currency === 'PHP' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
            >
              PHP (₱)
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-3 ${isStandalone ? 'gap-4 sm:gap-6' : 'gap-5 sm:gap-8'}`}>
          {tiers.map((tier, i) => {
            const isCurrentPlan = currentPlan === tier.planId;
            const displayPrice = tier.prices[currency];

            return (
              <div key={i} className={`bg-white ${isStandalone ? 'p-5 sm:p-6' : 'p-6 sm:p-8'} rounded-[24px] sm:rounded-[32px] border ${isCurrentPlan ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'} shadow-sm flex flex-col min-w-0 relative overflow-hidden`}>
                
                {isCurrentPlan && (
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-primary" />
                )}

                {tier.badge && !isCurrentPlan && (
                  <span className={`absolute ${isStandalone ? 'top-4 right-4' : 'top-5 right-5'} z-20 text-[9px] sm:text-[10px] uppercase tracking-widest font-black bg-amber-100 text-amber-700 ${isStandalone ? 'px-3 py-0.5' : 'px-3.5 py-1'} rounded-full shadow-sm`}>
                    {tier.badge}
                  </span>
                )}

                <div className={`${isStandalone ? 'mb-4' : 'mb-8'} flex flex-col items-center justify-center w-full relative`}>
                  <div className={`${isStandalone ? 'w-20 h-20 sm:w-24 sm:h-24' : 'w-28 h-28 sm:w-32 sm:h-32'} rounded-[28px] sm:rounded-[36px] bg-white/40 backdrop-blur-xl border border-white/60 flex items-center justify-center p-2.5 shadow-[0_12px_40px_rgba(31,38,135,0.08),inset_0_1px_0_rgba(255,255,255,0.6)] relative group/icon overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-transparent pointer-events-none" />
                    <img 
                      src={tier.icon} 
                      alt={tier.name} 
                      className="w-[82%] h-[82%] object-contain drop-shadow-[0_16px_28px_rgba(0,0,0,0.18)] relative z-10 transition-all duration-500 group-hover:scale-115 group-hover:-rotate-3 group-hover:drop-shadow-[0_20px_35px_rgba(0,0,0,0.22)]" 
                    />
                  </div>
                </div>

                <div className="text-center">
                  <h3 className={`${isStandalone ? 'text-lg sm:text-xl' : 'text-2xl'} font-black mb-1 sm:mb-2 text-slate-900 tracking-tight`}>
                    {tier.name}
                  </h3>
                  
                  <div className={`${isStandalone ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'} font-black ${isStandalone ? 'mb-4' : 'mb-6'} text-slate-900 tracking-tight`}>
                    {displayPrice}<span className="text-sm font-bold text-slate-400 tracking-normal">{tier.period}</span>
                  </div>
                </div>
                
                <ul className={`space-y-2 sm:space-y-3 ${isStandalone ? 'mb-6' : 'mb-8'} flex-1`}>
                  {tier.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                      {f.included ? <Check size={16} className="text-green-500 shrink-0" /> : <X size={16} className="text-slate-300 shrink-0" />}
                      <span className="truncate">{f.text}</span>
                    </li>
                  ))}
                </ul>
                
                {isCurrentPlan ? (
                  <button 
                    disabled
                    className={`w-full ${isStandalone ? 'py-3' : 'py-4'} bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl font-bold flex items-center justify-center gap-2`}
                  >
                    <ShieldCheck size={18} />
                    Your Current Plan
                  </button>
                ) : (
                  <button 
                    onClick={() => tier.planId === 'free' ? window.location.href = tier.href : handleCheckout(tier)}
                    disabled={loading === tier.planId}
                    className={`w-full ${isStandalone ? 'py-3' : 'py-4'} bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-colors`}
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
