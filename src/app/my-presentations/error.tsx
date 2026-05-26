'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import * as Sentry from '@sentry/nextjs';

export default function MyPresentationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[MyPresentationsError]', error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-dvh w-full bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-borderSubtle bg-white rounded-xl p-8 shadow-lg text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-textMuted">
          Library error
        </p>
        <h1 className="mt-2 text-lg font-semibold text-textMain">
          Could not load your presentations
        </h1>
        <p className="mt-2 text-sm text-textSecondary">
          There was an error loading your presentation library. Your data is safe — try reloading.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/dashboard"
            className="flex-1 border border-neutral-200 bg-white py-2.5 text-sm font-semibold text-neutral-800 rounded-lg transition hover:bg-neutral-50 text-center"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={reset}
            className="flex-1 border border-primary bg-primary py-2.5 text-sm font-semibold text-white rounded-lg transition hover:bg-primaryHover"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
