import {
  MOODS,
  MORNING_TABLETS,
  WATER_GOAL,
  clock,
  daysLeft,
  nameFor,
  needsBuying,
  runsOutOn,
  type Mood,
  type PersonId,
  type Status,
  type StoryState,
} from './story';

export type NoteAction =
  | { kind: 'record'; label: string; taskId: string; status: Status }
  | { kind: 'call'; label: string; to: PersonId }
  | { kind: 'remind'; label: string }
  | { kind: 'seen'; label: string; updateId: string }
  | { kind: 'reply'; label: string; messageId: string; to: PersonId; text: string }
  | { kind: 'water'; label: string }
  | { kind: 'mood'; label: string; value: Mood }
  | { kind: 'respond'; label: string }
  | { kind: 'willBuy'; label: string; medId: string }
  | { kind: 'bought'; label: string; medId: string }
  | { kind: 'buyReminder'; label: string; medId: string; to: PersonId }
  | { kind: 'dismiss'; label: string };

export interface StoryNotification {
  /** Stable while the situation it describes is unchanged. */
  key: string;
  tone: 'alert' | 'reminder' | 'good' | 'update';
  icon: 'pill' | 'water' | 'meal' | 'walk' | 'message' | 'check' | 'phone' | 'help' | 'heart' | 'cart' | 'home';
  title: string;
  body: string;
  actions: NoteAction[];
  /** Message this notification is about, marked read when acted on. */
  messageId?: string;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** What each person is notified about right now, most important first. */
export function notificationsFor(viewer: PersonId, s: StoryState): StoryNotification[] {
  const tablets = s.tasks.find((t) => t.id === MORNING_TABLETS)!;
  const out: StoryNotification[] = [];
  const family = viewer === 'me' || viewer === 'dad';

  // Mum asked for help: everyone else, until they respond.
  if (viewer !== 'mum' && s.help && !s.help.responders.includes(viewer)) {
    const coming = s.help.responders.map((p) => nameFor(p, viewer));
    out.push({
      key: `help-${s.help.at}`,
      tone: 'alert',
      icon: 'help',
      title: 'Mum asked for help',
      body: `She pressed “I need help” at ${clock(s.help.at)}.${
        coming.length
          ? ` ${coming.join(' and ')} ${coming.length > 1 ? 'are' : 'is'} on the way.`
          : ' Nobody has responded yet.'
      }`,
      actions: [
        { kind: 'call', label: 'Call Mum', to: 'mum' },
        { kind: 'respond', label: 'I’m on my way' },
      ],
    });
  }

  // Mum's own reminders.
  if (viewer === 'mum') {
    if (!s.mood) {
      out.push({
        key: 'mood-prompt',
        tone: 'reminder',
        icon: 'heart',
        title: 'Good morning! How are you feeling?',
        body: 'Let your family know with one tap.',
        actions: [
          { kind: 'mood', label: 'Great', value: 'great' },
          { kind: 'mood', label: 'Okay', value: 'okay' },
          { kind: 'mood', label: 'Not great', value: 'low' },
        ],
      });
    }
    if (tablets.status === null) {
      out.push({
        key: `mum-tablets-${s.reminderSentAt ?? 0}`,
        tone: 'reminder',
        icon: 'pill',
        title: 'Time for your morning tablets',
        body: s.reminderSentAt
          ? 'Your daughter sent you a reminder. Your blood pressure tablet was due at 8:00 am.'
          : 'Ram is running late today. You can take your blood pressure tablet now, with some water.',
        actions: [{ kind: 'record', label: 'I’ve taken them', taskId: MORNING_TABLETS, status: 'taken' }],
      });
    }
    // A gentle nudge only while she's behind on her morning water.
    if (s.water < 2) {
      out.push({
        key: 'mum-water',
        tone: 'reminder',
        icon: 'water',
        title: 'Time for a glass of water 💧',
        body: `You’ve had ${s.water} of ${WATER_GOAL} glasses today.`,
        actions: [{ kind: 'water', label: 'I had a glass' }],
      });
    }
  }

  // The daughter: missed tablets.
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
            : 'Her morning tablets were due at 8:00 am. Ram is running late, so nobody has given them yet.',
        actions: [
          { kind: 'call', label: 'Call Mum', to: 'mum' },
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

  // The carer: give the tablets.
  if (viewer === 'ram' && tablets.status === null) {
    out.push({
      key: 'ram-tablets',
      tone: 'reminder',
      icon: 'pill',
      title: 'Reminder: give Mum her morning tablets',
      body:
        s.visit.status === 'here'
          ? 'Blood pressure tablet, one with water. It was due at 8:00 am.'
          : 'Blood pressure tablet, one with breakfast. Due 8:00 am and not recorded yet.',
      actions: [
        { kind: 'record', label: 'Mark as given', taskId: MORNING_TABLETS, status: 'taken' },
        { kind: 'record', label: 'Not taken', taskId: MORNING_TABLETS, status: 'not_taken' },
      ],
    });
  }

  // Private messages: the newest unread one.
  const msg = [...s.messages].reverse().find((m) => m.to === viewer && !m.read);
  if (msg) {
    out.push({
      key: `msg-${msg.id}`,
      messageId: msg.id,
      tone: 'update',
      icon: msg.text.includes('❤️') ? 'heart' : 'message',
      title: `Message from ${nameFor(msg.from, viewer).replace(/^Your /, 'your ')}`,
      body: msg.text,
      actions: [
        {
          kind: 'reply',
          label: viewer === 'mum' ? 'Reply: Thank you ❤️' : 'Reply: Thanks, got it',
          messageId: msg.id,
          to: msg.from,
          text: viewer === 'mum' ? 'Thank you ❤️' : 'Thanks, got it.',
        },
        { kind: 'call', label: 'Call back', to: msg.from },
      ],
    });
  }

  // Family: how Mum is feeling, and who is with her.
  if (family && s.mood && MOODS[s.mood.value].worry) {
    out.push({
      key: `mood-${s.mood.at}`,
      tone: 'alert',
      icon: 'heart',
      title: s.mood.value === 'low' ? 'Mum isn’t feeling great today' : 'Mum is feeling unwell today',
      body: `She checked in at ${clock(s.mood.at)}. Maybe give her a call.`,
      actions: [
        { kind: 'call', label: 'Call Mum', to: 'mum' },
        { kind: 'dismiss', label: 'OK' },
      ],
    });
  }

  // Medicines running out: family and carer.
  if (viewer !== 'mum') {
    for (const m of s.medicines.filter(needsBuying)) {
      const d = daysLeft(m);
      if (m.buyer === null) {
        const other: PersonId = viewer === 'me' ? 'dad' : 'me';
        out.push({
          key: `buy-${m.id}-${d}`,
          tone: 'reminder',
          icon: 'cart',
          title: `Mum’s ${m.name.toLowerCase()} run out in ${plural(d, 'day')}`,
          body: `Only ${m.left} ${m.unit} left (${m.perDay} a day). Runs out ${runsOutOn(m)}. Buy more before then.`,
          actions: [
            { kind: 'willBuy', label: 'I’ll buy them', medId: m.id },
            {
              kind: 'buyReminder',
              label: other === 'dad' ? 'Remind Dad' : viewer === 'dad' ? 'Remind our daughter' : 'Tell Mum’s daughter',
              medId: m.id,
              to: other,
            },
          ],
        });
      } else if (m.buyer === viewer) {
        out.push({
          key: `buyer-${m.id}`,
          tone: 'reminder',
          icon: 'cart',
          title: `You’re buying Mum’s ${m.name.toLowerCase()}`,
          body: `${plural(d, 'day')} left. Runs out ${runsOutOn(m)}.`,
          actions: [{ kind: 'bought', label: 'Mark as bought', medId: m.id }],
        });
      }
    }
  }

  if (family && s.visit.status === 'here') {
    out.push({
      key: 'arrived',
      tone: 'good',
      icon: 'home',
      title: 'Ram has arrived at Mum’s',
      body: `Checked in at ${clock(s.visit.arrivedAt!)}.`,
      actions: [{ kind: 'dismiss', label: 'OK' }],
    });
  }
  if (family && s.visit.status === 'left') {
    out.push({
      key: `handover-${s.visit.leftAt}`,
      tone: 'update',
      icon: 'home',
      title: 'Ram left a handover note',
      body: s.handover.text,
      actions: [{ kind: 'dismiss', label: 'OK' }],
    });
  }

  // Updates for everyone: the newest one this person hasn't seen.
  const update = [...s.updates].reverse().find((u) => u.author !== viewer && !u.seenBy.includes(viewer));
  if (update) {
    out.push({
      key: `update-${update.id}`,
      tone: 'update',
      icon: 'message',
      title: `${nameFor(update.author, viewer)} posted an update`,
      body: update.text,
      actions: [{ kind: 'seen', label: 'Mark as seen', updateId: update.id }],
    });
  }

  if (viewer === 'ram') {
    out.push({
      key: 'ram-walk',
      tone: 'reminder',
      icon: 'walk',
      title: 'Coming up: Afternoon walk at 3:30 pm',
      body: 'Round the park with Mum if it’s dry. Take the walking stick.',
      actions: [{ kind: 'dismiss', label: 'OK' }],
    });
  }
  if (viewer === 'dad' && s.tasks.find((t) => t.id === 'lunch')?.status === null) {
    out.push({
      key: 'dad-lunch',
      tone: 'reminder',
      icon: 'meal',
      title: 'You’re making lunch today',
      body: 'Lunch with Mum at 12:30 pm. Soup and a sandwich is a favourite.',
      actions: [{ kind: 'dismiss', label: 'OK' }],
    });
  }

  return out.filter((n) => !s.dismissed[viewer].includes(n.key));
}
