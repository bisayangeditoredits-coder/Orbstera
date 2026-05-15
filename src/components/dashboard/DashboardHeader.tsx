'use client';

import Link from 'next/link';
import { Search, Plus, Menu, AlertTriangle } from 'lucide-react';

type DashboardHeaderProps = {
  query: string;
  onQueryChange: (q: string) => void;
  onNewDeck: () => void;
  onOpenMenu: () => void;
  creditsWarning?: boolean;
};

export function DashboardHeader({
  query,
  onQueryChange,
  onNewDeck,
  onOpenMenu,
  creditsWarning,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex shrink-0 flex-col gap-3 border-b border-white/50 bg-[#F0F7FF]/80 px-4 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/80 text-slate-700 shadow-sm transition hover:bg-white lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={22} strokeWidth={1.75} />
        </button>
        <div className="relative min-w-0 flex-1 group sm:max-w-md">
          <Search
            size={18}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search presentations…"
            className="w-full min-h-[44px] rounded-2xl border border-transparent bg-white/90 py-3 pl-12 pr-4 text-sm shadow-sm outline-none transition focus:border-primary/20 focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 sm:gap-4">
        {creditsWarning && (
          <Link
            href="/pricing"
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
            title="Credits running low"
          >
            <AlertTriangle size={16} strokeWidth={1.75} />
            <span className="hidden sm:inline">Low credits</span>
          </Link>
        )}
        <button
          type="button"
          onClick={onNewDeck}
          className="flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primaryHover active:scale-[0.98] sm:px-8"
        >
          <Plus size={18} strokeWidth={2} />
          New deck
        </button>
      </div>
    </header>
  );
}
