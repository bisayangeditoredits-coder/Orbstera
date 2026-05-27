'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// Bump this key when you publish a new announcement message.
const DISMISS_KEY = 'orbstera_banner_dismissed_v2';

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(DISMISS_KEY);
      setDismissed(v === 'true');
    } catch {
      // Ignore storage errors; banner remains visible.
      setDismissed(false);
    }
  }, []);

  if (dismissed === null || dismissed) return null;

  return (
    <div
      className="w-full h-10 bg-[#0F0F0F] text-white border-b border-white/10"
      role="status"
      aria-live="polite"
    >
      <div className="relative h-full flex items-center justify-center px-4">
        <div className="text-[13px] font-medium text-white/95 text-center leading-snug px-10 sm:px-12">
          <span className="sm:hidden">
            ✦ Orbstera v2.0 is here.{' '}
            <a href="/changelog" className="underline underline-offset-2 hover:opacity-90">
              Changelog →
            </a>
          </span>
          <span className="hidden sm:inline">
            ✦ Orbstera v2.0 is here — AI Cinematic Engine, Real-time Collaboration & PPTX Export.{' '}
            <a href="/changelog" className="underline underline-offset-2 hover:opacity-90">
              Read the changelog →
            </a>
          </span>
        </div>

        <button
          type="button"
          aria-label="Dismiss announcement"
          onClick={() => {
            setDismissed(true);
            try {
              window.localStorage.setItem(DISMISS_KEY, 'true');
            } catch {
              // Ignore storage errors.
            }
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

