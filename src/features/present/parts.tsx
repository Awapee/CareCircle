import {
  Bell,
  Check,
  CheckCheck,
  DoorOpen,
  Footprints,
  Heart,
  LifeBuoy,
  Send,
  ShoppingCart,
  GlassWater,
  Lock,
  MessageSquareText,
  Phone,
  PhoneOff,
  Pill,
  Undo2,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LogoMark } from '@/components/brand/Logo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CategoryIcon } from '@/features/tasks/CategoryIcon';
import { cn } from '@/lib/cn';
import type { NoteAction, StoryNotification } from './notifications';
import {
  BUY_SOON_DAYS,
  ORDER,
  PEOPLE,
  clock,
  contactName,
  daysLeft,
  rota,
  runsOutOn,
  type Message,
  type StoryState,
  isDone,
  minutesOf,
  nameFor,
  needsReview,
  type PersonId,
  type Status,
  type StoryAction,
  type Task,
  type Update,
} from './story';

/** "Your daughter" → "your daughter" mid-sentence; names stay as they are. */
const lower = (name: string) => (name.startsWith('Your ') ? `y${name.slice(1)}` : name);

export function Avatar({ person, className }: { person: PersonId; className?: string }) {
  const p = PEOPLE[person];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
        p.avatar,
        className,
      )}
    >
      {p.initial}
    </span>
  );
}

const noteIcons = {
  help: LifeBuoy,
  heart: Heart,
  cart: ShoppingCart,
  home: DoorOpen,
  pill: Pill,
  water: GlassWater,
  meal: UtensilsCrossed,
  walk: Footprints,
  message: MessageSquareText,
  check: CheckCheck,
  phone: Phone,
};

const noteTints: Record<StoryNotification['tone'], string> = {
  alert: 'bg-danger-50 text-danger-700',
  reminder: 'bg-brand-50 text-brand-700',
  good: 'bg-success-50 text-success-700',
  update: 'bg-info-50 text-info-700',
};

