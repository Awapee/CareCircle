import type { BadgeTone } from '@/components/ui/Badge';
import type { DisplayStatus, Occurrence, Outcome, Task } from './types';

/**
 * The single source of truth for the status a user sees. The database only stores the
 * recorded outcome; everything else follows from the clock and the follow-up setting.
 */
export function deriveStatus(
  occ: Pick<Occurrence, 'outcome' | 'scheduledAt'>,
  followUpMinutes: number,
  now: Date,
): DisplayStatus {
  switch (occ.outcome) {
    case 'completed':
    case 'taken':
      return 'completed';
    case 'skipped':
      return 'skipped';
    case 'cancelled':
      return 'cancelled';
    case 'not_taken':
      return 'needs_review';
    case null:
      break;
  }
  const scheduled = new Date(occ.scheduledAt).getTime();
  if (now.getTime() < scheduled) return 'upcoming';
  if (now.getTime() < scheduled + followUpMinutes * 60_000) return 'pending';
  return 'needs_review';
}

export function statusOf(occ: Occurrence, task: Pick<Task, 'followUpMinutes'>, now: Date): DisplayStatus {
  return deriveStatus(occ, task.followUpMinutes, now);
}

export const STATUS_TONES: Record<DisplayStatus, BadgeTone> = {
  upcoming: 'neutral',
  pending: 'info',
  needs_review: 'warning',
  completed: 'success',
  skipped: 'neutral',
  cancelled: 'neutral',
};

/** Outcomes a person can record for a task of a given category. */
export function outcomesFor(category: Task['category']): Outcome[] {
  return category === 'medication'
    ? ['taken', 'not_taken', 'skipped', 'cancelled']
    : ['completed', 'skipped', 'cancelled'];
}

export const OUTCOME_LABELS: Record<Outcome, string> = {
  completed: 'Mark done',
  taken: 'Mark taken',
  not_taken: 'Not taken',
  skipped: 'Skip',
  cancelled: 'Cancel',
};

/** Past-tense wording for history and activity. */
export const OUTCOME_PAST: Record<Outcome, string> = {
  completed: 'marked as done',
  taken: 'marked as taken',
  not_taken: 'marked as not taken',
  skipped: 'skipped',
  cancelled: 'cancelled',
};
