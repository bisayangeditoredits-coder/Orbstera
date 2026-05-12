'use client';

import Link from 'next/link';
import { LogOut, ArrowRight, Settings, Command, Menu, X, LayoutGrid } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

const NAV_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#templates', label: 'Templates' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Journal' },
] as const;

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
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
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setIsLoading(false);
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] border-b border-white/20 bg-white/70 backdrop-blur-xl pt-[env(safe-area-inset-top,0px)] shadow-[0_1px_0_rgba(59,130,246,0.06)]">
      <div className="mx-auto flex h-[52px] w-full max-w-7xl min-w-0 items-center justify-between gap-2 px-3 sm:h-14 sm:gap-3 sm:px-5 md:px-8">
        {/* Left */}
        <div className="flex flex-1 justify-start min-w-0 items-center gap-4">
          <Link
            href="/"
            className="group flex shrink-0 items-center min-w-0"
            onClick={() => setMobileNavOpen(false)}
          >
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-full bg-primary/15 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
              <img
                src="/logo.png.png"
                alt="Orbstera"
                className="relative z-10 h-7 w-auto max-h-8 object-contain transition-transform duration-300 sm:h-8"
              />
            </div>
          </Link>

          {/* Cmd + K Hint - Premium SaaS feel */}
          <div className="hidden min-[1100px]:flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/50 border border-slate-200/60 text-[10px] font-black text-slate-400 cursor-pointer hover:border-primary/30 transition-all group/k" onClick={() => {
            const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true });
            document.dispatchEvent(e);
          }}>
            <span className="flex items-center gap-0.5"><Command size={10} className="group-hover/k:text-primary transition-colors" />K</span>
          </div>
        </div>

        {/* Center: single horizontal strip — scroll on narrow desktop, never wrap */}
        <div className="mx-1 hidden min-h-0 min-w-0 flex-shrink justify-center overflow-hidden lg:flex lg:px-1">
          <div
            className="flex max-w-full flex-nowrap items-center justify-center gap-x-4 overflow-x-auto overscroll-x-contain whitespace-nowrap py-0.5 font-montserrat text-[11px] font-bold uppercase tracking-[0.12em] text-textSecondary scrollbar-none sm:gap-x-5 sm:text-[13px] sm:tracking-[0.15em] lg:gap-x-6"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 text-textSecondary transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <Link
                href="/my-presentations"
                className="shrink-0 border-l border-primary/15 pl-3 text-primary transition-colors hover:text-primaryHover sm:pl-4"
              >
                My decks
              </Link>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-1 flex-nowrap items-center justify-end gap-1.5 sm:gap-2">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-white text-gray-800 transition-colors hover:bg-accentBlue touch-manipulation lg:hidden"
            aria-label="Open navigation menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu size={20} strokeWidth={2} />
          </button>

          <Link
            href="/editor"
            className="group relative flex h-9 shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full bg-primary px-4 text-[10px] font-bold uppercase tracking-widest text-white shadow-[0_8px_20px_-6px_rgba(59,130,246,0.45)] transition-all hover:bg-primaryHover hover:shadow-primary/30 active:scale-[0.98] touch-manipulation sm:h-10 sm:gap-2 sm:px-6 sm:text-[11px] md:h-11 md:px-7 md:text-[12px]"
          >
            <span className="relative z-10 truncate whitespace-nowrap">
              <span className="hidden xs:inline">Start Creating</span>
              <span className="xs:hidden">Create</span>
            </span>
            <ArrowRight
              size={14}
              className="relative z-10 shrink-0 transition-transform group-hover:translate-x-1 sm:w-4 sm:h-4"
            />
            <div className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>

          {isLoading ? (
            <div className="hidden h-9 w-[120px] animate-pulse rounded-full bg-gray-100 sm:block sm:h-10" />
          ) : user ? (
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`hidden h-9 items-center gap-2 rounded-full border bg-white/90 pl-1 pr-2.5 shadow-sm transition-all sm:flex sm:h-10 sm:pr-3 ${
                  dropdownOpen
                    ? 'border-primary/40 ring-2 ring-primary/15'
                    : 'border-gray-200/80 hover:border-primary/25'
                }`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary via-indigo-500 to-indigo-600">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-[12px] font-bold uppercase text-white">
                      {user.email?.[0]}
                    </span>
                  )}
                </div>
                <div className="hidden max-w-[7rem] flex-col text-left text-[10px] leading-tight min-[1100px]:flex">
                  <span className="truncate font-semibold text-gray-900">{user.email?.split('@')[0]}</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Creator</span>
                </div>
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="absolute right-0 top-full z-[120] mt-2 w-56 origin-top-right rounded-2xl border border-gray-100/90 bg-white/98 p-1.5 shadow-xl ring-1 ring-black/5 backdrop-blur-md"
                  >
                    <div className="mb-1 rounded-xl bg-gray-50/80 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Signed in as</p>
                      <p className="truncate text-[12px] font-semibold text-gray-900">{user.email}</p>
                    </div>

                    <Link
                      href="/my-presentations"
                      onClick={() => setDropdownOpen(false)}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-primary/5 hover:text-primary"
                    >
                      <LayoutGrid size={16} className="text-gray-400 group-hover:text-primary" />
                      My presentations
                    </Link>

                    <Link
                      href="/account"
                      onClick={() => setDropdownOpen(false)}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-primary/5 hover:text-primary"
                    >
                      <Command size={16} className="text-gray-400 group-hover:text-primary" />
                      Account &amp; usage
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-gray-700 transition-colors hover:bg-primary/5 hover:text-primary"
                    >
                      <Settings size={16} className="text-gray-400 group-hover:text-primary" />
                      Settings
                    </Link>

                    <div className="mx-2 my-1.5 h-px bg-gray-100" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut size={16} className="text-red-400 group-hover:text-red-600" />
                      Log out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden shrink-0 whitespace-nowrap px-2 text-[11px] font-bold uppercase tracking-widest text-textSecondary transition-colors hover:text-primary sm:inline sm:px-3"
            >
              Sign In
            </Link>
          )}

          {isLoading ? (
            <div className="flex h-9 w-9 shrink-0 animate-pulse rounded-full bg-gray-100 sm:hidden" />
          ) : user && (
            <Link
              href="/my-presentations"
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200/80 bg-gradient-to-br from-primary to-indigo-600 touch-manipulation sm:hidden"
              aria-label="My presentations"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-[11px] font-bold uppercase text-white">{user.email?.[0]}</span>
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
              className="fixed inset-0 z-[180] bg-black/40 backdrop-blur-sm md:hidden"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed bottom-0 right-0 top-0 z-[190] flex w-[min(100%,20rem)] max-w-[100vw] flex-col overflow-y-auto overscroll-contain bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-2xl md:hidden"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-montserrat text-[11px] font-semibold uppercase tracking-[0.2em] text-textSecondary">
                  Navigate
                </span>
                <button
                  type="button"
                  className="touch-manipulation rounded-xl p-2 text-gray-600 hover:bg-gray-100"
                  aria-label="Close menu"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="flex flex-col gap-1 font-montserrat">
                {NAV_LINKS.map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className="rounded-xl px-3 py-3 text-[14px] font-semibold text-gray-800 transition-colors hover:bg-primary/5 hover:text-primary"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/contact"
                  className="rounded-xl px-3 py-3 text-[14px] font-semibold text-gray-800 transition-colors hover:bg-primary/5 hover:text-primary"
                  onClick={() => setMobileNavOpen(false)}
                >
                  Contact
                </Link>
                {user && (
                  <Link
                    href="/my-presentations"
                    className="rounded-xl px-3 py-3 text-[14px] font-semibold text-gray-800 transition-colors hover:bg-primary/5 hover:text-primary"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    My presentations
                  </Link>
                )}
                <Link
                  href="/editor"
                  className="mt-4 rounded-2xl bg-primary py-3.5 text-center text-[12px] font-bold uppercase tracking-widest text-white shadow-md"
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
