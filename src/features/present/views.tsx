import {
  CalendarClock,
  Check,
  ClipboardList,
  DoorOpen,
  GlassWater,
  Heart,
  LifeBuoy,
  Pill,
  Plus,
  Smile,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import {
  Avatar,
  ContactsCard,
  MedicineTracker,
  MessagesCard,
  ProgressCard,
  RotaCard,
  Section,
  TaskRow,
  UpdatesFeed,
} from './parts';
import {
  BP_TABLETS,
  BUY_SOON_DAYS,
  MOODS,
  MORNING_TABLETS,
  WATER_GOAL,
  clock,
  daysLeft,
  nameFor,
  rota,
  runsOutOn,
  type Mood,
  type PersonId,
  type StoryAction,
  type StoryState,
} from './story';

export interface ViewProps {
  story: StoryState;
  dispatch: (a: StoryAction) => void;
  onCall: (p: PersonId) => void;
  onMessage: (p: PersonId) => void;
}

const sortByTime = <T extends { time: string }>(list: T[]) => [...list].sort((a, b) => a.time.localeCompare(b.time));

function Greeting({ name, sub }: { name?: string; sub: string }) {
  return (
    <div>
      <h1 className="text-3xl font-semibold">Good morning{name ? `, ${name}` : ''}</h1>
      <p className="mt-1 text-ink-muted">{sub}</p>
    </div>
  );
}

function Appointment({ viewer }: { viewer: PersonId }) {
  return (
    <Card className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning-50 text-warning-700">
        <CalendarClock className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="font-medium">GP check-up · tomorrow, 11:00 am</p>
        <p className="text-sm text-ink-muted">
          Riverside Health Centre · {viewer === 'me' ? 'You’re' : 'Your daughter is'} driving
        </p>
      </div>
    </Card>
  );
}

/** Mum asked for help: a banner for everyone else. */
function HelpBanner({ story, dispatch, onCall, viewer }: ViewProps & { viewer: PersonId }) {
  if (!story.help) return null;
  const responded = story.help.responders.includes(viewer);
  const coming = story.help.responders.map((p) => nameFor(p, viewer));
  return (
    <Card className="border-danger-600/50 bg-danger-50 animate-[cc-pop_0.3s_ease-out]">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-danger-600 text-white">
          <LifeBuoy className="size-6" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <p className="text-lg font-semibold text-danger-700">Mum asked for help at {clock(story.help.at)}</p>
          <p className="text-ink-muted">
            {coming.length
              ? `${coming.join(' and ')} ${coming.length > 1 ? 'are' : 'is'} on the way.`
              : 'Nobody has responded yet.'}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="danger" onClick={() => onCall('mum')}>
          Call Mum
        </Button>
        {!responded && (
          <Button variant="secondary" onClick={() => dispatch({ type: 'respond', who: viewer })}>
            I’m on my way
          </Button>
        )}
      </div>
    </Card>
  );
}

/** At-a-glance status of Mum for family. */
function MumNow({ story }: { story: StoryState }) {
  const bp = story.medicines.find((m) => m.id === BP_TABLETS)!;
  const ram = rota(story)[0]!;
  const tiles = [
    {
      icon: <Smile className="size-5" />,
      label: 'Feeling',
      value: story.mood ? MOODS[story.mood.value].label : 'Not checked in yet',
      warn: story.mood ? MOODS[story.mood.value].worry : false,
    },
    {
      icon: <GlassWater className="size-5" />,
      label: 'Water today',
      value: `${story.water} of ${WATER_GOAL} glasses`,
      warn: story.water < 2,
    },
    { icon: <DoorOpen className="size-5" />, label: 'Carer', value: ram.status, warn: story.visit.status === 'late' },
    {
      icon: <Pill className="size-5" />,
      label: 'Blood pressure tablets',
      value: `${daysLeft(bp)} days left · ${runsOutOn(bp)}`,
      warn: daysLeft(bp) <= BUY_SOON_DAYS && !bp.buyer,
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label} className={cn(t.warn && 'border-accent-400 bg-accent-50')}>
          <dt className="flex items-center gap-2 text-sm text-ink-muted">
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </dt>
          <dd className="mt-1 font-semibold">{t.value}</dd>
        </Card>
      ))}
    </dl>
  );
}

