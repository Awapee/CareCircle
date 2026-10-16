import type { ReactNode } from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

const tones = {
  info: { box: 'border-info-700/20 bg-info-50 text-info-700', Icon: Info },
  warning: { box: 'border-warning-700/25 bg-warning-50 text-warning-700', Icon: TriangleAlert },
  neutral: { box: 'border-line bg-surface text-ink-muted', Icon: Info },
} as const;

/** An inline, non-interruptive message (e.g. "this page is provisional"). */
export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: keyof typeof tones;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const { box, Icon } = tones[tone];
  return (
    <div className={cn('flex gap-3 rounded-xl border px-4 py-3 text-[0.9375rem]', box, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn(title && 'mt-0.5', 'text-ink-muted [&_a]:font-medium [&_a]:text-ink [&_a]:underline')}>
          {children}
        </div>
      </div>
    </div>
  );
}
