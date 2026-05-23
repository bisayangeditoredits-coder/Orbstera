'use client';

import { Plus, Zap, TrendingUp, FileText, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { DeckMeta } from '@/types/deck-meta';
import type { CreditState } from '@/hooks/useCredits';

type Props = {
  decks: DeckMeta[];
  userName: string;
  credits: CreditState;
  onNewDeck: () => void;
  onOpenSettings: () => void;
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardStats({ decks, userName, credits, onNewDeck, onOpenSettings }: Props) {
  const firstName = userName.split(' ')[0] || 'Creator';
  const isFree = credits.plan === 'free' || !credits.plan;
  const usagePct = credits.usagePct ?? 0;

  // Most recent deck
  const lastEdited = decks.length > 0
    ? [...decks].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0]
    : null;

  return (
    <div className="space-y-6 pb-2">
      {/* ── Hero greeting row ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">
            {getGreeting()}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
            {firstName}
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-medium">
            {decks.length === 0
              ? 'Ready to create your first presentation?'
              : `${decks.length} presentation${decks.length === 1 ? '' : 's'} in your workspace`}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-2 h-10 px-4 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Zap size={13} className={usagePct >= 90 ? 'text-amber-500' : 'text-slate-400'} />
            <span className={usagePct >= 90 ? 'text-amber-600' : ''}>
              {credits.loading ? '—' : `${credits.remaining ?? 0} credits`}
            </span>
            {isFree && (
              <Link
                href="/pricing"
                onClick={(e) => e.stopPropagation()}
                className="ml-0.5 text-[11px] font-bold text-primary hover:underline"
              >
                Upgrade
              </Link>
            )}
          </button>

          <button
            type="button"
            onClick={onNewDeck}
            className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-white text-[13px] font-bold hover:bg-primaryHover active:scale-[0.97] transition-all shadow-md shadow-blue-500/20"
          >
            <Plus size={15} strokeWidth={2.5} />
            New deck
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Decks */}
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
              <FileText size={15} className="text-slate-400" strokeWidth={1.75} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Total</span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{decks.length}</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Presentations</p>
        </div>

        {/* Credits */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
              <Zap size={15} className="text-slate-400" strokeWidth={1.75} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
              {usagePct.toFixed(0)}% used
            </span>
          </div>
          <p className={`text-2xl font-extrabold tracking-tight ${usagePct >= 90 ? 'text-amber-500' : 'text-slate-900'}`}>
            {credits.loading ? '—' : credits.remaining ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Credits left</p>
        </button>

        {/* Plan */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
              <TrendingUp size={15} className="text-slate-400" strokeWidth={1.75} />
            </div>
            <ArrowRight size={12} className="text-slate-300" strokeWidth={1.75} />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 tracking-tight capitalize">
            {credits.plan || 'Free'}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Current plan</p>
        </button>

        {/* Last edited */}
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
              <Clock size={15} className="text-slate-400" strokeWidth={1.75} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Recent</span>
          </div>
          <p className="text-sm font-bold text-slate-900 tracking-tight truncate leading-snug">
            {lastEdited ? lastEdited.title || 'Untitled' : '—'}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Last edited</p>
        </div>
      </div>

      {/* ── Empty state ── */}
      {decks.length === 0 && (
        <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50/50">
          <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Plus size={18} className="text-slate-400" strokeWidth={1.75} />
          </div>
          <h3 className="font-bold text-slate-900 mb-1 text-sm">Create your first deck</h3>
          <p className="text-sm text-slate-400 mb-5">Our AI will generate a stunning presentation in seconds.</p>
          <button
            type="button"
            onClick={onNewDeck}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primaryHover transition-all shadow-md shadow-blue-500/20"
          >
            <Plus size={14} strokeWidth={2.5} /> Get started
          </button>
        </div>
      )}
    </div>
  );
}
