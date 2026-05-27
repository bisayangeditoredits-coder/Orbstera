'use client';

import Link from 'next/link';
import { LogOut, Menu, X, LayoutGrid, ChevronRight } from 'lucide-react';
import { useEffect, useState, useRef, Fragment, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { NewDeckModal } from '@/components/workspace/NewDeckModal';

const NAV_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/teams', label: 'Teams' },
  { href: '/blog', label: 'Journal' },
] as const;

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileNavOpen]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsLoading(false);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    const { signOutAndClearCaches } = await import('@/lib/auth/logout');
    await signOutAndClearCaches(supabase, user?.id);
    router.push('/login');
    router.refresh();
  };

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';
  const userRole = user?.user_metadata?.role || 'Creator';

  return (
    <Fragment>
      {/* ── Main Navbar ── */}
      <header
        className={`relative mx-auto transition-all duration-300 w-full max-w-6xl rounded-2xl ${
          scrolled
            ? 'bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-black/[0.06] py-2.5 px-3'
            : 'bg-white shadow-sm border border-black/[0.06] py-3 px-4'
        }`}
      >
        <div className="w-full flex items-center justify-between gap-4">

          {/* ── Logo ── */}
          <div className="flex-1 flex justify-start pl-2">
            <Link
              href="/"
              className="flex items-center shrink-0 group"
              onClick={() => setMobileNavOpen(false)}
            >
              <img
                src="/logo.png.png"
                alt="Orbstera"
                className="h-[22px] w-auto object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </Link>
          </div>

          {/* ── Center Nav Links (desktop) ── */}
          <nav className="hidden lg:flex items-center justify-center gap-1.5 p-1 rounded-full bg-white/40 border border-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative px-4 py-1.5 text-[13px] font-medium text-neutral-600 hover:text-neutral-900 rounded-full hover:bg-white/60 hover:shadow-sm transition-all duration-200"
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <Link
                href="/my-presentations"
                className="relative px-4 py-1.5 text-[13px] font-medium text-primary hover:text-primaryHover rounded-full hover:bg-white/60 hover:shadow-sm transition-all duration-200"
              >
                My Decks
              </Link>
            )}
          </nav>

          {/* ── Right Actions ── */}
          <div className="flex-1 flex items-center justify-end gap-2.5 shrink-0 pr-1">

            {/* Mobile burger */}
            <button
              type="button"
              className="flex lg:hidden h-9 w-9 items-center justify-center rounded-full text-neutral-600 bg-white/50 hover:bg-white shadow-sm border border-white/60 transition-all"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={18} strokeWidth={1.5} />
            </button>

            {/* START CREATING button (not logged in) or New Deck (logged in, no avatar) */}
            {!isLoading && !user && (
              <Link
                href="/login"
                className="hidden lg:inline-flex whitespace-nowrap items-center gap-2 h-9 px-5 rounded-full bg-primary text-white text-[12px] font-medium hover:bg-primaryHover active:scale-[0.97] transition-all shadow-[0_2px_12px_rgba(0,9,250,0.2)] hover:shadow-[0_4px_16px_rgba(0,9,250,0.3)] group"
              >
                Start Creating
                <ChevronRight size={14} strokeWidth={1.5} className="group-hover:translate-x-0.5 transition-transform opacity-70" />
              </Link>
            )}

            {!isLoading && user && (
              <button
                type="button"
                onClick={() => setNewDeckOpen(true)}
                className="hidden lg:inline-flex whitespace-nowrap items-center gap-2 h-9 px-5 rounded-full bg-primary text-white text-[12px] font-medium hover:bg-primaryHover active:scale-[0.97] transition-all shadow-[0_2px_12px_rgba(0,9,250,0.2)] hover:shadow-[0_4px_16px_rgba(0,9,250,0.3)] group"
              >
                Start Creating
                <ChevronRight size={14} strokeWidth={1.5} className="group-hover:translate-x-0.5 transition-transform opacity-70" />
              </button>
            )}

            {/* User avatar + name (logged in) */}
            {!isLoading && user && (
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 pl-1.5 pr-3.5 h-9 rounded-full border border-white/60 hover:border-white bg-white/40 hover:bg-white/80 shadow-sm hover:shadow transition-all group"
                >
                  {/* Avatar */}
                  <div className="h-6 w-6 rounded-full overflow-hidden bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-inner">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{user.email?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  {/* Name + Role */}
                  <div className="hidden sm:flex flex-col items-start justify-center pt-0.5">
                    <span className="text-[11px] font-bold text-neutral-800 truncate max-w-[80px] leading-[1.1]">{displayName}</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-primary leading-tight mt-[1px]">{userRole}</span>
                  </div>
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                      className="absolute right-0 top-full mt-2 w-52 origin-top-right rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
                    >
                      <div className="mb-1 rounded-xl bg-neutral-50 px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">Signed in as</p>
                        <p className="mt-0.5 truncate text-[13px] font-semibold text-neutral-900">{user.email}</p>
                      </div>

                      <Link
                        href="/my-presentations"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                      >
                        <LayoutGrid size={15} strokeWidth={1.5} className="text-neutral-400" />
                        Dashboard
                      </Link>

                      <div className="mx-2 my-1 h-px bg-neutral-100" />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
                      >
                        <LogOut size={15} strokeWidth={1.5} className="text-red-400" />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[180] bg-black/25 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 340 }}
              className="fixed bottom-0 right-0 top-0 z-[190] flex w-[min(100%,20rem)] flex-col overflow-y-auto bg-white px-5 pb-8 pt-5 shadow-2xl lg:hidden"
            >
              <div className="mb-6 flex items-center justify-between">
                <img src="/logo.png.png" alt="Orbstera" className="h-6 w-auto object-contain" />
                <button
                  type="button"
                  className="rounded-xl p-2 text-neutral-500 hover:bg-neutral-100 transition-colors"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>

              <nav className="flex flex-col gap-0.5">
                {NAV_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl px-3 py-3 text-[13px] font-medium uppercase tracking-[0.08em] text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                {user && (
                  <Link
                    href="/my-presentations"
                    className="rounded-xl px-3 py-3 text-[13px] font-medium uppercase tracking-[0.08em] text-primary hover:bg-primary/5 transition-colors"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    My Decks
                  </Link>
                )}
              </nav>

              <div className="mt-auto flex flex-col gap-2 pt-6 border-t border-neutral-100">
                {!user && (
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-1.5 h-11 rounded-full bg-primary text-white text-[13px] font-medium uppercase tracking-[0.06em] hover:bg-primaryHover transition-colors"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Start Creating <ChevronRight size={15} strokeWidth={1.5} />
                  </Link>
                )}
                {user && (
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1.5 h-11 rounded-full bg-primary text-white text-[13px] font-medium uppercase tracking-[0.06em] hover:bg-primaryHover transition-colors"
                    onClick={() => {
                      setMobileNavOpen(false);
                      setNewDeckOpen(true);
                    }}
                  >
                    Start Creating <ChevronRight size={15} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <NewDeckModal open={newDeckOpen} onClose={() => setNewDeckOpen(false)} />
    </Fragment>
  );
}
