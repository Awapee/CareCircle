import { addDays, localDate } from '@/domain/dates';
import { inQuietHours } from '@/domain/quietHours';
import { OCCURRENCE_WINDOW_DAYS, planOccurrences } from '@/domain/recurrence';
import type { ActivityType, NotificationKind } from '@/domain/types';
import { newId, type DemoDb, type OccurrenceRow, type TaskRow } from './store';

/**
 * Low-level operations on the demo database, shared by the demo API and the seed data.
 * These mirror the SQL functions in supabase/migrations/0003_functions.sql; permission checks
 * live in DemoApi, as they live in each SQL function.
 */

export function circleTimeZone(db: DemoDb, circleId: string): string {
  return db.circles.find((c) => c.id === circleId)?.timeZone ?? 'UTC';
}

export function circleToday(db: DemoDb, circleId: string, now: Date): string {
  return localDate(now, circleTimeZone(db, circleId));
}

export function displayName(db: DemoDb, userId: string | null): string {
  return db.users.find((u) => u.id === userId)?.displayName ?? 'Someone';
}

export function log(
  db: DemoDb,
  circleId: string,
  actorId: string | null,
  type: ActivityType,
  summary: string,
  subjectId: string | null,
  at: Date,
): void {
  db.activity.push({
    id: newId(),
    circleId,
    actorId,
    type,
    summary: summary.slice(0, 300),
    subjectId,
    createdAt: at.toISOString(),
  });
}

/** Same behaviour as `_generate_occurrences`: existing slots are kept, slots before `notBefore` are skipped. */
export function generateOccurrences(
  db: DemoDb,
  task: TaskRow,
  from: string,
  to: string,
  notBefore: Date | null,
): number {
  if (task.pausedAt) return 0;
  const tz = circleTimeZone(db, task.circleId);
  const existing = new Set(
    db.occurrences.filter((o) => o.taskId === task.id).map((o) => `${o.occurrenceDate} ${o.localTime}`),
  );
  let n = 0;
  for (const p of planOccurrences(task, from, to, tz)) {
    if (notBefore && p.scheduledAt < notBefore) continue;
    const key = `${p.occurrenceDate} ${p.localTime}`;
    if (existing.has(key)) continue;
    existing.add(key);
    db.occurrences.push(blankOccurrence(task, p.occurrenceDate, p.localTime, p.scheduledAt.toISOString()));
    n += 1;
  }
  return n;
}

export function blankOccurrence(task: TaskRow, date: string, time: string, scheduledAt: string): OccurrenceRow {
  return {
    id: newId(),
    taskId: task.id,
    circleId: task.circleId,
    occurrenceDate: date,
    localTime: time,
    scheduledAt,
    outcome: null,
    outcomeBy: null,
    outcomeAt: null,
    note: '',
    titleOverride: null,
    assigneeOverride: null,
    timeOverride: null,
    version: 1,
    followUpLoggedAt: null,
  };
}

/** Removes future occurrences with nothing recorded (when a series is edited or paused). */
export function dropFutureUnrecorded(db: DemoDb, taskId: string, now: Date): void {
  db.occurrences = db.occurrences.filter(
    (o) => !(o.taskId === taskId && o.outcome === null && new Date(o.scheduledAt) > now),
  );
}

function prefsOf(db: DemoDb, userId: string) {
  return db.prefs.find((p) => p.userId === userId);
}

/** Inserts a notification unless one with the same dedupe key exists. Returns true if inserted. */
export function notify(
  db: DemoDb,
  n: {
    circleId: string;
    recipientId: string;
    kind: NotificationKind;
    title: string;
    body: string;
    occurrenceId: string | null;
    dedupeKey: string;
  },
  at: Date,
): boolean {
  if (db.notifications.some((x) => x.dedupeKey === n.dedupeKey)) return false;
  if (prefsOf(db, n.recipientId)?.inApp === false) return false;
  db.notifications.push({ ...n, id: newId(), readAt: null, createdAt: at.toISOString() });
  return true;
}

