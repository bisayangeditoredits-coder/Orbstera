'use client';

import React from 'react';
import { Footer } from '@/components/layout/Footer';

export default function RefundPage() {
  return (
    <main className="min-h-screen w-full bg-white pt-32 pb-16 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto px-6 sm:px-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[#1E293B]">Refund Policy</h1>
        <p className="text-sm text-slate-500 mb-12">Last Updated: May 23, 2026</p>

        <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Overview</h2>
            <p>
              At Orbstera, we strive to ensure our customers are fully satisfied with our AI presentation generation tools. Because our service relies on substantial computing resources to generate AI outputs, we maintain a specific refund policy to prevent abuse.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Subscription Refunds</h2>
            <p>
              If you are unsatisfied with your subscription, you may request a refund within <strong>7 days</strong> of your initial purchase, provided that you have generated <strong>fewer than 2 presentations</strong> (or consumed fewer than 50 credits). If these conditions are met, we will issue a full refund to your original payment method.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. Renewals and Cancellations</h2>
            <p>
              You may cancel your subscription at any time. Cancellation will prevent any future charges, and you will retain access to your paid tier until the end of your current billing cycle. We do not provide prorated refunds for mid-cycle cancellations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Exceptional Circumstances</h2>
            <p>
              If you experience a major technical issue or prolonged downtime that prevents you from using the service, please reach out to our support team. We review these situations on a case-by-case basis and may grant account credits or refunds at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. How to Request a Refund</h2>
            <p>
              To request a refund, please contact our support team at support@orbstera.com with your account email and the reason for your request. Please allow 3-5 business days for your refund to be processed and reflected on your bank statement.
            </p>
          </section>
        </div>
      </div>
      <div className="mt-24">
        <Footer />
      </div>
    </main>
  );
}
