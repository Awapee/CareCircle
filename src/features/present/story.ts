import type { Category } from '@/domain/types';

/**
 * Presentation mode (temporary, for the pitch video): one scripted day in Mum's circle,
 * seen through four people's eyes. Everything is fictional and stays in this browser.
 */

export type PersonId = 'mum' | 'me' | 'ram' | 'dad';

export interface Person {
  id: PersonId;
  name: string;
  role: string;
  relation: string;
  initial: string;
  avatar: string;
}

export const PEOPLE: Record<PersonId, Person> = {
  mum: {
    id: 'mum',
    name: 'Mum',
    role: 'Care recipient',
    relation: 'Receives care',
    initial: 'M',
    avatar: 'bg-accent-300 text-ink',
  },
  me: {
    id: 'me',
    name: 'Me',
    role: 'Admin',
    relation: 'Daughter · runs the circle',
    initial: 'Me',
    avatar: 'bg-brand-600 text-white',
  },
  ram: {
    id: 'ram',
    name: 'Ram',
    role: 'Caregiver',
    relation: 'Visiting carer',
    initial: 'R',
    avatar: 'bg-info-700 text-white',
  },
  dad: {
    id: 'dad',
    name: 'Dad',
    role: 'Family',
    relation: 'Husband',
    initial: 'D',
    avatar: 'bg-success-700 text-white',
  },
};

export const ORDER: PersonId[] = ['mum', 'me', 'ram', 'dad'];

/** How `person` is named on `viewer`'s screen. */
export function nameFor(person: PersonId, viewer: PersonId): string {
  if (person === viewer) return 'You';
  if (person === 'me') return viewer === 'ram' ? 'Mum’s daughter' : 'Your daughter';
  return PEOPLE[person].name;
}

export type Status = 'done' | 'taken' | 'not_taken' | null;

export interface Task {
  id: string;
  time: string;
  title: string;
  category: Category;
  assignee: PersonId;
  details?: string;
  status: Status;
  by?: PersonId;
  at?: number;
  note?: string;
}

export interface Update {
  id: string;
  author: PersonId;
  text: string;
  at: number;
  seenBy: PersonId[];
}

export interface Activity {
  id: string;
  at: number;
  who: PersonId;
  text: string;
}

export interface StoryState {
  /** Story clock, in minutes after midnight. */
  minute: number;
  tasks: Task[];
  updates: Update[];
  activity: Activity[];
  reminderSentAt: number | null;
}

export const MORNING_TABLETS = 'tablets-am';
export const WATER = 'water-10';
export const LUNCH = 'lunch';

const START = 9 * 60 + 20;

export function initialStory(): StoryState {
  return {
    minute: START,
    tasks: [
      {
        id: MORNING_TABLETS,
        time: '08:00',
        title: 'Morning tablets',
        category: 'medication',
        assignee: 'ram',
        details: 'Blood pressure tablet · one with breakfast',
        status: null,
      },
      {
        id: 'breakfast',
        time: '08:30',
        title: 'Breakfast',
        category: 'meal',
        assignee: 'ram',
        status: 'done',
        by: 'ram',
        at: 8 * 60 + 40,
      },
      { id: WATER, time: '10:00', title: 'Glass of water', category: 'hydration', assignee: 'mum', status: null },
      {
        id: LUNCH,
        time: '12:30',
        title: 'Lunch',
        category: 'meal',
        assignee: 'dad',
        details: 'Soup and a sandwich is a favourite',
        status: null,
      },
      { id: 'water-15', time: '15:00', title: 'Glass of water', category: 'hydration', assignee: 'mum', status: null },
      {
        id: 'walk',
        time: '15:30',
        title: 'Afternoon walk',
        category: 'routine',
        assignee: 'ram',
        details: 'Round the park if it’s dry',
        status: null,
      },
      {
        id: 'tablets-pm',
        time: '20:00',
        title: 'Evening tablets',
        category: 'medication',
        assignee: 'mum',
        details: 'Vitamin D · one capsule with dinner',
        status: null,
      },
    ],
    updates: [
      {
        id: 'u1',
        author: 'ram',
        text: 'Mum had a good breakfast and is in good spirits this morning.',
        at: 8 * 60 + 45,
        seenBy: ['me'],
      },
    ],
    activity: [
      { id: 'a1', at: 8 * 60 + 40, who: 'ram', text: 'marked “Breakfast” as done' },
      { id: 'a2', at: 8 * 60 + 45, who: 'ram', text: 'posted an update' },
    ],
    reminderSentAt: null,
  };
}

