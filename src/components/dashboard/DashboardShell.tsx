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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [section, setSection] = useState<DashboardSection>('overview');
  const decksRef = useRef<HTMLDivElement | null>(null);

  const credits = useCredits();

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
            <div className="flex flex-col items-center justify-center py-32">
              <div className="h-1 w-20 overflow-hidden rounded-full bg-primary/20">
                <div className="h-full w-[40%] animate-pulse bg-primary" />
              </div>
              <p className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-400">
                Loading workspace
              </p>
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
                  <DashboardQuickTools
                    onNewDeck={() => setNewDeckOpen(true)}
                    onOpenSettings={() => navigateSection('settings')}
                    isFreePlan={isFreePlan}
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
