'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  Layers,
  LayoutTemplate,
  ChevronDown,
  X,
  History,
} from 'lucide-react';
import type { DeckMeta } from '@/types/deck-meta';
import { cn } from '@/lib/cn';
import { formatPlanLabel } from './dashboard-utils';
import type { DashboardSection } from './dashboard-types';

const NAV: {
  id: DashboardSection | 'templates';
  label: string;
  icon: typeof LayoutDashboard;
  external?: boolean;
  href?: string;
}[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'decks', label: 'My Documents', icon: Layers },
  { id: 'planner-history', label: 'Chat History', icon: History },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate, external: true, href: '/#templates' },
];

type DashboardSidebarProps = {
  section: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
  recentDecks: DeckMeta[];
  userName: string;
  plan: string;
  avatarUrl?: string | null;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  className?: string;
};

function isNavActive(section: DashboardSection, id: DashboardSection | 'templates'): boolean {
  if (id === 'templates') return false;
  if (id === 'decks') return section === 'decks';
  if (id === 'planner-history') return section === 'planner-history';
  if (id === 'overview') return section === 'overview' || section === 'settings';
  return false;
}

export function DashboardSidebar({
  section,
  onNavigate,
  recentDecks,
  userName,
  plan,
  avatarUrl,
  mobileOpen,
  onMobileClose,
  className,
}: DashboardSidebarProps) {
  const inner = (
    <>
      <div className="p-6 lg:p-8">
        <Link href="/" onClick={onMobileClose} className="mb-10 inline-flex max-w-full items-center">
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png-white.png"
              alt="Orbstera"
              className="h-8 w-auto max-w-[180px] object-contain object-left sm:h-9"
            />
          </div>
        </Link>
        <nav className="-mx-3 space-y-1" aria-label="Dashboard">
          <p className="mb-3 px-3 text-[11px] font-semibold tracking-[0.15em] text-neutral-500">Main</p>
          {NAV.map(({ id, label, icon: Icon, external, href }) => {
            const active = !external && isNavActive(section, id);
            const baseClass = cn(
              'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-left',
              active
                ? 'bg-primary/10 text-white ring-1 ring-primary/20'
                : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200',
            );

            if (external && href) {
              return (
                <Link key={id} href={href} onClick={onMobileClose} className={baseClass}>
                  <Icon size={18} strokeWidth={2} className="text-neutral-500 group-hover:text-neutral-300" />
                  {label}
                </Link>
              );
            }

            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onNavigate(id as DashboardSection);
                  onMobileClose?.();
                }}
                className={baseClass}
              >
                <Icon
                  size={18}
                  strokeWidth={2}
                  className={active ? 'text-primary' : 'text-neutral-500 group-hover:text-neutral-400'}
                />
                {label}
              </button>
            );
          })}
        </nav>
        {recentDecks.length > 0 && (
          <div className="mt-10 -mx-3">
            <p className="mb-3 px-3 text-[11px] font-semibold tracking-[0.15em] text-neutral-500">
              Recent Projects
            </p>
            <ul className="space-y-1">
              {recentDecks.slice(0, 4).map((deck, i) => (
                <li key={deck.id}>
                  <Link
                    href={`/editor?id=${deck.id}`}
                    onClick={onMobileClose}
                    className="group flex items-center gap-3.5 rounded-xl px-3 py-2.5 transition-all hover:bg-white/[0.06] hover:shadow-sm"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] shadow-sm transition-all group-hover:scale-105 group-hover:bg-white/[0.08] group-hover:border-white/20">
                      <LayoutTemplate size={16} strokeWidth={2} className="text-neutral-400 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-[13px] font-medium text-neutral-300 group-hover:text-white transition-colors">
                        {deck.title || 'Untitled'}
                      </span>
                      <span className="truncate text-[11px] text-neutral-500 font-medium">
                        {deck.date ? new Date(deck.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently edited'}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="mt-auto border-t border-white/[0.05] p-4 lg:p-6">
        <button
          type="button"
          onClick={() => {
            onNavigate('settings');
            onMobileClose?.();
          }}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors',
            section === 'settings'
              ? 'bg-white/[0.06] ring-1 ring-white/[0.05]'
              : 'hover:bg-white/[0.04]',
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/10 bg-neutral-800">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-montserrat text-sm font-medium text-neutral-300">
                {userName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{userName}</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-500 mt-0.5">
              {formatPlanLabel(plan)}
            </p>
          </div>
          <ChevronDown size={16} className="shrink-0 text-neutral-500" strokeWidth={1.75} />
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside
        className={cn(
          'hidden w-64 shrink-0 flex-col border-r border-white/[0.05] bg-[#0A0E17] lg:flex lg:sticky lg:top-0 lg:h-dvh',
          className,
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">{inner}</div>
      </aside>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[90] flex w-[min(280px,88vw)] flex-col border-r border-white/[0.05] bg-[#0A0E17] shadow-2xl transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="flex items-center justify-end p-3">
          <button
            type="button"
            onClick={onMobileClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-neutral-500 hover:bg-white/5"
            aria-label="Close sidebar"
          >
            <X size={22} strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{inner}</div>
      </aside>
    </>
  );
}
