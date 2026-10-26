import type { Category } from '@/domain/types';

/**
 * Presentation mode (temporary, for the pitch video): one scripted morning in Mum's circle,
 * seen through four people's eyes. Ram, the carer, is running late, so Mum's tablets are
 * missed and the circle has to coordinate. Everything is fictional and stays in this browser.
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
  if (person === 'dad' && viewer === 'mum') return 'Your husband';
  return PEOPLE[person].name;
}

/** How `person` appears in `viewer`'s contacts ("Call my daughter"). */
export function contactName(person: PersonId, viewer: PersonId): string {
  if (person === 'me') return viewer === 'mum' ? 'my daughter' : viewer === 'dad' ? 'our daughter' : 'Mum’s daughter';
  if (person === 'dad') return viewer === 'mum' ? 'my husband' : 'Dad';
  return PEOPLE[person].name;
}

export type Status = 'done' | 'taken' | 'not_taken' | null;
export type Mood = 'great' | 'okay' | 'low' | 'unwell';

export const MOODS: Record<Mood, { label: string; worry: boolean }> = {
  great: { label: 'Feeling great', worry: false },
  okay: { label: 'Okay', worry: false },
  low: { label: 'Not great', worry: true },
  unwell: { label: 'Unwell', worry: true },
};

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

export interface Message {
  id: string;
  from: PersonId;
  to: PersonId;
  text: string;
  at: number;
  read: boolean;
}

/** Shown in the daughter's activity timeline, so texts are written from her point of view. */
export interface Activity {
  id: string;
  at: number;
  who: PersonId;
  text: string;
}

/** A medicine's supply: how much was bought, how fast it's used, and who is buying more. */
export interface Medicine {
  id: string;
  name: string;
  purpose: string;
  unit: string;
  perDay: number;
  left: number;
  boughtQty: number;
  boughtOn: string;
  boughtBy: PersonId;
  /** Someone has said they'll buy more. */
  buyer: PersonId | null;
}

export interface StoryState {
  /** Story clock, in minutes after midnight. */
  minute: number;
  tasks: Task[];
  updates: Update[];
  messages: Message[];
  activity: Activity[];
  reminderSentAt: number | null;
  mood: { value: Mood; at: number } | null;
  help: { at: number; responders: PersonId[] } | null;
  visit: { status: 'late' | 'here' | 'left'; arrivedAt?: number; leftAt?: number };
  handover: { from: PersonId; text: string; when: string };
  water: number;
  medicines: Medicine[];
  /** Notifications each person has dealt with, so they stop showing. */
  dismissed: Record<PersonId, string[]>;
}

export const MORNING_TABLETS = 'tablets-am';
export const WATER_GOAL = 6;
export const BP_TABLETS = 'med-bp';
/** Days of supply left before family are reminded to buy more. */
export const BUY_SOON_DAYS = 5;

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
        assignee: 'mum',
        status: 'done',
        by: 'mum',
        at: 8 * 60 + 40,
      },
      { id: 'water-10', time: '10:00', title: 'Glass of water', category: 'hydration', assignee: 'mum', status: null },
      {
        id: 'lunch',
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
        author: 'dad',
        text: 'Had an early cup of tea with Mum before work. She slept well.',
        at: 7 * 60 + 50,
        seenBy: ['me', 'mum', 'ram'],
      },
    ],
    messages: [
      {
        id: 'm1',
        from: 'ram',
        to: 'me',
        text: 'Running about 40 minutes late this morning because of traffic. Sorry! I’ll give Mum her tablets as soon as I arrive.',
        at: 8 * 60 + 50,
        read: false,
      },
    ],
    activity: [
      { id: 'a0', at: 7 * 60 + 50, who: 'dad', text: 'posted an update' },
      { id: 'a1', at: 8 * 60 + 40, who: 'mum', text: 'marked “Breakfast” as done' },
      { id: 'a2', at: 8 * 60 + 50, who: 'ram', text: 'messaged you: running 40 minutes late' },
    ],
    reminderSentAt: null,
    mood: null,
    help: null,
    visit: { status: 'late' },
    handover: {
      from: 'ram',
      text: 'Mum was a little tired last night and ate half her dinner. Please keep an eye on her water today.',
      when: 'Yesterday, 6:10 pm',
    },
    water: 1,
    medicines: [
      {
        id: BP_TABLETS,
        name: 'Blood pressure tablets',
        purpose: 'Morning, one with breakfast',
        unit: 'tablets',
        perDay: 1,
        left: 4,
        boughtQty: 28,
        boughtOn: '29 Sept',
        boughtBy: 'me',
        buyer: null,
      },
      {
        id: 'med-eye',
        name: 'Eye drops',
        purpose: 'Morning and night, one drop each eye',
        unit: 'doses',
        perDay: 2,
        left: 18,
        boughtQty: 60,
        boughtOn: '5 Oct',
        boughtBy: 'dad',
        buyer: null,
      },
      {
        id: 'med-vitd',
        name: 'Vitamin D capsules',
        purpose: 'Evening, one with dinner',
        unit: 'capsules',
        perDay: 1,
        left: 34,
        boughtQty: 60,
        boughtOn: '1 Oct',
        boughtBy: 'me',
        buyer: null,
      },
    ],
    dismissed: { mum: [], me: [], ram: [], dad: [] },
  };
}