/** One notification, styled like a phone notification. */
export function NotificationCard({
  note,
  onAction,
  onClose,
  className,
}: {
  note: StoryNotification;
  onAction: (a: NoteAction) => void;
  onClose?: () => void;
  className?: string;
}) {
  const Icon = noteIcons[note.icon];
  return (
    <div
      className={cn(
        'rounded-2xl border bg-canvas p-4 shadow-xl',
        note.tone === 'alert' ? 'border-danger-600/40' : 'border-line',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs text-ink-subtle">
        <LogoMark className="size-5" />
        <span className="font-semibold text-ink-muted">CareCircle</span>
        <span>· now</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss notification"
            className="-my-1 -mr-1 ml-auto inline-flex size-8 items-center justify-center rounded-lg hover:bg-surface"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="mt-2 flex gap-3">
        <span
          className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', noteTints[note.tone])}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold leading-snug">{note.title}</p>
          <p className="mt-0.5 text-sm text-ink-muted">{note.body}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {note.actions.map((a, i) => (
          <Button
            key={a.label}
            size="sm"
            variant={i === 0 ? (note.tone === 'alert' ? 'danger' : 'primary') : 'secondary'}
            icon={a.kind === 'call' ? <Phone className="size-4" aria-hidden="true" /> : undefined}
            onClick={() => onAction(a)}
          >
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Pop-ups in the top corner, like notifications arriving on a device. */
export function PopupStack({
  notes,
  onAction,
  onClose,
}: {
  notes: StoryNotification[];
  onAction: (n: StoryNotification, a: NoteAction) => void;
  onClose: (n: StoryNotification) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-3 top-[8.75rem] z-50 flex w-[min(23rem,calc(100vw-1.5rem))] flex-col gap-3 sm:right-5"
    >
      {notes.map((n) => (
        <NotificationCard
          key={n.key}
          note={n}
          className="pointer-events-auto animate-[cc-pop_0.35s_ease-out]"
          onAction={(a) => onAction(n, a)}
          onClose={() => onClose(n)}
        />
      ))}
    </div>
  );
}

/** The bell in the app bar, with a panel listing everything this person is notified about. */
export function NotificationBell({
  notes,
  onAction,
}: {
  notes: StoryNotification[];
  onAction: (n: StoryNotification, a: NoteAction) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={notes.length ? `Notifications, ${notes.length} new` : 'Notifications'}
        className="relative inline-flex size-11 items-center justify-center rounded-xl text-ink-muted hover:bg-surface hover:text-ink"
      >
        <Bell className="size-5" aria-hidden="true" />
        {notes.length > 0 && (
          <span className="absolute right-1.5 top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-danger-600 px-1.5 text-[0.6875rem] font-semibold leading-5 text-white">
            {notes.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(23rem,calc(100vw-2rem))] space-y-2 rounded-2xl border border-line bg-surface p-2 shadow-xl">
          <p className="px-2 pt-1 text-sm font-semibold">Notifications</p>
          {notes.length === 0 ? (
            <p className="px-2 pb-2 text-sm text-ink-muted">All caught up.</p>
          ) : (
            notes.map((n) => (
              <NotificationCard
                key={n.key}
                note={n}
                className="shadow-none"
                onAction={(a) => {
                  onAction(n, a);
                  setOpen(false);
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ task, minute }: { task: Task; minute: number }) {
  if (task.status === 'taken') return <Badge tone="success">Taken</Badge>;
  if (task.status === 'done') return <Badge tone="success">Done</Badge>;
  if (task.status === 'not_taken') return <Badge tone="danger">Not taken</Badge>;
  if (needsReview(task, minute)) return <Badge tone="warning">Needs review</Badge>;
  if (minute >= minutesOf(task.time)) return <Badge tone="info">Due now</Badge>;
  return <Badge tone="neutral">Upcoming</Badge>;
}

/** A task in the day's plan, with the same record buttons as the real app. */
export function TaskRow({
  task,
  viewer,
  minute,
  canRecord,
  hideMedication = false,
  big = false,
  dispatch,
}: {
  task: Task;
  viewer: PersonId;
  minute: number;
  canRecord: boolean;
  hideMedication?: boolean;
  big?: boolean;
  dispatch: (a: StoryAction) => void;
}) {
  const med = task.category === 'medication';
  const record = (status: Status) => dispatch({ type: 'record', taskId: task.id, status, by: viewer });
  const assignee = nameFor(task.assignee, viewer);
  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3',
        big && 'py-4',
        needsReview(task, minute) && 'bg-warning-50/60',
      )}
    >
      <span className={cn('w-[4.5rem] shrink-0 whitespace-nowrap font-semibold tabular-nums', big && 'w-24 text-lg')}>
        {clock(task.time)}
      </span>
      <CategoryIcon category={task.category} className={big ? 'size-12' : undefined} />
      <div className="min-w-0 flex-1">
        <p className={cn('font-medium', big && 'text-lg')}>{task.title}</p>
        <p className="text-sm text-ink-muted">
          {med && hideMedication ? (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3.5" aria-hidden="true" />
              Details hidden
            </span>
          ) : (
            (task.details ?? '')
          )}
          {!big && (
            <>
              {task.details || (med && hideMedication) ? ' · ' : ''}
              {assignee === 'You' ? 'You' : assignee}
            </>
          )}
        </p>
        {task.status && task.by && task.at && (
          <p className="mt-0.5 text-sm text-success-700">
            {nameFor(task.by, viewer)} recorded this at {clock(task.at)}
            {task.note ? `: “${task.note}”` : ''}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge task={task} minute={minute} />
        {canRecord &&
          (task.status === null ? (
            <>
              <Button
                size={big ? 'lg' : 'sm'}
                variant={big || needsReview(task, minute) ? 'primary' : 'secondary'}
                icon={<Check className="size-4" aria-hidden="true" />}
                onClick={() => record(med ? 'taken' : 'done')}
              >
                {med ? (big ? 'I’ve taken them' : 'Taken') : 'Done'}
              </Button>
              {med && !big && (
                <Button size="sm" variant="ghost" onClick={() => record('not_taken')}>
                  Not taken
                </Button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => record(null)}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm text-ink-muted hover:bg-surface hover:text-ink"
              aria-label={`Undo ${task.title}`}
            >
              <Undo2 className="size-4" aria-hidden="true" />
              Undo
            </button>
          ))}
      </div>
    </li>
  );
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className} aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Updates from the circle, with "Mark as seen" and a box to post one. */
export function UpdatesFeed({
  viewer,
  updates,
  dispatch,
  placeholder = 'Share how things are going…',
}: {
  viewer: PersonId;
  updates: Update[];
  dispatch: (a: StoryAction) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState('');
  const sorted = [...updates].sort((a, b) => b.at - a.at);
  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          dispatch({ type: 'post', author: viewer, text: text.trim() });
          setText('');
        }}
      >
        <label className="sr-only" htmlFor={`post-${viewer}`}>
          Post an update to everyone
        </label>
        <input
          id={`post-${viewer}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-canvas px-3.5 text-[0.9375rem] placeholder:text-ink-subtle"
        />
        <Button type="submit" disabled={!text.trim()}>
          Post
        </Button>
      </form>
      {sorted.map((u) => {
        const mine = u.author === viewer;
        const seen = u.seenBy.includes(viewer);
        return (
          <Card key={u.id} as="article" className="animate-[cc-pop_0.3s_ease-out]">
            <header className="flex items-center gap-2">
              <Avatar person={u.author} className="size-8 text-xs" />
              <p className="font-semibold">{nameFor(u.author, viewer)}</p>
              <span className="ml-auto text-sm text-ink-subtle">{clock(u.at)}</span>
            </header>
            <p className="mt-2">{u.text}</p>
            <footer className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-sm">
              {u.seenBy.length > 0 && (
                <p className="flex items-center gap-1.5 text-ink-muted">
                  <CheckCheck className="size-4 text-success-700" aria-hidden="true" />
                  Seen by {u.seenBy.map((p) => lower(nameFor(p, viewer))).join(', ')}
                </p>
              )}
              {!mine && !seen && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => dispatch({ type: 'seen', updateId: u.id, who: viewer })}
                >
                  Mark as seen
                </Button>
              )}
            </footer>
          </Card>
        );
      })}
    </div>
  );
}

/** A pretend phone call, so calling anyone in the circle can be shown on camera. */
export function CallOverlay({
  to,
  viewer,
  onEnd,
}: {
  to: PersonId | null;
  viewer: PersonId;
  onEnd: (seconds: number) => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [connected, setConnected] = useState(false);
  const endRef = useRef<HTMLButtonElement>(null);
  const open = to !== null;

  useEffect(() => {
    if (!open) return;
    endRef.current?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endRef.current?.click();
    };
    window.addEventListener('keydown', escape);
    const connect = window.setTimeout(() => setConnected(true), 3000);
    const tick = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      window.removeEventListener('keydown', escape);
      window.clearTimeout(connect);
      window.clearInterval(tick);
      setConnected(false);
      setSeconds(0);
    };
  }, [open]);

  if (!to) return null;
  const talkTime = Math.max(0, seconds - 3);
  const end = () => onEnd(connected ? talkTime : 0);
  const label = capitalise(contactName(to, viewer));
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Calling ${label}`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4 animate-[fade-in_0.2s_ease-out]"
    >
      <div className="w-full max-w-xs rounded-3xl bg-brand-900 px-6 py-10 text-center text-white shadow-2xl">
        <div className="relative mx-auto flex size-24 items-center justify-center">
          {!connected && <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/40" />}
          <Avatar person={to} className="relative size-24 text-3xl" />
        </div>
        <p className="mt-6 text-2xl font-semibold">{label}</p>
        <p className="mt-1 text-brand-200" aria-live="polite">
          {connected
            ? `Connected · ${Math.floor(talkTime / 60)}:${String(talkTime % 60).padStart(2, '0')}`
            : 'Calling mobile…'}
        </p>
        <button
          ref={endRef}
          type="button"
          onClick={end}
          className="mx-auto mt-10 flex size-16 items-center justify-center rounded-full bg-danger-600 hover:bg-danger-700"
          aria-label="End call"
        >
          <PhoneOff className="size-7" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const capitalise = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Everyone else in the circle, one tap to call or message. */
export function ContactsCard({
  viewer,
  onCall,
  onMessage,
  big = false,
}: {
  viewer: PersonId;
  onCall: (p: PersonId) => void;
  onMessage: (p: PersonId) => void;
  big?: boolean;
}) {
  const people = ORDER.filter((p) => p !== viewer);
  return (
    <Card padding="none" className="divide-y divide-line overflow-hidden">
      {people.map((p) => (
        <div key={p} className={cn('flex flex-wrap items-center gap-3 px-4 py-3', big && 'py-4')}>
          <Avatar person={p} className={big ? 'size-12 text-base' : undefined} />
          <div className="min-w-0 flex-1">
            <p className={cn('font-semibold', big && 'text-lg')}>{capitalise(contactName(p, viewer))}</p>
            <p className="text-sm text-ink-muted">{PEOPLE[p].relation}</p>
          </div>
          <div className="flex gap-2">
            <Button
              size={big ? 'lg' : 'sm'}
              icon={<Phone className="size-4" aria-hidden="true" />}
              onClick={() => onCall(p)}
              aria-label={`Call ${contactName(p, viewer)}`}
            >
              Call
            </Button>
            <Button
              size={big ? 'lg' : 'sm'}
              variant="secondary"
              icon={<MessageSquareText className="size-4" aria-hidden="true" />}
              onClick={() => onMessage(p)}
              aria-label={`Message ${contactName(p, viewer)}`}
            >
              Message
            </Button>
          </div>
        </div>
      ))}
    </Card>
  );
}

const QUICK: Record<PersonId, string[]> = {
  mum: [
    'I’m okay, don’t worry 🙂',
    'Could you call me when you’re free?',
    'Thank you for today ❤️',
    'I’ve taken my tablets',
  ],
  me: [
    'How are you feeling, Mum? ❤️',
    'I’ll call you at lunchtime',
    'Could you check on Mum this morning?',
    'Thank you!',
  ],
  ram: ['I’m on my way', 'Mum is doing well today', 'Mum seems a bit tired, worth a call', 'Running a little late'],
  dad: ['Thinking of you ❤️', 'See you at lunch', 'I’ll pick up the shopping', 'Can you check on Mum?'],
};

/** Write a private message to one person, with quick suggestions. */
export function MessageDialog({
  to,
  viewer,
  onSend,
  onClose,
}: {
  to: PersonId | null;
  viewer: PersonId;
  onSend: (to: PersonId, text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!to) return;
    inputRef.current?.focus();
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('keydown', escape);
      setText('');
    };
  }, [to, onClose]);
  if (!to) return null;
  const send = (t: string) => {
    if (!t.trim()) return;
    onSend(to, t.trim());
  };
  const name = contactName(to, viewer);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="message-title"
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 p-4 animate-[fade-in_0.2s_ease-out] sm:items-center"
    >
      <Card padding="lg" className="w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3">
          <Avatar person={to} />
          <h2 id="message-title" className="flex-1 text-lg font-semibold">
            Message {name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-surface"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-muted">Only {name} will see this.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK[viewer].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              className="rounded-full border border-line-strong px-3 py-1.5 text-sm hover:border-brand-400 hover:bg-brand-50"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <label htmlFor="message-text" className="sr-only">
            Your message
          </label>
          <textarea
            id="message-text"
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Or write your own…"
            className="block w-full rounded-xl border border-line-strong bg-canvas px-3.5 py-2.5 text-[0.9375rem] placeholder:text-ink-subtle"
          />
          <Button type="submit" fullWidth disabled={!text.trim()} icon={<Send className="size-4" aria-hidden="true" />}>
            Send
          </Button>
        </form>
      </Card>
    </div>
  );
}

/** This person's private messages, newest first. */
export function MessagesCard({
  viewer,
  messages,
  onReply,
  onCall,
}: {
  viewer: PersonId;
  messages: Message[];
  onReply: (p: PersonId) => void;
  onCall: (p: PersonId) => void;
}) {
  const mine = messages.filter((m) => m.to === viewer || m.from === viewer).sort((a, b) => b.at - a.at);
  if (mine.length === 0) {
    return (
      <Card>
        <p className="text-ink-muted">No messages yet.</p>
      </Card>
    );
  }
  return (
    <Card padding="none" className="divide-y divide-line overflow-hidden">
      {mine.slice(0, 5).map((m) => {
        const incoming = m.to === viewer;
        const other = incoming ? m.from : m.to;
        return (
          <div
            key={m.id}
            className={cn('px-4 py-3 animate-[cc-pop_0.3s_ease-out]', incoming && !m.read && 'bg-info-50/60')}
          >
            <div className="flex items-center gap-2 text-sm">
              <Avatar person={other} className="size-7 text-[0.6875rem]" />
              <span className="font-semibold">
                {incoming ? `From ${contactName(other, viewer)}` : `To ${contactName(other, viewer)}`}
              </span>
              {incoming && !m.read && <Badge tone="info">New</Badge>}
              <span className="ml-auto text-ink-subtle">{clock(m.at)}</span>
            </div>
            <p className="mt-1.5">{m.text}</p>
            {incoming && (
              <div className="mt-2 flex gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => onReply(other)}
                  className="font-semibold text-brand-700 hover:underline"
                >
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => onCall(other)}
                  className="font-semibold text-brand-700 hover:underline"
                >
                  Call back
                </button>
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}

/** Who is visiting Mum today. */
export function RotaCard({ story, viewer }: { story: StoryState; viewer: PersonId }) {
  return (
    <Card padding="none" className="divide-y divide-line overflow-hidden">
      {rota(story).map((r) => (
        <div key={r.time + r.who} className="flex items-center gap-3 px-4 py-3">
          <span className="w-[4.5rem] shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums">{r.time}</span>
          <Avatar person={r.who} className="size-8 text-xs" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {nameFor(r.who, viewer)} · {r.what}
            </p>
            <p className={cn('text-sm', r.live ? 'font-medium text-brand-700' : 'text-ink-muted')}>{r.status}</p>
          </div>
        </div>
      ))}
    </Card>
  );
}

/** Medicine supply: what was bought, how long it lasts, and who is buying more. */
export function MedicineTracker({
  story,
  viewer,
  dispatch,
}: {
  story: StoryState;
  viewer: PersonId;
  dispatch: (a: StoryAction) => void;
}) {
  const other: PersonId = viewer === 'me' ? 'dad' : 'me';
  return (
    <Card padding="none" className="divide-y divide-line overflow-hidden">
      {story.medicines.map((m) => {
        const d = daysLeft(m);
        const tone = d <= BUY_SOON_DAYS ? 'danger' : d <= 10 ? 'warning' : 'success';
        const pct = Math.min(100, (m.left / m.boughtQty) * 100);
        return (
          <div key={m.id} className="px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-3">
                <CategoryIcon category="medication" />
                <div>
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-sm text-ink-muted">{m.purpose}</p>
                </div>
              </div>
              <Badge tone={tone}>
                {d <= BUY_SOON_DAYS ? 'Buy soon · ' : ''}
                {d} days left
              </Badge>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-500',
                  tone === 'danger' ? 'bg-danger-600' : tone === 'warning' ? 'bg-accent-400' : 'bg-brand-600',
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-ink-subtle">Left</dt>
                <dd className="font-medium">
                  {m.left} {m.unit}
                </dd>
              </div>
              <div>
                <dt className="text-ink-subtle">Uses</dt>
                <dd className="font-medium">{m.perDay} a day</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">Runs out</dt>
                <dd className={cn('font-medium', tone === 'danger' && 'text-danger-700')}>{runsOutOn(m)}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle">Last bought</dt>
                <dd className="font-medium">
                  {m.boughtQty} {m.unit} on {m.boughtOn}, by {lowerYour(nameFor(m.boughtBy, viewer))}
                </dd>
              </div>
            </dl>
            {viewer !== 'mum' && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {m.buyer ? (
                  <>
                    <p className="text-sm font-medium text-brand-700">
                      {m.buyer === viewer ? 'You’re buying more' : `${nameFor(m.buyer, viewer)} is buying more`}
                    </p>
                    {m.buyer === viewer && (
                      <Button size="sm" onClick={() => dispatch({ type: 'bought', medId: m.id, who: viewer })}>
                        Mark as bought
                      </Button>
                    )}
                  </>
                ) : (
                  d <= 10 && (
                    <>
                      <Button
                        size="sm"
                        variant={d <= BUY_SOON_DAYS ? 'primary' : 'secondary'}
                        onClick={() => dispatch({ type: 'willBuy', medId: m.id, who: viewer })}
                      >
                        I’ll buy it
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Send className="size-4" aria-hidden="true" />}
                        onClick={() => dispatch({ type: 'buyReminder', medId: m.id, from: viewer, to: other })}
                      >
                        {other === 'dad' ? 'Remind Dad to buy' : 'Remind our daughter'}
                      </Button>
                    </>
                  )
                )}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}

const lowerYour = (name: string) => (name.startsWith('Your ') ? `y${name.slice(1)}` : name);

export function ProgressCard({ tasks, label }: { tasks: Task[]; label: string }) {
  const done = tasks.filter(isDone).length;
  return (
    <Card>
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">
        {done} of {tasks.length} done
      </p>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface" aria-hidden="true">
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
          style={{ width: `${(done / tasks.length) * 100}%` }}
        />
      </div>
    </Card>
  );
}
