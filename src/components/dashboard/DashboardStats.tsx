'use client';

import { Plus, Zap, TrendingUp, FileText, Clock, ArrowRight, Sparkles, BookOpen, Briefcase } from 'lucide-react';
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
        <div className="relative w-full overflow-hidden rounded-[32px] border border-indigo-100/60 bg-white shadow-[0_20px_40px_-15px_rgba(99,102,241,0.08)] p-10 sm:p-14 mt-6">
          {/* Background Elements */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-[80px] -mr-40 -mt-40 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-500/10 to-cyan-500/10 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className="w-20 h-20 rounded-[1.25rem] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-8 shadow-[0_15px_30px_-10px_rgba(99,102,241,0.5),inset_0_2px_4px_rgba(255,255,255,0.4)]">
              <Sparkles size={36} className="text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-3xl sm:text-[40px] font-extrabold text-slate-900 tracking-tight mb-4 leading-tight">
              Your blank canvas awaits
            </h2>
            <p className="text-[15px] text-slate-500 leading-relaxed mb-10 max-w-xl">
              Let Orbstera's AI craft a cinematic, fully-editable presentation in seconds. Choose a template or start from scratch.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              {[
                { title: 'Pitch Deck', desc: 'Fundraise with confidence', icon: TrendingUp },
                { title: 'Business Review', desc: 'Quarterly metrics & goals', icon: Briefcase },
                { title: 'Education', desc: 'Engage your students', icon: BookOpen }
              ].map((t, i) => (
                <button 
                  key={i}
                  onClick={onNewDeck}
                  className="group relative flex flex-col items-start p-6 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 transition-all duration-300 hover:shadow-[0_15px_35px_-10px_rgba(99,102,241,0.15)] text-left hover:-translate-y-1 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-indigo-50/0 group-hover:from-indigo-50/80 group-hover:to-purple-50/80 transition-colors duration-300" />
                  <div className="w-12 h-12 rounded-xl bg-slate-50 group-hover:bg-white flex items-center justify-center mb-5 transition-colors duration-300 border border-slate-100 group-hover:border-indigo-100 relative z-10 shadow-sm">
                    <t.icon size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors duration-300" strokeWidth={2.25} />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1.5 relative z-10 text-[15px]">{t.title}</h3>
                  <p className="text-[13px] text-slate-500 relative z-10 font-medium">{t.desc}</p>
                </button>
              ))}
            </div>

            <div className="mt-12 flex items-center justify-center gap-4 relative z-10">
              <button
                type="button"
                onClick={onNewDeck}
                className="inline-flex items-center gap-2.5 h-14 px-8 rounded-2xl text-white text-[15px] font-bold hover:opacity-90 hover:shadow-[0_15px_30px_-10px_rgba(99,102,241,0.5)] transition-all active:scale-[0.97] border border-white/10"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
              >
                <Plus size={18} strokeWidth={2.5} /> Create blank presentation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
