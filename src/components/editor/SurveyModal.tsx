/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, Briefcase, Rocket, Palette, 
  Users, Sparkles, CheckCircle2, ArrowRight,
  Target, Zap, Globe, Heart
} from '@/components/icons/lucide';
import { createClient } from '@/lib/supabase';

interface SurveyModalProps {
  onComplete: () => void;
}

const ROLES = [
  { id: 'student', label: 'Student', icon: GraduationCap, color: 'bg-blue-50 text-blue-600' },
  { id: 'professional', label: 'Professional', icon: Briefcase, color: 'bg-indigo-50 text-indigo-600' },
  { id: 'entrepreneur', label: 'Entrepreneur', icon: Rocket, color: 'bg-amber-50 text-amber-600' },
  { id: 'creative', label: 'Creative', icon: Palette, color: 'bg-purple-50 text-purple-600' },
  { id: 'educator', label: 'Educator', icon: Users, color: 'bg-emerald-50 text-emerald-600' },
  { id: 'other', label: 'Other', icon: Globe, color: 'bg-gray-50 text-gray-600' },
];

const PURPOSES = [
  { id: 'pitch', label: 'Pitch Deck', icon: Target },
  { id: 'academic', label: 'Academic Presentation', icon: GraduationCap },
  { id: 'report', label: 'Business Report', icon: Briefcase },
  { id: 'creative', label: 'Creative Portfolio', icon: Palette },
  { id: 'marketing', label: 'Marketing Content', icon: Zap },
  { id: 'nonprofit', label: 'Non-profit / Charity', icon: Heart },
];

export function SurveyModal({ onComplete }: SurveyModalProps) {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: authErr } = await supabase.auth.updateUser({
          data: {
            survey_completed: true,
            survey_role: selectedRole,
            survey_purpose: selectedPurpose,
          },
        });
        if (authErr) {
          console.warn('[SurveyModal] auth.updateUser:', authErr.message);
        }
        // Best-effort profiles touch (ignore if columns differ from this project's schema)
        const { error: profileErr } = await supabase.from('profiles').upsert(
          {
            id: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        );
        if (profileErr) {
          console.warn('[SurveyModal] profiles upsert:', profileErr.message);
        }
      }
      onComplete();
    } catch (err) {
      console.error('Failed to save survey:', err);
      // Still proceed to not block the user if DB fails
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 safe-pad-y overflow-y-auto overscroll-contain">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-xl max-h-[min(92dvh,900px)] my-auto overflow-y-auto overscroll-contain bg-white rounded-lg shadow-modal border border-neutral-200/90"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-100">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: '33%' }}
            animate={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
          />
        </div>

        <div className="p-5 sm:p-8 md:p-12">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles size={18} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Personalization Protocol</span>
                  </div>
                  <h2 className="text-[clamp(1.35rem,4.5vw,1.875rem)] font-black text-slate-900 leading-tight text-balance">
                    Who are you <br className="hidden xs:block" />
                    <span className="text-primary italic">creating for today?</span>
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">We&apos;ll tailor the AI to match your professional tone.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ROLES.map((role) => {
                    const Icon = role.icon;
                    const isActive = selectedRole === role.id;
                    return (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={`group relative p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-3 ${
                          isActive 
                            ? 'border-primary bg-primary/5 shadow-premium' 
                            : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${isActive ? 'bg-primary text-white' : role.color}`}>
                          <Icon size={24} />
                        </div>
                        <span className={`text-[12px] font-bold ${isActive ? 'text-primary' : 'text-slate-600'}`}>
                          {role.label}
                        </span>
                        {isActive && (
                          <motion.div 
                            layoutId="check"
                            className="absolute top-2 right-2 text-primary"
                          >
                            <CheckCircle2 size={16} />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={!selectedRole}
                  onClick={() => setStep(2)}
                  className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-primary active:scale-[0.98] disabled:opacity-30"
                >
                  Next Step
                  <ArrowRight size={18} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <button onClick={() => setStep(1)} className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors">← GO BACK</button>
                  <h2 className="text-3xl font-black text-slate-900 leading-tight">
                    What is your <br />
                    <span className="text-primary italic">primary goal?</span>
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">This helps us optimize slide structure and narrative flow.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {PURPOSES.map((purpose) => {
                    const Icon = purpose.icon;
                    const isActive = selectedPurpose === purpose.id;
                    return (
                      <button
                        key={purpose.id}
                        onClick={() => setSelectedPurpose(purpose.id)}
                        className={`group relative p-4 rounded-3xl border-2 transition-all duration-300 flex items-center gap-4 text-left ${
                          isActive 
                            ? 'border-primary bg-primary/5 shadow-premium' 
                            : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${isActive ? 'bg-primary text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
                          <Icon size={20} />
                        </div>
                        <span className={`text-[12px] font-bold leading-tight ${isActive ? 'text-primary' : 'text-slate-600'}`}>
                          {purpose.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={!selectedPurpose || isSubmitting}
                  onClick={handleFinish}
                  className="w-full h-14 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? 'Optimizing AI...' : 'Complete Setup'}
                  {!isSubmitting && <Sparkles size={18} />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom branding */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-center gap-2">
          <img src="/logo.png.png" alt="Orbstera" className="h-4 w-auto grayscale opacity-50" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Architectural Intelligence v4.2</span>
        </div>
      </motion.div>
    </div>
  );
}
