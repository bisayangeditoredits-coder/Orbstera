'use client';

import { useRef, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

type VirtualColumnProps<T> = {
  items: T[];
  estimateSize?: number;
  gap?: number;
  className?: string;
  renderItem: (item: T, index: number) => ReactNode;
  getKey?: (item: T, index: number) => string | number;
};

export function VirtualColumn<T>({
  items,
  estimateSize = 112,
  gap = 20,
  className = '',
  renderItem,
  getKey,
}: VirtualColumnProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize + gap,
    overscan: 4,
  });

  if (items.length <= 24) {
    return (
      <div className={`space-y-5 ${className}`} data-lenis-prevent>
        {items.map((item, index) => (
          <div key={getKey ? getKey(item, index) : index}>{renderItem(item, index)}</div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-y-auto overflow-x-hidden custom-scrollbar ${className}`}
      data-lenis-prevent
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          const key = getKey ? getKey(item, virtualRow.index) : virtualRow.key;
          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                paddingBottom: gap,
              }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
