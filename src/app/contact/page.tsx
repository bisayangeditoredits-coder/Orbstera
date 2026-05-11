'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setSent(false);
    setError(null);
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] text-neutral-900">
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">Contact</p>
            <h1
              className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-neutral-950"
              style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
            >
              Let&apos;s talk about your team&apos;s decks
            </h1>
            <p className="mt-6 text-sm leading-relaxed text-neutral-600">
              For product questions, partnerships, or press, send a note. When email delivery is configured on the
              server, your message is sent through Resend to our inbox—otherwise use the address below.
            </p>
            <p className="mt-8 text-sm text-neutral-500">
              Direct email:{' '}
              <a href="mailto:hello@orbstera.ai" className="font-medium text-neutral-900 underline-offset-4 hover:underline">
                hello@orbstera.ai
              </a>
            </p>
          </div>

          <div className="border border-neutral-200 bg-white p-8 shadow-[0_1px_0_rgba(0,0,0,0.04)] sm:p-10">
            {sent ? (
              <div className="py-8 text-center">
                <p className="text-lg font-semibold text-neutral-950">Message sent</p>
                <p className="mt-2 text-sm text-neutral-600">
                  Thanks—we received your note and will reply when we can.
                </p>
                <button
                  type="button"
                  onClick={resetForm}
                  className="mt-8 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Send another
                </button>
              </div>
            ) : (
              <form
                className="space-y-6"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSubmitting(true);
                  setError(null);
                  try {
                    const res = await fetch('/api/contact', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name, email, message }),
                    });
                    const data = (await res.json()) as {
                      ok?: boolean;
                      error?: string;
                    };
                    if (res.ok && data.ok) {
                      setSent(true);
                      return;
                    }
                    if (data.error === 'CONTACT_NOT_CONFIGURED') {
                      setError(
                        'This site is not yet wired for outbound mail. Please email hello@orbstera.ai directly, or ask your admin to set RESEND_API_KEY and CONTACT_TO_EMAIL.',
                      );
                      return;
                    }
                    if (data.error === 'VALIDATION') {
                      setError('Please check the fields: name, a valid email, and at least 10 characters in your message.');
                      return;
                    }
                    setError('Something went wrong sending your message. Try again or use email directly.');
                  } catch {
                    setError('Network error. Check your connection and try again.');
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                <div>
                  <label htmlFor="name" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="mt-2 w-full border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                    Work email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="mt-2 w-full border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="msg" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                    How can we help?
                  </label>
                  <textarea
                    id="msg"
                    name="message"
                    required
                    minLength={10}
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-2 w-full resize-y border border-neutral-200 bg-neutral-50/50 px-4 py-3 text-sm outline-none transition focus:border-primary/40 focus:bg-white"
                  />
                </div>
                {error && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  aria-busy={submitting}
                  className="w-full bg-neutral-900 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
                >
                  {submitting ? 'Sending…' : 'Submit'}
                </button>
                <p className="text-center text-[11px] text-neutral-400">
                  By sending, you agree to our{' '}
                  <Link href="/privacy" className="underline-offset-2 hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
