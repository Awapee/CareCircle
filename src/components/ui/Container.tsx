import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Horizontally centred content column with responsive side padding. */
export function Container({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)} {...rest} />;
}
