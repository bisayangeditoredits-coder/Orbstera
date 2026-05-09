"use client";

import { Check, X, Crown, Zap, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

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
      { text: 'Up to 12 slides per presentation', included: true },
      { text: 'Elite AI model (Claude 3.5 Sonnet)', included: true },
      { text: 'PPTX export — no watermark', included: true },
      { text: 'All premium templates & themes', included: true },
      { text: 'AI Magic Edit (inline text editing)', included: true },
      { text: 'Fast & Elite intelligence modes', included: true },
      { text: 'Priority generation speed', included: true },
    ],
    buttonText: 'Upgrade with PayPal',
    href: 'https://www.paypal.com/paypalme/orvixes/5', // Direct Payment Gateway
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
      { text: 'Up to 30 slides per presentation', included: true },
      { text: 'Elite AI: Claude 3.5 + DeepSeek R1', included: true },
      { text: 'PPTX export — no watermark, custom branding', included: true },
      { text: 'All templates + cinematic AI images', included: true },
      { text: 'AI Magic Edit (inline text editing)', included: true },
      { text: 'All 3 intelligence modes unlocked', included: true },
      { text: 'Priority support', included: true },
    ],
    buttonText: 'Upgrade with PayPal',
    href: 'https://www.paypal.com/paypalme/orvixes/19', // Direct Payment Gateway
    popular: false,
    planId: 'creator_pro',
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="w-full py-32 px-6 bg-[#F8FAFC] text-slate-900 relative overflow-hidden font-sans">
      {/* Cinematic Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-24">
          <motion-div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-primary/20 text-primary text-[12px] font-black uppercase tracking-[0.2em] rounded-full mb-8 shadow-sm">
            <Crown size={14} className="text-amber-500" /> Premium Access
          </motion-div>
          <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-600">
            Fair Pricing, Real Power.
          </h2>
          <p className="text-slate-500 text-xl max-w-2xl mx-auto leading-relaxed font-medium">
            Designed for visionaries and creators. Start free, scale instantly. <br/>
            Secure, lightning-fast payments via PayPal.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {tiers.map((tier, i) => (
            <div
              key={i}
              className={`relative flex flex-col h-full transition-all duration-500 rounded-[40px] p-10 group overflow-hidden bg-white ${
                tier.popular
                  ? 'border border-primary/30 shadow-[0_20px_80px_-20px_rgba(59,130,246,0.15)] lg:-translate-y-4 ring-4 ring-primary/5'
                  : 'border border-slate-200/80 shadow-lg hover:border-slate-300 hover:shadow-xl'
              }`}
            >
              {/* Internal Subtle Gradient on Hover */}
              <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Badge */}
              {tier.badge && (
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 text-white text-[11px] font-black px-6 py-2 rounded-b-2xl uppercase tracking-[0.2em] shadow-lg ${
                  tier.popular ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-purple-500 to-purple-400'
                }`}>
                  {tier.badge}
                </div>
              )}

              {/* Header */}
              <div className="mb-10 relative mt-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2.5 rounded-xl border ${tier.popular ? 'bg-amber-50 border-amber-100 text-amber-500' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                    {tier.icon}
                  </div>
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">{tier.name}</h3>
                </div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-6xl font-black tracking-tighter text-slate-900">{tier.price}</span>
                  {tier.period && <span className="text-slate-400 font-bold text-lg">{tier.period}</span>}
                </div>
                <p className="text-[15px] text-slate-500 leading-relaxed font-medium">{tier.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-5 mb-12 flex-1 relative">
                {tier.features.map((feat, j) => (
                  <li key={j} className={`flex items-start gap-4 text-[14px] font-medium transition-colors ${feat.included ? 'text-slate-700' : 'text-slate-300'}`}>
                    <div className={`shrink-0 rounded-full p-1 mt-0.5 shadow-sm ${feat.included ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-slate-100 text-slate-300 border border-slate-200'}`}>
                      {feat.included ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                    </div>
                    <span className={feat.included ? '' : 'line-through decoration-slate-200'}>{feat.text}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={tier.href}
                className={`relative w-full py-5 rounded-[20px] font-black tracking-wide transition-all duration-300 text-center flex items-center justify-center gap-2 group/btn ${
                  tier.popular
                    ? 'bg-primary text-white hover:bg-primary/90 shadow-[0_15px_30px_-10px_rgba(59,130,246,0.4)] hover:shadow-[0_20px_40px_-10px_rgba(59,130,246,0.6)]'
                    : tier.planId === 'creator_pro'
                    ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-[0_15px_30px_-10px_rgba(15,23,42,0.3)]'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300'
                }`}
              >
                {tier.buttonText}
                {tier.planId !== 'free' && <ArrowRight size={18} className={`group-hover/btn:translate-x-1 transition-transform ${tier.popular || tier.planId === 'creator_pro' ? 'text-white/80' : 'text-slate-400'}`} />}
              </a>
            </div>
          ))}
        </div>

        {/* Premium Trust Note */}
        <div className="mt-20 flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex items-center justify-center gap-3 text-slate-400 font-bold uppercase tracking-[0.15em] text-[11px]">
            <ShieldCheck size={16} /> 100% Secure Checkout via PayPal
          </div>
          <p className="text-slate-400 text-[13px] font-medium max-w-md">
            All transactions are encrypted. Cancel your subscription anytime directly from your PayPal dashboard.
          </p>
        </div>
      </div>
    </section>
  );
}
