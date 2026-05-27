'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

type ShareVisitorCtaBarProps = {
  onVisibilityChange?: (visible: boolean) => void;
};

export function ShareVisitorCtaBar({ onVisibilityChange }: ShareVisitorCtaBarProps) {
  const [isVisitor, setIsVisitor] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!cancelled) setIsVisitor(!user);
      } catch {
        if (!cancelled) setIsVisitor(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isVisitor === null) return;
    onVisibilityChange?.(isVisitor);
  }, [isVisitor, onVisibilityChange]);

  if (isVisitor !== true) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[214] pointer-events-auto border-t border-neutral-200/80 bg-white/95 backdrop-blur-md shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.12)]"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3.5 max-w-5xl mx-auto">
        <p className="text-[13px] sm:text-sm font-medium text-neutral-700 text-center sm:text-left leading-snug">
          ✨ This was made with Orbstera AI — Create your own presentation for free
        </p>
        <Link
          href="/login"
          className="inline-flex shrink-0 items-center justify-center h-9 px-5 rounded-full bg-primary text-white text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-sm mx-auto sm:mx-0"
        >
          Get Started Free →
        </Link>
      </div>
    </div>
  );
}
