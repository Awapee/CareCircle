import { addDays, localDate, zonedTimeToUtc } from '@/domain/dates';
import type { Category, Outcome, Recurrence, Role } from '@/domain/types';
import { displayName, generateOccurrences, log, runScheduler } from './engine';
import { newId, type DemoDb, type DemoUser, type TaskRow } from './store';

/**
 * Fictional demo data. Every person, task and update here is invented. It is built relative
 * to "now" so the demo always shows a realistic week: some history, today, and what's coming.
 */

const TZ = 'Europe/London';

export const DEMO_PEOPLE: (DemoUser & { role: Role })[] = [
  {
    id: 'demo-priya',
    email: 'priya@demo.carecircle',
    displayName: 'Priya',
    timeZone: TZ,
    role: 'admin',
    blurb: 'Margaret’s daughter. Runs the circle.',
  },
  {
    id: 'demo-margaret',
    email: 'margaret@demo.carecircle',
    displayName: 'Margaret',
    timeZone: TZ,
    role: 'care_recipient',
    blurb: 'Receives care and manages her own routine.',
  },
  {
    id: 'demo-tom',
    email: 'tom@demo.carecircle',
    displayName: 'Tom',
    timeZone: TZ,
    role: 'caregiver',
    blurb: 'Visiting carer on weekday mornings.',
  },
  {
    id: 'demo-leo',
    email: 'leo@demo.carecircle',
    displayName: 'Leo',
    timeZone: TZ,
    role: 'family',
    blurb: 'Grandson. Helps with lunch and the bins.',
  },
  {
    id: 'demo-sam',
    email: 'sam@demo.carecircle',
    displayName: 'Sam',
    timeZone: TZ,
    role: 'read_only',
    blurb: 'Neighbour. Keeps an eye on the schedule.',
  },
];

