'use client';

import Link from 'next/link';
import { Search, Menu, AlertTriangle, ArrowLeft, Sparkles } from 'lucide-react';
import type { DashboardSection } from './dashboard-types';

const SECTION_TITLES: Record<DashboardSection, string> = {
  overview: 'Workspace',
  decks: 'My Documents',
  'planner-history': 'Chat History',
  settings: 'Account & Billing',
};

const SECTION_SUBTITLES: Record<DashboardSection, string> = {
  overview: 'Your presentation workspace',
  decks: 'All your saved presentations',
  'planner-history': 'Previous AI planning sessions',
  settings: 'Manage your plan and preferences',
};

type DashboardHeaderProps = {
  section: DashboardSection;
  query: string;
  onQueryChange: (q: string) => void;
  onNewDeck: () => void;
  onOpenMenu: () => void;
  onOpenSettings: () => void;
  onBackToWorkspace?: () => void;
  creditsWarning?: boolean;
};

export function DashboardHeader({
  section,
  query,
  onQueryChange,
  onNewDeck,
  onCreateAIDeck,
  onOpenMenu,
  onOpenSettings,
  onBackToWorkspace,
  creditsWarning,
}: DashboardHeaderProps & { onCreateAIDeck?: () => void }) {
  const showSearch = section !== 'settings';

  return (
    <header className="sticky top-0 z-20 flex shrink-0 flex-col border-b border-slate-100 bg-white/98 backdrop-blur-md">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 px-5 py-3 sm:px-8">
        {/* Left: mobile menu + page title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>

          <div className="min-w-0 hidden lg:block">
            <div className="flex items-center gap-2">
              {section === 'settings' && onBackToWorkspace && (
                <button
                  type="button"
                  onClick={onBackToWorkspace}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-400 hover:text-slate-700 transition-colors mr-1"
                >
                  <ArrowLeft size={13} />
                  Back
                </button>
              )}
              <h1 className="text-[15px] font-semibold text-slate-900 tracking-tight truncate">
                {SECTION_TITLES[section]}
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">{SECTION_SUBTITLES[section]}</p>
          </div>

          <div className="min-w-0 lg:hidden">
            <h1 className="text-base font-semibold text-slate-900 tracking-tight">{SECTION_TITLES[section]}</h1>
          </div>
        </div>

        {/* Center: Search */}
        {showSearch && (
          <div className="relative hidden flex-1 max-w-sm group sm:flex items-center mx-4">
            <Search
              size={15}
              strokeWidth={2}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search presentations…"
              className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition focus:border-primary/30 focus:bg-white focus:ring-2 focus:ring-primary/10 placeholder:text-slate-400"
            />
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {section !== 'settings' && (
            <button
              type="button"
              onClick={onCreateAIDeck || onNewDeck}
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md bg-primary text-white text-[13px] font-medium hover:bg-primaryHover transition-colors shadow-sm"
            >
              <Sparkles size={13} strokeWidth={2.5} /> Create AI Deck
            </button>
          )}

          {creditsWarning && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-amber-200 bg-amber-50 text-[12px] font-semibold text-amber-700 hover:bg-amber-100 transition-all"
            >
              <AlertTriangle size={12} strokeWidth={2.5} />
              <span className="hidden sm:inline">Low credits</span>
            </button>
          )}

          {section === 'settings' && (
            <button
              type="button"
              onClick={onBackToWorkspace}
              className="flex lg:hidden items-center h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition-all"
            >
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* Mobile search */}
      {showSearch && (
        <div className="relative px-4 pb-3 group sm:hidden">
          <Search
            size={15}
            strokeWidth={2}
            className="pointer-events-none absolute left-7.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search presentations…"
            className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none focus:border-primary/30 focus:bg-white focus:ring-2 focus:ring-primary/10"
          />
        </div>
      )}
    </header>
  );
}
