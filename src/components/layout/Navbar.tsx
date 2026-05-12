'use client';

import Link from 'next/link';
import {
  LogOut,
  ArrowRight,
  Settings,
  Command,
  Menu,
  X,
  LayoutGrid,
  Search,
} from 'lucide-react';
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

/** Dispatch global shortcut handlers (palette / command menu) without overlapping primary nav links. */
function dispatchCommandPaletteShortcut() {
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true, cancelable: true }),
  );
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true }),
  );
}

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

  const linkClass =
    'relative shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors duration-200 hover:text-slate-900 sm:text-[12px] sm:tracking-[0.13em] ' +
    'after:absolute after:-bottom-1 after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:rounded-full after:bg-primary after:transition-all after:duration-200 hover:after:w-4';

  const linkAccentClass =
    'relative shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary transition-colors duration-200 hover:text-primaryHover sm:text-[12px] sm:tracking-[0.13em] ' +
    'after:absolute after:-bottom-1 after:left-1/2 after:h-[2px] after:w-4 after:-translate-x-1/2 after:rounded-full after:bg-primary';

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] pt-[env(safe-area-inset-top,0px)]">
      <nav
        className="border-b border-slate-200/70 bg-white/85 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/75"
        aria-label="Primary"
      >
        <div className="mx-auto grid h-[52px] w-full max-w-[1400px] min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 px-3 sm:h-[60px] sm:gap-x-4 sm:px-5 md:px-8">
          {/* Left: logo only — keeps center nav truly centered and prevents chip overlap */}
          <div className="flex min-w-0 items-center justify-self-start">
            <Link
              href="/"
              className="group flex min-w-0 shrink-0 items-center"
              onClick={() => setMobileNavOpen(false)}
            >
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-primary/12 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                <img
                  src="/logo.png.png"
                  alt="Orbstera"
                  className="relative z-10 h-7 w-auto max-h-8 object-contain transition-transform duration-300 sm:h-8"
                />
              </div>
            </Link>
          </div>

          {/* Center: isolated nav strip — always above lateral overflow */}
          <div className="relative z-20 hidden min-w-0 justify-center lg:flex">
            <div
              className="flex max-w-[min(100vw-28rem,52rem)] items-center justify-center gap-x-1 overflow-x-auto whitespace-nowrap rounded-full border border-slate-200/60 bg-slate-50/50 px-2 py-1 shadow-inner shadow-slate-200/30 sm:gap-x-0 sm:px-3 sm:py-1.5"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {NAV_LINKS.map((item) => (
                <Link key={item.href} href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              ))}
              {user && (
                <>
                  <span
                    className="mx-1.5 hidden h-4 w-px shrink-0 bg-slate-200 sm:block"
                    aria-hidden
                  />
                  <Link href="/my-presentations" className={`${linkAccentClass} pl-1 sm:pl-0`}>
                    My decks
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Right: command hint + CTA + auth (no collision with Features) */}
          <div className="flex min-w-0 flex-nowrap items-center justify-end justify-self-end gap-1.5 sm:gap-2">
            <button
              type="button"
              className="hidden h-9 shrink-0 items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 shadow-sm transition hover:border-primary/25 hover:bg-white hover:text-slate-700 min-[1080px]:flex"
              aria-label="Open command palette — keyboard shortcut Command K"
              onClick={() => dispatchCommandPaletteShortcut()}
            >
              <Search size={12} strokeWidth={2} className="text-slate-400" aria-hidden />
              <kbd className="inline-flex items-center gap-0.5 rounded border border-slate-200/90 bg-slate-50 px-1.5 py-px font-mono text-[9px] font-medium text-slate-500">
                <Command size={9} aria-hidden strokeWidth={2.5} />
                <span>K</span>
              </kbd>
            </button>

            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-800 shadow-sm transition hover:border-primary/20 hover:bg-slate-50 touch-manipulation lg:hidden"
              aria-label="Open navigation menu"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu size={20} strokeWidth={2} />
            </button>

            <Link
              href="/editor"
              className="group relative flex h-9 shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full bg-gradient-to-b from-primary to-primaryHover px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-[0_10px_28px_-8px_rgba(37,99,235,0.55)] ring-1 ring-white/25 transition hover:brightness-[1.05] hover:shadow-[0_12px_36px_-10px_rgba(37,99,235,0.65)] active:scale-[0.98] touch-manipulation sm:h-10 sm:gap-2 sm:px-6 sm:text-[11px]"
            >
              <span className="relative z-10 truncate whitespace-nowrap">
                <span className="hidden xs:inline">Start Creating</span>
                <span className="xs:hidden">Create</span>
              </span>
              <ArrowRight
                size={14}
                className="relative z-10 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 sm:h-4 sm:w-4"
              />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </Link>

            {isLoading ? (
              <div className="hidden h-9 w-[120px] animate-pulse rounded-full bg-slate-100 sm:block sm:h-10" />
            ) : user ? (
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`hidden h-9 items-center gap-2 rounded-full border bg-white pl-1 pr-2.5 shadow-sm ring-slate-200/80 transition-all sm:flex sm:h-10 sm:pr-3 ${
                    dropdownOpen
                      ? 'border-primary/35 ring-2 ring-primary/12'
                      : 'border-slate-200 hover:border-primary/25 hover:shadow-md'
                  }`}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary via-indigo-500 to-indigo-600 shadow-inner">
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
                  <div className="hidden max-w-[7.5rem] flex-col items-start text-left text-[11px] leading-[1.15] text-slate-900 min-[1140px]:flex">
                    <span className="truncate font-semibold tracking-tight">
                      {user.email?.split('@')[0]}
                    </span>
                    <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Creator
                    </span>
                  </div>
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      className="absolute right-0 top-full z-[120] mt-2 w-56 origin-top-right rounded-2xl border border-slate-200/95 bg-white/98 p-1.5 shadow-xl shadow-slate-200/90 ring-1 ring-black/5 backdrop-blur-md"
                    >
                      <div className="mb-1 rounded-xl bg-slate-50/95 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Signed in as
                        </p>
                        <p className="truncate text-[12px] font-semibold text-slate-900">{user.email}</p>
                      </div>

                      <Link
                        href="/my-presentations"
                        onClick={() => setDropdownOpen(false)}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-primary/5 hover:text-primary"
                      >
                        <LayoutGrid size={16} className="text-slate-400 group-hover:text-primary" />
                        My presentations
                      </Link>

                      <Link
                        href="/account"
                        onClick={() => setDropdownOpen(false)}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-primary/5 hover:text-primary"
                      >
                        <Command size={16} className="text-slate-400 group-hover:text-primary" />
                        Account &amp; usage
                      </Link>

                      <Link
                        href="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-primary/5 hover:text-primary"
                      >
                        <Settings size={16} className="text-slate-400 group-hover:text-primary" />
                        Settings
                      </Link>

                      <div className="mx-2 my-1.5 h-px bg-slate-100" />

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
                className="hidden shrink-0 whitespace-nowrap px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-primary sm:inline sm:px-3"
              >
                Sign In
              </Link>
            )}

            {isLoading ? (
              <div className="flex h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100 sm:hidden" />
            ) : (
              user && (
                <Link
                  href="/my-presentations"
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200/90 bg-gradient-to-br from-primary to-indigo-600 shadow-sm touch-manipulation sm:hidden"
                  aria-label="My presentations"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-[11px] font-bold uppercase text-white">{user.email?.[0]}</span>
                  )}
                </Link>
              )
            )}
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[180] bg-slate-900/35 backdrop-blur-sm md:hidden"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed bottom-0 right-0 top-0 z-[190] flex w-[min(100%,20rem)] max-w-[100vw] flex-col overflow-y-auto overscroll-contain border-l border-slate-200/80 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-2xl shadow-slate-300/40 md:hidden"
            >
              <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Navigate
                </span>
                <button
                  type="button"
                  className="touch-manipulation rounded-xl p-2 text-slate-600 hover:bg-slate-100"
                  aria-label="Close menu"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((item) => (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className="rounded-xl px-3 py-3 text-[14px] font-semibold text-slate-800 transition-colors hover:bg-primary/6 hover:text-primary"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/contact"
                  className="rounded-xl px-3 py-3 text-[14px] font-semibold text-slate-800 transition-colors hover:bg-primary/6 hover:text-primary"
                  onClick={() => setMobileNavOpen(false)}
                >
                  Contact
                </Link>
                {user && (
                  <Link
                    href="/my-presentations"
                    className="rounded-xl px-3 py-3 text-[14px] font-semibold text-slate-800 transition-colors hover:bg-primary/6 hover:text-primary"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    My presentations
                  </Link>
                )}
                <button
                  type="button"
                  className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-600"
                  onClick={() => {
                    dispatchCommandPaletteShortcut();
                    setMobileNavOpen(false);
                  }}
                >
                  <Command size={14} />
                  Command palette
                </button>
                <Link
                  href="/editor"
                  className="mt-3 rounded-2xl bg-gradient-to-b from-primary to-primaryHover py-3.5 text-center text-[12px] font-bold uppercase tracking-widest text-white shadow-lg shadow-primary/25"
                  onClick={() => setMobileNavOpen(false)}
                >
                  Start Creating
                </Link>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
