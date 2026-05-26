'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Suspense } from 'react';

const SCROLL_CSS = `
@keyframes scrollUp {
  0% { transform: translateY(0); }
  100% { transform: translateY(-33.3333%); }
}
@keyframes scrollDown {
  0% { transform: translateY(-33.3333%); }
  100% { transform: translateY(0); }
}
.animate-scroll-up {
  animation: scrollUp 40s linear infinite;
}
.animate-scroll-down {
  animation: scrollDown 45s linear infinite;
}
`;

const COL_1_IMAGES = [
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80',
];
const COL_2_IMAGES = [
  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=600&q=80',
];
const COL_3_IMAGES = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80',
];

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup' | 'recovery'>('login');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'recovery') {
      setLoading(true);
      setError(null);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/login')}`,
        });
        if (error) throw error;
        setError('Reset link sent. Please check your inbox.');
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Could not send reset email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    const baseRedirect = searchParams.get('redirect') || '/';
    const finalRedirect = baseRedirect;

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
          },
        });
        if (error) throw error;
        setError('Account created! Please check your email for confirmation.');
        setLoading(false);
        return;
      }
      router.push(finalRedirect);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google') => {
    setGoogleLoading(true);
    const baseRedirect = searchParams.get('redirect') || '/';

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(baseRedirect)}`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SCROLL_CSS }} />
      <div className="h-dvh max-h-screen w-full flex bg-white font-sans overflow-hidden">
        
        {/* LEFT COLUMN: AUTH */}
        <div className="w-full lg:w-[500px] xl:w-[600px] shrink-0 flex flex-col justify-center px-8 sm:px-16 py-12 relative z-20 bg-white shadow-[20px_0_40px_rgba(0,0,0,0.03)] overflow-hidden">
          
          {/* Top Blue Linear Gradient Fade */}
          <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-blue-500/20 to-transparent pointer-events-none" />
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[400px] mx-auto"
          >
            <div className="mb-10">
              <Link href="/" className="inline-flex hover:opacity-80 transition-opacity">
                 <img src="/logo.png.png" alt="Orbstera Logo" className="h-9 w-auto object-contain" />
              </Link>
            </div>
            
            <div className="mb-8">
              <h1 className="text-[32px] font-bold text-slate-900 tracking-tight leading-tight">
                {mode === 'recovery' ? 'Reset password' : mode === 'login' ? 'Welcome back' : 'Get started free'}
              </h1>
              <p className="text-[15px] text-slate-500 mt-2 font-medium">
                {mode === 'recovery' ? 'Enter your email to receive a reset link.' : 'Create presentations at the speed of thought.'}
              </p>
            </div>

            {mode !== 'recovery' && (
              <>
                <button 
                  type="button"
                  disabled={googleLoading}
                  onClick={() => handleOAuth('google')}
                  className="w-full h-[48px] bg-white border border-slate-200 rounded-[14px] flex items-center justify-center gap-3 font-semibold text-[15px] text-slate-700 hover:bg-slate-50 hover:shadow-sm transition-all active:scale-[0.98]"
                >
                  {googleLoading ? (
                    <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c3.11 0 5.72-1.03 7.63-2.79l-3.57-2.77c-.99.66-2.26 1.05-4.06 1.05-3.12 0-5.77-2.11-6.71-4.94H1.54v2.85C3.44 20.21 7.45 23 12 23z" />
                        <path fill="#FBBC05" d="M5.29 13.55A6.88 6.88 0 014.88 12c0-.54.09-1.07.25-1.55V7.6H1.54A11.96 11.96 0 000 12c0 1.58.31 3.11.88 4.5l4.41-3.45z" />
                        <path fill="#EA4335" d="M12 4.81c1.69 0 3.21.58 4.4 1.72l3.3-3.3A12.01 12.01 0 0012 .5C7.45.5 3.44 3.29 1.54 7.6l3.75 2.85c.94-2.83 3.59-4.94 6.71-4.94z" />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>

                <div className="flex items-center gap-4 my-6">
                  <div className="h-[1px] flex-1 bg-slate-100" />
                  <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider">Or email</span>
                  <div className="h-[1px] flex-1 bg-slate-100" />
                </div>
              </>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label htmlFor="auth-email" className="sr-only">Email address</label>
                <input 
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-[48px] bg-slate-50 border border-slate-200 rounded-[14px] px-4 text-[15px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                />
              </div>

              {mode !== 'recovery' && (
                <div>
                  <label htmlFor="auth-password" className="sr-only">Password</label>
                  <input 
                    id="auth-password"
                    type="password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full h-[48px] bg-slate-50 border border-slate-200 rounded-[14px] px-4 text-[15px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  />
                </div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={`text-[13.5px] font-medium p-3 rounded-xl ${
                    error.includes('Account created') || error.includes('link sent')
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-red-50 text-red-600 border border-red-100'
                  }`}
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[48px] bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-[14px] font-semibold text-[15px] shadow-[0_4px_14px_rgba(59,130,246,0.3)] hover:from-blue-400 hover:to-blue-500 hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:-translate-y-[1px] active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
              >
                {loading ? 'Processing...' : mode === 'recovery' ? 'Send reset link' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="mt-8 text-center text-[14px] text-slate-500 font-medium">
              {mode === 'login' ? (
                <>Don&apos;t have an account? <button onClick={() => setMode('signup')} className="text-indigo-600 hover:text-indigo-800 transition-colors font-semibold ml-1">Sign up</button></>
              ) : mode === 'signup' ? (
                <>Already have an account? <button onClick={() => setMode('login')} className="text-indigo-600 hover:text-indigo-800 transition-colors font-semibold ml-1">Sign in</button></>
              ) : (
                <button onClick={() => setMode('login')} className="text-indigo-600 hover:text-indigo-800 transition-colors font-semibold">Return to sign in</button>
              )}
            </div>
            
            {mode === 'login' && (
              <div className="mt-4 text-center">
                 <button onClick={() => setMode('recovery')} className="text-[13px] font-medium text-slate-400 hover:text-slate-600 transition-colors">
                   Forgot your password?
                 </button>
              </div>
            )}
          </motion.div>

          <div className="absolute bottom-6 left-0 right-0 text-center px-8">
            <p className="text-[12px] text-slate-400 font-medium">Â© 2026 Orbstera, Inc.</p>
          </div>
        </div>

        {/* RIGHT COLUMN: SCROLLING GALLERY */}
        <div className="hidden lg:flex flex-1 relative bg-slate-100 overflow-hidden items-start justify-center gap-4 sm:gap-6 px-4">
          {/* Subtle vignette / fading at top and bottom */}
          <div className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-b from-slate-100 via-transparent to-slate-100" />

          {/* Column 1 (Scrolls Up) */}
          <div className="flex-1 w-full min-w-[200px] flex flex-col gap-4 sm:gap-6 animate-scroll-up -mt-[20%]">
            {[...COL_1_IMAGES, ...COL_1_IMAGES, ...COL_1_IMAGES].map((src, i) => (
              <div key={`col1-${i}`} className="w-full rounded-[24px] overflow-hidden shadow-sm aspect-[4/5] relative">
                <img src={src} alt="Gallery" className="w-full h-full object-cover" loading={i > 3 ? "lazy" : "eager"} />
              </div>
            ))}
          </div>

          {/* Column 2 (Scrolls Down) */}
          <div className="flex-1 w-full min-w-[200px] flex flex-col gap-4 sm:gap-6 animate-scroll-down -mt-[50%]">
            {[...COL_2_IMAGES, ...COL_2_IMAGES, ...COL_2_IMAGES].map((src, i) => (
              <div key={`col2-${i}`} className="w-full rounded-[24px] overflow-hidden shadow-sm aspect-[3/4] relative">
                <img src={src} alt="Gallery" className="w-full h-full object-cover" loading={i > 3 ? "lazy" : "eager"} />
              </div>
            ))}
          </div>

          {/* Column 3 (Scrolls Up) */}
          <div className="flex-1 w-full min-w-[200px] flex flex-col gap-4 sm:gap-6 animate-scroll-up hidden xl:flex -mt-[10%]">
            {[...COL_3_IMAGES, ...COL_3_IMAGES, ...COL_3_IMAGES].map((src, i) => (
              <div key={`col3-${i}`} className="w-full rounded-[24px] overflow-hidden shadow-sm aspect-[4/5] relative">
                <img src={src} alt="Gallery" className="w-full h-full object-cover" loading={i > 3 ? "lazy" : "eager"} />
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
