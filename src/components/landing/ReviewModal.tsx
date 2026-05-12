"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Send, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewModal({ isOpen, onClose }: ReviewModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    handle: '',
    body: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, rating }),
      });

      if (response.ok) {
        alert("Thank you! Your story has been shared.");
        onClose();
        setFormData({ name: '', role: '', handle: '', body: '' });
      } else {
        alert("Something went wrong. Please check your R2 configuration.");
      }
    } catch (error) {
      console.error(error);
      alert("Error submitting review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0A0A0F] p-8 shadow-2xl overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
            
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-3xl font-bold text-white mb-2">Share Your Story</h2>
            <p className="text-white/60 mb-8">Tell us how Orbstera transformed your storytelling process.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Handle</label>
                  <input
                    type="text"
                    value={formData.handle}
                    onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                    placeholder="@jane_ux"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Role / Company</label>
                <input
                  required
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all"
                  placeholder="Creative Director at Apple"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className={`p-1 transition-all ${rating >= s ? 'text-yellow-500 scale-110' : 'text-white/20 hover:text-white/40'}`}
                    >
                      <Star className={`w-8 h-8 ${rating >= s ? 'fill-yellow-500' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Your Review</label>
                <textarea
                  required
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-all min-h-[120px] resize-none"
                  placeholder="The AI presentation generator is literally magic..."
                />
              </div>

              <button
                disabled={isSubmitting}
                type="submit"
                className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(var(--primary),0.4)] transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Storing in R2...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Share Story
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
