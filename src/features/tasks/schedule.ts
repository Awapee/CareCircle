import { useEffect, useMemo, useState } from 'react';
import { useOccurrences, useTasks } from '@/api/queries';
import { useCircle } from '@/app/session';
import { addDays, localDate, zonedTimeToUtc } from '@/domain/dates';
import { deriveStatus } from '@/domain/status';
import type { DisplayStatus, Occurrence, Task } from '@/domain/types';

/** One scheduled item, with per-occurrence overrides already applied. */
export interface ScheduleItem {
  occurrence: Occurrence;
  task: Task;
  title: string;
  assigneeId: string | null;
  /** Local "HH:mm" actually scheduled (after any reschedule). */
  time: string;
  /** Local date of the scheduled instant. */
  date: string;
  status: DisplayStatus;
}

/** The current time, refreshed every 30 seconds so statuses move from upcoming to pending on their own. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** The UTC range covering `days` local days starting at `from`, in a time zone. */
export function dayRange(from: string, days: number, timeZone: string) {
  return {
    fromIso: zonedTimeToUtc(from, '00:00', timeZone).toISOString(),
    toIso: zonedTimeToUtc(addDays(from, days), '00:00', timeZone).toISOString(),
  };
}

export function toItems(occurrences: Occurrence[], tasks: Task[], timeZone: string, now: Date): ScheduleItem[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const items: ScheduleItem[] = [];
  for (const o of occurrences) {
    const task = byId.get(o.taskId);
    if (!task) continue;
    items.push({
      occurrence: o,
      task,
      title: o.titleOverride ?? task.title,
      assigneeId: o.assigneeOverride ?? task.assigneeId,
      time: o.timeOverride ?? o.localTime,
      date: localDate(new Date(o.scheduledAt), timeZone),
      status: deriveStatus(o, task.followUpMinutes, now),
    });
  }
  return items.sort((a, b) => a.occurrence.scheduledAt.localeCompare(b.occurrence.scheduledAt));
}

/** Tasks and occurrences for a run of local days, joined into schedule items. */
export function useSchedule(from: string, days: number) {
  const { circleId, timeZone } = useCircle();
  const now = useNow();
  const range = useMemo(() => dayRange(from, days, timeZone), [from, days, timeZone]);
  const tasks = useTasks(circleId);
  const occurrences = useOccurrences(circleId, range.fromIso, range.toIso);
  const items = useMemo(
    () => (tasks.data && occurrences.data ? toItems(occurrences.data, tasks.data, timeZone, now) : []),
    [tasks.data, occurrences.data, timeZone, now],
  );
  return {
    items,
    tasks: tasks.data ?? [],
    now,
    isPending: tasks.isPending || occurrences.isPending,
    error: tasks.error ?? occurrences.error,
    refetch: () => {
      void tasks.refetch();
      void occurrences.refetch();
    },
  };
}

/** Today's date in the circle's time zone. */
export function useToday(): string {
  const { timeZone } = useCircle();
  const now = useNow(60_000);
  return localDate(now, timeZone);
}
