import { addDays, daysBetween, isoWeekday, zonedTimeToUtc } from './dates';
import type { Recurrence, Task, Weekday } from './types';

/** How many days ahead occurrences are created. Matches the scheduler in the database. */
export const OCCURRENCE_WINDOW_DAYS = 14;

/** Whether a series has an occurrence on a local calendar date (ignoring start/end bounds). */
export function recursOn(recurrence: Recurrence, startDate: string, date: string): boolean {
  const offset = daysBetween(startDate, date);
  if (offset < 0) return false;
  switch (recurrence.kind) {
    case 'once':
      return offset === 0;
    case 'daily':
      return true;
    case 'weekly':
      return recurrence.days.includes(isoWeekday(date) as Weekday);
    case 'interval':
      return offset % Math.max(1, recurrence.everyDays) === 0;
  }
}

export interface PlannedOccurrence {
  occurrenceDate: string;
  localTime: string;
  scheduledAt: Date;
}

type SeriesFields = Pick<Task, 'recurrence' | 'times' | 'startDate' | 'endDate' | 'pausedAt'>;

/**
 * Every occurrence of a series between two local dates (inclusive), in time order.
 * Paused series produce nothing. Times are converted from the circle's time zone, so
 * "08:00 every day" stays at 08:00 local time across daylight-saving changes.
 */
export function planOccurrences(task: SeriesFields, from: string, to: string, timeZone: string): PlannedOccurrence[] {
  if (task.pausedAt) return [];
  const first = daysBetween(task.startDate, from) > 0 ? from : task.startDate;
  const last = task.endDate && daysBetween(task.endDate, to) > 0 ? task.endDate : to;
  const out: PlannedOccurrence[] = [];
  const times = [...new Set(task.times)].sort();
  for (let date = first; daysBetween(date, last) >= 0; date = addDays(date, 1)) {
    if (!recursOn(task.recurrence, task.startDate, date)) continue;
    for (const time of times) {
      out.push({ occurrenceDate: date, localTime: time, scheduledAt: zonedTimeToUtc(date, time, timeZone) });
    }
  }
  return out;
}

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** "Every day", "Mon, Wed, Fri", "Every 3 days", "Once". */
export function describeRecurrence(recurrence: Recurrence): string {
  switch (recurrence.kind) {
    case 'once':
      return 'Once';
    case 'daily':
      return 'Every day';
    case 'weekly':
      if (recurrence.days.length === 7) return 'Every day';
      return [...recurrence.days]
        .sort()
        .map((d) => WEEKDAY_NAMES[d - 1])
        .join(', ');
    case 'interval':
      return recurrence.everyDays === 1 ? 'Every day' : `Every ${recurrence.everyDays} days`;
  }
}

export { WEEKDAY_NAMES };