export type StoryAction =
  | { type: 'record'; taskId: string; status: Status; by: PersonId; note?: string }
  | { type: 'post'; author: PersonId; text: string }
  | { type: 'seen'; updateId: string; who: PersonId }
  | { type: 'remind'; by: PersonId }
  | { type: 'called'; by: PersonId; seconds: number }
  | { type: 'reset' };

let counter = 0;
const id = (p: string) => `${p}-${Date.now().toString(36)}-${(counter += 1)}`;

export function storyReducer(s: StoryState, a: StoryAction): StoryState {
  if (a.type === 'reset') return initialStory();
  const minute = s.minute + 1;
  const log = (who: PersonId, text: string): Activity[] => [...s.activity, { id: id('a'), at: minute, who, text }];
  switch (a.type) {
    case 'record': {
      const task = s.tasks.find((t) => t.id === a.taskId);
      if (!task) return s;
      const verb =
        a.status === 'taken'
          ? `marked “${task.title}” as taken`
          : a.status === 'not_taken'
            ? `marked “${task.title}” as not taken`
            : a.status === 'done'
              ? `marked “${task.title}” as done`
              : `cleared “${task.title}”`;
      return {
        ...s,
        minute,
        tasks: s.tasks.map((t) =>
          t.id === a.taskId
            ? {
                ...t,
                status: a.status,
                by: a.status ? a.by : undefined,
                at: a.status ? minute : undefined,
                note: a.note,
              }
            : t,
        ),
        activity: log(a.by, verb),
      };
    }
    case 'post':
      return {
        ...s,
        minute,
        updates: [...s.updates, { id: id('u'), author: a.author, text: a.text, at: minute, seenBy: [] }],
        activity: log(a.author, 'posted an update'),
      };
    case 'seen':
      return {
        ...s,
        updates: s.updates.map((u) =>
          u.id === a.updateId && !u.seenBy.includes(a.who) ? { ...u, seenBy: [...u.seenBy, a.who] } : u,
        ),
      };
    case 'remind':
      return {
        ...s,
        minute,
        reminderSentAt: minute,
        activity: log(a.by, 'sent Mum a reminder about her morning tablets'),
      };
    case 'called':
      return { ...s, minute, activity: log(a.by, `called Mum${a.seconds > 0 ? ` (${a.seconds}s)` : ''}`) };
  }
}

const KEY = 'carecircle-present';

export function loadStory(): StoryState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as StoryState;
  } catch {
    // Start the story fresh.
  }
  return initialStory();
}

export function saveStory(s: StoryState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Remembering the story is a convenience only.
  }
}

/** "08:00" or 480 → "8:00 am". */
export function clock(t: string | number): string {
  const m = typeof t === 'number' ? t : Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const h = Math.floor(m / 60) % 24;
  const mm = String(m % 60).padStart(2, '0');
  return `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h < 12 ? 'am' : 'pm'}`;
}

export function minutesOf(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

export function isDone(t: Task): boolean {
  return t.status === 'done' || t.status === 'taken';
}

/** Overdue with nothing recorded (follow-up is 30 minutes after the due time). */
export function needsReview(t: Task, minute: number): boolean {
  return t.status === null && minute >= minutesOf(t.time) + 30;
}
