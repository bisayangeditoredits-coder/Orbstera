'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function EditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log full error for debugging in the browser console / monitoring.
    console.error('[EditorError]', error);
  }, [error]);

  return (
    <div className="min-h-dvh max-h-dvh w-full max-w-[100vw] overflow-hidden bg-background flex items-center justify-center px-4 safe-pad-y">
      <div className="w-full max-w-md border border-borderSubtle bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-textMuted">
          Editor error
        </p>
        <h1 className="mt-2 text-lg font-semibold text-textMain">
          Something crashed in the editor
        </h1>
        <p className="mt-2 text-sm text-textSecondary">
          Try reloading the editor. If it keeps happening, open your browser console and copy the first red error +
          stack trace.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/my-presentations"
            className="flex-1 border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-800 transition hover:border-primary/25 hover:bg-accentBlue text-center"
          >
            Back to library
          </Link>
          <button
            type="button"
            onClick={reset}
            className="flex-1 border border-primary bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primaryHover"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

