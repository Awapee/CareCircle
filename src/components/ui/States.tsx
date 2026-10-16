import { RotateCw } from 'lucide-react';
import { errorMessage } from '@/api/types';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { Notice } from './Notice';

/** Shown while data loads. Announced politely to screen readers. */
export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-3 py-16 text-ink-muted', className)}>
      <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label}
    </div>
  );
}

/** Shown when data couldn't load, with a way to try again. */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Notice tone="warning" title="This couldn’t be loaded" className={className}>
      <p>{errorMessage(error)}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={onRetry}
          icon={<RotateCw className="size-4" aria-hidden="true" />}
        >
          Try again
        </Button>
      )}
    </Notice>
  );
}

/** An inline error from a failed action, announced immediately. */
export function ActionError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-danger-700/20 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700"
    >
      {errorMessage(error)}
    </p>
  );
}
