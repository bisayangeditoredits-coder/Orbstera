'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';
import { Mail, MapPin, Phone, ArrowRight, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const OFFICES = [
  { city: "San Francisco", address: "101 Mission Street, Suite 2400", flag: "ðŸ‡ºðŸ‡¸" },
  { city: "London", address: "22 Bishopsgate, EC2N 4BQ", flag: "ðŸ‡¬ðŸ‡§" },
  { city: "Singapore", address: "Marina Bay Financial Centre", flag: "ðŸ‡¸ðŸ‡¬" },
];

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setSent(false);
    setError(null);
    setName('');
    setEmail('');
    setCompany('');
    setMessage('');
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans">

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 pt-32 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }} />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 sm:px-12 relative z-10">
          <div className="inline-flex items-center gap-2 border border-white/30 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white/70 mb-8">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
            Contact Orbstera
          </div>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tighter text-white leading-[1] mb-6 max-w-3xl">
            Let&apos;s build something <span className="text-blue-200">extraordinary.</span>
          </h1>
          <p className="text-white/60 text-lg max-w-xl leading-relaxed">
            Whether you&apos;re scaling a startup or managing enterprise decks — our team is ready to talk.
          </p>
        </div>
      </section>

      {/* ── MAIN GRID ── */}
      <section className="max-w-6xl mx-auto px-6 sm:px-12 py-24">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">

          {/* ── LEFT: Info ── */}
          <div>
            <h2 className="text-3xl font-bold text-[#1E293B] tracking-tight mb-8">Get in touch</h2>

            <div className="space-y-6 mb-12">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 border border-slate-200 flex items-center justify-center text-[#0009fa] shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Email</p>
                  <a href="mailto:hello@orbstera.ai" className="text-slate-800 font-semibold hover:text-blue-600 transition-colors">hello@orbstera.ai</a>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 border border-slate-200 flex items-center justify-center text-[#0009fa] shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Enterprise Sales</p>
                  <a href="mailto:sales@orbstera.ai" className="text-[#1E293B] font-semibold hover:text-blue-600 transition-colors">sales@orbstera.ai</a>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 border border-slate-200 flex items-center justify-center text-[#0009fa] shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Response Time</p>
                  <p className="text-[#1E293B] font-semibold">Within 4 business hours</p>
                </div>
              </div>
            </div>

            {/* Offices */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">Global Offices</p>
              <div className="space-y-0 border-t border-slate-100">
                {OFFICES.map((o, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 py-5 border-b border-slate-100"
                  >
                    <span className="text-2xl">{o.flag}</span>
                    <div className="flex gap-2 items-start">
                      <MapPin className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{o.city}</p>
                        <p className="text-slate-400 text-xs">{o.address}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Form ── */}
          <div className="border border-slate-200 bg-white p-8 sm:p-12 shadow-xl shadow-slate-100/50">
            {sent ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <div className="w-16 h-16 bg-green-50 border border-green-100 flex items-center justify-center text-green-500 text-3xl mb-6">✓</div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">Message received.</h3>
                <p className="text-slate-500 text-sm mb-8 max-w-xs">We&apos;ll get back to you within 4 business hours. Check your inbox.</p>
                <button onClick={resetForm} className="text-sm font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors">
                  Send another message
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
                      body: JSON.stringify({ name, email, message: `Company: ${company}\n\n${message}` }),
                    });
                    const data = (await res.json()) as { ok?: boolean; error?: string };
                    if (res.ok && data.ok) { setSent(true); return; }
                    if (data.error === 'CONTACT_NOT_CONFIGURED') {
                      setError('Email not configured. Please email hello@orbstera.ai directly.');
                      return;
                    }
                    setError('Something went wrong. Please try again or email us directly.');
                  } catch {
                    setError('Network error. Check your connection and try again.');
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                <h3 className="text-xl font-bold text-[#1E293B] mb-2">Send a message</h3>
                <p className="text-slate-400 text-sm mb-6">Fill in your details and we&apos;ll be in touch shortly.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Full Name</label>
                    <input id="name" name="name" required value={name} onChange={e => setName(e.target.value)}
                      className="w-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#0009fa] focus:bg-white transition-colors" />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Company</label>
                    <input id="company" name="company" value={company} onChange={e => setCompany(e.target.value)}
                      className="w-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#0009fa] focus:bg-white transition-colors" />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Work Email</label>
                  <input id="email" name="email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#0009fa] focus:bg-white transition-colors" />
                </div>

                <div>
                  <label htmlFor="msg" className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">How can we help?</label>
                  <textarea id="msg" name="message" required minLength={10} rows={5} value={message} onChange={e => setMessage(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#0009fa] focus:bg-white transition-colors resize-y" />
                </div>

                {error && (
                  <p className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>
                )}

                <button type="submit" disabled={submitting}
                  className="w-full bg-blue-600 text-white font-bold text-xs uppercase tracking-[0.15em] py-4 flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-60 group"
                >
                  {submitting ? 'Sending…' : <><span>Send Message</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                </button>
                <p className="text-center text-[10px] text-slate-300">
                  By submitting, you agree to our{' '}
                  <Link href="/privacy" className="underline underline-offset-2 hover:text-slate-500">Privacy Policy</Link>.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
