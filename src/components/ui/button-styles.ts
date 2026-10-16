import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse' | 'inverseOutline';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap ' +
  'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-55 ' +
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-55';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800',
  secondary: 'border border-line-strong bg-canvas text-ink hover:bg-surface hover:border-ink-subtle',
  ghost: 'text-ink-muted hover:bg-surface hover:text-ink',
  danger: 'bg-danger-600 text-white shadow-sm hover:bg-danger-700',
  // For use on dark brand backgrounds.
  inverse: 'bg-white text-brand-800 shadow-sm hover:bg-brand-50',
  inverseOutline: 'text-white ring-1 ring-inset ring-white/50 hover:bg-white/10',
};

// Minimum heights keep every control at or above the 44px touch-target guideline (sm is for dense desktop toolbars).
const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-[0.9375rem]',
  lg: 'min-h-12 px-6 text-base',
};

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className);
}
