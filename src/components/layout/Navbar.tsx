'use client';

import Link from 'next/link';
import { Sparkles, LogOut, User, ArrowRight, Settings, Command } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/70 border-b border-blue-100/50">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between w-full">
        <Link href="/" className="flex items-center group">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <img src="/logo.png.png" alt="Orbstera Logo" className="h-9 w-auto object-contain relative z-10 transition-transform group-hover:scale-110 duration-300" />
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
        
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/editor" className="group relative h-11 px-7 rounded-full text-[12px] font-bold uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 overflow-hidden bg-primary shadow-[0_12px_24px_-8px_rgba(59,130,246,0.4)] hover:shadow-[0_15px_30px_-10px_rgba(59,130,246,0.5)] active:scale-95">
            <span className="relative z-10">Start Creating</span>
            <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
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
                    className="absolute right-0 top-full mt-3 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-gray-100/80 overflow-hidden flex flex-col p-1.5 z-50 origin-top-right ring-1 ring-black/5"
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
            <Link href="/login" className="text-[12px] font-bold uppercase tracking-widest hover:text-primary transition-colors text-textSecondary">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