/** Small deterministic random generator so a reset always produces the same history. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

interface TaskSeed {
  title: string;
  category: Category;
  recurrence: Recurrence;
  times: string[];
  assignee: string | null;
  startOffset?: number;
  notes?: string;
  medication?: { name: string; instructions: string };
  appointment?: { location: string; meetingLink: string; professional: string };
  reminder?: number | null;
}

export function buildSeed(now: Date): DemoDb {
  const today = localDate(now, TZ);
  const weekAgo = addDays(today, -7);
  const createdAt = new Date(now.getTime() - 8 * 86_400_000).toISOString();
  const random = rng(42);

  const db: DemoDb = {
    schema: 2,
    users: DEMO_PEOPLE.map(({ role: _role, ...u }) => u),
    sessionUserId: null,
    circles: [
      {
        id: 'demo-circle',
        name: 'Margaret’s circle',
        timeZone: TZ,
        familyCanSeeMedication: false,
        createdAt,
        version: 1,
      },
    ],
    members: DEMO_PEOPLE.map((p, i) => ({
      circleId: 'demo-circle',
      userId: p.id,
      role: p.role,
      joinedAt: new Date(new Date(createdAt).getTime() + i * 3_600_000).toISOString(),
    })),
    careProfiles: [
      {
        circleId: 'demo-circle',
        preferredName: 'Margaret',
        sharedNotes: 'Prefers tea to coffee. Hard of hearing on the left side, so ring the bell twice.',
        version: 1,
      },
    ],
    tasks: [],
    medication: {},
    appointments: {},
    occurrences: [],
    updates: [],
    acks: [],
    activity: [],
    notifications: [],
    deliveries: [],
    invitations: [],
    followUps: [
      { circleId: 'demo-circle', userId: 'demo-priya' },
      { circleId: 'demo-circle', userId: 'demo-tom' },
    ],
    prefs: DEMO_PEOPLE.map((p) => ({
      userId: p.id,
      quietStart: p.id === 'demo-priya' ? '22:00' : null,
      quietEnd: p.id === 'demo-priya' ? '07:00' : null,
      inApp: true,
      email: false,
      push: false,
    })),
  };

  for (const p of DEMO_PEOPLE) {
    const joined = db.members.find((m) => m.userId === p.id)!.joinedAt;
    log(
      db,
      'demo-circle',
      p.id,
      p.role === 'admin' ? 'circle_updated' : 'member_joined',
      p.role === 'admin' ? `${p.displayName} created the circle` : `${p.displayName} joined as ${roleWords(p.role)}`,
      p.id,
      new Date(joined),
    );
  }

  const seeds: TaskSeed[] = [
    {
      title: 'Morning tablets',
      category: 'medication',
      recurrence: { kind: 'daily' },
      times: ['08:00'],
      assignee: 'demo-tom',
      medication: {
        name: 'Blood pressure tablet',
        instructions: 'One tablet with breakfast, as on the pharmacy label.',
      },
      reminder: 10,
    },
    {
      title: 'Evening tablets',
      category: 'medication',
      recurrence: { kind: 'daily' },
      times: ['20:00'],
      assignee: 'demo-margaret',
      medication: { name: 'Vitamin D', instructions: 'One capsule with dinner.' },
      reminder: 10,
    },
    {
      title: 'Breakfast',
      category: 'meal',
      recurrence: { kind: 'daily' },
      times: ['08:30'],
      assignee: 'demo-tom',
    },
    {
      title: 'Lunch',
      category: 'meal',
      recurrence: { kind: 'daily' },
      times: ['12:30'],
      assignee: 'demo-leo',
      notes: 'Soup and a sandwich is a favourite.',
    },
    {
      title: 'Glass of water',
      category: 'hydration',
      recurrence: { kind: 'daily' },
      times: ['10:00', '15:00', '18:00'],
      assignee: null,
      reminder: null,
    },
    {
      title: 'Afternoon walk',
      category: 'routine',
      recurrence: { kind: 'weekly', days: [1, 3, 5] },
      times: ['15:30'],
      assignee: 'demo-tom',
      notes: 'Round the park if it’s dry. Take the walking stick.',
    },
    {
      title: 'Bins out',
      category: 'other',
      recurrence: { kind: 'weekly', days: [4] },
      times: ['19:00'],
      assignee: 'demo-leo',
    },
    {
      title: 'Physio appointment',
      category: 'appointment',
      recurrence: { kind: 'once' },
      times: ['11:00'],
      assignee: 'demo-priya',
      startOffset: 2,
      appointment: {
        location: 'Riverside Health Centre, Room 4',
        meetingLink: '',
        professional: 'Physiotherapy team',
      },
      reminder: 60,
    },
    {
      title: 'GP video call',
      category: 'appointment',
      recurrence: { kind: 'once' },
      times: ['09:30'],
      assignee: 'demo-priya',
      startOffset: 6,
      appointment: { location: '', meetingLink: 'https://example.com/meet/demo', professional: 'Dr Patel (GP)' },
      notes: 'Ask about the new walking frame.',
      reminder: 30,
    },
  ];

  for (const s of seeds) {
    const id = newId();
    const task: TaskRow = {
      id,
      circleId: 'demo-circle',
      title: s.title,
      category: s.category,
      notes: s.notes ?? '',
      recurrence: s.recurrence,
      times: s.times,
      startDate: s.startOffset !== undefined ? addDays(today, s.startOffset) : weekAgo,
      endDate: null,
      assigneeId: s.assignee,
      followUpMinutes: 30,
      reminderMinutesBefore: s.reminder === undefined ? 15 : s.reminder,
      pausedAt: null,
      version: 1,
      createdBy: 'demo-priya',
      createdAt,
      updatedAt: createdAt,
    };
    db.tasks.push(task);
    if (s.medication) db.medication[id] = s.medication;
    if (s.appointment) db.appointments[id] = s.appointment;
    log(db, 'demo-circle', 'demo-priya', 'task_created', `Priya added “${s.title}”`, id, new Date(createdAt));
    generateOccurrences(db, task, task.startDate, addDays(today, 14), null);
  }

  // History: most past occurrences were recorded by whoever usually does them.
  const yesterday = addDays(today, -1);
  for (const o of db.occurrences) {
    const task = db.tasks.find((t) => t.id === o.taskId)!;
    const due = new Date(o.scheduledAt).getTime();
    if (due > now.getTime()) continue;
    const isToday = o.occurrenceDate === today;
    const minutesAgo = (now.getTime() - due) / 60_000;
    // Leave the most recent items open so "pending" and "needs review" show up naturally.
    if (isToday && minutesAgo < 25) continue;
    if (o.occurrenceDate === yesterday && task.title === 'Evening tablets') continue;
    if (isToday && task.title === 'Glass of water' && o.localTime !== '10:00') continue;

    let outcome: Outcome = task.category === 'medication' ? 'taken' : 'completed';
    let note = '';
    const roll = random();
    if (task.title === 'Morning tablets' && o.occurrenceDate === addDays(today, -3)) {
      outcome = 'not_taken';
      note = 'Margaret felt unwell and didn’t want breakfast. Will try again tomorrow.';
    } else if (task.category === 'hydration' && roll < 0.15) {
      outcome = 'skipped';
      note = 'Had a cup of tea instead.';
    } else if (task.title === 'Afternoon walk' && roll < 0.3) {
      outcome = 'skipped';
      note = 'Raining, so we did seated exercises instead.';
    }

    const by = task.assigneeId ?? (random() < 0.5 ? 'demo-margaret' : random() < 0.5 ? 'demo-tom' : 'demo-priya');
    const at = new Date(due + (3 + Math.floor(random() * 20)) * 60_000);
    o.outcome = outcome;
    o.outcomeBy = by;
    o.outcomeAt = at.toISOString();
    o.note = note;
    o.version = 2;
    const verb =
      outcome === 'taken'
        ? `marked “${task.title}” as taken`
        : outcome === 'not_taken'
          ? `marked “${task.title}” as not taken`
          : outcome === 'skipped'
            ? `skipped “${task.title}”`
            : `marked “${task.title}” as done`;
    log(db, 'demo-circle', by, 'outcome_recorded', `${displayName(db, by)} ${verb}`, o.id, at);
  }

  // One occurrence moved to a different time, to show "edit this occurrence".
  const walk = db.tasks.find((t) => t.title === 'Afternoon walk')!;
  const nextWalk = db.occurrences
    .filter((o) => o.taskId === walk.id && new Date(o.scheduledAt) > now)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0];
  if (nextWalk) {
    nextWalk.timeOverride = '14:00';
    nextWalk.scheduledAt = zonedTimeToUtc(nextWalk.occurrenceDate, '14:00', TZ).toISOString();
    nextWalk.version = 2;
  }

  const update = (authorId: string, body: string, hoursAgo: number, visibility: 'circle' | 'private' = 'circle') => {
    const id = newId();
    const at = new Date(now.getTime() - hoursAgo * 3_600_000);
    db.updates.push({
      id,
      circleId: 'demo-circle',
      authorId,
      body,
      visibility,
      occurrenceId: null,
      createdAt: at.toISOString(),
    });
    if (visibility === 'circle') {
      log(db, 'demo-circle', authorId, 'update_posted', `${displayName(db, authorId)} posted an update`, id, at);
    }
    return { id, at };
  };

  const physio = update(
    'demo-priya',
    'Physio is booked for this week. I’ll drive Margaret there and back. Tom, no need to do the walk that day.',
    30,
  );
  db.acks.push({
    updateId: physio.id,
    userId: 'demo-tom',
    circleId: 'demo-circle',
    createdAt: new Date(physio.at.getTime() + 2 * 3_600_000).toISOString(),
  });
  log(
    db,
    'demo-circle',
    'demo-tom',
    'update_acknowledged',
    'Tom acknowledged an update',
    physio.id,
    new Date(physio.at.getTime() + 2 * 3_600_000),
  );
  update(
    'demo-tom',
    'Margaret enjoyed her walk to the park today and ate a full lunch. She asked about the photo album.',
    6,
  );
  update('demo-leo', 'Bring the photo album next time I visit.', 4, 'private');

  db.activity.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  runScheduler(db, now);
  return db;
}

function roleWords(role: Role): string {
  return role.replace('_', ' ');
}
