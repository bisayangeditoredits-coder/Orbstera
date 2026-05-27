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
  badge?: string;
}[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'decks', label: 'My Documents', icon: Layers },
  { id: 'planner-history', label: 'Chat History', icon: History },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate, badge: 'Soon' },
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
              src="/logo.png.png"
              alt="Orbstera"
              className="h-8 w-auto max-w-[180px] object-contain object-left sm:h-9"
            />
          </div>
        </Link>
        <nav className="-mx-2 space-y-0.5" aria-label="Dashboard">
          {NAV.map(({ id, label, icon: Icon, external, href, badge }) => {
            const active = !external && isNavActive(section, id);
            const isComingSoon = badge === 'Soon';
            const baseClass = cn(
              'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors text-left',
              active
                ? 'bg-[#E5E7EB] text-slate-900'
                : isComingSoon 
                  ? 'text-slate-400 cursor-not-allowed'
                  : 'text-slate-700 hover:bg-[#E5E7EB]/80 hover:text-slate-900',
            );

            const content = (
              <>
                <Icon
                  size={18}
                  strokeWidth={1.5}
                  className={active ? 'text-slate-900' : isComingSoon ? 'text-slate-300' : 'text-slate-600 group-hover:text-slate-800'}
                />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                    badge === 'Soon' ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-500"
                  )}>
                    {badge}
                  </span>
                )}
              </>
            );

            if (external && href) {
              return (
                <Link key={id} href={href} onClick={onMobileClose} className={baseClass}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={id}
                type="button"
                disabled={isComingSoon}
                onClick={() => {
                  if (isComingSoon) return;
                  onNavigate(id as DashboardSection);
                  onMobileClose?.();
                }}
                className={baseClass}
              >
                {content}
              </button>
            );
          })}
        </nav>
        {recentDecks.length > 0 && (
          <div className="mt-8 -mx-2">
            <p className="mb-2 px-3 text-[13px] font-medium text-slate-500">
              Recent Projects
            </p>
            <ul className="space-y-0.5">
              {recentDecks.slice(0, 4).map((deck) => (
                <li key={deck.id}>
                  <Link
                    href={`/editor?id=${deck.id}`}
                    onClick={onMobileClose}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-slate-200/70"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200/60 bg-white group-hover:border-slate-300">
                      <LayoutTemplate size={16} strokeWidth={1.5} className="text-slate-600 group-hover:text-slate-800 transition-colors" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-[14px] font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                        {deck.title || 'Untitled'}
                      </span>
                      <span className="truncate text-[10px] text-slate-400">
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
      <div className="mt-auto border-t border-slate-100 p-4 lg:p-6">
        <button
          type="button"
          onClick={() => {
            onNavigate('settings');
            onMobileClose?.();
          }}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors',
            section === 'settings'
              ? 'bg-[#E5E7EB] text-slate-900'
              : 'hover:bg-[#E5E7EB]/80',
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-slate-200/50 bg-slate-100">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[13px] font-medium text-slate-700">
                {userName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-slate-900">{userName}</p>
            <div className="mt-1 inline-flex items-center rounded-[4px] bg-[#E0F2FE] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0284C7]">
              {formatPlanLabel(plan)}
            </div>
          </div>
          <ChevronDown size={14} className="shrink-0 text-slate-400" strokeWidth={1.5} />
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside
        className={cn(
          'hidden w-64 shrink-0 flex-col border-r border-slate-200/60 bg-slate-100 lg:flex lg:sticky lg:top-0 lg:h-dvh',
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
          'fixed inset-y-0 left-0 z-[90] flex w-[min(280px,88vw)] flex-col border-r border-slate-200/60 bg-slate-100 shadow-2xl transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="flex items-center justify-end p-3">
          <button
            type="button"
            onClick={onMobileClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label="Close sidebar"
          >
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{inner}</div>
      </aside>
    </>
  );
}
