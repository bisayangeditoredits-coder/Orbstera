"use client";

import { Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { storePendingCheckout } from '@/lib/billing/confirm-subscription-client';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    annualPrice: null,
    subtitle: 'Start building presentations instantly ? no credit card required.',
    badge: 'No credit card required',
    badgeType: 'gray',
    buttonText: 'Start for free',
    buttonVariant: 'outline',
    highlight: false,
    featuresHeader: 'Free includes:',
    features: [
      '~150 credits/month (~1?2 AI decks)',
      'Up to 6 slides per presentation',
      'Automatic cinematic layout & motion',
      'PPTX export with watermark',
      'AI Magic Edit ? 15 uses (text edits)',
      'Generative Fill ? 8 uses (FLUX AI)',
      'Voice Protocol (Hands-free generation)'
    ],
    planId: 'free',
  },
  {
    name: 'Student Pro',
    price: '$9',
    period: '/ month',
    annualPrice: '$108 billed annually',
    subtitle: 'The best value for students, freelancers & emerging creators who need real power.',
    badge: 'Most popular',
    badgeType: 'pink',
    buttonText: 'Get started',
    buttonVariant: 'solid',
    highlight: true,
    featuresHeader: 'Everything in Free, and:',
    features: [
      '500 credits/month ? ~6 full AI decks with images',
      'Up to 25 slides per presentation',
      'GPT-5.5 + Claude Sonnet orchestration',
      'Generative Fill with FLUX Kontext Pro',
      'PPTX export ? no watermark',
      'All premium templates & themes',
      'AI Magic Edit ? unlimited inline editing',
      'Cinematic FLUX imagery for every slide',
      'Priority generation speed'
    ],
    planId: 'student_pro',
  },
  {
    name: 'Creator Pro',
    price: '$22',
    period: '/ month',
    annualPrice: '$264 billed annually',
    subtitle: 'Built for agencies, teachers & power users who live and breathe presentations.',
    badge: 'Best value',
    badgeType: 'gray',
    buttonText: 'Get started',
    buttonVariant: 'outline',
    highlight: false,
    featuresHeader: 'Everything in Student Pro, and:',
    features: [
      '1,125 credits/month ? ~14 full AI decks with images',
      'Up to 40 slides per presentation',
      'GPT-5.5 + Claude Opus 4 maximum intelligence',
      'Generative Fill with FLUX Kontext Max',
      'PPTX export ? no watermark, custom branding',
      'All templates + cinematic FLUX Ultra imagery',
      'AI Magic Edit ? unlimited, highest quality',
      'Highest priority rendering queue',
      'Priority support'
    ],
    planId: 'creator_pro',
  }
];

interface PricingProps {
  isStandalone?: boolean;
}

export function Pricing({ isStandalone = false }: PricingProps) {
  const [loading, setLoading] = useState<string | null>(null);
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
        if (data.planId && data.sig) {
          storePendingCheckout(data.planId, data.sig);
        }
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
    <section id="pricing" className={`w-full ${isStandalone ? 'py-8' : 'py-24 sm:py-32'} px-4 sm:px-6 lg:px-8 bg-white text-slate-900 relative overflow-hidden font-sans border-b border-black/[0.04]`}>

      <div className="max-w-[1400px] mx-auto relative z-10 w-full">
        {!isStandalone && (
           <div className="text-center mb-16 sm:mb-20">
             <h2 className="text-4xl sm:text-5xl font-semibold mb-4 tracking-tight text-[#0F2B5B]">Flexible plans for everyone</h2>
             <p className="text-slate-500 text-lg font-medium">Choose the plan that fits your vision.</p>
           </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-6xl mx-auto">
          {tiers.map((tier, i) => {
            const isCurrentPlan = currentPlan === tier.planId;

            return (
              <div 
                key={i} 
                className={`bg-white rounded-[12px] p-6 sm:p-7 flex flex-col relative ${
                  tier.highlight 
                    ? 'border-[1.5px] border-blue-500 shadow-[0_4px_20px_rgba(59,130,246,0.12)] z-10' 
                    : 'border border-blue-100/80 shadow-sm hover:shadow-md transition-shadow'
                }`}
              >
                {/* Header Container (Relative for badge positioning) */}
                <div className="relative mb-6">
                  {/* Badge positioned top right inside the card */}
                  {tier.badge && (
                    <div className="absolute top-0 right-0">
                      <span 
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${
                          tier.badgeType === 'pink' 
                            ? 'bg-[#E84ECA] text-white shadow-sm' 
                            : 'bg-[#F1F3F5] text-slate-600'
                        }`}
                      >
                        {tier.badge}
                      </span>
                    </div>
                  )}

                  <h3 className="text-[28px] font-bold text-[#0A2540] tracking-tight mb-2 mt-1">
                    {tier.name}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-slate-500 h-10 pr-4">
                    {tier.subtitle}
                  </p>
                </div>

                {/* Price */}
                <div className="mb-6 h-[70px]">
                  <div className="flex items-baseline font-bold text-[#0A2540]">
                    <span className="text-[44px] tracking-tighter leading-none">{tier.price}</span>
                    {tier.period && (
                      <span className="text-[11px] text-slate-500 font-medium ml-1 tracking-normal">{tier.period}</span>
                    )}
                  </div>
                  <div className="text-[12px] text-slate-500 mt-2 font-medium">
                    {tier.annualPrice ? tier.annualPrice : <span className="opacity-0">-</span>}
                  </div>
                </div>

                {/* Action Button */}
                <div className="mb-6">
                  {isCurrentPlan ? (
                    <button 
                      disabled
                      className="w-full py-2.5 px-4 bg-slate-50 text-slate-500 border border-slate-200 rounded-full font-semibold text-[14px] cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button 
                      onClick={() => tier.planId === 'free' ? window.location.href = '/login' : handleCheckout(tier)}
                      disabled={loading === tier.planId}
                      className={`w-full py-2.5 px-4 rounded-full font-semibold text-[14px] transition-all duration-200 ${
                        tier.buttonVariant === 'solid'
                          ? 'bg-gradient-to-r from-[#1755E6] to-[#5D94F8] text-white hover:opacity-90 shadow-sm border border-transparent'
                          : 'bg-white text-[#1755E6] border border-[#1755E6] hover:bg-[#F4F8FF]'
                      }`}
                    >
                      {loading === tier.planId ? 'Loading...' : tier.buttonText}
                    </button>
                  )}
                </div>

                {/* Separator */}
                <hr className="border-slate-100 mb-6" />

                {/* Features */}
                <div className="flex-1">
                  <p className="text-[13px] text-slate-600 mb-4 font-medium">{tier.featuresHeader}</p>
                  <ul className="space-y-3">
                    {tier.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <Check size={16} className="text-[#10B981] shrink-0 mt-[3px]" strokeWidth={2.5} />
                        <span className="text-[13px] text-slate-700 leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
