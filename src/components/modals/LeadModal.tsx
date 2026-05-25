'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Sparkles, ArrowRight, CheckCircle2 } from '@/components/icons/lucide';
import { motion, AnimatePresence } from 'framer-motion';

export interface LeadModalProps {
  open: boolean;
  onClose: () => void;
}

export function LeadModal({ open, onClose }: LeadModalProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setStatus('submitting');
    // Simulate network request
    setTimeout(() => {
      setStatus('success');
      setTimeout(() => {
        onClose();
        setTimeout(() => {
          setStatus('idle');
          setEmail('');
        }, 300);
      }, 2000);
    }, 1200);
  };

  return (
    <Modal open={open} onClose={onClose} size="md" panelClassName="overflow-hidden p-0 rounded-3xl bg-slate-50 border-0 shadow-2xl">
      <div className="relative">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-br from-blue-600 to-cyan-500 opacity-10 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-400 rounded-full blur-[100px] opacity-20 pointer-events-none" />

        <div className="p-8 sm:p-10 relative z-10">
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center text-center py-12"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">You're on the list!</h3>
                <p className="text-slate-500">
                  We'll let you know as soon as Orbstera is ready for you. Keep an eye on your inbox.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 mb-6 relative">
                  <Sparkles className="w-6 h-6" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full border-2 border-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Join the Waitlist</h2>
                <p className="text-slate-500 text-sm mb-8">
                  Get exclusive early access to Orbstera's AI presentation tools before anyone else. We're launching soon!
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Work Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@company.com"
                      required
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="w-full h-12 mt-6 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {status === 'submitting' ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Get Early Access <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
                
                <p className="text-center text-xs text-slate-400 mt-6">
                  By joining, you agree to our Terms of Service and Privacy Policy. No spam, ever.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
}