function Handover({ story }: { story: StoryState }) {
  return (
    <Card className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-50 text-info-700">
        <ClipboardList className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm text-ink-muted">Handover from Ram · {story.handover.when}</p>
        <p className="mt-1">{story.handover.text}</p>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ Mum */

/** Each feeling has its own colour: green, teal, amber, red. */
const MOOD_STYLES: Record<Mood, { idle: string; active: string; dot: string; check: string }> = {
  great: {
    idle: 'border-success-700/30 bg-success-50 text-success-700 hover:border-success-700',
    active: 'border-success-700 bg-success-700 text-white',
    dot: 'bg-success-700',
    check: 'text-success-700',
  },
  okay: {
    idle: 'border-brand-300 bg-brand-50 text-brand-800 hover:border-brand-600',
    active: 'border-brand-600 bg-brand-600 text-white',
    dot: 'bg-brand-500',
    check: 'text-brand-700',
  },
  low: {
    idle: 'border-accent-400/60 bg-accent-50 text-accent-800 hover:border-accent-400',
    active: 'border-accent-400 bg-accent-400 text-ink',
    dot: 'bg-accent-400',
    check: 'text-accent-800',
  },
  unwell: {
    idle: 'border-danger-600/30 bg-danger-50 text-danger-700 hover:border-danger-600',
    active: 'border-danger-600 bg-danger-600 text-white',
    dot: 'bg-danger-600',
    check: 'text-danger-700',
  },
};

export function MumView({ story, dispatch, onCall, onMessage }: ViewProps) {
  const tasks = sortByTime(story.tasks);
  return (
    <div className="space-y-8">
      <Greeting name="Mum" sub="Here’s your day. Tap a task once it’s done, and everyone in your circle will know." />

      <Section title="How are you feeling today?">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(MOODS) as Mood[]).map((m) => {
            const active = story.mood?.value === m;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={active}
                onClick={() => dispatch({ type: 'mood', value: m })}
                className={cn(
                  'flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 px-3 py-4 text-lg font-semibold transition-colors',
                  active ? MOOD_STYLES[m].active : MOOD_STYLES[m].idle,
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-9 items-center justify-center rounded-full',
                    active ? 'bg-white/90' : MOOD_STYLES[m].dot,
                  )}
                >
                  {active && <Check className={cn('size-5', MOOD_STYLES[m].check)} />}
                </span>
                {MOODS[m].label}
              </button>
            );
          })}
        </div>
        {story.mood && (
          <p className="mt-3 text-ink-muted">
            Your family can see this.{MOODS[story.mood.value].worry ? ' They’ll probably give you a call.' : ''}
          </p>
        )}
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <GlassWater className="size-4" aria-hidden="true" />
            Water today
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {story.water} of {WATER_GOAL} glasses
          </p>
          <div className="mt-3 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: WATER_GOAL }, (_, i) => (
              <span key={i} className={cn('h-8 flex-1 rounded-md', i < story.water ? 'bg-brand-400' : 'bg-surface')} />
            ))}
          </div>
          <Button
            className="mt-4"
            size="lg"
            icon={<Plus className="size-5" />}
            onClick={() => dispatch({ type: 'water' })}
          >
            I had a glass
          </Button>
        </Card>

        <Card className={cn(story.help && 'border-danger-600/50 bg-danger-50')}>
          {story.help ? (
            <>
              <p className="text-lg font-semibold text-danger-700">Your circle has been told</p>
              <p className="mt-1 text-ink-muted">
                {story.help.responders.length
                  ? `${story.help.responders.map((p) => nameFor(p, 'mum')).join(' and ')} ${
                      story.help.responders.length > 1 ? 'are' : 'is'
                    } on the way.`
                  : 'Your daughter, your husband and Ram can all see this.'}
              </p>
              <Button className="mt-4" size="lg" variant="secondary" onClick={() => dispatch({ type: 'helpCancel' })}>
                I’m okay now
              </Button>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold">Need a hand?</p>
              <p className="mt-1 text-ink-muted">One tap tells everyone in your circle.</p>
              <Button
                className="mt-4"
                size="lg"
                variant="danger"
                icon={<LifeBuoy className="size-5" />}
                onClick={() => dispatch({ type: 'help' })}
              >
                I need help
              </Button>
            </>
          )}
          <p className="mt-3 text-xs text-ink-subtle">In an emergency, call your local emergency number.</p>
        </Card>
      </div>

      <Section title="Call or message your family">
        <ContactsCard viewer="mum" onCall={onCall} onMessage={onMessage} big />
      </Section>

      <Section title="Your day">
        <ProgressCard tasks={tasks} label="Your day so far" />
        <Card padding="none" className="mt-4 overflow-hidden">
          <ul className="divide-y divide-line">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} viewer="mum" minute={story.minute} canRecord big dispatch={dispatch} />
            ))}
          </ul>
        </Card>
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Messages">
          <MessagesCard viewer="mum" messages={story.messages} onReply={onMessage} onCall={onCall} />
        </Section>
        <Section title="Who’s coming today">
          <RotaCard story={story} viewer="mum" />
        </Section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Me (daughter, admin) */

