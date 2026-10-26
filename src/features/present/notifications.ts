import { LUNCH, MORNING_TABLETS, WATER, clock, nameFor, type PersonId, type Status, type StoryState } from './story';

export type NoteAction =
  | { kind: 'record'; label: string; taskId: string; status: Status }
  | { kind: 'call'; label: string }
  | { kind: 'remind'; label: string }
  | { kind: 'seen'; label: string; updateId: string }
  | { kind: 'dismiss'; label: string };

export interface StoryNotification {
  /** Stable while the situation it describes is unchanged. */
  key: string;
  tone: 'alert' | 'reminder' | 'good' | 'update';
  icon: 'pill' | 'water' | 'meal' | 'walk' | 'message' | 'check' | 'phone';
  title: string;
  body: string;
  actions: NoteAction[];
}

/** What each person is notified about right now, most important first. */
export function notificationsFor(viewer: PersonId, s: StoryState): StoryNotification[] {
  const tablets = s.tasks.find((t) => t.id === MORNING_TABLETS)!;
  const water = s.tasks.find((t) => t.id === WATER)!;
  const lunch = s.tasks.find((t) => t.id === LUNCH)!;
  const out: StoryNotification[] = [];

  const latestUpdate = [...s.updates].reverse().find((u) => u.author !== viewer && !u.seenBy.includes(viewer));
  const updateNote = (): StoryNotification | null =>
    latestUpdate
      ? {
          key: `update-${latestUpdate.id}`,
          tone: 'update',
          icon: 'message',
          title: `${nameFor(latestUpdate.author, viewer)} posted an update`,
          body: latestUpdate.text,
          actions: [{ kind: 'seen', label: 'Mark as seen', updateId: latestUpdate.id }],
        }
      : null;

  if (viewer === 'mum') {
    if (tablets.status === null) {
      out.push({
        key: `mum-tablets-${s.reminderSentAt ?? 0}`,
        tone: 'reminder',
        icon: 'pill',
        title: 'Time for your morning tablets',
        body: s.reminderSentAt
          ? 'Your daughter sent you a reminder. Your blood pressure tablet was due at 8:00 am.'
          : 'Your blood pressure tablet was due at 8:00 am, with breakfast.',
        actions: [{ kind: 'record', label: 'I’ve taken them', taskId: MORNING_TABLETS, status: 'taken' }],
      });
    }
    if (water.status === null) {
      out.push({
        key: 'mum-water',
        tone: 'reminder',
        icon: 'water',
        title: 'Time for a glass of water 💧',
        body: 'Your 10:00 am glass of water is coming up. Tap Done once you’ve had it.',
        actions: [{ kind: 'record', label: 'Done', taskId: WATER, status: 'done' }],
      });
    }
  }

  if (viewer === 'me') {
    if (tablets.status === null || tablets.status === 'not_taken') {
      out.push({
        key: `me-tablets-${tablets.status ?? 'none'}`,
        tone: 'alert',
        icon: 'pill',
        title: 'Mum hasn’t taken her medicine today',
        body:
          tablets.status === 'not_taken'
            ? `Morning tablets were recorded as not taken by ${nameFor(tablets.by!, viewer)}. Check in when you can.`
            : 'Her morning tablets were due at 8:00 am and nothing has been recorded yet.',
        actions: [
          { kind: 'call', label: 'Call Mum' },
          { kind: 'remind', label: s.reminderSentAt ? 'Remind again' : 'Send a reminder' },
        ],
      });
    } else if (tablets.at) {
      out.push({
        key: 'me-tablets-ok',
        tone: 'good',
        icon: 'check',
        title: 'Mum took her morning tablets',
        body: `Recorded by ${nameFor(tablets.by!, viewer)} at ${clock(tablets.at)}.`,
        actions: [{ kind: 'dismiss', label: 'Great' }],
      });
    }
  }

  if (viewer === 'ram') {
    if (tablets.status === null) {
      out.push({
        key: 'ram-tablets',
        tone: 'reminder',
        icon: 'pill',
        title: 'Reminder: give Mum her morning tablets',
        body: 'Blood pressure tablet, one with breakfast. Due 8:00 am and not recorded yet.',
        actions: [
          { kind: 'record', label: 'Mark as given', taskId: MORNING_TABLETS, status: 'taken' },
          { kind: 'record', label: 'Not taken', taskId: MORNING_TABLETS, status: 'not_taken' },
        ],
      });
    }
    out.push({
      key: 'ram-walk',
      tone: 'reminder',
      icon: 'walk',
      title: 'Coming up: Afternoon walk at 3:30 pm',
      body: 'Round the park with Mum if it’s dry. Take the walking stick.',
      actions: [{ kind: 'dismiss', label: 'OK' }],
    });
  }

  if (viewer === 'dad' && lunch.status === null) {
    out.push({
      key: 'dad-lunch',
      tone: 'reminder',
      icon: 'meal',
      title: 'You’re making lunch today',
      body: 'Lunch with Mum at 12:30 pm. Soup and a sandwich is a favourite.',
      actions: [{ kind: 'dismiss', label: 'OK' }],
    });
  }

  const u = updateNote();
  if (u) out.splice(viewer === 'dad' ? 0 : out.length, 0, u);
  return out;
}
