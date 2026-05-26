'use client';

import { useState } from 'react';
import { Plus, Zap, TrendingUp, FileText, Clock, ArrowRight, Sparkles, BookOpen, Briefcase, Play, X } from 'lucide-react';
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
  const [showDemoBanner, setShowDemoBanner] = useState(true);
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            {getGreeting()}
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight leading-[1.1]">
            {firstName}
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">
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

      {/* ── Demo Banner ── */}
      {showDemoBanner && (
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-[#F4F7FF] via-[#F8FAFC] to-[#F1F5F9] border border-[#E2E8F0] shadow-[0_4px_20px_rgba(0,0,0,0.03)] mt-2">
          <button 
            onClick={() => setShowDemoBanner(false)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-full transition-colors z-10"
          >
            <X size={18} />
          </button>
          
          <div className="flex flex-col md:flex-row gap-8 p-3 sm:p-3 items-stretch">
            {/* Video Embed */}
            <div className="relative w-full md:w-[480px] shrink-0 aspect-video rounded-[14px] overflow-hidden bg-black flex items-center justify-center">
              <iframe width="100%" height="100%" src="https://www.youtube.com/embed/q_rhPocHIOQ?si=Am17HQewFPyjSFwx&rel=0&modestbranding=1" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-center py-6 pr-10 px-4 md:px-0">
              <h2 className="text-[28px] sm:text-[34px] font-semibold text-slate-900 tracking-tight mb-4 leading-tight">Welcome to Orbstera!</h2>
              <p className="text-[15px] sm:text-[16px] text-slate-600 leading-relaxed max-w-xl mb-8 font-medium">
                See a quick tour of Orbstera so you can get started and create your first AI-generated presentation. Watch the video to learn more!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Decks */}
        <div className="bg-slate-100 border border-slate-200/60 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200/50">
              <FileText size={15} className="text-slate-400" strokeWidth={1.75} />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Total</span>
          </div>
          <p className="text-3xl font-semibold text-slate-900 tracking-tight">{decks.length}</p>
          <p className="text-[13px] text-slate-500 font-medium mt-0.5">Presentations</p>
        </div>

        {/* Credits */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="bg-slate-100 border border-slate-200/60 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200/50">
              <Zap size={15} className="text-slate-400" strokeWidth={1.75} />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              {usagePct.toFixed(0)}% used
            </span>
          </div>
          <p className={`text-3xl font-semibold tracking-tight ${usagePct >= 90 ? 'text-amber-500' : 'text-slate-900'}`}>
            {credits.loading ? '—' : credits.remaining ?? 0}
          </p>
          <p className="text-[13px] text-slate-500 font-medium mt-0.5">Credits left</p>
        </button>

        {/* Plan */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="bg-slate-100 border border-slate-200/60 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200/50">
              <TrendingUp size={15} className="text-slate-400" strokeWidth={1.75} />
            </div>
            <ArrowRight size={12} className="text-slate-300" strokeWidth={1.75} />
          </div>
          <p className="text-3xl font-semibold text-slate-900 tracking-tight capitalize">
            {credits.plan || 'Free'}
          </p>
          <p className="text-[13px] text-slate-500 font-medium mt-0.5">Current plan</p>
        </button>

        {/* Last edited */}
        <div className="bg-slate-100 border border-slate-200/60 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-slate-200/50">
              <Clock size={15} className="text-slate-400" strokeWidth={1.75} />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Recent</span>
          </div>
          <p className="text-base font-semibold text-slate-900 tracking-tight truncate leading-snug">
            {lastEdited ? lastEdited.title || 'Untitled' : '—'}
          </p>
          <p className="text-[13px] text-slate-500 font-medium mt-0.5">Last edited</p>
        </div>
      </div>

      {/* ── Empty state ── */}
      {decks.length === 0 && (
        <div className="w-full mt-8">
          <div className="flex flex-col lg:flex-row gap-8 lg:items-center">
            <div className="flex-1 max-w-lg">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-slate-200/60 bg-slate-50 text-slate-500 mb-5">
                <Sparkles size={11} strokeWidth={2.5} className="text-indigo-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Orbstera AI</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 tracking-tight">
                Welcome to Orbstera
              </h2>
              <p className="text-[15px] text-slate-500 mb-8 leading-relaxed">
                Start crafting cinematic, fully-editable presentations in seconds. You can start with a blank canvas or use one of our quick templates to hit the ground running.
              </p>
              <button
                type="button"
                onClick={onNewDeck}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-md bg-primary text-white text-[13px] font-semibold hover:bg-primaryHover transition-colors shadow-sm"
              >
                <Plus size={16} strokeWidth={2.5} /> Create blank presentation
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:pl-10 lg:border-l border-slate-100">
              {[
                { title: 'Pitch Deck', desc: 'Fundraise with confidence', icon: TrendingUp },
                { title: 'Business Review', desc: 'Quarterly metrics & goals', icon: Briefcase },
                { title: 'Education', desc: 'Engage your students', icon: BookOpen },
                { title: 'Brainstorm', desc: 'Share ideas quickly', icon: Sparkles }
              ].map((t, i) => (
                <button 
                  key={i}
                  onClick={onNewDeck}
                  className="group flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 group-hover:bg-indigo-50 transition-colors border border-slate-100 group-hover:border-indigo-100">
                    <t.icon size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-0.5 text-[13px]">{t.title}</h3>
                    <p className="text-[12px] text-slate-500">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
