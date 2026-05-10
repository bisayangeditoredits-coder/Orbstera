'use client';

import Link from 'next/link';
import { LogOut, ArrowRight, Settings, Command, Menu, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-xl bg-white/70 border-b border-blue-100/50 pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-3 sm:py-4 flex items-center justify-between w-full min-w-0 gap-2">
        <Link href="/" className="flex items-center group shrink-0 min-w-0" onClick={() => setMobileNavOpen(false)}>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <img src="/logo.png.png" alt="Orbstera Logo" className="h-8 sm:h-9 w-auto max-w-[44vw] object-contain relative z-10 transition-transform group-hover:scale-110 duration-300" />
          </div>
        </Link>
        
        <div className="hidden md:flex items-center gap-10 text-[12px] font-bold text-textSecondary uppercase tracking-[0.2em] ml-12">
          <Link href="#features" className="hover:text-primary transition-all relative group">
            <span>Features</span>
            <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
          </Link>
          <Link href="#templates" className="hover:text-primary transition-all relative group">
            <span>Templates</span>
            <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
          </Link>
          <Link href="#pricing" className="hover:text-primary transition-all relative group">
            <span>Pricing</span>
            <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
          </Link>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 shrink-0 min-w-0">
          <button
            type="button"
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200/80 bg-white/80 text-gray-800 hover:bg-white transition-colors touch-manipulation"
            aria-label="Open navigation menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu size={20} strokeWidth={2} />
          </button>

          <Link href="/editor" className="group relative h-9 sm:h-11 px-4 sm:px-7 rounded-full text-[10px] sm:text-[12px] font-bold uppercase tracking-wider sm:tracking-widest text-white transition-all flex items-center justify-center gap-1.5 sm:gap-2 overflow-hidden bg-primary shadow-[0_12px_24px_-8px_rgba(59,130,246,0.4)] hover:shadow-[0_15px_30px_-10px_rgba(59,130,246,0.5)] active:scale-95 touch-manipulation whitespace-nowrap max-w-[42vw] sm:max-w-none">
            <span className="relative z-10 truncate"><span className="hidden xs:inline">Start Creating</span><span className="xs:hidden">Create</span></span>
            <ArrowRight size={14} className="relative z-10 shrink-0 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          {user ? (
            <div className="relative" ref={dropdownRef}>
              {/* Trigger Pill */}
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`hidden sm:flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border shadow-[0_4px_12px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_20px_-4px_rgba(123,97,255,0.25)] hover:bg-white transition-all duration-300 cursor-pointer ${dropdownOpen ? 'border-primary/50 bg-white ring-2 ring-primary/20' : 'border-gray-200/60 hover:border-primary/40'}`}
              >
                <div className="relative w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-primary via-indigo-500 to-purple-600 shadow-inner group-hover:scale-105 transition-transform duration-300">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover relative z-10" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[13px] font-black text-white uppercase tracking-wider relative z-10 shadow-sm">
                      {user.email?.[0]}
                    </span>
                  )}
                </div>
                <div className="flex flex-col justify-center text-left">
                  <span className="text-[11px] font-bold text-gray-900 leading-[1.1] truncate max-w-[120px]">
                    {user.email?.split('@')[0]}
                  </span>
                  <span className="text-[8.5px] font-bold text-gray-400 uppercase tracking-[0.2em] leading-[1.1] mt-0.5">
                    Creator
                  </span>
                </div>
              </button>

              {/* Framer Motion Dropdown Menu */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute right-0 top-full mt-3 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-100/80 overflow-hidden flex flex-col p-1.5 z-[120] origin-top-right ring-1 ring-black/5"
                  >
                    <div className="px-3 py-2.5 mb-1 bg-gray-50/50 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Signed in as</p>
                      <p className="text-[12px] font-bold text-gray-900 truncate">{user.email}</p>
                    </div>
                    
                    <Link href="/dashboard" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-gray-700 hover:text-primary hover:bg-primary/5 rounded-xl transition-all group">
                      <Command size={16} className="text-gray-400 group-hover:text-primary transition-colors" />
                      My Dashboard
                    </Link>
                    
                    <Link href="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-gray-700 hover:text-primary hover:bg-primary/5 rounded-xl transition-all group">
                      <Settings size={16} className="text-gray-400 group-hover:text-primary transition-colors" />
                      User Settings
                    </Link>
                    
                    <div className="h-px bg-gray-100 my-1.5 mx-2" />
                    
                    <button 
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-all w-full text-left group"
                    >
                      <LogOut size={16} className="text-red-400 group-hover:text-red-600 transition-colors" />
                      Log Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link href="/login" className="text-[11px] sm:text-[12px] font-bold uppercase tracking-widest hover:text-primary transition-colors text-textSecondary whitespace-nowrap">
              Sign In
            </Link>
          )}

          {user && (
            <Link
              href="/dashboard"
              className="sm:hidden flex w-10 h-10 rounded-full overflow-hidden items-center justify-center bg-gradient-to-br from-primary via-indigo-500 to-purple-600 border border-gray-200/60 touch-manipulation shrink-0"
              aria-label="My Dashboard"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-[12px] font-black text-white uppercase">{user.email?.[0]}</span>
              )}
            </Link>
          )}
        </div>
      </div>

      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[180] bg-black/50 backdrop-blur-sm md:hidden"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed top-0 right-0 bottom-0 z-[190] w-[min(100%,20rem)] max-w-[100vw] bg-white shadow-2xl flex flex-col md:hidden pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] px-4 overflow-y-auto overscroll-contain isolate"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-textSecondary">Navigate</span>
                <button
                  type="button"
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 touch-manipulation"
                  aria-label="Close menu"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {[
                  { href: '#features', label: 'Features' },
                  { href: '#templates', label: 'Templates' },
                  { href: '#pricing', label: 'Pricing' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="py-3 px-3 rounded-xl text-[13px] font-bold text-gray-800 hover:bg-primary/5 hover:text-primary transition-colors"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/editor"
                  className="mt-4 py-3.5 px-3 rounded-2xl text-center text-[12px] font-black uppercase tracking-widest text-white bg-primary shadow-lg"
                  onClick={() => setMobileNavOpen(false)}
                >
                  Start Creating
                </Link>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
