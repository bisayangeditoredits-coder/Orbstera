'use client';

/**
 * InsertStyleSelector
 * -------------------
 * A reusable dropdown/pill selector for choosing how Wikipedia / TopInsert
 * content is placed on the slide.
 *
 * Props:
 *  value    – currently selected style string
 *  onChange – called when the user selects a new style
 *
 * This component is purely presentational — it emits events upward.
 * No store access is needed here; callers own the insertion logic.
 */

import React from 'react';

export type InsertStyle =
  | 'textBox'
  | 'imageCard'
  | 'sideBySide'
  | 'fullBleed'
  | 'quote'
  | 'list';

interface StyleOption {
  id: InsertStyle;
  label: string;
  icon: string;
  description: string;
}

const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'textBox',
    label: 'Text Box',
    icon: 'ðŸ“',
    description: 'Plain text block on the slide',
  },
  {
    id: 'imageCard',
    label: 'Image Card',
    icon: 'ðŸ–¼ï¸',
    description: 'Image with caption overlay',
  },
  {
    id: 'sideBySide',
    label: 'Side by Side',
    icon: '⬛⬜',
    description: 'Image left, text right',
  },
  {
    id: 'fullBleed',
    label: 'Full Bleed',
    icon: 'ðŸŒ…',
    description: 'Full-canvas background image',
  },
  {
    id: 'quote',
    label: 'Quote',
    icon: 'â',
    description: 'Centered pull-quote style',
  },
  {
    id: 'list',
    label: 'Bullet List',
    icon: 'ðŸ“‹',
    description: 'Bulleted content list',
  },
];

interface InsertStyleSelectorProps {
  value: InsertStyle;
  onChange: (style: InsertStyle) => void;
  className?: string;
}

export function InsertStyleSelector({
  value,
  onChange,
  className = '',
}: InsertStyleSelectorProps) {
  return (
    <div
      className={`flex flex-wrap gap-1.5 ${className}`}
      role="radiogroup"
      aria-label="Insert style"
    >
      {STYLE_OPTIONS.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${opt.label}: ${opt.description}`}
            title={opt.description}
            onClick={() => onChange(opt.id)}
            className={[
              'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-150 select-none',
              selected
                ? 'border-primary/70 bg-primary/10 text-primary shadow-sm'
                : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10 hover:text-white/80',
            ].join(' ')}
          >
            <span aria-hidden className="text-[13px] leading-none">
              {opt.icon}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
