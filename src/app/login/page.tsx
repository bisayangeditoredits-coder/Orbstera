'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Lock, Mail, ShieldCheck, Check } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct final redirect URL with preserved params
    const baseRedirect = searchParams.get('redirect') || '/';
    const prompt = searchParams.get('prompt');
    const modeParam = searchParams.get('mode');
    
    let finalRedirect = baseRedirect;
    if (prompt || modeParam) {
      const url = new URL(baseRedirect, window.location.origin);
      if (prompt) url.searchParams.set('prompt', prompt);
      if (modeParam) url.searchParams.set('mode', modeParam);
      finalRedirect = url.pathname + url.search;
    }
    if (!agreed && mode === 'signup') {
      setError("Please agree to the Terms of use.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        });
        if (error) throw error;
        setError("Account created! Please check your email for confirmation.");
        setLoading(false);
        return;
      }
      router.push(finalRedirect);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google') => {
    setGoogleLoading(true);
    
    // Construct final redirect URL for OAuth callback
    const baseRedirect = searchParams.get('redirect') || '/';
    const prompt = searchParams.get('prompt');
    const modeParam = searchParams.get('mode');
    
    let nextPath = baseRedirect;
    if (prompt || modeParam) {
      const url = new URL(baseRedirect, window.location.origin);
      if (prompt) url.searchParams.set('prompt', prompt);
      if (modeParam) url.searchParams.set('mode', modeParam);
      nextPath = url.pathname + url.search;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setGoogleLoading(false);
    }
  };

  // Inject Lottie Script
  useEffect(() => {
    const scriptId = 'lottie-player-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-6 md:p-12 font-sans overflow-hidden relative">
      
      {/* ── Background Architectural Elements ────────────────────────── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[70%] bg-primary/[0.06] blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[60%] bg-blue-200/[0.15] blur-[100px] rounded-full" />
        <div className="absolute inset-0 dot-grid opacity-[0.03]" />
      </div>

      <div className="w-full max-w-[1200px] flex flex-col lg:flex-row items-center justify-between gap-16 relative z-10">
        
        {/* ── LEFT SECTION: AUTH CARD (THE "VAULT") ───────────────────── */}
        <motion.div 
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[440px] relative z-20"
        >
          <div className="bg-white rounded-[40px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.06)] border border-gray-100/50 overflow-hidden flex flex-col relative z-20">
            {/* Modern Tab System */}
            <div className="flex bg-gray-50/50 p-2 m-2 rounded-[24px]">
              {[
                { id: 'login', label: 'Sign In' },
                { id: 'signup', label: 'Sign Up' },
                { id: 'recovery', label: 'Recovery' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => tab.id !== 'recovery' && setMode(tab.id as any)}
                  className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-[18px] transition-all duration-300 ${
                    mode === tab.id
                      ? 'text-primary bg-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-8 lg:p-12 pt-6">
              <div className="mb-10">
                 <div className="flex items-center gap-2 mb-8">
                    <img src="/logo.png.png" alt="Logo" className="h-7 w-auto object-contain" />
                    <div className="w-[1px] h-4 bg-gray-200 mx-1" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Auth Protocol</span>
                 </div>
                 <h2 className="text-[32px] font-black text-[#1E293B] tracking-tight leading-tight">
                   {mode === 'login' ? 'Welcome back' : 'Start your journey'}
                 </h2>
                 <p className="text-[13px] text-gray-400 mt-2 font-medium">Access the future of AI presentations.</p>
              </div>

              <form onSubmit={handleAuth} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-[0.1em]">Identity / Email</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors">
                      <Mail size={18} />
                    </div>
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full h-14 bg-gray-50/80 border border-transparent rounded-[20px] pl-14 pr-6 text-[14px] font-bold text-gray-800 placeholder:text-gray-300 focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Security / Key</label>
                     {mode === 'login' && <button type="button" className="text-[10px] font-bold text-primary/60 hover:text-primary transition-colors">Forgot Key?</button>}
                  </div>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors">
                      <Lock size={18} />
                    </div>
                    <input 
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-14 bg-gray-50/80 border border-transparent rounded-[20px] pl-14 pr-12 text-[14px] font-bold text-gray-800 placeholder:text-gray-300 focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all outline-none"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-200">
                      <ShieldCheck size={18} />
                    </div>
                  </div>
                </div>

                {/* Bot Protection Check */}
                <div className="bg-gray-50/50 border border-gray-100/50 rounded-[20px] p-4 flex items-center justify-between group cursor-pointer" onClick={() => setAgreed(!agreed)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${agreed ? 'bg-primary border-primary' : 'bg-white border-gray-200 group-hover:border-primary/30'}`}>
                      {agreed && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-[11px] font-bold text-gray-400">Verifying human presence</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-20">
                     <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" className="w-5 h-5 grayscale" alt="" />
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-2xl bg-red-50 text-red-500 text-[12px] font-bold border border-red-100"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Primary Action */}
                <button
                  disabled={loading}
                  className="w-full h-14 bg-primary text-white rounded-[22px] font-black text-[14px] uppercase tracking-[0.15em] shadow-[0_20px_40px_-10px_rgba(59,130,246,0.3)] hover:shadow-[0_25px_50px_-10px_rgba(59,130,246,0.4)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
                </button>
              </form>

              <div className="mt-10 flex flex-col gap-3">
                 <button 
                  disabled={googleLoading}
                  onClick={() => handleOAuth('google')}
                  className="w-full h-12 bg-white border border-gray-100 rounded-[20px] flex items-center justify-center gap-3 font-bold text-[13px] text-gray-600 hover:bg-gray-50 transition-all active:scale-[0.98]"
                 >
                   {googleLoading ? (
                     <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                   ) : (
                     <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c3.11 0 5.72-1.03 7.63-2.79l-3.57-2.77c-.99.66-2.26 1.05-4.06 1.05-3.12 0-5.77-2.11-6.71-4.94H1.54v2.85C3.44 20.21 7.45 23 12 23z" />
                        <path fill="#FBBC05" d="M5.29 13.55A6.88 6.88 0 014.88 12c0-.54.09-1.07.25-1.55V7.6H1.54A11.96 11.96 0 000 12c0 1.58.31 3.11.88 4.5l4.41-3.45z" />
                        <path fill="#EA4335" d="M12 4.81c1.69 0 3.21.58 4.4 1.72l3.3-3.3A12.01 12.01 0 0012 .5C7.45.5 3.44 3.29 1.54 7.6l3.75 2.85c.94-2.83 3.59-4.94 6.71-4.94z" />
                      </svg>
                      Continue with Google
                     </>
                   )}
                 </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── RIGHT SECTION: BRAND & VISUALS ──────────────────────────── */}
        <motion.div 
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex flex-1 flex-col items-center lg:items-start text-center lg:text-left max-w-[620px]"
        >
          <div className="mb-12 relative">
            {/* Relocated Robo Assistant Mascot */}
            <motion.div
              animate={{ 
                y: [0, -15, 0],
                rotate: [2, -2, 2]
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-12 -right-12 w-48 h-48 pointer-events-none z-30 hidden xl:block"
            >
               {/* @ts-ignore */}
               <lottie-player
                 src="/robo (2).json"
                 background="transparent"
                 speed="1"
                 style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 20px 40px rgba(59,130,246,0.2))' }}
                 loop
                 autoplay
               />
            </motion.div>

            <h1 className="text-[48px] md:text-[72px] font-black text-[#1E293B] leading-[0.95] tracking-tight relative z-20">
              Reimagine <br />
              <span className="text-primary italic">Presentations.</span>
            </h1>
            <p className="text-[20px] text-gray-500 mt-6 max-w-[480px] leading-relaxed font-medium">
              Join the world's most advanced AI-driven presentation platform. Cinematic decks, created in seconds.
            </p>
          </div>

          <div className="relative w-full aspect-[4/3]">
            {/* Lottie VR Visionary with cinematic orchestration */}
            <motion.div
              animate={{ y: [-15, 15, -15] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 z-10 flex items-center justify-center"
            >
              {/* @ts-ignore */}
              <lottie-player
                src="/A Man with VR headset touches a holographic screen.json"
                background="transparent"
                speed="0.8"
                style={{ width: '120%', height: '120%', filter: 'drop-shadow(0 40px 80px rgba(59,130,246,0.2))' }}
                loop
                autoplay
              />
            </motion.div>

            {/* Ambient Background Glow for Lottie */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-purple-500/5 rounded-full blur-3xl opacity-50 animate-pulse" />

            {/* Decorative Sparkles */}
            <div className="absolute -top-10 -right-10 w-24 h-24 text-primary/10">
               <Sparkles size={100} />
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