export function MeView(props: ViewProps) {
  const { story, dispatch, onCall, onMessage } = props;
  const tasks = sortByTime(story.tasks);
  const tablets = story.tasks.find((t) => t.id === MORNING_TABLETS)!;
  const worry = tablets.status === null || tablets.status === 'not_taken';
  return (
    <div className="space-y-8">
      <Greeting sub="You run Mum’s circle. Here’s how her day is going." />
      <HelpBanner {...props} viewer="me" />
      <MumNow story={story} />

      {worry ? (
        <Card className="border-danger-600/40 bg-danger-50">
          <p className="text-lg font-semibold text-danger-700">Mum hasn’t taken her medicine today</p>
          <p className="mt-1 text-ink-muted">
            {tablets.status === 'not_taken'
              ? `Morning tablets were recorded as not taken by ${nameFor(tablets.by!, 'me')}.`
              : 'Morning tablets were due at 8:00 am. Ram is running late, so nobody has given them yet.'}
            {story.reminderSentAt ? ` You sent her a reminder at ${clock(story.reminderSentAt)}.` : ''}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="danger" onClick={() => onCall('mum')}>
              Call Mum
            </Button>
            <Button variant="secondary" onClick={() => dispatch({ type: 'remind', by: 'me' })}>
              {story.reminderSentAt ? 'Remind her again' : 'Send Mum a reminder'}
            </Button>
            <Button variant="secondary" onClick={() => onMessage('dad')}>
              Ask Dad to check
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="border-success-700/20 bg-success-50">
          <p className="text-lg font-semibold text-success-700">All good: Mum took her morning tablets</p>
          <p className="mt-1 text-ink-muted">
            Recorded by {nameFor(tablets.by!, 'me')} at {clock(tablets.at!)}.
          </p>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Section title="Mum’s schedule today">
          <Card padding="none" className="overflow-hidden">
            <ul className="divide-y divide-line">
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} viewer="me" minute={story.minute} canRecord dispatch={dispatch} />
              ))}
            </ul>
          </Card>
        </Section>
        <div className="space-y-8">
          <Section title="Your circle">
            <ContactsCard viewer="me" onCall={onCall} onMessage={onMessage} />
          </Section>
          <Section title="Messages">
            <MessagesCard viewer="me" messages={story.messages} onReply={onMessage} onCall={onCall} />
          </Section>
        </div>
      </div>

      <Section title="Medicine supply" action={<Badge tone="neutral">Counts down as doses are recorded</Badge>}>
        <MedicineTracker story={story} viewer="me" dispatch={dispatch} />
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Who’s visiting today">
          <RotaCard story={story} viewer="me" />
          <div className="mt-4">
            <Handover story={story} />
          </div>
        </Section>
        <div className="space-y-8">
          <Section title="Coming up">
            <Appointment viewer="me" />
          </Section>
          <Section title="Today’s activity">
            <Card>
              <ol className="space-y-3">
                {[...story.activity]
                  .sort((a, b) => b.at - a.at)
                  .slice(0, 7)
                  .map((a) => (
                    <li key={a.id} className="flex items-start gap-3 text-sm animate-[cc-pop_0.3s_ease-out]">
                      <Avatar person={a.who} className="size-7 text-[0.6875rem]" />
                      <p className="flex-1">
                        <strong className="font-semibold">{nameFor(a.who, 'me')}</strong> {a.text}
                      </p>
                      <span className="whitespace-nowrap text-ink-subtle">{clock(a.at)}</span>
                    </li>
                  ))}
              </ol>
            </Card>
          </Section>
        </div>
      </div>

      <Section title="Updates for everyone">
        <UpdatesFeed viewer="me" updates={story.updates} dispatch={dispatch} />
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ Ram (caregiver) */

