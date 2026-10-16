import { describe, expect, it } from 'vitest';
import { addDays, isoWeekday, localDate, localTime, startOfIsoWeek, zonedTimeToUtc } from './dates';
import { dayMetrics } from './metrics';
import { can } from './permissions';
import { inQuietHours } from './quietHours';
import { describeRecurrence, planOccurrences, recursOn } from './recurrence';
import { deriveStatus } from './status';
import type { Occurrence, Task } from './types';
import { taskInputSchema, type TaskInput } from './validation';

const at = (iso: string) => new Date(iso);

describe('deriveStatus', () => {
  const scheduledAt = '2026-03-10T08:00:00.000Z';
  const occ = (outcome: Occurrence['outcome']) => ({ outcome, scheduledAt });

  it('is upcoming before the scheduled time', () => {
    expect(deriveStatus(occ(null), 30, at('2026-03-10T07:59:00Z'))).toBe('upcoming');
  });
  it('is pending during the follow-up wait', () => {
    expect(deriveStatus(occ(null), 30, at('2026-03-10T08:00:00Z'))).toBe('pending');
    expect(deriveStatus(occ(null), 30, at('2026-03-10T08:29:59Z'))).toBe('pending');
  });
  it('needs review once the wait has passed with nothing recorded', () => {
    expect(deriveStatus(occ(null), 30, at('2026-03-10T08:30:00Z'))).toBe('needs_review');
  });
  it('maps recorded outcomes regardless of the clock', () => {
    const early = at('2026-03-09T00:00:00Z');
    expect(deriveStatus(occ('completed'), 30, early)).toBe('completed');
    expect(deriveStatus(occ('taken'), 30, early)).toBe('completed');
    expect(deriveStatus(occ('not_taken'), 30, early)).toBe('needs_review');
    expect(deriveStatus(occ('skipped'), 30, early)).toBe('skipped');
    expect(deriveStatus(occ('cancelled'), 30, early)).toBe('cancelled');
  });
});

