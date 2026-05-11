'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import type { DeckMeta } from '@/types/deck-meta';
import { DeckCard } from '@/components/workspace/DeckCard';

function sortByUpdated(a: DeckMeta, b: DeckMeta) {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
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
    return sorted.filter((p) => p.title.toLowerCase().includes(q));
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
    <div className="min-h-screen bg-[#0B0B0D] text-neutral-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />
      <Navbar />

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md border border-white/10 bg-[#121214] p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Remove deck</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Delete this presentation?</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              <span className="text-white/90">{deleteTarget.title}</span> will be removed from your library. This
              cannot be undone.
            </p>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-white/15 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/5 disabled:opacity-50"
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

      <main className="relative mx-auto max-w-6xl px-5 pb-24 pt-28 sm:px-8 sm:pt-32">
        <header className="mb-14 border-b border-white/[0.08] pb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Studio library</p>
          <div className="mt-4 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1
                className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl"
                style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
              >
                My presentations
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/55">
                Jump back into decks you touched recently, or search everything you have saved. Thumbnails reflect your
                first slide—images when available, otherwise the slide headline on a palette from your deck.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/editor"
                className="inline-flex border border-white/20 bg-white px-5 py-2.5 text-sm font-medium text-neutral-950 transition hover:bg-white/90"
              >
                New deck
              </Link>
              <Link
                href="/account"
                className="inline-flex border border-white/15 px-5 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/5"
              >
                Account &amp; usage
              </Link>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <p className="mt-6 text-sm text-white/45">Loading your library</p>
          </div>
        ) : presentations.length === 0 ? (
          <div className="border border-dashed border-white/15 bg-white/[0.02] px-8 py-20 text-center">
            <h2 className="text-lg font-semibold text-white">No presentations yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
              Generate a deck in the editor and save it—your work will show up here automatically.
            </p>
            <Link
              href="/editor"
              className="mt-8 inline-block border border-white/20 bg-white px-6 py-2.5 text-sm font-medium text-neutral-950 transition hover:bg-white/90"
            >
              Open editor
            </Link>
          </div>
        ) : (
          <>
            <section className="mb-20">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Continue</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">Recently edited</h2>
                  <p className="mt-1 text-xs text-white/45">The decks you opened or saved most recently</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {continueWorking.map((deck) => (
                  <div key={deck.id} className="[&_article]:border-white/10 [&_article]:bg-[#121214] [&_h3]:text-white [&_p]:text-white/50 [&_a]:text-white [&_button]:text-red-300">
                    <DeckCard
                      deck={deck}
                      selectionMode={false}
                      selected={false}
                      onToggleSelect={() => {}}
                      onDelete={() => setDeleteTarget(deck)}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Library</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">All saved presentations</h2>
                  <p className="mt-1 text-xs text-white/45">{sorted.length} total</p>
                </div>
                <label className="block w-full sm:max-w-xs">
                  <span className="sr-only">Search presentations</span>
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by title…"
                    className="w-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-white/25"
                  />
                </label>
              </div>

              {filtered.length === 0 ? (
                <p className="border border-white/10 bg-white/[0.02] px-6 py-12 text-center text-sm text-white/50">
                  No decks match that search.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((deck) => (
                    <div
                      key={deck.id}
                      className="[&_article]:border-white/10 [&_article]:bg-[#121214] [&_h3]:text-white [&_p]:text-white/50 [&_a]:text-white [&_button]:text-red-300"
                    >
                      <DeckCard
                        deck={deck}
                        selectionMode={false}
                        selected={false}
                        onToggleSelect={() => {}}
                        onDelete={() => setDeleteTarget(deck)}
                      />
                    </div>
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