export type StoryAction =
  | { type: 'record'; taskId: string; status: Status; by: PersonId; note?: string }
  | { type: 'post'; author: PersonId; text: string }
  | { type: 'seen'; updateId: string; who: PersonId }
  | { type: 'remind'; by: PersonId }
  | { type: 'called'; by: PersonId; to: PersonId; seconds: number }
  | { type: 'message'; from: PersonId; to: PersonId; text: string }
  | { type: 'read'; messageId: string }
  | { type: 'mood'; value: Mood }
  | { type: 'help' }
  | { type: 'helpCancel' }
  | { type: 'respond'; who: PersonId }
  | { type: 'arrive' }
  | { type: 'leave'; handover: string }
  | { type: 'water' }
  | { type: 'willBuy'; medId: string; who: PersonId }
  | { type: 'bought'; medId: string; who: PersonId }
  | { type: 'buyReminder'; medId: string; from: PersonId; to: PersonId }
  | { type: 'dismiss'; who: PersonId; key: string }
  | { type: 'reset' };

let counter = 0;
const id = (p: string) => `${p}-${Date.now().toString(36)}-${(counter += 1)}`;

/** Activity texts are read by the daughter, so "you" means her. */
const forMe = (p: PersonId) => (p === 'me' ? 'you' : p === 'dad' ? 'Dad' : PEOPLE[p].name);

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
      const wasTaken = task.status === 'taken';
      const nowTaken = a.status === 'taken';
      const stockChange =
        task.id === MORNING_TABLETS ? (nowTaken && !wasTaken ? -1 : !nowTaken && wasTaken ? 1 : 0) : 0;
      return {
        ...s,
        minute,
        medicines: s.medicines.map((m) => (m.id === BP_TABLETS ? { ...m, left: m.left + stockChange } : m)),
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
      return {
        ...s,
        minute,
        activity: log(a.by, `called ${forMe(a.to)}${a.seconds > 0 ? ` (${a.seconds}s)` : ''}`),
      };
    case 'message':
      return {
        ...s,
        minute,
        messages: [...s.messages, { id: id('m'), from: a.from, to: a.to, text: a.text, at: minute, read: false }],
        activity: log(a.from, `messaged ${forMe(a.to)}`),
      };
    case 'read':
      return { ...s, messages: s.messages.map((m) => (m.id === a.messageId ? { ...m, read: true } : m)) };
    case 'mood':
      return {
        ...s,
        minute,
        mood: { value: a.value, at: minute },
        activity: log('mum', `checked in: ${MOODS[a.value].label.toLowerCase()}`),
      };
    case 'help':
      return { ...s, minute, help: { at: minute, responders: [] }, activity: log('mum', 'asked the circle for help') };
    case 'helpCancel':
      return { ...s, minute, help: null, activity: log('mum', 'said she’s okay now') };
    case 'respond':
      if (!s.help || s.help.responders.includes(a.who)) return s;
      return {
        ...s,
        minute,
        help: { ...s.help, responders: [...s.help.responders, a.who] },
        messages: [
          ...s.messages,
          { id: id('m'), from: a.who, to: 'mum', text: 'I’m on my way, Mum.', at: minute, read: false },
        ],
        activity: log(a.who, 'is on the way to Mum'),
      };
    case 'arrive':
      return { ...s, minute, visit: { status: 'here', arrivedAt: minute }, activity: log('ram', 'arrived at Mum’s') };
    case 'leave':
      return {
        ...s,
        minute,
        visit: { ...s.visit, status: 'left', leftAt: minute },
        handover: a.handover.trim()
          ? { from: 'ram', text: a.handover.trim(), when: `Today, ${clock(minute)}` }
          : s.handover,
        activity: log('ram', a.handover.trim() ? 'left Mum’s and wrote a handover note' : 'left Mum’s'),
      };
    case 'water':
      return { ...s, minute, water: Math.min(s.water + 1, 12), activity: log('mum', 'had a glass of water 💧') };
    case 'willBuy': {
      const med = s.medicines.find((m) => m.id === a.medId);
      if (!med) return s;
      return {
        ...s,
        minute,
        medicines: s.medicines.map((m) => (m.id === a.medId ? { ...m, buyer: a.who } : m)),
        activity: log(a.who, `will buy more ${med.name.toLowerCase()}`),
      };
    }
    case 'bought': {
      const med = s.medicines.find((m) => m.id === a.medId);
      if (!med) return s;
      return {
        ...s,
        minute,
        medicines: s.medicines.map((m) =>
          m.id === a.medId ? { ...m, left: m.left + m.boughtQty, boughtOn: 'Today', boughtBy: a.who, buyer: null } : m,
        ),
        activity: log(a.who, `bought ${med.boughtQty} more ${med.name.toLowerCase()}`),
      };
    }
    case 'buyReminder': {
      const med = s.medicines.find((m) => m.id === a.medId);
      if (!med) return s;
      const days = daysLeft(med);
      return {
        ...s,
        minute,
        messages: [
          ...s.messages,
          {
            id: id('m'),
            from: a.from,
            to: a.to,
            text: `Reminder: Mum’s ${med.name.toLowerCase()} run out in ${days} day${days === 1 ? '' : 's'} (${runsOutOn(med)}). Could you pick some up?`,
            at: minute,
            read: false,
          },
        ],
        activity: log(a.from, `reminded ${forMe(a.to)} to buy ${med.name.toLowerCase()}`),
      };
    }
    case 'dismiss':
      return { ...s, dismissed: { ...s.dismissed, [a.who]: [...s.dismissed[a.who], a.key] } };
  }
}

