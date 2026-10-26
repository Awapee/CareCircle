import { CalendarClock, HeartPulse, Phone, Send, Smile, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Avatar, ProgressCard, Section, TaskRow, UpdatesFeed } from './parts';
import {
  MORNING_TABLETS,
  clock,
  isDone,
  nameFor,
  needsReview,
  type PersonId,
  type StoryAction,
  type StoryState,
} from './story';

interface ViewProps {
  story: StoryState;
  dispatch: (a: StoryAction) => void;
  onCall: () => void;
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

/* ------------------------------------------------------------------ Mum */

export function MumView({ story, dispatch }: ViewProps) {
  const [sent, setSent] = useState<string | null>(null);
  const tasks = sortByTime(story.tasks);
  const next = tasks.find((t) => t.status === null);
  const say = (text: string) => {
    dispatch({ type: 'post', author: 'mum', text });
    setSent(text);
  };
  return (
    <div className="space-y-8">
      <Greeting name="Mum" sub="Here’s your day. Tap a task once it’s done, and everyone in your circle will know." />
      <div className="grid gap-4 md:grid-cols-2">
        <ProgressCard tasks={tasks} label="Your day so far" />
        {next && (
          <Card className="border-brand-200 bg-brand-50">
            <p className="text-sm font-medium text-brand-800">Next up</p>
            <p className="mt-1 text-2xl font-semibold">
              {next.title} · {clock(next.time)}
            </p>
            <p className="text-ink-muted">{next.details ?? 'You can tick it off below.'}</p>
          </Card>
        )}
      </div>

      <Section title="Your day">
        <Card padding="none" className="overflow-hidden">
          <ul className="divide-y divide-line">
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} viewer="mum" minute={story.minute} canRecord big dispatch={dispatch} />
            ))}
          </ul>
        </Card>
      </Section>

      <Section title="Tell your circle how you are">
        <div className="grid gap-3 sm:grid-cols-3">
          <Button
            size="lg"
            variant="secondary"
            icon={<Smile className="size-5" />}
            onClick={() => say('I’m feeling well today 🙂')}
          >
            I’m feeling well
          </Button>
          <Button
            size="lg"
            variant="secondary"
            icon={<HeartPulse className="size-5" />}
            onClick={() => say('I’m not feeling great today. Staying in bed for now.')}
          >
            Not feeling great
          </Button>
          <Button
            size="lg"
            variant="secondary"
            icon={<Phone className="size-5" />}
            onClick={() => say('Could someone please give me a call?')}
          >
            Please call me
          </Button>
        </div>
        {sent && (
          <p role="status" className="mt-3 rounded-xl bg-success-50 px-4 py-3 text-success-700">
            Sent to your circle: “{sent}” Your daughter, Ram and Dad have been notified.
          </p>
        )}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ Me (daughter, admin) */

export function MeView({ story, dispatch, onCall }: ViewProps) {
  const tasks = sortByTime(story.tasks);
  const tablets = story.tasks.find((t) => t.id === MORNING_TABLETS)!;
  const worry = tablets.status === null || tablets.status === 'not_taken';
  const stats = [
    { label: 'Scheduled today', value: tasks.length },
    { label: 'Done', value: tasks.filter(isDone).length },
    { label: 'Still to do', value: tasks.filter((t) => t.status === null).length },
    {
      label: 'Needs attention',
      value: tasks.filter((t) => needsReview(t, story.minute) || t.status === 'not_taken').length,
    },
  ];
  return (
    <div className="space-y-8">
      <Greeting sub="You run Mum’s circle. Here’s how her day is going." />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <dt className="text-sm text-ink-muted">{s.label}</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{s.value}</dd>
          </Card>
        ))}
      </dl>

      {worry ? (
        <Card className="border-danger-600/40 bg-danger-50">
          <p className="text-lg font-semibold text-danger-700">Mum hasn’t taken her medicine today</p>
          <p className="mt-1 text-ink-muted">
            {tablets.status === 'not_taken'
              ? `Morning tablets were recorded as not taken by ${nameFor(tablets.by!, 'me')}.`
              : 'Morning tablets were due at 8:00 am. Nothing has been recorded yet.'}
            {story.reminderSentAt ? ` You sent a reminder at ${clock(story.reminderSentAt)}.` : ''}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="danger" icon={<Phone className="size-4" />} onClick={onCall}>
              Call Mum
            </Button>
            <Button
              variant="secondary"
              icon={<Send className="size-4" />}
              onClick={() => dispatch({ type: 'remind', by: 'me' })}
            >
              {story.reminderSentAt ? 'Remind again' : 'Send a reminder'}
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
          <Section title="Coming up">
            <Appointment viewer="me" />
          </Section>
          <Section title="Today’s activity">
            <Card>
              <ol className="space-y-3">
                {[...story.activity]
                  .sort((a, b) => b.at - a.at)
                  .slice(0, 6)
                  .map((a) => (
                    <li key={a.id} className="flex items-start gap-3 text-sm animate-[cc-pop_0.3s_ease-out]">
                      <Avatar person={a.who} className="size-7 text-[0.6875rem]" />
                      <p className="flex-1">
                        <strong className="font-semibold">{nameFor(a.who, 'me')}</strong> {a.text}
                      </p>
                      <span className="text-ink-subtle">{clock(a.at)}</span>
                    </li>
                  ))}
              </ol>
            </Card>
          </Section>
        </div>
      </div>

      <Section title="Updates">
        <UpdatesFeed viewer="me" updates={story.updates} dispatch={dispatch} />
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ Ram (caregiver) */

export function RamView({ story, dispatch }: ViewProps) {
  const mine = sortByTime(story.tasks.filter((t) => t.assignee === 'ram'));
  const others = sortByTime(story.tasks.filter((t) => t.assignee !== 'ram'));
  const tablets = story.tasks.find((t) => t.id === MORNING_TABLETS)!;
  return (
    <div className="space-y-8">
      <Greeting name="Ram" sub="Your visits with Mum today. Record each one so the family knows it’s done." />

      {tablets.status === null && (
        <Card className="border-brand-200 bg-brand-50">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-50 text-info-700">
              <Stethoscope className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-semibold">Give Mum her morning tablets</p>
              <p className="text-ink-muted">Blood pressure tablet, one with breakfast, as on the pharmacy label.</p>
            </div>
          </div>
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
        <Section title="Visit note">
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

export function DadView({ story, dispatch }: ViewProps) {
  const tasks = sortByTime(story.tasks);
  const mine = tasks.filter((t) => t.assignee === 'dad');
  return (
    <div className="space-y-8">
      <Greeting name="Dad" sub="Here’s how Mum’s day is going, even when you’re not there." />
      <div className="grid gap-4 md:grid-cols-2">
        <ProgressCard tasks={tasks} label="Mum’s day so far" />
        <Appointment viewer="dad" />
      </div>

      <Section title="Your jobs today">
        <Card padding="none" className="overflow-hidden">
          <ul className="divide-y divide-line">
            {mine.map((t) => (
              <TaskRow key={t.id} task={t} viewer="dad" minute={story.minute} canRecord dispatch={dispatch} />
            ))}
          </ul>
        </Card>
      </Section>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Updates from the circle">
          <UpdatesFeed viewer="dad" updates={story.updates} dispatch={dispatch} />
        </Section>
        <Section title="Mum’s whole day" action={<Badge tone="neutral">Medication details are private</Badge>}>
          <Card padding="none" className="overflow-hidden">
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
