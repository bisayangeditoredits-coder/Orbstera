'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase';
import type { DeckMeta } from '@/types/deck-meta';
import { useCredits } from '@/hooks/useCredits';
import { NewDeckModal } from '@/components/workspace/NewDeckModal';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { DashboardStats } from './DashboardStats';
import { PresentationGrid } from './PresentationGrid';
import { DashboardSettings } from './DashboardSettings';
import { DashboardQuickTools } from './DashboardQuickTools';
import { DashboardCreditBreakdown } from './DashboardCreditBreakdown';
import { DashboardUsageHistory } from './DashboardUsageHistory';
import { sortByUpdated } from './dashboard-utils';
import {
  type DashboardSection,
  sectionFromHash,
  hashForSection,
} from './dashboard-types';

export function DashboardShell() {
  const [presentations, setPresentations] = useState<DeckMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeckMeta | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Creator');
  const [plan, setPlan] = useState('free');
  const [freeTier, setFreeTier] = useState<{
    generativeFillUsed: number;
    generativeFillLimit: number;
    magicEditUsed: number;
    magicEditLimit: number;
  } | null>(null);
  const [decksRemainingEstimate, setDecksRemainingEstimate] = useState<number | undefined>();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [section, setSection] = useState<DashboardSection>('overview');
  const decksRef = useRef<HTMLDivElement | null>(null);

  const credits = useCredits();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/credits/summary', { credentials: 'include' });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (json.freeTier) setFreeTier(json.freeTier);
        if (typeof json.decksRemainingEstimate === 'number') {
          setDecksRemainingEstimate(json.decksRemainingEstimate);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [credits.used, credits.remaining]);

  const navigateSection = useCallback((next: DashboardSection) => {
    setSection(next);
    const hash = hashForSection(next);
    const url = `/my-presentations${hash}`;
    if (window.location.pathname + window.location.hash !== url) {
      window.history.replaceState(null, '', url);
    }
    if (next === 'decks') {
      requestAnimationFrame(() => {
        decksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    if (next === 'settings') {
      requestAnimationFrame(() => {
        document.getElementById('settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, []);

  useEffect(() => {
    const syncFromHash = () => setSection(sectionFromHash(window.location.hash));
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'success') return;
    navigateSection('settings');
    void credits.refresh();
    params.delete('payment');
    const qs = params.toString();
    window.history.replaceState(null, '', `/my-presentations#settings${qs ? `?${qs}` : ''}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when returning from checkout
  }, []);

  const loadPresentations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/presentations');
      if (res.ok) {
        const data = (await res.json()) as DeckMeta[];
        setPresentations(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPresentations();
  }, [loadPresentations]);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const name =
          user.user_metadata?.full_name || user.email?.split('@')[0] || 'Creator';
        setUserName(name);
        setAvatarUrl(
          user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        );
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.plan) setPlan(profile.plan.toLowerCase());
        else if (user.user_metadata?.plan)
          setPlan(String(user.user_metadata.plan).toLowerCase());
      } catch (e) {
        console.error(e);
      }
    }
    loadUser();
  }, []);

  const recentDecks = useMemo(
    () => [...presentations].sort(sortByUpdated).slice(0, 8),
    [presentations],
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/presentations?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPresentations((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleRename = (id: string, newTitle: string) => {
    setPresentations((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, title: newTitle, date: new Date().toISOString() } : p,
      ),
    );
  };

  const handleBulkDeleted = (ids: string[]) => {
    const removed = new Set(ids);
    setPresentations((prev) => prev.filter((p) => !removed.has(p.id)));
  };

  const creditsWarning = !credits.loading && credits.usagePct >= 90;
  const activePlan = credits.plan || plan;
  const isFreePlan = activePlan === 'free' || !activePlan;
  const showLibrary = section === 'overview' || section === 'decks';
  const showSettings = section === 'settings';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-dvh bg-[#F0F7FF] font-sans text-slate-900 selection:bg-primary/10"
    >
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(59,130,246,0.1),transparent)]"
        aria-hidden
      />
      <DashboardSidebar
        section={section}
        onNavigate={navigateSection}
        recentDecks={recentDecks}
        userName={userName}
        plan={activePlan}
        avatarUrl={avatarUrl}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          section={section}
          query={query}
          onQueryChange={setQuery}
          onNewDeck={() => setNewDeckOpen(true)}
          onOpenMenu={() => setMobileMenuOpen(true)}
          creditsWarning={creditsWarning}
          onOpenSettings={() => navigateSection('settings')}
          onBackToWorkspace={() => navigateSection('overview')}
        />

        <main className="flex-1 overflow-y-auto px-4 pb-12 pt-2 sm:px-8 sm:pb-16">
          <NewDeckModal open={newDeckOpen} onClose={() => setNewDeckOpen(false)} />

          {deleteTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-[999] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm"
              role="presentation"
              onClick={() => !deleting && setDeleteTarget(null)}
            >
              <div
                role="dialog"
                aria-modal="true"
                className="w-full max-w-md rounded-3xl border border-white/20 bg-white/90 p-8 shadow-2xl backdrop-blur-md"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="font-montserrat text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
                  Confirm delete
                </p>
                <h2 className="mt-2 font-montserrat text-xl font-bold tracking-tight text-neutral-950">
                  Remove presentation?
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                  <span className="font-bold text-neutral-900">{deleteTarget.title}</span>{' '}
                  will be permanently deleted.
                </p>
                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 rounded-xl border border-neutral-200 bg-white py-3 text-sm font-bold text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-red-500 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {loading ? (
            <div className="space-y-10">
              {/* Dashboard Welcome & Stats Mock */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="h-8 w-48 bg-slate-300/45 rounded-xl animate-pulse" />
                  <div className="h-4 w-64 bg-slate-300/35 rounded-lg animate-pulse" />
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-3xl border border-white/50 bg-white/60 p-6 shadow-sm flex items-center justify-between">
                      <div className="space-y-3">
                        <div className="h-3 w-20 bg-slate-300/35 rounded animate-pulse" />
                        <div className="h-8 w-16 bg-slate-300/45 rounded-lg animate-pulse" />
                      </div>
                      <div className="h-12 w-12 rounded-2xl bg-slate-300/30 animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Deck Library Skeleton Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="h-6 w-32 bg-slate-300/40 rounded-lg animate-pulse" />
                  <div className="h-4 w-20 bg-slate-300/30 rounded animate-pulse" />
                </div>

                {/* Slide Grid skeleton */}
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="group overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-3 shadow-sm hover:shadow-md transition-all flex flex-col gap-3">
                       {/* Card Thumbnail Mock - Premium Blue Glassmorphism */}
                      <div className="aspect-[16/9] w-full rounded-2xl border border-primary/10 bg-primary/[0.03] backdrop-blur-sm animate-pulse relative overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-white/10 to-transparent pointer-events-none" />
                        <div className="h-10 w-10 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center relative">
                          <div className="h-3.5 w-3.5 rounded-full bg-primary/25 animate-ping absolute" />
                          <div className="h-2 w-2 rounded-full bg-primary/40" />
                        </div>
                      </div>
                      {/* Card Meta Mock */}
                      <div className="px-1 py-1 space-y-2">
                        <div className="h-4 w-3/4 bg-slate-300/40 rounded animate-pulse" />
                        <div className="flex justify-between items-center">
                          <div className="h-3 w-16 bg-slate-300/30 rounded animate-pulse" />
                          <div className="h-3 w-8 bg-slate-300/30 rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : showSettings ? (
            <DashboardSettings credits={credits} />
          ) : (
            <div className="space-y-10">
              {section === 'overview' && (
                <>
                  <DashboardStats
                    decks={presentations}
                    userName={userName}
                    credits={credits}
                    onOpenSettings={() => navigateSection('settings')}
                  />
                  <DashboardCreditBreakdown
                    credits={credits}
                    decksRemainingEstimate={decksRemainingEstimate}
                    onOpenSettings={() => navigateSection('settings')}
                  />
                  <DashboardUsageHistory freeTier={freeTier} />
                  <DashboardQuickTools
                    onNewDeck={() => setNewDeckOpen(true)}
                    onOpenSettings={() => navigateSection('settings')}
                    isFreePlan={isFreePlan}
                    isAdmin={activePlan === 'admin'}
                  />
                </>
              )}

              {showLibrary && (
                <div ref={decksRef}>
                  <PresentationGrid
                    decks={presentations}
                    query={query}
                    onDeleteRequest={setDeleteTarget}
                    onRename={handleRename}
                    onBulkDeleted={handleBulkDeleted}
                    onNewDeck={() => setNewDeckOpen(true)}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </motion.div>
  );
}
