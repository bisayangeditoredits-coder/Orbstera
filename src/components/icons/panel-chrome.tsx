import { cn } from '@/lib/cn';
import type { LucideIcon } from './lucide';
import { iconSize } from './sizes';

/** Icon badge in panel headers — matches TopBar / GeneratePanel premium chrome */
export const panelHeaderIconBox =
  'w-9 h-9 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50 border border-neutral-200/70 flex items-center justify-center shrink-0 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]';

/** Standard close button in side panels */
export const panelCloseButtonClass =
  'w-8 h-8 rounded-xl border border-neutral-200/70 bg-white text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 hover:border-neutral-300 flex items-center justify-center shrink-0 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]';

/** Compact toolbar / row action button */
export const panelIconButtonClass =
  'inline-flex items-center justify-center shrink-0 leading-none';

type PanelHeaderIconProps = {
  icon: LucideIcon;
  className?: string;
  iconClassName?: string;
  size?: number;
};

export function PanelHeaderIcon({
  icon: Icon,
  className,
  iconClassName,
  size = iconSize.panelHeader,
}: PanelHeaderIconProps) {
  return (
    <div className={cn(panelHeaderIconBox, className)}>
      <Icon size={size} strokeWidth={1.75} className={cn('text-neutral-600', iconClassName)} />
    </div>
  );
}

type PanelCloseIconProps = {
  icon: LucideIcon;
  size?: number;
  className?: string;
};

export function PanelCloseIcon({
  icon: Icon,
  size = iconSize.panelCompact,
  className,
}: PanelCloseIconProps) {
  return <Icon size={size} strokeWidth={1.75} className={className} />;
}
