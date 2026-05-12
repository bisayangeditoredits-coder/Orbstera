'use client';

import Link from 'next/link';
import type { DeckMeta } from '@/types/deck-meta';
import { cn } from '@/lib/cn';
import { DeckThumbnail } from './DeckThumbnail';

export function DeckCard({
  deck,
  selectionMode,
  selected,
  onToggleSelect,
  onDelete,
}: {
  deck: DeckMeta;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
}) {
  const dateLabel = (() => {
    const ts = Number.isFinite(Date.parse(deck?.date ?? '')) ? Date.parse(deck.date) : NaN;
    if (!Number.isFinite(ts)) return '—';
    try {
      return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '—';
    }
  })();

  return (
    <article
      className={cn(
        'group flex flex-col border bg-white transition',
        selected ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200 hover:border-neutral-400',
      )}
    >
      <div className="relative">
        {selectionMode && (
          <label className="absolute left-3 top-3 z-10 flex cursor-pointer items-center bg-white/90 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-neutral-700 shadow-sm backdrop-blur-sm">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="mr-2 h-3.5 w-3.5 rounded border-neutral-400 text-neutral-900 focus:ring-neutral-900"
            />
            Select
          </label>
        )}
        <Link href={`/editor?id=${deck.id}`} className="block">
          <DeckThumbnail deck={deck} />
        </Link>
        <div className="pointer-events-none absolute right-2 top-2 rounded bg-black/55 px-2 py-0.5 text-[10px] font-medium tabular-nums text-white backdrop-blur-sm">
          {deck.slidesCount}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0 flex-1">
          <Link href={`/editor?id=${deck.id}`}>
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-950 transition group-hover:underline">
              {deck.title}
            </h3>
          </Link>
          <p className="mt-1 text-[11px] text-neutral-500">{dateLabel}</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-neutral-100 pt-3 text-[11px] font-medium">
          <Link href={`/editor?id=${deck.id}`} className="text-neutral-900 underline-offset-4 hover:underline">
            Open
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="text-red-700 underline-offset-4 hover:underline"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
