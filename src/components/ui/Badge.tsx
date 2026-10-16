import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface text-ink-muted ring-line-strong',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  success: 'bg-success-50 text-success-700 ring-success-700/20',
  warning: 'bg-warning-50 text-warning-700 ring-warning-700/25',
  danger: 'bg-danger-50 text-danger-700 ring-danger-700/20',
  info: 'bg-info-50 text-info-700 ring-info-700/20',
  accent: 'bg-accent-100 text-accent-800 ring-accent-800/20',
};

/** A small text label. Colour is supplementary — the text itself always carries the meaning. */
export function Badge({
  tone = 'neutral',
  icon,
  children,
  className,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.8125rem] font-medium ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
