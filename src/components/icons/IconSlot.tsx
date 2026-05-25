import { cn } from '@/lib/cn';
import type { OrbsteraIconProps } from './Icon';
import type { ComponentType } from 'react';

type IconSlotProps = OrbsteraIconProps & {
  icon: ComponentType<OrbsteraIconProps>;
};

/** Centers icons in buttons/toolbars with consistent box */
export function IconSlot({ icon: Icon, className, size = 16, ...props }: IconSlotProps) {
  return (
    <span className={cn('inline-flex items-center justify-center shrink-0 leading-none', className)}>
      <Icon size={size} {...props} />
    </span>
  );
}