const KEY = 'carecircle-present-v2';

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

/** Who is visiting Mum today, with Ram's live status. */
export function rota(s: StoryState) {
  const ram =
    s.visit.status === 'here'
      ? `With Mum since ${clock(s.visit.arrivedAt!)}`
      : s.visit.status === 'left'
        ? `Visited ${clock(s.visit.arrivedAt!)}–${clock(s.visit.leftAt!)}`
        : 'Running about 40 minutes late';
  return [
    {
      time: '8:00 am',
      who: 'ram' as PersonId,
      what: 'Morning visit · tablets and breakfast',
      status: ram,
      live: s.visit.status !== 'left',
    },
    { time: '12:30 pm', who: 'dad' as PersonId, what: 'Lunch at home', status: 'Planned', live: false },
    { time: '3:30 pm', who: 'ram' as PersonId, what: 'Afternoon walk', status: 'Planned', live: false },
    { time: '6:00 pm', who: 'me' as PersonId, what: 'Evening visit and dinner', status: 'Planned', live: false },
  ];
}

export function daysLeft(m: Medicine): number {
  return Math.floor(m.left / m.perDay);
}

/** "Fri 30 Oct": the day the supply runs out, counted from today. */
export function runsOutOn(m: Medicine, today = new Date()): string {
  const d = new Date(today);
  d.setDate(d.getDate() + daysLeft(m));
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function needsBuying(m: Medicine): boolean {
  return daysLeft(m) <= BUY_SOON_DAYS;
}
