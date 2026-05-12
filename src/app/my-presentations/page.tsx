'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
// Navbar removed
import type { DeckMeta } from '@/types/deck-meta';
import { DeckCard } from '@/components/workspace/DeckCard';

function sortByUpdated(a: DeckMeta, b: DeckMeta) {
  const tb = Number.isFinite(Date.parse(b?.date ?? '')) ? Date.parse(b.date) : 0;
  const ta = Number.isFinite(Date.parse(a?.date ?? '')) ? Date.parse(a.date) : 0;
  return tb - ta;
}

export default function MyPresentationsPage() {
  const [presentations, setPresentations] = useState<DeckMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeckMeta | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
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
    load();
  }, [load]);

  const sorted = useMemo(() => [...presentations].sort(sortByUpdated), [presentations]);
  const continueWorking = useMemo(() => sorted.slice(0, 8), [sorted]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((p) => (p.title ?? '').toLowerCase().includes(q));
  }, [sorted, query]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/presentations?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setPresentations((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#CDE4FF] via-white to-white text-neutral-900">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(59,130,246,0.08),transparent)]" />
      {/* Navbar removed */}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md border border-neutral-200 bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-montserrat text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
              Remove deck
            </p>
            <h2 className="mt-2 font-montserrat text-xl font-semibold tracking-tight text-neutral-950">
              Delete this presentation?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              <span className="font-medium text-neutral-900">{deleteTarget.title}</span> will be removed from your
              library. This cannot be undone.
            </p>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-neutral-300 bg-white py-2.5 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex-1 bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="relative mx-auto max-w-6xl min-w-0 px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
        <header className="mb-14 rounded-2xl border border-primary/10 bg-white/80 px-8 pb-8 pt-8 shadow-sm backdrop-blur-sm">
          <p className="font-montserrat text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/90">
            Studio library
          </p>
          <div className="mt-4 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="font-montserrat text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">
                My presentations
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-600">
                Jump back into decks you touched recently, or search everything you have saved. Thumbnails use your
                first slide—image when available, otherwise the slide headline on your deck palette.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                href="/editor/new"
                className="inline-flex items-center justify-center border border-neutral-900 bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800"
              >
                New blank deck
              </Link>
              <Link
                href="/editor"
                className="inline-flex items-center justify-center border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 transition hover:border-primary/25 hover:bg-accentBlue"
              >
                AI workspace
              </Link>
              <Link
                href="/account"
                className="inline-flex items-center justify-center border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 transition hover:border-primary/25 hover:bg-accentBlue"
              >
                Account &amp; usage
              </Link>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="h-0.5 w-14 rounded-full bg-primary/30" />
            <p className="mt-6 text-sm text-neutral-500">Loading your library</p>
          </div>
        ) : presentations.length === 0 ? (
          <div className="border border-dashed border-primary/20 bg-white/90 px-8 py-20 text-center shadow-sm">
            <h2 className="font-montserrat text-lg font-semibold text-neutral-950">No presentations yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
              Create a <Link href="/editor/new" className="font-medium text-primary underline-offset-4 hover:underline">blank presentation</Link> (saved to the cloud), or use the{' '}
              <Link href="/editor" className="font-medium text-primary underline-offset-4 hover:underline">AI workspace</Link> to generate a deck.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/editor/new"
                className="inline-block border border-neutral-900 bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                New blank deck
              </Link>
              <Link
                href="/editor"
                className="inline-block border border-neutral-200 bg-white px-6 py-2.5 text-sm font-semibold text-neutral-800 transition hover:border-primary/30"
              >
                AI workspace
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section className="mb-20">
              <div className="mb-6">
                <p className="font-montserrat text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                  Continue
                </p>
                <h2 className="mt-1 font-montserrat text-lg font-semibold text-neutral-950">Recently edited</h2>
                <p className="mt-1 text-xs text-neutral-500">The decks you opened or saved most recently</p>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {continueWorking.map((deck) => (
                  <DeckCard
                    key={deck.id}
                    deck={deck}
                    selectionMode={false}
                    selected={false}
                    onToggleSelect={() => {}}
                    onDelete={() => setDeleteTarget(deck)}
                  />
                ))}
              </div>
            </section>

            <section>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-montserrat text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                    Library
                  </p>
                  <h2 className="mt-1 font-montserrat text-lg font-semibold text-neutral-950">All saved presentations</h2>
                  <p className="mt-1 text-xs text-neutral-500">{sorted.length} total</p>
                </div>
                <label className="block w-full sm:max-w-xs">
                  <span className="sr-only">Search presentations</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by title…"
                    className="w-full border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                  />
                </label>
              </div>

              {filtered.length === 0 ? (
                <p className="border border-neutral-200 bg-white px-6 py-12 text-center text-sm text-neutral-500 shadow-sm">
                  No decks match that search.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((deck) => (
                    <DeckCard
                      key={deck.id}
                      deck={deck}
                      selectionMode={false}
                      selected={false}
                      onToggleSelect={() => {}}
                      onDelete={() => setDeleteTarget(deck)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
