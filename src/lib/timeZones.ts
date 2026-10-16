/** IANA time zones offered in pickers: the runtime's full list, or a short fallback on older browsers. */
export const TIME_ZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [
      'UTC',
      'Europe/London',
      'Europe/Dublin',
      'Europe/Paris',
      'America/New_York',
      'America/Los_Angeles',
      'Asia/Kolkata',
      'Australia/Sydney',
    ];
  }
})();