export function RamView(props: ViewProps) {
  const { story, dispatch, onCall, onMessage } = props;
  const [note, setNote] = useState('');
  const mine = sortByTime(story.tasks.filter((t) => t.assignee === 'ram'));
  const others = sortByTime(story.tasks.filter((t) => t.assignee !== 'ram'));
  const tablets = story.tasks.find((t) => t.id === MORNING_TABLETS)!;
  const v = story.visit;
  return (
    <div className="space-y-8">
      <Greeting name="Ram" sub="Your visits with Mum today. Record each one so the family knows it’s done." />
      <HelpBanner {...props} viewer="ram" />

      <Card className={cn(v.status === 'here' && 'border-brand-300 bg-brand-50')}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-ink-muted">Morning visit · due 8:00 am</p>
            <p className="mt-1 text-xl font-semibold">
              {v.status === 'late'
                ? 'You told the family you’re running late'
                : v.status === 'here'
                  ? `With Mum since ${clock(v.arrivedAt!)}`
                  : `Visit finished ${clock(v.arrivedAt!)}–${clock(v.leftAt!)}`}
            </p>
          </div>
          {v.status === 'late' && (
            <Button size="lg" icon={<DoorOpen className="size-5" />} onClick={() => dispatch({ type: 'arrive' })}>
              I’ve arrived
            </Button>
          )}
        </div>
        {v.status === 'here' && (
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              dispatch({ type: 'leave', handover: note });
              setNote('');
            }}
          >
            <label htmlFor="handover" className="block font-medium">
              Handover note for the next visit
            </label>
            <textarea
              id="handover"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Took her tablets late with toast. Drank two glasses of water."
              className="block w-full rounded-xl border border-line-strong bg-canvas px-3.5 py-2.5 text-[0.9375rem] placeholder:text-ink-subtle"
            />
            <Button type="submit" variant="secondary">
              Leaving now
            </Button>
          </form>
        )}
        {v.status === 'left' && <p className="mt-2 text-ink-muted">The family can see your handover note.</p>}
      </Card>

      {v.status !== 'left' && <Handover story={story} />}

      {tablets.status === null && (
        <Card className="border-info-700/20">
          <p className="text-lg font-semibold">Give Mum her morning tablets</p>
          <p className="text-ink-muted">Blood pressure tablet, one with breakfast, as on the pharmacy label.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => dispatch({ type: 'record', taskId: MORNING_TABLETS, status: 'taken', by: 'ram' })}>
              Mark as given
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                dispatch({
                  type: 'record',
                  taskId: MORNING_TABLETS,
                  status: 'not_taken',
                  by: 'ram',
                  note: 'She felt sick and didn’t want them',
                })
              }
            >
              She didn’t take them
            </Button>
          </div>
        </Card>
      )}

      <Section title="Your tasks">
        <Card padding="none" className="overflow-hidden">
          <ul className="divide-y divide-line">
            {mine.map((t) => (
              <TaskRow key={t.id} task={t} viewer="ram" minute={story.minute} canRecord dispatch={dispatch} />
            ))}
          </ul>
        </Card>
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Contact the family">
          <ContactsCard viewer="ram" onCall={onCall} onMessage={onMessage} />
        </Section>
        <Section title="Messages">
          <MessagesCard viewer="ram" messages={story.messages} onReply={onMessage} onCall={onCall} />
        </Section>
      </div>

      <Section title="Medicine supply">
        <MedicineTracker story={story} viewer="ram" dispatch={dispatch} />
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Visit notes for everyone">
          <UpdatesFeed viewer="ram" updates={story.updates} dispatch={dispatch} placeholder="How is Mum today?" />
        </Section>
        <Section title="Rest of Mum’s day">
          <Card padding="none" className="overflow-hidden">
            <ul className="divide-y divide-line">
              {others.map((t) => (
                <TaskRow key={t.id} task={t} viewer="ram" minute={story.minute} canRecord={false} dispatch={dispatch} />
              ))}
            </ul>
          </Card>
        </Section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Dad (husband, family) */

