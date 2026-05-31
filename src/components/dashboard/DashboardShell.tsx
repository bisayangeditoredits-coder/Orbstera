'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { DeckMeta } from '@/types/deck-meta';
import { useCredits } from '@/hooks/useCredits';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Loader2 } from 'lucide-react';

const NewDeckModal = dynamic(
  () => import('@/components/workspace/NewDeckModal').then((m) => m.NewDeckModal),
  { ssr: false },
);
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { finalizePaymentReturn } from '@/lib/billing/confirm-subscription-client';
import { CreditWarningBanner } from './CreditWarningBanner';
import { DashboardStats } from './DashboardStats';
import { PresentationGrid } from './PresentationGrid';
import { DashboardSettings } from './DashboardSettings';
import { PlannerHistory } from './PlannerHistory';
import { sortByUpdated } from './dashboard-utils';
import {
  type DashboardSection,
  sectionFromHash,
  hashForSection,
} from './dashboard-types';


export function DashboardShell() {
  const router = useRouter();
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
  const [mounted, setMounted] = useState(false);
  const decksRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        decksRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      });
    }
    if (next === 'settings') {
      requestAnimationFrame(() => {
        document.getElementById('settings')?.scrollIntoView({ behavior: 'instant', block: 'start' });
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
    void (async () => {
      await finalizePaymentReturn();
      await credits.refresh();
    })();
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

  const handleBulkDeleted = useCallback((ids: string[]) => {
    setPresentations((prev) => prev.filter((d) => !ids.includes(d.id)));
  }, []);

  const creditsWarning = !credits.loading && credits.usagePct >= 90;
  const activePlan = mounted ? (credits.plan || plan) : '';
  const isFreePlan = activePlan === 'free' || !activePlan;
  const showLibrary = section === 'overview' || section === 'decks';
  const showSettings = section === 'settings';

  return (
    <div className="flex min-h-dvh bg-white font-sans text-slate-900 selection:bg-primary/10">
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
          onCreateAIDeck={() => router.push('/editor?mode=ai')}
          onOpenMenu={() => setMobileMenuOpen(true)}
          creditsWarning={creditsWarning}
          onOpenSettings={() => navigateSection('settings')}
          onBackToWorkspace={() => navigateSection('overview')}
        />

        <CreditWarningBanner credits={credits} />

        <main className="flex-1 overflow-y-auto px-5 pb-12 pt-5 sm:px-8 sm:pb-16">
          <NewDeckModal open={newDeckOpen} onClose={() => setNewDeckOpen(false)} />

          <Modal
            open={!!deleteTarget}
            onClose={() => !deleting && setDeleteTarget(null)}
            size="sm"
            showClose={false}
            closeDisabled={deleting}
            panelClassName="p-8"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
              Confirm delete
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-neutral-950">
              Remove presentation?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              <span className="font-bold text-neutral-900">{deleteTarget?.title}</span>{' '}
              will be permanently deleted.
            </p>
            <div className="mt-8 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                fullWidth
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </Modal>

          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] w-full animate-in fade-in duration-500">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100/50 mb-4">
                <Loader2 size={24} className="text-indigo-600 animate-spin" strokeWidth={2.5} />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">
                Loading workspace
              </h3>
              <p className="text-[12px] text-slate-500">
                Just a moment while we fetch your documents...
              </p>
            </div>
          ) : section === 'planner-history' ? (
            <PlannerHistory />
          ) : showSettings ? (
            <DashboardSettings credits={credits} />
          ) : (
            <div className="space-y-6">
              {(section === 'overview' || (section === 'decks' && presentations.length === 0)) && (
                <DashboardStats
                  decks={presentations}
                  userName={userName}
                  credits={credits}
                  onNewDeck={() => setNewDeckOpen(true)}
                  onOpenSettings={() => navigateSection('settings')}
                />
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
    </div>
  );
}
