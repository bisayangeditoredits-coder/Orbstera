"use client";

import { Check, X, Crown, Zap, Sparkles, ArrowRight, ShieldCheck, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase';
import { SpotlightCard } from '@/components/ui/SpotlightCard';

const tiers = [
  {
    name: 'Free',
    prices: { USD: '$0', PHP: '₱0' },
    period: null,
    description: 'Start building presentations instantly — no credit card required.',
    badge: null,
    icon: <img src="/psdzone.net-Education-3D-Icons/PNG/Notebook and Pencil.png" alt="Free" className="w-28 h-28 object-contain" />,
    features: [
      { text: '100 AI credits every month', included: true },
      { text: '3 AI presentations lifetime', included: true },
      { text: 'Cinematic layout & motion', included: true },
      { text: 'PPTX export (with watermark)', included: true },
      { text: 'AI Magic Edit & premium assets', included: false },
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
    icon: <img src="/psdzone.net-Education-3D-Icons/PNG/Graduation Hat.png" alt="Student" className="w-28 h-28 object-contain" />,
    features: [
      { text: '1,500 AI credits / month', included: true },
      { text: 'Unlimited decks (up to 25 slides)', included: true },
      { text: 'No-watermark PPTX export', included: true },
      { text: 'All premium templates & themes', included: true },
      { text: 'Full AI Magic Edit access', included: true },
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
    icon: <img src="/psdzone.net-Education-3D-Icons/PNG/Trophy.png" alt="Creator" className="w-28 h-28 object-contain" />,
    features: [
      { text: '8,000 AI credits / month', included: true },
      { text: 'Unlimited decks (up to 40 slides)', included: true },
      { text: 'Custom branding & priority lane', included: true },
      { text: 'Richest generative imagery pools', included: true },
      { text: '24/7 Priority support', included: true },
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
    <section id="pricing" className="w-full py-16 sm:py-24 md:py-32 px-4 sm:px-6 bg-[#F8FAFC] text-slate-900 relative overflow-hidden">
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
      
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
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 sm:mb-6 text-slate-900 tracking-tight leading-[1.1]"
          >
            Fair Pricing, <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-600">Real Power.</span>
          </motion.h2>
          <p className="text-slate-500 text-base sm:text-lg mb-10 max-w-2xl mx-auto font-medium">
            Choose the plan that fits your vision. No hidden fees, just pure AI performance.
          </p>
          
          {/* Currency Toggle */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-1 bg-white border border-slate-200 p-1.5 rounded-full shadow-xl"
          >
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
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
          {tiers.map((tier, i) => {
            const isCurrentPlan = currentPlan === tier.planId;
            const displayPrice = tier.prices[currency];

            return (
              <SpotlightCard key={i} className={`bg-white p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] border ${isCurrentPlan ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'} shadow-sm flex flex-col min-w-0`}>
                
                {isCurrentPlan && (
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-primary" />
                )}

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-3">
                    {tier.name}
                  </h3>
                  {tier.badge && !isCurrentPlan && (
                    <span className="text-[10px] uppercase tracking-widest font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                      {tier.badge}
                    </span>
                  )}
                </div>
                
                <div className="mb-8 flex justify-center py-10 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] relative overflow-hidden group/icon">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-indigo-500/5 opacity-0 group-hover/icon:opacity-100 transition-opacity duration-500" />
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: 8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                    className="relative z-10 drop-shadow-2xl"
                  >
                    {tier.icon}
                  </motion.div>
                </div>
                
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
              </SpotlightCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
