'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
// Navbar removed
import { createClient } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import type { DeckMeta } from '@/types/deck-meta';
import { cn } from '@/lib/cn';
import { DeckThumbnail } from '@/components/workspace/DeckThumbnail';
import { DeckCard } from '@/components/workspace/DeckCard';

function AccountContent() {
  const searchParams = useSearchParams();
  const [presentations, setPresentations] = useState<DeckMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [deleteTarget, setDeleteTarget] = useState<DeckMeta | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userPlan, setUserPlan] = useState('free');
  const [userName, setUserName] = useState('Creator');
  const [generationsUsed, setGenerationsUsed] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    async function init(retryCount = 0) {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const name =
            user.user_metadata?.full_name || user.email?.split('@')[0] || 'Creator';
          setUserName(name);

          if (user.user_metadata?.plan) {
            setUserPlan(String(user.user_metadata.plan).toLowerCase());
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('plan, credits_used_month')
            .eq('id', user.id)
            .maybeSingle();
          if (profile) {
            setUserPlan(profile.plan?.toLowerCase() || 'free');
            setGenerationsUsed(profile.credits_used_month || 0);
          } else if (retryCount < 3 && searchParams.get('payment') === 'success') {
            setTimeout(() => init(retryCount + 1), 2000);
          }
        }
        const res = await fetch('/api/presentations');
        if (res.ok) setPresentations(await res.json());
      } catch (e) {
        console.error('Account workspace init error:', e);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [searchParams]);

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  useEffect(() => {
    if (!selectionMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectionMode, exitSelection]);

  const handleDeleteOne = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/presentations?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setPresentations((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setSelectedIds((prev) => {
          const n = new Set(prev);
          n.delete(deleteTarget.id);
          return n;
        });
        setDeleteTarget(null);
      }
    } catch (e) {
      console.error('Delete failed:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteIds?.length) return;
    setIsDeleting(true);
    try {
      const results = await Promise.all(
        bulkDeleteIds.map((id) =>
          fetch(`/api/presentations?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).then(
            (r) => r.ok,
          ),
        ),
      );
      if (results.every(Boolean)) {
        const removed = new Set(bulkDeleteIds);
        setPresentations((prev) => prev.filter((p) => !removed.has(p.id)));
        setSelectedIds(new Set());
        setBulkDeleteIds(null);
        exitSelection();
      }
    } catch (e) {
      console.error('Bulk delete failed:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const planLabel =
    userPlan === 'creator_pro'
      ? 'Creator Pro'
      : userPlan === 'student_pro' || userPlan === 'pro'
        ? 'Student Pro'
        : 'Free';
  const genLimit =
    userPlan === 'creator_pro' ? 100 : userPlan === 'student_pro' || userPlan === 'pro' ? 30 : 3;
  const genLeft = Math.max(0, genLimit - generationsUsed);
  const isPaid =
    userPlan === 'student_pro' || userPlan === 'pro' || userPlan === 'creator_pro';

  const recentDecks = useMemo(() => presentations.slice(0, 4), [presentations]);

  const selectedCount = selectedIds.size;
  const allSelected = presentations.length > 0 && selectedCount === presentations.length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(presentations.map((p) => p.id)));
  };

  const usagePct = Math.min(100, (generationsUsed / genLimit) * 100);

  return (
    <div className="min-h-screen bg-[#F4F3F1] text-neutral-900">
      {/* Navbar removed */}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md border border-neutral-200 bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold tracking-tight text-neutral-950">
              Delete presentation
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              <span className="font-medium text-neutral-900">{deleteTarget.title}</span> will be
              removed from your workspace. This cannot be undone.
            </p>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 border border-neutral-300 bg-white py-2.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOne}
                disabled={isDeleting}
                className="flex-1 bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteIds && bulkDeleteIds.length > 0 && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onClick={() => !isDeleting && setBulkDeleteIds(null)}
        >
          <div
            className="w-full max-w-md border border-neutral-200 bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold tracking-tight text-neutral-950">
              Delete {bulkDeleteIds.length} presentation
              {bulkDeleteIds.length === 1 ? '' : 's'}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              Selected decks will be permanently removed. This cannot be undone.
            </p>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setBulkDeleteIds(null)}
                disabled={isDeleting}
                className="flex-1 border border-neutral-300 bg-white py-2.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="flex-1 bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Delete all'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto min-w-0 max-w-6xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
        <header className="mb-12 flex flex-col gap-8 border-b border-neutral-300/80 pb-12 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Account &amp; usage
              </span>
              <span className="hidden h-3 w-px bg-neutral-300 sm:inline" aria-hidden />
              <span className="text-[11px] font-medium text-neutral-500">
                {planLabel}
                <span className="text-neutral-400"> · </span>
                {genLeft} generation{genLeft === 1 ? '' : 's'} remaining
              </span>
            </div>
            <h1
              className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl"
              style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
            >
              {userName.split(' ')[0]}, your workspace overview
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-neutral-600">
              {presentations.length} deck{presentations.length === 1 ? '' : 's'} in cloud storage. Open{' '}
              <Link href="/my-presentations" className="font-medium text-neutral-900 underline-offset-4 hover:underline">
                My presentations
              </Link>{' '}
              for search and quick resume, or manage decks below.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
            {!isPaid && (
              <Link
                href="/pricing"
                className="inline-flex justify-center border border-neutral-900 px-5 py-2.5 text-center text-sm font-medium text-neutral-900 transition hover:bg-neutral-900 hover:text-white"
              >
                Upgrade plan
              </Link>
            )}
            <Link
              href="/editor"
              className="inline-flex justify-center bg-neutral-900 px-6 py-2.5 text-center text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              New presentation
            </Link>
          </div>
        </header>

        <section
          className="mb-14 border border-neutral-200/90 bg-white p-6 sm:p-8"
          aria-label="Monthly usage"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Monthly generations
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-neutral-950">
                {generationsUsed}
                <span className="text-base font-medium text-neutral-400"> / {genLimit}</span>
              </p>
            </div>
            {!isPaid && (
              <Link href="/pricing" className="text-sm font-medium text-neutral-900 underline-offset-4 hover:underline">
                Increase limit
              </Link>
            )}
          </div>
          <div className="mt-6 h-px w-full bg-neutral-200" />
          <div className="mt-6 h-1.5 w-full bg-neutral-100">
            <div
              className={cn(
                'h-full transition-[width] duration-700 ease-out',
                generationsUsed >= genLimit
                  ? 'bg-red-600'
                  : generationsUsed >= genLimit * 0.85
                    ? 'bg-amber-600'
                    : 'bg-neutral-900',
              )}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        </section>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="h-px w-12 animate-pulse bg-neutral-900" />
            <p className="mt-6 text-sm text-neutral-500">Loading workspace</p>
          </div>
        ) : (
          <>
            {recentDecks.length > 0 && (
              <section className="mb-16">
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                      Recent
                    </p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight text-neutral-950">
                      Last opened
                    </h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {recentDecks.map((deck) => (
                    <DeckCard
                      key={deck.id}
                      deck={deck}
                      selectionMode={selectionMode}
                      selected={selectedIds.has(deck.id)}
                      onToggleSelect={() => toggleSelect(deck.id)}
                      onDelete={() => setDeleteTarget(deck)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    Library
                  </p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-neutral-950">
                    All presentations
                    <span className="ml-2 text-sm font-normal text-neutral-400">
                      ({presentations.length})
                    </span>
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex border border-neutral-300 bg-white p-0.5 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setView('grid')}
                      className={cn(
                        'px-3 py-1.5 transition',
                        view === 'grid' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900',
                      )}
                    >
                      Grid
                    </button>
                    <button
                      type="button"
                      onClick={() => setView('list')}
                      className={cn(
                        'px-3 py-1.5 transition',
                        view === 'list' ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:text-neutral-900',
                      )}
                    >
                      List
                    </button>
                  </div>
                  {presentations.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectionMode) exitSelection();
                        else setSelectionMode(true);
                      }}
                      className="border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 transition hover:border-neutral-400"
                    >
                      {selectionMode ? 'Done selecting' : 'Select'}
                    </button>
                  )}
                  {selectionMode && presentations.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-xs font-medium text-neutral-700 underline-offset-4 hover:underline"
                      >
                        {allSelected ? 'Clear all' : 'Select all'}
                      </button>
                      <button
                        type="button"
                        disabled={selectedCount === 0}
                        onClick={() => selectedCount && setBulkDeleteIds([...selectedIds])}
                        className="border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-900 transition enabled:hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Delete selected{selectedCount ? ` (${selectedCount})` : ''}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {presentations.length === 0 ? (
                <div className="border border-dashed border-neutral-300 bg-white/60 px-8 py-20 text-center">
                  <h3 className="text-base font-semibold text-neutral-950">No presentations yet</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-600">
                    When you generate or save a deck, it appears here with a thumbnail from the
                    first slide.
                  </p>
                  <Link
                    href="/editor"
                    className="mt-8 inline-block border border-neutral-900 bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
                  >
                    Create presentation
                  </Link>
                </div>
              ) : view === 'grid' ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {presentations.map((deck) => (
                    <DeckCard
                      key={deck.id}
                      deck={deck}
                      selectionMode={selectionMode}
                      selected={selectedIds.has(deck.id)}
                      onToggleSelect={() => toggleSelect(deck.id)}
                      onDelete={() => setDeleteTarget(deck)}
                    />
                  ))}
                </div>
              ) : (
                <ul className="divide-y divide-neutral-200 border border-neutral-200 bg-white">
                  {presentations.map((deck) => (
                    <li key={deck.id}>
                      <div className="flex flex-col gap-4 p-4 transition hover:bg-neutral-50/80 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
                        {selectionMode && (
                          <label className="flex cursor-pointer items-center gap-2 sm:w-28">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(deck.id)}
                              onChange={() => toggleSelect(deck.id)}
                              className="h-4 w-4 rounded border-neutral-400 text-neutral-900 focus:ring-neutral-900"
                            />
                            <span className="text-xs text-neutral-500 sm:hidden">Select</span>
                          </label>
                        )}
                        <Link
                          href={`/editor?id=${deck.id}`}
                          className="block w-full shrink-0 sm:w-40"
                        >
                          <DeckThumbnail deck={deck} compact />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={`/editor?id=${deck.id}`}>
                            <span className="text-sm font-semibold text-neutral-950 hover:underline">
                              {deck.title}
                            </span>
                          </Link>
                          <p className="mt-1 text-xs text-neutral-500">
                            {deck.slidesCount} slide{deck.slidesCount === 1 ? '' : 's'}
                            <span className="text-neutral-300"> · </span>
                            Updated{' '}
                            {Number.isFinite(Date.parse((deck as any)?.date ?? ''))
                              ? new Date(deck.date).toLocaleDateString(undefined, { dateStyle: 'medium' })
                              : '—'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs font-medium sm:justify-end">
                          <Link
                            href={`/editor?id=${deck.id}`}
                            className="text-neutral-900 underline-offset-4 hover:underline"
                          >
                            Open
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(deck)}
                            className="text-red-700 underline-offset-4 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F4F3F1]">
          <p className="text-sm text-neutral-500">Loading</p>
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  );
}
