import { TZDate } from '@date-fns/tz';

/**
 * Local calendar dates are plain "yyyy-MM-dd" strings and times are "HH:mm" strings.
 * Arithmetic on calendar dates is done in UTC so the host machine's time zone never leaks in.
 */

const DAY_MS = 86_400_000;

function toUtcMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!);
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

/** ISO weekday of a calendar date: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: string): number {
  const day = new Date(toUtcMs(date)).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Monday of the week containing `date`. */
export function startOfIsoWeek(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

/**
 * The UTC instant of a local wall-clock time in an IANA time zone. Times that don't exist
 * (skipped by a daylight-saving change) move forward to the next valid instant.
 */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(new TZDate(y!, m! - 1, d!, hh!, mm!, timeZone).getTime());
}

/** The local calendar date ("yyyy-MM-dd") of an instant in a time zone. */
export function localDate(instant: Date, timeZone: string): string {
  const z = new TZDate(instant.getTime(), timeZone);
  return `${z.getFullYear()}-${pad(z.getMonth() + 1)}-${pad(z.getDate())}`;
}

/** The local wall-clock time ("HH:mm") of an instant in a time zone. */
export function localTime(instant: Date, timeZone: string): string {
  const z = new TZDate(instant.getTime(), timeZone);
  return `${pad(z.getHours())}:${pad(z.getMinutes())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** A valid IANA time-zone name accepted by the runtime. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Some browsers still report old spellings of a few zones (e.g. "Asia/Katmandu"). Both work everywhere,
 * so the current official name is shown and stored.
 */
const RENAMED_ZONES: Record<string, string> = {
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Rangoon': 'Asia/Yangon',
  'Europe/Kiev': 'Europe/Kyiv',
  'America/Godthab': 'America/Nuuk',
  'Pacific/Enderbury': 'Pacific/Kanton',
};

export function canonicalTimeZone(zone: string): string {
  return RENAMED_ZONES[zone] ?? zone;
}

/** The browser's time zone, falling back to UTC. */
export function browserTimeZone(): string {
  try {
    return canonicalTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  } catch {
    return 'UTC';
  }
}

/** "Mon 14 Oct" style label for a local date. */
export function formatDateLabel(date: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Date(toUtcMs(date)).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    ...opts,
  });
}

/** "08:00" → "8:00 am" style label. */
export function formatTimeLabel(time: string): string {
  const [hh, mm] = time.split(':').map(Number);
  const suffix = hh! < 12 ? 'am' : 'pm';
  const h12 = hh! % 12 === 0 ? 12 : hh! % 12;
  return `${h12}:${pad(mm!)} ${suffix}`;
}

/** Date and time of an instant, shown in a time zone, e.g. "14 Oct, 8:05 am". */
export function formatInstant(iso: string, timeZone: string): string {
  const instant = new Date(iso);
  return `${formatDateLabel(localDate(instant, timeZone), { weekday: undefined })}, ${formatTimeLabel(
    localTime(instant, timeZone),
  )}`;
}

/** "5 min ago", "3 h ago", "2 days ago". */
export function formatRelative(iso: string, now: Date): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
