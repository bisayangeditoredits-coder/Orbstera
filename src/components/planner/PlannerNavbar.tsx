'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const STEPS = ['PLAN', 'REFINE', 'GENERATE'];

export function PlannerNavbar() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-black/[0.04] bg-white px-6">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center">
          <img
            src="/logo.png.png"
            alt="Orbstera"
            className="h-6 w-auto object-contain"
          />
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center rounded-xl bg-blue-50/50 p-2 text-primary">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.29 7 12 12 20.71 7" />
              <line x1="12" y1="22" x2="12" y2="12" />
            </svg>
          </div>
          <span className="font-semibold text-neutral-900">
            Presentation Copilot
          </span>
        </div>
      </div>

      <div className="flex flex-1 justify-center">
        <div className="flex items-center gap-8 text-[11px] font-bold tracking-widest text-neutral-400">
          {STEPS.map((step, idx) => (
            <div
              key={step}
              className={`flex items-center gap-2 ${
                idx === 0 ? 'text-primary' : ''
              }`}
            >
              {idx === 0 && <span className="text-primary">✓</span>}
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/my-presentations"
          className="flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
        >
          My decks
        </Link>
        <button className="flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-all hover:bg-primaryHover active:scale-[0.98] shadow-[0_4px_14px_-4px_rgba(59,130,246,0.55),0_0_0_1px_rgba(255,255,255,0.12)_inset]">
          <span>Generate deck</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </header>
  );
}
