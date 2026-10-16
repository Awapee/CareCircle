import { canonicalTimeZone } from '@/domain/dates';

/** IANA time zones offered in pickers: the runtime's full list, or a short fallback on older browsers. */
export const TIME_ZONES: string[] = (() => {
  try {
    const zones = Intl.supportedValuesOf('timeZone').map(canonicalTimeZone);
    return [...new Set(zones)].sort();
  } catch {
    return [
      'UTC',
      'Europe/London',
      'Europe/Dublin',
      'Europe/Paris',
      'America/New_York',
      'America/Los_Angeles',
      'Asia/Kathmandu',
      'Asia/Kolkata',
      'Australia/Sydney',
    ];
  }
})();
