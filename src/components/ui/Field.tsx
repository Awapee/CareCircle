import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

/**
 * Form fields with a visible label, optional hint, and an error that is announced and linked to
 * the control with aria-describedby. Controls are at least 44px tall.
 */

const control =
  'block w-full rounded-xl border border-line-strong bg-canvas px-3.5 text-[0.9375rem] text-ink ' +
  'placeholder:text-ink-subtle hover:border-ink-subtle disabled:cursor-not-allowed disabled:bg-surface ' +
  'aria-[invalid=true]:border-danger-600';

interface FieldShellProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

export function FieldShell({ label, hint, error, optional, className, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="block text-[0.9375rem] font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-ink-subtle"> (optional)</span>}
      </label>
      {hint && (
        <p id={hintId} className="mt-0.5 text-sm text-ink-muted">
          {hint}
        </p>
      )}
      <div className="mt-1.5">{children({ id, describedBy, invalid: !!error })}</div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}

type Common = { label: ReactNode; hint?: ReactNode; error?: string; optional?: boolean; className?: string };

export function TextField({
  label,
  hint,
  error,
  optional,
  className,
  ...rest
}: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(control, 'min-h-11 py-2')}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

export function TextArea({
  label,
  hint,
  error,
  optional,
  className,
  ...rest
}: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          rows={3}
          className={cn(control, 'py-2.5 leading-relaxed')}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  className,
  children,
  ...rest
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(control, 'min-h-11 py-2 pr-9')}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export function Checkbox({
  label,
  hint,
  className,
  ...rest
}: { label: ReactNode; hint?: ReactNode; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const id = useId();
  return (
    <div className={cn('flex gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-0.5 size-5 shrink-0 rounded border-line-strong accent-brand-600"
        {...rest}
      />
      <div className="min-w-0">
        <label htmlFor={id} className="text-[0.9375rem] font-medium text-ink">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-sm text-ink-muted">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

/** A group of related controls with a shared legend (e.g. weekday checkboxes). */
export function Fieldset({
  legend,
  hint,
  error,
  children,
  className,
}: {
  legend: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="text-[0.9375rem] font-medium text-ink">{legend}</legend>
      {hint && <p className="mt-0.5 text-sm text-ink-muted">{hint}</p>}
      <div className="mt-2">{children}</div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
