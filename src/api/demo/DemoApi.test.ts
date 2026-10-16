import { describe, expect, it } from 'vitest';
import { addDays, localDate } from '@/domain/dates';
import type { TaskInput } from '@/domain/validation';
import { ApiError } from '../types';
import { DemoApi } from './DemoApi';
import { runScheduler } from './engine';
import { buildSeed } from './seed';

const NOW = new Date('2026-03-11T12:00:00Z');

function api(userId: string | null = 'demo-priya') {
  const db = buildSeed(NOW);
  db.sessionUserId = userId;
  return { api: new DemoApi({ db, clock: () => NOW }), db };
}

async function code(p: Promise<unknown>) {
  try {
    await p;
    return null;
  } catch (e) {
    return e instanceof ApiError ? e.code : 'unknown';
  }
}

const meal = (over: Partial<TaskInput> = {}): TaskInput => ({
  title: 'Supper',
  category: 'meal',
  notes: '',
  recurrence: { kind: 'daily' },
  times: ['18:00'],
  startDate: localDate(NOW, 'Europe/London'),
  endDate: null,
  assigneeId: null,
  followUpMinutes: 30,
  reminderMinutesBefore: 15,
  medication: null,
  appointment: null,
  ...over,
});

describe('demo seed', () => {
  it('has a week of history, today, and two weeks ahead, all fictional', () => {
    const { db } = api();
    expect(db.users.map((u) => u.displayName)).toEqual(['Gita', 'Sita', 'Ram', 'Hari', 'Bina']);
    const dates = new Set(db.occurrences.map((o) => o.occurrenceDate));
    expect(dates.has(addDays('2026-03-11', -6))).toBe(true);
    expect(dates.has(addDays('2026-03-11', 14))).toBe(true);
    expect(db.occurrences.some((o) => o.outcome === 'not_taken')).toBe(true);
    expect(db.occurrences.some((o) => o.outcome === null && new Date(o.scheduledAt) < NOW)).toBe(true);
  });

  it('never has two occurrences in the same slot', () => {
    const { db } = api();
    const keys = db.occurrences.map((o) => `${o.taskId} ${o.occurrenceDate} ${o.localTime}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('demo permissions match the database rules', () => {
  it('hides medication details from family and read-only members', async () => {
    const leo = (await api('demo-leo').api.listTasks('demo-circle')).filter((t) => t.category === 'medication');
    expect(leo.every((t) => t.medication === null && t.medicationHidden)).toBe(true);
    const sam = (await api('demo-sam').api.listTasks('demo-circle')).filter((t) => t.category === 'medication');
    expect(sam.every((t) => t.medicationHidden)).toBe(true);
    const tom = (await api('demo-tom').api.listTasks('demo-circle')).filter((t) => t.category === 'medication');
    expect(tom.every((t) => t.medication !== null)).toBe(true);
  });

  it('lets family record only tasks assigned to them', async () => {
    const { api: leo, db } = api('demo-leo');
    const lunch = db.tasks.find((t) => t.title === 'Lunch')!; // assigned to Hari
    const walk = db.tasks.find((t) => t.title === 'Glass of water')!; // unassigned
    const open = (taskId: string) => db.occurrences.find((o) => o.taskId === taskId && o.outcome === null)!;
    const a = open(lunch.id);
    const b = open(walk.id);
    expect(await code(leo.recordOutcome(a.id, 'completed', '', a.version))).toBeNull();
    expect(await code(leo.recordOutcome(b.id, 'completed', '', b.version))).toBe('forbidden');
  });

  it('stops read-only members from posting and caregivers from deleting', async () => {
    expect(
      await code(
        api('demo-sam').api.postUpdate('demo-circle', { body: 'hi', visibility: 'circle', occurrenceId: null }),
      ),
    ).toBe('forbidden');
    const { api: tom, db } = api('demo-tom');
    expect(await code(tom.deleteTask(db.tasks[0]!.id))).toBe('forbidden');
  });

  it('rejects an edit made from an out-of-date version', async () => {
    const { api: priya } = api();
    const id = await priya.saveTask('demo-circle', null, null, meal());
    await priya.saveTask('demo-circle', id, 1, meal({ title: 'Supper (soup)' }));
    expect(await code(priya.saveTask('demo-circle', id, 1, meal({ title: 'Supper (pie)' })))).toBe('conflict');
  });

  it('keeps private notes private', async () => {
    const leoNotes = await api('demo-leo').api.listUpdates('demo-circle');
    expect(leoNotes.some((u) => u.visibility === 'private')).toBe(true);
    const priyaNotes = await api('demo-priya').api.listUpdates('demo-circle');
    expect(priyaNotes.some((u) => u.visibility === 'private')).toBe(false);
  });

  it('keeps at least one admin', async () => {
    expect(await code(api().api.removeMember('demo-circle', 'demo-priya'))).toBe('invalid');
    expect(await code(api().api.changeMemberRole('demo-circle', 'demo-priya', 'family'))).toBe('invalid');
  });
});

describe('demo invitations', () => {
  it('work once, store only a hash, and can be revoked', async () => {
    const { api: demo, db } = api();
    const token = await demo.createInvitation('demo-circle', { role: 'caregiver', label: 'Nina', expiresInDays: 7 });
    expect(JSON.stringify(db.invitations)).not.toContain(token);
    await demo.startFresh('Nina', 'Europe/London');
    expect((await demo.previewInvitation(token))?.status).toBe('valid');
    expect(await demo.acceptInvitation(token)).toBe('demo-circle');
    expect(await code(demo.acceptInvitation(token))).toBe('not_found');

    await demo.switchPersona('demo-priya');
    const second = await demo.createInvitation('demo-circle', { role: 'family', label: '', expiresInDays: 1 });
    const inv = (await demo.listInvitations('demo-circle')).find((i) => !i.acceptedAt && !i.revokedAt)!;
    await demo.revokeInvitation(inv.id);
    expect((await demo.previewInvitation(second))?.status).toBe('revoked');
  });
});

describe('demo scheduler', () => {
  it('is idempotent', () => {
    const { db } = api();
    const before = { o: db.occurrences.length, n: db.notifications.length, a: db.activity.length };
    runScheduler(db, NOW);
    runScheduler(db, NOW);
    expect({ o: db.occurrences.length, n: db.notifications.length, a: db.activity.length }).toEqual(before);
  });

  it('sends follow-up for yesterday’s unrecorded evening tablets', () => {
    const { db } = api();
    const evening = db.tasks.find((t) => t.title === 'Evening tablets')!;
    const missed = db.occurrences.find((o) => o.taskId === evening.id && o.occurrenceDate === '2026-03-10')!;
    const recipients = db.notifications.filter((n) => n.occurrenceId === missed.id && n.kind === 'follow_up');
    // Follow-up contacts (Gita, Ram) plus the assignee (Sita).
    expect(recipients.map((n) => n.recipientId).sort()).toEqual(['demo-margaret', 'demo-priya', 'demo-tom']);
  });
});

describe('demo account and circle deletion', () => {
  it('refuses to delete the only admin of a shared circle', async () => {
    expect(await code(api('demo-priya').api.deleteAccount())).toBe('invalid');
  });

  it('removes the person, keeps shared history without their name, and drops their private notes', async () => {
    const { api: leo, db } = api('demo-leo');
    await leo.deleteAccount();
    expect(db.users.some((u) => u.id === 'demo-leo')).toBe(false);
    expect(db.members.some((m) => m.userId === 'demo-leo')).toBe(false);
    expect(db.updates.some((u) => u.authorId === 'demo-leo')).toBe(false);
    expect(db.updates.some((u) => u.body.includes('photo album next time'))).toBe(false);
    expect(db.activity.some((a) => /\bLeo\b/.test(a.summary))).toBe(false);
    expect(db.activity.some((a) => a.summary.startsWith('A former member'))).toBe(true);
    expect(db.tasks.find((t) => t.title === 'Lunch')!.assigneeId).toBeNull();
    expect(await leo.getSession()).toBeNull();
  });

  it('deletes a circle only for an admin who types its name', async () => {
    expect(await code(api('demo-tom').api.deleteCircle('demo-circle', 'Sita’s circle'))).toBe('forbidden');
    const { api: priya, db } = api();
    expect(await code(priya.deleteCircle('demo-circle', 'margaret'))).toBe('invalid');
    await priya.deleteCircle('demo-circle', 'Sita’s circle');
    expect(db.circles).toEqual([]);
    expect(db.tasks).toEqual([]);
    expect(db.occurrences).toEqual([]);
    expect(db.activity).toEqual([]);
  });
});
