'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import type { DeckMeta } from '@/types/deck-meta';
import { cn } from '@/lib/cn';
import { DeckThumbnail } from './DeckThumbnail';
import { Pencil, Check, X, Loader2 } from '@/components/icons/lucide';

export function DeckCard({
  deck,
  selectionMode,
  selected,
  onToggleSelect,
  onDelete,
  onRename,
  variant = 'default',
}: {
  deck: DeckMeta;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onRename?: (newTitle: string) => void;
  variant?: 'default' | 'dashboard';
}) {
  const [renaming, setRenaming]     = useState(false);
  const [draft,    setDraft]        = useState('');
  const [saving,   setSaving]       = useState(false);
  const [renameErr, setRenameErr]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dateLabel = (() => {
    const ts = Number.isFinite(Date.parse(deck?.date ?? '')) ? Date.parse(deck.date) : NaN;
    if (!Number.isFinite(ts)) return '—';
    try {
      return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '—';
    }
  })();

  const startRename = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft(deck.title);
    setRenameErr(null);
    setRenaming(true);
    setTimeout(() => inputRef.current?.select(), 20);
  };

  const cancelRename = () => {
    setRenaming(false);
    setRenameErr(null);
  };

  const commitRename = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === deck.title) { cancelRename(); return; }
    setSaving(true);
    setRenameErr(null);
    try {
      const res = await fetch(`/api/presentations?id=${encodeURIComponent(deck.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Rename failed (${res.status})`);
      onRename?.(trimmed);
      setRenaming(false);
    } catch (e: unknown) {
      setRenameErr(e instanceof Error ? e.message : 'Rename failed');
    } finally {
      setSaving(false);
    }
  };

  const isDashboard = variant === 'dashboard';

  return (
    <article
      className={cn(
        'group flex flex-col border bg-white transition',
        isDashboard && 'overflow-hidden rounded-2xl border-white/80 shadow-sm hover:-translate-y-0.5 hover:shadow-lg',
        selected
          ? 'border-neutral-900 ring-1 ring-neutral-900'
          : isDashboard
            ? 'border-slate-200/80 hover:border-primary/30'
            : 'border-neutral-200 hover:border-neutral-400',
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
          {/* ── Inline rename input ── */}
          {renaming ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                    if (e.key === 'Escape') cancelRename();
                  }}
                  disabled={saving}
                  className="flex-1 min-w-0 text-[13px] font-semibold border border-primary/40 rounded-lg px-2 py-1 text-neutral-900 outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={commitRename}
                  disabled={saving || !draft.trim()}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 transition-all"
                  title="Save rename"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                </button>
                <button
                  type="button"
                  onClick={cancelRename}
                  disabled={saving}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all"
                  title="Cancel"
                >
                  <X size={12} />
                </button>
              </div>
              {renameErr && (
                <p className="text-[10px] text-red-600">{renameErr}</p>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-1 group/title">
              <Link href={`/editor?id=${deck.id}`} className="flex-1 min-w-0">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-950 transition group-hover:underline">
                  {deck.title}
                </h3>
              </Link>
              <button
                type="button"
                onClick={startRename}
                className="shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded text-neutral-300 opacity-0 group-hover/title:opacity-100 hover:text-neutral-600 hover:bg-neutral-100 transition-all"
                title="Rename"
              >
                <Pencil size={11} strokeWidth={1.75} />
              </button>
            </div>
          )}
          <p className="mt-1 text-[11px] text-neutral-500">{dateLabel}</p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-neutral-100 pt-3 text-[11px] font-medium">
          <Link href={`/editor?id=${deck.id}`} className="text-neutral-900 underline-offset-4 hover:underline">
            Open
          </Link>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); startRename(e); }}
            className="text-neutral-500 underline-offset-4 hover:underline hover:text-neutral-800"
          >
            Rename
          </button>
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
