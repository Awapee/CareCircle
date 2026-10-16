import clsx, { type ClassValue } from 'clsx';

/** Joins conditional class names. Components avoid conflicting utilities, so no merge step is needed. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
