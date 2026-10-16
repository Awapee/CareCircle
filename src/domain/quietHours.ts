import { localTime } from './dates';

/**
 * Whether an instant falls inside a user's quiet hours. Windows may cross midnight
 * (e.g. 22:00–07:00). Equal start and end means no quiet hours.
 */
export function inQuietHours(instant: Date, start: string | null, end: string | null, timeZone: string): boolean {
  if (!start || !end || start === end) return false;
  const t = localTime(instant, timeZone);
  return start < end ? t >= start && t < end : t >= start || t < end;
}
