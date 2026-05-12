'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FilePlus2, LayoutTemplate, Loader2, ArrowLeft } from 'lucide-react';
import { createBlankPresentation, STANDARD_SLIDE_SIZE } from '@/lib/presentation/create-blank-presentation';
import { usePresentationStore } from '@/store/usePresentationStore';

export default function NewDocumentClient() {
  const router = useRouter();
  const clearPresentation = usePresentationStore((s) => s.clearPresentation);
  const selectElement = usePresentationStore((s) => s.selectElement);
  const setEditorState = usePresentationStore((s) => s.setEditorState);

  const [title, setTitle] = useState('Untitled presentation');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clearPresentation();
    selectElement(null);
    setEditorState({ activeTool: 'select', generativeFillTarget: null });
  }, [clearPresentation, selectElement, setEditorState]);

  const handleCreate = async () => {
    setError(null);
    setBusy(true);
    try {
      const deck = createBlankPresentation(title);
      const res = await fetch('/api/presentations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deck),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setError('You are signed out. Please sign in again.');
        return;
      }
      if (res.status === 409) {
        setError('Save conflict — refresh and try again.');
        return;
      }
      if (!res.ok) {
        setError(
          typeof data.error === 'string'
            ? data.error
            : 'Could not save to cloud storage. Check that Cloudflare R2 is configured.',
        );
        return;
      }
      if (data.message === 'Placeholder skipped') {
        setError('Document was rejected by the server. Add a name and try again.');
        return;
      }
      if (!data.success || typeof deck.id !== 'string') {
        setError('Unexpected response from server.');
        return;
      }

      router.replace(`/editor?id=${encodeURIComponent(deck.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error while saving.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh w-full max-w-[100vw] overflow-x-hidden bg-gradient-to-b from-[#E8F0FF] via-white to-[#F4F6FA] text-neutral-900 flex flex-col">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />
      <header className="relative z-10 border-b border-black/[0.06] bg-white/80 backdrop-blur-md px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-lg items-center gap-4">
          <Link
            href="/my-presentations"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-neutral-600 shadow-sm transition hover:border-primary/25 hover:text-primary"
            aria-label="Back to My presentations"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">New document</p>
            <h1 className="truncate text-lg font-semibold tracking-tight text-neutral-950 sm:text-xl">
              Blank presentation
            </h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-10 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-black/[0.08] bg-white p-6 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.15)] sm:p-8"
        >
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FilePlus2 size={22} strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-950">Name your deck</h2>
              <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                Like Photoshop: create the document first. It is saved to <strong className="text-neutral-700">My presentations</strong> on
                Cloudflare R2 so you can open it from any device.
              </p>
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Document title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="mt-2 w-full rounded-xl border border-black/[0.1] bg-neutral-50/80 px-4 py-3 text-[15px] font-medium text-neutral-900 outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              placeholder="Untitled presentation"
              autoComplete="off"
              disabled={busy}
            />
          </label>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-black/[0.06] bg-neutral-50/90 px-4 py-3">
            <LayoutTemplate size={18} className="mt-0.5 shrink-0 text-neutral-400" strokeWidth={1.75} />
            <div className="text-sm text-neutral-600">
              <p className="font-semibold text-neutral-800">Standard slide size</p>
              <p className="mt-0.5 text-[13px] leading-snug text-neutral-500">
                16:9 workspace — {STANDARD_SLIDE_SIZE.width} × {STANDARD_SLIDE_SIZE.height}px (matches the editor canvas and exports).
              </p>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700" role="alert">
              {error}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/editor"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-black/[0.1] bg-white px-5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              Use AI instead
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCreate()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primaryHover disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 size={18} className="animate-spin" strokeWidth={1.75} />
                  Saving…
                </>
              ) : (
                <>
                  Create &amp; open editor
                </>
              )}
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
