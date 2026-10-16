import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div
          className="mb-4 flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <div className="mt-2 max-w-md text-ink-muted">{description}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
