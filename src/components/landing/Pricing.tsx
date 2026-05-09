"use client";

import { Check, X, Crown, Zap, Sparkles } from 'lucide-react';
import Link from 'next/link';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: null,
    description: 'Start building presentations instantly — no credit card required.',
    badge: null,
    icon: <Sparkles size={20} className="text-textMuted" />,
    features: [
      { text: '3 AI-generated presentations per month', included: true },
      { text: 'Maximum 5 slides per presentation', included: true },
      { text: 'Standard AI model (DeepSeek Chat)', included: true },
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
    priceValue: '0',
  },
  {
    name: 'Student Pro',
    price: '$5',
    period: '/month',
    description: 'The best value for students, freelancers & emerging creators who need real power.',
    badge: 'Most Popular',
    icon: <Crown size={20} className="text-amber-500" />,
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
    buttonText: 'Upgrade to Student Pro',
    href: '/pricing',
    popular: true,
    planId: 'student_pro',
    priceValue: '5.00',
  },
  {
    name: 'Creator Pro',
    price: '$19',
    period: '/month',
    description: 'Built for agencies, teachers & power users who live and breathe presentations.',
    badge: 'Best Value',
    icon: <Zap size={20} className="text-purple-500" />,
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
    buttonText: 'Become a Creator',
    href: '/pricing',
    popular: false,
    planId: 'creator_pro',
    priceValue: '19.00',
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="w-full py-32 px-6 bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-[12px] font-bold uppercase tracking-widest rounded-full mb-6">
            <Crown size={14} /> Pricing
          </div>
          <h2 className="text-4xl md:text-5xl font-space-grotesk font-bold mb-6 text-textMain">
            Fair Pricing, Real Power
          </h2>
          <p className="text-textSecondary text-lg max-w-2xl mx-auto leading-relaxed">
            Designed for Filipino students and creators. Start free, upgrade only when you need more.
            No hidden fees, no confusing limits.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {tiers.map((tier, i) => (
            <div
              key={i}
              className={`relative bg-white border flex flex-col h-full transition-all duration-300 rounded-[36px] p-10 ${
                tier.popular
                  ? 'border-primary ring-4 ring-primary/5 shadow-2xl shadow-primary/10 scale-[1.03] z-10'
                  : 'border-borderSubtle hover:border-primary/30 shadow-sm hover:shadow-md'
              }`}
            >
              {/* Badge */}
              {tier.badge && (
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-[11px] font-bold px-5 py-1.5 rounded-full uppercase tracking-[0.1em] shadow-lg ${
                  tier.popular ? 'bg-primary shadow-primary/20' : 'bg-purple-500 shadow-purple-200'
                }`}>
                  {tier.badge}
                </div>
              )}

              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  {tier.icon}
                  <h3 className="text-sm font-bold text-textSecondary uppercase tracking-widest">{tier.name}</h3>
                </div>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-5xl font-space-grotesk font-bold text-textMain">{tier.price}</span>
                  {tier.period && <span className="text-textSecondary font-medium text-lg">{tier.period}</span>}
                </div>
                <p className="text-[14px] text-textSecondary leading-relaxed">{tier.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-10 flex-1">
                {tier.features.map((feat, j) => (
                  <li key={j} className={`flex items-start gap-3 text-[13.5px] font-medium ${feat.included ? 'text-textSecondary' : 'text-textMuted/40'}`}>
                    <div className={`shrink-0 rounded-full p-0.5 mt-0.5 ${feat.included ? 'bg-primary/10' : 'bg-gray-100'}`}>
                      {feat.included
                        ? <Check size={13} className="text-primary" />
                        : <X size={13} className="text-gray-300" />
                      }
                    </div>
                    <span className={feat.included ? '' : 'line-through decoration-gray-200'}>{feat.text}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={tier.href}
                className={`w-full py-4 rounded-2xl font-bold transition-all text-center block active:scale-95 ${
                  tier.popular
                    ? 'bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/20'
                    : tier.planId === 'creator_pro'
                    ? 'bg-gradient-to-r from-purple-600 to-primary text-white hover:opacity-90 shadow-lg'
                    : 'bg-panel text-textMain hover:bg-hoverSurface border border-borderSubtle'
                }`}
              >
                {tier.buttonText}
              </Link>
            </div>
          ))}
        </div>

        {/* Trust note */}
        <p className="text-center text-[13px] text-textMuted mt-14 font-medium">
          🔒 Secure payments via PayPal &nbsp;·&nbsp; Cancel anytime &nbsp;·&nbsp; No subscriptions trapped — monthly only
        </p>
      </div>
    </section>
  );
}
