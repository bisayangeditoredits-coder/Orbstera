'use client';

import { useState } from 'react';
import type { DeckMeta } from '@/types/deck-meta';
import { cn } from '@/lib/cn';

export function DeckThumbnail({ deck, compact }: { deck: DeckMeta; compact?: boolean }) {
  const [imgErr, setImgErr] = useState(false);
  const url = deck.thumbnailUrl && !imgErr ? deck.thumbnailUrl : null;

  // Pull palette colors
  const bg      = deck.colorPalette?.[0] ?? '#0f172a';
  const text     = deck.colorPalette?.[1] ?? '#ffffff';
  const accent   = deck.colorPalette?.[2] ?? '#6366f1';
  const subtext  = deck.colorPalette?.[3] ?? accent;

  const headline = deck.firstSlideTitle?.trim() || deck.title || 'Untitled';
  const sub      = deck.firstSlideSubtitle?.trim() || deck.subtitle?.trim() || '';

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden',
        compact ? 'aspect-video max-h-[5.5rem] rounded-lg' : 'aspect-video rounded-xl',
      )}
    >
      {/* ── Real screenshot if available ── */}
      {url ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImgErr(true)}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-10">
            <p className="line-clamp-1 text-[11px] font-medium text-white/95">{headline}</p>
          </div>
        </>
      ) : (
        /* ── Rich mini-slide fallback ── */
        <div
          className="absolute inset-0 flex flex-col"
          style={{ background: bg }}
        >
          {/* Radial glow accent */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 65% 35%, ${accent}35 0%, transparent 65%)`,
            }}
          />

          {/* Bottom accent bar */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[3px]"
            style={{ background: accent, opacity: 0.9 }}
          />

          {/* Slide content */}
          <div className="relative flex-1 flex flex-col items-center justify-center px-4 gap-1.5 text-center">
            {/* Decorative dot grid (subtle) */}
            <div className="absolute top-2 right-2 grid grid-cols-3 gap-[3px] opacity-10 pointer-events-none">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="w-[3px] h-[3px] rounded-full" style={{ background: text }} />
              ))}
            </div>

            {/* Title line */}
            <p
              className={cn(
                'font-bold leading-snug tracking-tight line-clamp-2',
                compact ? 'text-[8px]' : 'text-[10px] sm:text-[11px]',
              )}
              style={{ color: text, opacity: 0.95, maxWidth: '85%' }}
            >
              {headline}
            </p>

            {/* Subtitle line */}
            {sub && !compact && (
              <p
                className="text-[8px] leading-snug line-clamp-1 opacity-70"
                style={{ color: subtext, maxWidth: '75%' }}
              >
                {sub}
              </p>
            )}

            {/* Divider */}
            {!compact && (
              <div
                className="mt-1 h-[1.5px] w-8 rounded-full opacity-40"
                style={{ background: accent }}
              />
            )}
          </div>

          {/* Footer label */}
          {!compact && (
            <div className="relative px-3 pb-2 flex items-center justify-between">
              <span
                className="text-[7px] font-bold uppercase tracking-[0.2em] opacity-40"
                style={{ color: text }}
              >
                First slide
              </span>
              <span
                className="text-[7px] font-bold uppercase tracking-[0.15em] opacity-60 px-1.5 py-0.5 rounded"
                style={{ color: accent, background: `${accent}18` }}
              >
                {deck.slidesCount ?? 1} slides
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
