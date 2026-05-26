'use client';

import React from 'react';
import { Footer } from '@/components/layout/Footer';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen w-full bg-white pt-32 pb-16 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto px-6 sm:px-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-[#1E293B]">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-12">Last Updated: May 23, 2026</p>

        <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us when you create an account, subscribe to our newsletter, or use our services. This includes your name, email address, payment information, and the prompts/files you upload to generate presentations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to operate, maintain, and improve our services, process transactions, communicate with you, and personalize your experience. We do not use your private presentation data to train our foundational AI models without your explicit consent.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. Data Sharing and Disclosure</h2>
            <p>
              We do not sell your personal information. We may share your information with third-party service providers (such as payment processors and cloud hosting platforms) who need access to such information to carry out work on our behalf.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Data Security</h2>
            <p>
              We implement reasonable security measures to protect your information. However, no security system is impenetrable, and we cannot guarantee the absolute security of your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Your Rights</h2>
            <p>
              Depending on your location, you may have the right to access, correct, or delete your personal data. You can manage your account information directly from your dashboard or contact us for assistance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our service and hold certain information to enhance your user experience and analyze traffic patterns.
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
