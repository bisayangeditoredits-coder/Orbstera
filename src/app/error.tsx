'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 text-center">
      <div className="max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-textMuted">
          Something went wrong
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-textMain">
          Orbstera hit an error while loading this page.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-textMuted">
          Try again. If it keeps happening, the browser console or dev server logs should have the
          real clue.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover transition-colors"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-full border border-borderSubtle bg-white px-5 py-2.5 text-sm font-semibold text-textMain hover:bg-panel transition-colors"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
