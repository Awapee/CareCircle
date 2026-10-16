import { CalendarClock, GlassWater, ListChecks, Pill, Sun, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import type { Category } from '@/domain/types';
import { cn } from '@/lib/cn';

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  medication: Pill,
  meal: UtensilsCrossed,
  hydration: GlassWater,
  routine: Sun,
  appointment: CalendarClock,
  other: ListChecks,
};

const tints: Record<Category, string> = {
  medication: 'bg-info-50 text-info-700',
  meal: 'bg-accent-50 text-accent-800',
  hydration: 'bg-brand-50 text-brand-700',
  routine: 'bg-success-50 text-success-700',
  appointment: 'bg-warning-50 text-warning-700',
  other: 'bg-surface text-ink-muted',
};

/** A decorative category marker. The category name is always given in text nearby. */
export function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <span
      className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', tints[category], className)}
      aria-hidden="true"
    >
      <Icon className="size-5" />
    </span>
  );
}
