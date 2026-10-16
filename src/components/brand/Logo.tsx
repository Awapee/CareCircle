import { cn } from '@/lib/cn';

/**
 * CareCircle mark: a ring (the circle of care) with three members around it.
 * The yellow dot represents the person at the centre of the circle's attention.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8 shrink-0', className)} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" className="fill-brand-600" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="white" strokeWidth="2.5" />
      <circle cx="16" cy="7.5" r="2.6" className="fill-accent-400" />
      <circle cx="8.6" cy="20.25" r="2.6" fill="white" />
      <circle cx="23.4" cy="20.25" r="2.6" fill="white" />
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      <span className="text-lg font-semibold tracking-tight text-ink">
        Care<span className="text-brand-600">Circle</span>
      </span>
    </span>
  );
}
