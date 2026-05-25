import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type OrbsteraIconProps = {
  size?: number;
  className?: string;
  /** Lucide-compat — ignored for filled Streamline icons */
  strokeWidth?: number;
  style?: CSSProperties;
  'aria-hidden'?: boolean;
  title?: string;
};

type IconRootProps = OrbsteraIconProps & {
  viewBox?: string;
  children: ReactNode;
};

/** Local Streamline-based icons — use currentColor for theme/hover/dark mode */
export function OrbsteraIcon({
  size = 20,
  className,
  style,
  viewBox = '0 0 24 24',
  children,
  title,
  'aria-hidden': ariaHidden = !title,
}: IconRootProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      style={style}
      className={cn('shrink-0', className)}
      aria-hidden={ariaHidden}
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      {children}
    </svg>
  );
}
