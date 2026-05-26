'use client';

import { useRef, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

type VirtualRowProps<T> = {
  items: T[];
  estimateSize?: number;
  gap?: number;
  className?: string;
  renderItem: (item: T, index: number) => ReactNode;
  getKey?: (item: T, index: number) => string | number;
  /** Below this count, render all items (no virtualizer overhead). */
  virtualizeThreshold?: number;
};

/** Horizontal virtual list for slide strips and similar rails. */
export function VirtualRow<T>({
  items,
  estimateSize = 88,
  gap = 8,
  className = '',
  renderItem,
  getKey,
  virtualizeThreshold = 24,
}: VirtualRowProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    horizontal: true,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize + gap,
    overscan: 3,
  });

  if (items.length <= virtualizeThreshold) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {items.map((item, index) => (
          <div key={getKey ? getKey(item, index) : index} className="shrink-0">
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-x-auto overflow-y-hidden scrollbar-none ${className}`}
      style={{ scrollbarWidth: 'none' }}
    >
      <div
        style={{
          width: `${virtualizer.getTotalSize()}px`,
          height: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualCol) => {
          const item = items[virtualCol.index];
          const key = getKey ? getKey(item, virtualCol.index) : virtualCol.key;
          return (
            <div
              key={key}
              className="absolute top-0"
              style={{
                left: 0,
                height: '100%',
                transform: `translateX(${virtualCol.start}px)`,
                paddingRight: gap,
              }}
            >
              {renderItem(item, virtualCol.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
