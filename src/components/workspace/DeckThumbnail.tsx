'use client';

import { useState } from 'react';
import type { DeckMeta } from '@/types/deck-meta';
import { cn } from '@/lib/cn';

export function DeckThumbnail({ deck, compact }: { deck: DeckMeta; compact?: boolean }) {
  const [imgErr, setImgErr] = useState(false);
  const url = deck.thumbnailUrl && !imgErr ? deck.thumbnailUrl : null;
  const c0 = deck.colorPalette?.[0] ?? '#111113';
  const c1 = deck.colorPalette?.[2] ?? '#3f3d47';
  const headline = deck.firstSlideTitle?.trim() || deck.title;
  const sub = deck.firstSlideSubtitle?.trim() || deck.subtitle?.trim();

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden border border-neutral-200/90 bg-neutral-100',
        compact ? 'aspect-video max-h-[5.5rem]' : 'aspect-video',
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote slide URLs from many hosts
        <img
          src={url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setImgErr(true)}
        />
      ) : null}
      {(!url || imgErr) && (
        <div
          className="absolute inset-0 flex flex-col justify-end p-4 text-white"
          style={{
            background: `linear-gradient(152deg, ${c0} 0%, ${c1} 100%)`,
          }}
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-white/55">
            First slide
          </p>
          <p className={cn('mt-1 line-clamp-2 font-medium leading-snug', compact ? 'text-xs' : 'text-sm')}>
            {headline}
          </p>
          {sub && !compact ? (
            <p className="mt-1 line-clamp-1 text-xs text-white/75">{sub}</p>
          ) : null}
        </div>
      )}
      {url && !imgErr ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-3 pt-10">
          <p className="line-clamp-1 text-[11px] font-medium text-white/95">{headline}</p>
        </div>
      ) : null}
    </div>
  );
}
