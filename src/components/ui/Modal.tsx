'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** sm: 400px, md: 480px, lg: 640px, xl: 780px */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  panelClassName?: string;
  showClose?: boolean;
  closeDisabled?: boolean;
  labelledBy?: string;
  describedBy?: string;
}

const SIZE_CLASS: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-[400px]',
  md: 'max-w-[480px]',
  lg: 'max-w-[640px]',
  xl: 'max-w-[780px]',
};

export function Modal({
  open,
  onClose,
  children,
  size = 'md',
  className,
  panelClassName,
  showClose = true,
  closeDisabled = false,
  labelledBy,
  describedBy,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const fallbackTitleId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !closeDisabled) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, closeDisabled]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[600] flex items-center justify-center p-4',
        'animate-[modal-overlay-in_0.18s_ease-out]',
        className,
      )}
      role="presentation"
      onClick={() => !closeDisabled && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? fallbackTitleId}
        aria-describedby={describedBy}
        className={cn(
          'relative z-[1] w-full overflow-hidden',
          'rounded-lg border border-neutral-200/90 bg-white',
          'shadow-[0_24px_48px_-12px_rgba(15,23,42,0.18)]',
          'animate-[modal-panel-in_0.2s_cubic-bezier(0.22,1,0.36,1)]',
          SIZE_CLASS[size],
          panelClassName,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
