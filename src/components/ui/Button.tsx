'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  primary:
    'bg-primary text-white hover:bg-primaryHover shadow-[0_1px_2px_rgba(59,130,246,0.25)]',
  secondary:
    'bg-white text-neutral-800 border border-neutral-200 hover:bg-neutral-50',
  danger: 'bg-red-600 text-white hover:bg-red-500 shadow-sm',
  ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
} as const;

const sizes = {
  sm: 'h-8 px-3 text-[12px]',
  md: 'h-10 px-4 text-[13px]',
  lg: 'h-11 px-5 text-[14px]',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', fullWidth, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold',
        'transition-colors duration-150',
        'focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    />
  );
});
