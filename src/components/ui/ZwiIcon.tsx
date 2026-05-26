import React from 'react';
import { cn } from '@/lib/cn';

interface ZwiIconProps {
  name: string;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

export const ZwiIcon = React.forwardRef<HTMLElement, ZwiIconProps>(
  ({ name, size = 16, className, style, onClick, title }, ref) => {
    // If the name doesn't start with zwicon-, add it.
    // e.g. name="star" -> class="zwi zwicon-star"
    const iconClass = name.startsWith('zwicon-') ? name : `zwicon-${name}`;

    return (
      <i
        ref={ref}
        className={cn('zwicon', iconClass, className)}
        style={{
          fontSize: typeof size === 'number' ? `${size}px` : size,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
        onClick={onClick}
        title={title}
      />
    );
  }
);

ZwiIcon.displayName = 'ZwiIcon';
