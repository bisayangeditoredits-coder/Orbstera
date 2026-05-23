'use client';

import Link from 'next/link';
import { LogOut, Menu, X, LayoutGrid, ChevronRight } from 'lucide-react';
import { useEffect, useState, useRef, Fragment } from 'react';
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
  const supabase = createClient();
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
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-200 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-[0_1px_0_rgba(0,0,0,0.06)]'
            : 'bg-white/90 backdrop-blur-sm'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-[52px] flex items-center justify-between gap-4">

          {/* ── Logo ── */}
          <Link
            href="/"
            className="flex items-center shrink-0 group"
            onClick={() => setMobileNavOpen(false)}
          >
            <img
              src="/logo.png.png"
              alt="Orbstera"
              className="h-[22px] w-auto object-contain group-hover:opacity-80 transition-opacity"
            />
          </Link>

          {/* ── Center Nav Links (desktop) ── */}
          <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-neutral-500 hover:text-neutral-900 transition-colors duration-150 group"
              >
                {item.label}
                <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full opacity-0 group-hover:opacity-100" />
              </Link>
            ))}
            {user && (
              <Link
                href="/my-presentations"
                className="relative px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-primary hover:text-primaryHover transition-colors duration-150"
              >
                My Decks
              </Link>
            )}
          </nav>

          {/* ── Right Actions ── */}
          <div className="flex items-center gap-3 shrink-0 ml-auto lg:ml-0">

            {/* Mobile burger */}
            <button
              type="button"
              className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 transition-all"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={18} strokeWidth={2} />
            </button>

            {/* START CREATING button (not logged in) or New Deck (logged in, no avatar) */}
            {!isLoading && !user && (
              <Link
                href="/login"
                className="hidden lg:inline-flex items-center gap-1.5 h-9 px-5 rounded-full bg-primary text-white text-[11.5px] font-bold uppercase tracking-[0.06em] hover:bg-primaryHover active:scale-[0.97] transition-all shadow-sm group"
              >
                Start Creating
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            {!isLoading && user && (
              <button
                type="button"
                onClick={() => setNewDeckOpen(true)}
                className="hidden lg:inline-flex items-center gap-1.5 h-9 px-5 rounded-full bg-primary text-white text-[11.5px] font-bold uppercase tracking-[0.06em] hover:bg-primaryHover active:scale-[0.97] transition-all shadow-sm group"
              >
                Start Creating
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            {/* User avatar + name (logged in) */}
            {!isLoading && user && (
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 pl-2 pr-3 h-9 rounded-full border border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50 transition-all group"
                >
                  {/* Avatar */}
                  <div className="h-6 w-6 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{user.email?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  {/* Name + Role */}
                  <div className="hidden sm:flex flex-col items-start leading-none">
                    <span className="text-[11px] font-semibold text-neutral-800 truncate max-w-[90px]">{displayName}</span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-primary mt-[1px]">{userRole}</span>
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
                        <LayoutGrid size={15} className="text-neutral-400" />
                        Dashboard
                      </Link>

                      <div className="mx-2 my-1 h-px bg-neutral-100" />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
                      >
                        <LogOut size={15} className="text-red-400" />
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
                  <X size={18} />
                </button>
              </div>

              <nav className="flex flex-col gap-0.5">
                {NAV_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl px-3 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                {user && (
                  <Link
                    href="/my-presentations"
                    className="rounded-xl px-3 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-primary hover:bg-primary/5 transition-colors"
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
                    className="flex items-center justify-center gap-1.5 h-11 rounded-full bg-primary text-white text-[13px] font-bold uppercase tracking-[0.06em] hover:bg-primaryHover transition-colors"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Start Creating <ChevronRight size={15} />
                  </Link>
                )}
                {user && (
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1.5 h-11 rounded-full bg-primary text-white text-[13px] font-bold uppercase tracking-[0.06em] hover:bg-primaryHover transition-colors"
                    onClick={() => {
                      setMobileNavOpen(false);
                      setNewDeckOpen(true);
                    }}
                  >
                    Start Creating <ChevronRight size={15} />
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
