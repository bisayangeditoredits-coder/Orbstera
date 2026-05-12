'use client';

import type { CSSProperties } from 'react';

const brands = ['Foresight', 'Goodwell', 'Luminary', 'Magnolia', 'Norse Star', 'Mastermind'];

export function SocialProof() {
  /** Exactly two identical halves → translateX(-50%) loops seamlessly. */
  const loopItems = [...brands, ...brands];

  return (
    <section className="flex w-full flex-col items-center overflow-hidden border-y border-blue-50/50 bg-white py-16">
      <p className="mb-12 text-[10px] font-bold uppercase tracking-[0.3em] text-textMuted opacity-60">
        Trusted by the world&apos;s most innovative teams
      </p>

      <div className="relative w-full max-w-full overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-white to-transparent sm:w-40" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-white to-transparent sm:w-40" />

        <div className="group flex w-full overflow-hidden">
          <div
            className="flex w-max will-change-transform motion-safe:animate-marquee-left motion-reduce:animate-none hover:[animation-play-state:paused]"
            style={
              {
                ['--marquee-duration' as string]: '50s',
              } as CSSProperties
            }
          >
            {loopItems.map((brand, i) => (
              <div
                key={`${brand}-${i}`}
                className="group/item flex shrink-0 cursor-pointer items-center gap-2.5 pr-12 opacity-[0.35] transition-all duration-300 sm:gap-3 sm:pr-20 grayscale hover:opacity-100 hover:grayscale-0"
                aria-hidden={i >= brands.length}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded bg-black/[0.04] transition-colors group-hover/item:bg-primary/10 sm:h-6 sm:w-6">
                  <div className="h-1.5 w-1.5 rounded-full bg-black/20 transition-colors group-hover/item:bg-primary/60 sm:h-2 sm:w-2" />
                </div>
                <span className="whitespace-nowrap text-lg font-extrabold uppercase italic tracking-tighter text-neutral-800 sm:text-xl">
                  {brand}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