describe('dates', () => {
  it('does calendar arithmetic across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });
  it('knows ISO weekdays and week starts', () => {
    expect(isoWeekday('2026-10-12')).toBe(1); // Monday
    expect(isoWeekday('2026-10-18')).toBe(7); // Sunday
    expect(startOfIsoWeek('2026-10-18')).toBe('2026-10-12');
  });
  it('converts local wall-clock time to UTC across daylight saving', () => {
    // London: GMT in winter, BST (UTC+1) in summer.
    expect(zonedTimeToUtc('2026-01-15', '08:00', 'Europe/London').toISOString()).toBe('2026-01-15T08:00:00.000Z');
    expect(zonedTimeToUtc('2026-07-15', '08:00', 'Europe/London').toISOString()).toBe('2026-07-15T07:00:00.000Z');
    // New York: UTC-5 / UTC-4.
    expect(zonedTimeToUtc('2026-01-15', '08:00', 'America/New_York').toISOString()).toBe('2026-01-15T13:00:00.000Z');
  });
  it('moves a time skipped by a daylight-saving change forward', () => {
    // Clocks in London jump from 01:00 to 02:00 on 29 March 2026.
    const instant = zonedTimeToUtc('2026-03-29', '01:30', 'Europe/London');
    expect(localTime(instant, 'Europe/London')).toBe('02:30');
  });
  it('reads local dates and times back from an instant', () => {
    const instant = at('2026-07-15T23:30:00Z');
    expect(localDate(instant, 'Europe/London')).toBe('2026-07-16');
    expect(localTime(instant, 'Europe/London')).toBe('00:30');
  });
});

describe('recurrence', () => {
  const base = { startDate: '2026-03-02', endDate: null, pausedAt: null, times: ['08:00'] };

  it('matches each kind of rule', () => {
    expect(recursOn({ kind: 'once' }, '2026-03-02', '2026-03-02')).toBe(true);
    expect(recursOn({ kind: 'once' }, '2026-03-02', '2026-03-03')).toBe(false);
    expect(recursOn({ kind: 'daily' }, '2026-03-02', '2026-03-01')).toBe(false);
    expect(recursOn({ kind: 'weekly', days: [1, 3] }, '2026-03-02', '2026-03-04')).toBe(true);
    expect(recursOn({ kind: 'weekly', days: [1, 3] }, '2026-03-02', '2026-03-05')).toBe(false);
    expect(recursOn({ kind: 'interval', everyDays: 3 }, '2026-03-02', '2026-03-08')).toBe(true);
    expect(recursOn({ kind: 'interval', everyDays: 3 }, '2026-03-02', '2026-03-07')).toBe(false);
  });

  it('keeps 08:00 local across the spring daylight-saving change', () => {
    const occ = planOccurrences(
      { ...base, recurrence: { kind: 'daily' } },
      '2026-03-28',
      '2026-03-30',
      'Europe/London',
    );
    expect(occ.map((o) => o.scheduledAt.toISOString())).toEqual([
      '2026-03-28T08:00:00.000Z',
      '2026-03-29T07:00:00.000Z',
      '2026-03-30T07:00:00.000Z',
    ]);
  });

  it('respects start, end, multiple times and pausing', () => {
    const task = { ...base, endDate: '2026-03-03', times: ['20:00', '08:00'], recurrence: { kind: 'daily' as const } };
    const occ = planOccurrences(task, '2026-03-01', '2026-03-10', 'UTC');
    expect(occ.map((o) => `${o.occurrenceDate} ${o.localTime}`)).toEqual([
      '2026-03-02 08:00',
      '2026-03-02 20:00',
      '2026-03-03 08:00',
      '2026-03-03 20:00',
    ]);
    expect(planOccurrences({ ...task, pausedAt: '2026-03-01T00:00:00Z' }, '2026-03-01', '2026-03-10', 'UTC')).toEqual(
      [],
    );
  });

  it('describes rules in plain words', () => {
    expect(describeRecurrence({ kind: 'weekly', days: [5, 1, 3] })).toBe('Mon, Wed, Fri');
    expect(describeRecurrence({ kind: 'interval', everyDays: 3 })).toBe('Every 3 days');
  });
});

describe('permissions', () => {
  it('follows the role matrix', () => {
    expect(can('admin', 'manage_members')).toBe(true);
    expect(can('care_recipient', 'manage_members')).toBe(false);
    expect(can('caregiver', 'edit_tasks')).toBe(true);
    expect(can('caregiver', 'delete_tasks')).toBe(false);
    expect(can('family', 'edit_tasks')).toBe(false);
    expect(can('family', 'post_updates')).toBe(true);
    expect(can('read_only', 'post_updates')).toBe(false);
    expect(can('read_only', 'view_medication')).toBe(false);
  });
  it('lets family see medication only when the circle allows it', () => {
    expect(can('family', 'view_medication')).toBe(false);
    expect(can('family', 'view_medication', { familyCanSeeMedication: true })).toBe(true);
  });
  it('lets family record outcomes only for tasks assigned to them', () => {
    expect(can('family', 'record_outcome')).toBe(false);
    expect(can('family', 'record_outcome', { assignedToMe: true })).toBe(true);
    expect(can('read_only', 'record_outcome', { assignedToMe: true })).toBe(false);
  });
});

describe('quiet hours', () => {
  it('handles windows that cross midnight', () => {
    expect(inQuietHours(at('2026-01-15T23:00:00Z'), '22:00', '07:00', 'UTC')).toBe(true);
    expect(inQuietHours(at('2026-01-15T06:59:00Z'), '22:00', '07:00', 'UTC')).toBe(true);
    expect(inQuietHours(at('2026-01-15T07:00:00Z'), '22:00', '07:00', 'UTC')).toBe(false);
    expect(inQuietHours(at('2026-01-15T13:00:00Z'), '12:00', '14:00', 'UTC')).toBe(true);
    expect(inQuietHours(at('2026-01-15T13:00:00Z'), null, null, 'UTC')).toBe(false);
  });
});

describe('dayMetrics', () => {
  const task = { id: 't1', followUpMinutes: 30 } as Task;
  const occ = (id: string, scheduledAt: string, outcome: Occurrence['outcome']) =>
    ({ id, taskId: 't1', scheduledAt, outcome }) as Occurrence;

  it('counts one local day from real occurrences', () => {
    const now = at('2026-03-10T12:00:00Z');
    const m = dayMetrics(
      [
        occ('a', '2026-03-10T08:00:00Z', 'completed'),
        occ('b', '2026-03-10T09:00:00Z', null), // overdue → needs review
        occ('c', '2026-03-10T11:45:00Z', null), // pending → still outstanding
        occ('d', '2026-03-10T18:00:00Z', null), // upcoming
        occ('e', '2026-03-10T19:00:00Z', 'cancelled'), // not counted
        occ('f', '2026-03-10T20:00:00Z', 'skipped'), // scheduled, nothing else
        occ('g', '2026-03-11T08:00:00Z', null), // other day
      ],
      new Map([['t1', task]]),
      '2026-03-10',
      'UTC',
      now,
    );
    expect(m).toEqual({ scheduled: 5, completed: 1, upcoming: 2, needsReview: 1 });
  });
});

describe('task validation', () => {
  const valid: TaskInput = {
    title: 'Morning tablets',
    category: 'medication',
    notes: '',
    recurrence: { kind: 'daily' },
    times: ['08:00'],
    startDate: '2026-03-01',
    endDate: null,
    assigneeId: null,
    followUpMinutes: 30,
    reminderMinutesBefore: 10,
    medication: { name: 'Example tablet', instructions: 'With food' },
    appointment: null,
  };

  it('accepts a valid task', () => {
    expect(taskInputSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects an end date before the start date', () => {
    expect(taskInputSchema.safeParse({ ...valid, endDate: '2026-02-01' }).success).toBe(false);
  });
  it('requires medication details for medication tasks only', () => {
    expect(taskInputSchema.safeParse({ ...valid, medication: null }).success).toBe(false);
    expect(taskInputSchema.safeParse({ ...valid, category: 'meal' }).success).toBe(false);
  });
  it('rejects malformed times and non-https meeting links', () => {
    expect(taskInputSchema.safeParse({ ...valid, times: ['8am'] }).success).toBe(false);
    expect(
      taskInputSchema.safeParse({
        ...valid,
        category: 'appointment',
        medication: null,
        appointment: { location: '', meetingLink: 'http://x.test', professional: '' },
      }).success,
    ).toBe(false);
  });
});
