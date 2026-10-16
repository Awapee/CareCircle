import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type CardProps = HTMLAttributes<HTMLElement> & {
  padding?: 'none' | 'md' | 'lg';
  as?: 'div' | 'section' | 'article' | 'li';
};

const paddings = { none: '', md: 'p-5', lg: 'p-6 sm:p-7' } as const;

/** The single card style used across CareCircle: white surface, subtle border, rounded corners. */
export function Card({ padding = 'md', as: Tag = 'div', className, ...rest }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-[var(--radius-card)] border border-line bg-canvas shadow-card',
        paddings[padding],
        className,
      )}
      {...rest}
    />
  );
}
