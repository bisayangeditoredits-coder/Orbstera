'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { DeckMeta } from '@/types/deck-meta';
import { DeckCard } from '@/components/workspace/DeckCard';
import { DeckThumbnail } from '@/components/workspace/DeckThumbnail';
import { cn } from '@/lib/cn';
import { sortByUpdated, sortByTitle } from './dashboard-utils';

type SortMode = 'recent' | 'title';
type ViewMode = 'grid' | 'list';

export type PresentationGridProps = {
  decks: DeckMeta[];
  query: string;
  onDeleteRequest: (deck: DeckMeta) => void;
  onRename: (id: string, title: string) => void;
  onBulkDeleted: (ids: string[]) => void;
  onNewDeck: () => void;
};

export function PresentationGrid({
  decks,
  query,
  onDeleteRequest,
  onRename,
  onBulkDeleted,
  onNewDeck,
}: PresentationGridProps) {
  const [sort, setSort] = useState<SortMode>('recent');
  const [view, setView] = useState<ViewMode>('grid');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[] | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(48);

  useEffect(() => {
    setVisibleLimit(48);
  }, [query, sort]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? decks.filter((d) => (d.title ?? '').toLowerCase().includes(q)) : [...decks];
    list.sort(sort === 'title' ? sortByTitle : sortByUpdated);
    return list;
  }, [decks, query, sort]);

  const visibleDecks = filtered.slice(0, visibleLimit);
  const hasMoreDecks = filtered.length > visibleLimit;

  const selectedCount = selectedIds.size;
  const allSelected = filtered.length > 0 && selectedCount === filtered.length;

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
    else setSelectedIds(new Set(filtered.map((d) => d.id)));
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteIds?.length) return;
    setBulkDeleting(true);
    try {
      const combinedIds = bulkDeleteIds.join(',');
      const res = await fetch(
        `/api/presentations?ids=${encodeURIComponent(combinedIds)}`,
        { method: 'DELETE' },
      );
      if (res.ok) {
        onBulkDeleted(bulkDeleteIds);
        setBulkDeleteIds(null);
        exitSelection();
      }
    } finally {
      setBulkDeleting(false);
    }
  };

  if (decks.length === 0) return null;

  return (
    <section id="decks" className="scroll-mt-6 space-y-6">
      {bulkDeleteIds && bulkDeleteIds.length > 0 && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => !bulkDeleting && setBulkDeleteIds(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-white/20 bg-white p-8 shadow-2xl"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-montserrat text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
              Confirm delete
            </p>
            <h2 className="mt-2 font-montserrat text-xl font-bold text-neutral-950">
              Remove {bulkDeleteIds.length} presentation{bulkDeleteIds.length === 1 ? '' : 's'}?
            </h2>
            <p className="mt-3 text-sm text-neutral-600">This cannot be undone.</p>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => setBulkDeleteIds(null)}
                className="flex-1 rounded-md border border-neutral-200 py-3 text-sm font-bold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={handleBulkDelete}
                className="flex-1 rounded-md bg-red-600 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting…' : 'Delete all'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Recently edited</p>
          <h2 className="mt-1 font-montserrat text-2xl font-bold text-slate-900">Your presentations</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="min-h-[44px] rounded-md border border-white/80 bg-white/90 px-3 text-xs font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Sort presentations"
          >
            <option value="recent">Most recent</option>
            <option value="title">A–Z</option>
          </select>
          <div className="inline-flex rounded-md border border-white/80 bg-white/90 p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={cn(
                'min-h-[40px] rounded-lg px-3 py-2 text-xs font-bold transition',
                view === 'grid' ? 'bg-primary text-white' : 'text-slate-600',
              )}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'min-h-[40px] rounded-lg px-3 py-2 text-xs font-bold transition',
                view === 'list' ? 'bg-primary text-white' : 'text-slate-600',
              )}
            >
              List
            </button>
          </div>
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (selectionMode) exitSelection();
                else setSelectionMode(true);
              }}
              className="min-h-[44px] rounded-md border border-white/80 bg-white/90 px-4 text-xs font-bold text-slate-700 shadow-sm hover:bg-white"
            >
              {selectionMode ? 'Done' : 'Select'}
            </button>
          )}
          {selectionMode && filtered.length > 0 && (
            <>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-bold text-primary underline-offset-4 hover:underline"
              >
                {allSelected ? 'Clear' : 'All'}
              </button>
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={() => selectedCount && setBulkDeleteIds(Array.from(selectedIds))}
                className="min-h-[44px] rounded-md border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-800 disabled:opacity-40"
              >
                Delete ({selectedCount})
              </button>
            </>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-primary/25 bg-white/70 px-8 py-16 text-center shadow-sm backdrop-blur-sm sm:py-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/3d_icons/Open Book Lamp.png"
            alt=""
            className="mx-auto mb-6 h-24 w-24 object-contain opacity-90"
          />
          <h2 className="font-montserrat text-lg font-bold text-slate-900">
            {query.trim() ? 'No matches' : 'No presentations yet'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            {query.trim()
              ? 'Try another search term.'
              : 'Create your first deck to see it here with a live thumbnail.'}
          </p>
          <button
            type="button"
            onClick={onNewDeck}
            className="mt-8 inline-flex min-h-[44px] items-center rounded-md bg-primary px-8 py-3 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primaryHover"
          >
            Create presentation
          </button>
        </div>
      ) : view === 'grid' ? (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {visibleDecks.map((deck) => (
            <motion.div
              key={deck.id}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            >
              <DeckCard
                deck={deck}
                variant="dashboard"
                selectionMode={selectionMode}
                selected={selectedIds.has(deck.id)}
                onToggleSelect={() => toggleSelect(deck.id)}
                onDelete={() => onDeleteRequest(deck)}
                onRename={(title) => onRename(deck.id, title)}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-white/70 bg-white shadow-sm">
          {visibleDecks.map((deck) => (
            <li key={deck.id}>
              <div className="flex flex-col gap-4 p-4 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
                {selectionMode && (
                  <label className="flex cursor-pointer items-center gap-2 sm:w-24">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(deck.id)}
                      onChange={() => toggleSelect(deck.id)}
                      className="h-4 w-4 rounded border-slate-300 accent-primary"
                    />
                  </label>
                )}
                <Link href={`/editor?id=${deck.id}`} className="block w-full shrink-0 sm:w-36">
                  <DeckThumbnail deck={deck} compact />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/editor?id=${deck.id}`}>
                    <span className="text-sm font-semibold text-slate-900 hover:underline">
                      {deck.title}
                    </span>
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">{deck.slidesCount} slides</p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-bold">
                  <Link href={`/editor?id=${deck.id}`} className="text-primary hover:underline">
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDeleteRequest(deck)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {hasMoreDecks && (
        <motion.div className="flex justify-center pt-8">
          <button
            type="button"
            onClick={() => setVisibleLimit((n) => n + 48)}
            className="min-h-[44px] rounded-md border border-slate-200 bg-white px-6 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-primary/30 hover:text-primary"
          >
            Load more ({filtered.length - visibleLimit} remaining)
          </button>
        </motion.div>
      )}
    </section>
  );
}