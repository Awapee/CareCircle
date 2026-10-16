import { localDate } from './dates';
import { statusOf } from './status';
import type { DisplayStatus, Occurrence, Task } from './types';

export interface DayMetrics {
  scheduled: number;
  completed: number;
  upcoming: number;
  needsReview: number;
}

/**
 * Counts for one local day. Cancelled occurrences are not "scheduled"; skipped ones are,
 * but they are neither completed nor outstanding.
 */
export function dayMetrics(
  occurrences: Occurrence[],
  tasksById: Map<string, Task>,
  day: string,
  timeZone: string,
  now: Date,
): DayMetrics {
  const m: DayMetrics = { scheduled: 0, completed: 0, upcoming: 0, needsReview: 0 };
  for (const occ of occurrences) {
    if (localDate(new Date(occ.scheduledAt), timeZone) !== day) continue;
    const task = tasksById.get(occ.taskId);
    if (!task) continue;
    const status: DisplayStatus = statusOf(occ, task, now);
    if (status === 'cancelled') continue;
    m.scheduled += 1;
    if (status === 'completed') m.completed += 1;
    else if (status === 'upcoming' || status === 'pending') m.upcoming += 1;
    else if (status === 'needs_review') m.needsReview += 1;
  }
  return m;
}