export function DadView(props: ViewProps) {
  const { story, dispatch, onCall, onMessage } = props;
  const [sent, setSent] = useState<string | null>(null);
  const tasks = sortByTime(story.tasks);
  const mine = tasks.filter((t) => t.assignee === 'dad');
  const love = (text: string) => {
    dispatch({ type: 'message', from: 'dad', to: 'mum', text });
    setSent(text);
  };
  return (
    <div className="space-y-8">
      <Greeting name="Dad" sub="Here’s how Mum’s day is going, even when you’re at work." />
      <HelpBanner {...props} viewer="dad" />
      <MumNow story={story} />

      <Card className="border-accent-300 bg-accent-50">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <Heart className="size-5 text-danger-600" aria-hidden="true" />
          Send Mum a little love
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => love('Thinking of you ❤️')}>
            Thinking of you ❤️
          </Button>
          <Button variant="secondary" onClick={() => love('Can’t wait to see you at lunch 🥪')}>
            See you at lunch 🥪
          </Button>
          <Button variant="secondary" onClick={() => love('Proud of you for taking it easy today ❤️')}>
            Proud of you ❤️
          </Button>
          <Button onClick={() => onCall('mum')}>Call Mum</Button>
        </div>
        {sent && (
          <p role="status" className="mt-3 text-success-700">
            Sent to Mum: “{sent}” It pops up on her screen.
          </p>
        )}
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Your jobs today">
          <Card padding="none" className="overflow-hidden">
            <ul className="divide-y divide-line">
              {mine.map((t) => (
                <TaskRow key={t.id} task={t} viewer="dad" minute={story.minute} canRecord dispatch={dispatch} />
              ))}
            </ul>
          </Card>
          <div className="mt-4">
            <Appointment viewer="dad" />
          </div>
        </Section>
        <Section title="Who’s with Mum today">
          <RotaCard story={story} viewer="dad" />
        </Section>
      </div>

      <Section title="Medicine supply">
        <MedicineTracker story={story} viewer="dad" dispatch={dispatch} />
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Your circle">
          <ContactsCard viewer="dad" onCall={onCall} onMessage={onMessage} />
        </Section>
        <Section title="Messages">
          <MessagesCard viewer="dad" messages={story.messages} onReply={onMessage} onCall={onCall} />
        </Section>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Updates from the circle">
          <UpdatesFeed viewer="dad" updates={story.updates} dispatch={dispatch} />
        </Section>
        <Section title="Mum’s whole day" action={<Badge tone="neutral">Medication details are private</Badge>}>
          <ProgressCard tasks={tasks} label="Done so far" />
          <Card padding="none" className="mt-4 overflow-hidden">
            <ul className="divide-y divide-line">
              {tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  viewer="dad"
                  minute={story.minute}
                  canRecord={false}
                  hideMedication
                  dispatch={dispatch}
                />
              ))}
            </ul>
          </Card>
        </Section>
      </div>
    </div>
  );
}
