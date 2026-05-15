'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  LayoutTemplate,
  Settings,
  ChevronDown,
  X,
} from 'lucide-react';
import type { DeckMeta } from '@/types/deck-meta';
import { cn } from '@/lib/cn';
import { formatPlanLabel } from './dashboard-utils';

const NAV = [
  { href: '/my-presentations', label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
  { href: '/my-presentations#decks', label: 'My decks', icon: Layers, id: 'decks' },
  { href: '/#templates', label: 'Templates', icon: LayoutTemplate, id: 'templates' },
  { href: '/settings', label: 'Settings', icon: Settings, id: 'settings' },
] as const;

type DashboardSidebarProps = {
  recentDecks: DeckMeta[];
  userName: string;
  plan: string;
  avatarUrl?: string | null;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  className?: string;
};

function isNavActive(pathname: string, id: string): boolean {
  if (id === 'settings') return pathname === '/settings';
  if (id === 'dashboard') return pathname === '/my-presentations';
  return false;
}

export function DashboardSidebar({
  recentDecks,
  userName,
  plan,
  avatarUrl,
  mobileOpen,
  onMobileClose,
  className,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const inner = (
    <>
      <div className="p-6 lg:p-8">
        <Link href="/" onClick={onMobileClose} className="group mb-10 inline-flex max-w-full items-center">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-xl bg-primary/15 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png.png"
              alt="Orbstera"
              className="relative z-10 h-8 w-auto max-w-[180px] object-contain object-left drop-shadow-sm transition-transform duration-300 group-hover:scale-[1.01] sm:h-9"
            />
          </div>
        </Link>
        <nav className="-mx-2 space-y-0.5" aria-label="Dashboard">
          <p className="mb-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Main</p>
          {NAV.map(({ href, label, icon: Icon, id }) => {
            const active = isNavActive(pathname, id);
            return (
              <Link
                key={id}
                href={href}
                onClick={onMobileClose}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                  active ? 'border-r-4 border-primary bg-white/50 text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/30 hover:text-slate-900',
                )}
              >
                <Icon size={20} strokeWidth={1.75} className={active ? 'text-primary' : 'text-slate-500'} />
                {label}
              </Link>
            );
          })}
        </nav>
        {recentDecks.length > 0 && (
          <div className="mt-10">
            <p className="mb-3 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Recent projects</p>
            <ul className="space-y-0.5">
              {recentDecks.slice(0, 4).map((deck, i) => (
                <li key={deck.id}>
                  <Link href={`/editor?id=${deck.id}`} onClick={onMobileClose} className="flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors hover:bg-white/30">
                    <span className={cn('h-2 w-2 shrink-0 rounded-full border-2 border-white shadow-sm', i % 2 === 0 ? 'bg-orange-400' : 'bg-emerald-400')} aria-hidden />
                    <span className="truncate text-sm font-medium text-slate-600 hover:text-slate-900">{deck.title || 'Untitled'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="mt-auto border-t border-white/40 p-4 lg:p-6">
        <Link href="/settings" onClick={onMobileClose} className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/40 p-4 backdrop-blur-md transition hover:bg-white/60">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-200 shadow-sm">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-montserrat text-sm font-bold text-slate-600">{userName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">{userName}</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">{formatPlanLabel(plan)}</p>
          </div>
          <ChevronDown size={16} className="shrink-0 text-slate-400" strokeWidth={1.75} />
        </Link>
      </div>
    </>
  );

  return (
    <>
      <aside
        className={cn(
          'hidden w-64 shrink-0 flex-col border-r border-white/40 bg-gradient-to-b from-[#E8F2FF] to-[#D4E8FF] shadow-xl lg:flex lg:sticky lg:top-0 lg:h-dvh',
          className,
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">{inner}</div>
      </aside>
      {mobileOpen && <button type="button" aria-label="Close menu" className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm lg:hidden" onClick={onMobileClose} />}
      <aside className={cn('fixed inset-y-0 left-0 z-[90] flex w-[min(280px,88vw)] flex-col border-r border-white/40 bg-gradient-to-b from-[#E8F2FF] to-[#D4E8FF] shadow-2xl transition-transform duration-300 lg:hidden', mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none')} aria-hidden={!mobileOpen}>
        <div className="flex items-center justify-end p-3">
          <button type="button" onClick={onMobileClose} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-white/40" aria-label="Close sidebar">
            <X size={22} strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{inner}</div>
      </aside>
    </>
  );
}