function isMember(db: DemoDb, circleId: string, userId: string): boolean {
  return db.members.some((m) => m.circleId === circleId && m.userId === userId);
}

function quiet(db: DemoDb, userId: string, now: Date): boolean {
  const p = prefsOf(db, userId);
  const tz = db.users.find((u) => u.id === userId)?.timeZone ?? 'UTC';
  return !!p && inQuietHours(now, p.quietStart, p.quietEnd, tz);
}

/** The same steps as `run_scheduler()`; every step is idempotent. */
export function runScheduler(db: DemoDb, now: Date): { occurrences: number; reminders: number; followUps: number } {
  let occurrences = 0;
  let reminders = 0;
  let followUps = 0;
  const tasks = new Map(db.tasks.map((t) => [t.id, t]));

  for (const task of db.tasks) {
    if (task.pausedAt) continue;
    const today = circleToday(db, task.circleId, now);
    occurrences += generateOccurrences(
      db,
      task,
      addDays(today, -1),
      addDays(today, OCCURRENCE_WINDOW_DAYS),
      new Date(task.updatedAt),
    );
  }

  const twoDaysAgo = now.getTime() - 2 * 86_400_000;
  for (const o of db.occurrences) {
    const task = tasks.get(o.taskId);
    if (!task || task.pausedAt) continue;
    const at = new Date(o.scheduledAt).getTime();
    const followUpAt = at + task.followUpMinutes * 60_000;
    const title = o.titleOverride ?? task.title;
    const assignee = o.assigneeOverride ?? task.assigneeId;
    const contacts = db.followUps.filter((f) => f.circleId === o.circleId).map((f) => f.userId);
    const send = (userId: string, kind: 'reminder' | 'follow_up', body: string) => {
      if (!isMember(db, o.circleId, userId) || quiet(db, userId, now)) return false;
      return notify(
        db,
        {
          circleId: o.circleId,
          recipientId: userId,
          kind,
          title: kind === 'reminder' ? `Coming up: ${title}` : `Needs review: ${title}`,
          body,
          occurrenceId: o.id,
          dedupeKey: `${kind}:${o.id}:${userId}`,
        },
        now,
      );
    };

    if (
      o.outcome === null &&
      task.reminderMinutesBefore !== null &&
      now.getTime() >= at - task.reminderMinutesBefore * 60_000 &&
      now.getTime() < followUpAt
    ) {
      for (const userId of assignee ? [assignee] : contacts) {
        if (send(userId, 'reminder', 'Scheduled soon. Open the task to record what happened.')) reminders += 1;
      }
    }

    const overdue = o.outcome === null && now.getTime() >= followUpAt;
    if (at > twoDaysAgo && (overdue || o.outcome === 'not_taken')) {
      const body =
        o.outcome === 'not_taken'
          ? 'Recorded as not taken. Check in when you can.'
          : 'Nothing has been recorded yet. This is a missed confirmation, not proof that anything is wrong.';
      for (const userId of new Set([...contacts, ...(assignee ? [assignee] : [])])) {
        if (send(userId, 'follow_up', body)) followUps += 1;
      }
      if (overdue && !o.followUpLoggedAt) {
        o.followUpLoggedAt = now.toISOString();
        log(db, o.circleId, null, 'follow_up_due', `“${title}” needs review: nothing recorded yet`, o.id, now);
      }
    }
  }

  for (const n of db.notifications) {
    if (now.getTime() - new Date(n.createdAt).getTime() > 86_400_000) continue;
    const p = prefsOf(db, n.recipientId);
    for (const channel of ['email', 'push'] as const) {
      if (!p?.[channel]) continue;
      if (db.deliveries.some((d) => d.notificationId === n.id && d.channel === channel)) continue;
      db.deliveries.push({ notificationId: n.id, channel, status: 'not_configured' });
    }
  }

  return { occurrences, reminders, followUps };
}
