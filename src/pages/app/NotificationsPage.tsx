import { AlarmClock, CheckCheck, MessageSquare, TriangleAlert, Users, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useApi } from '@/api/ApiProvider';
import { useAction, useNotifications, usePreferences } from '@/api/queries';
import { useCircle } from '@/app/session';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox, TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { ActionError, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { addDays, formatInstant, formatRelative } from '@/domain/dates';
import type { AppNotification, NotificationKind, UserPreferences } from '@/domain/types';
import { useNow, useSchedule, useToday } from '@/features/tasks/schedule';
import { cn } from '@/lib/cn';
import { usePageTitle } from '@/lib/usePageTitle';

const KIND: Record<NotificationKind, { label: string; Icon: LucideIcon; tint: string }> = {
  reminder: { label: 'Reminder', Icon: AlarmClock, tint: 'bg-info-50 text-info-700' },
  follow_up: { label: 'Follow-up', Icon: TriangleAlert, tint: 'bg-warning-50 text-warning-700' },
  update: { label: 'Update', Icon: MessageSquare, tint: 'bg-brand-50 text-brand-700' },
  circle: { label: 'Circle', Icon: Users, tint: 'bg-surface text-ink-muted' },
};

export function NotificationsPage() {
  usePageTitle('Notifications');
  const api = useApi();
  const notifications = useNotifications();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const markAll = useAction((a) => a.markNotificationsRead(null));
  const now = useNow();

  // Map each notification's task to its date, so "Open task" can jump straight to it.
  const today = useToday();
  const schedule = useSchedule(addDays(today, -3), 6);
  const dates = useMemo(() => new Map(schedule.items.map((i) => [i.occurrence.id, i.date])), [schedule.items]);

  const all = notifications.data ?? [];
  const unread = all.filter((n) => !n.readAt).length;
  const shown = unreadOnly ? all.filter((n) => !n.readAt) : all;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notifications"
        description="Reminders, follow-ups and updates from your circle."
        actions={
          unread > 0 && (
            <Button
              variant="secondary"
              loading={markAll.isPending}
              icon={<CheckCheck className="size-4" aria-hidden="true" />}
              onClick={() => markAll.mutate(undefined)}
            >
              Mark all as read
            </Button>
          )
        }
      />

      {api.mode === 'demo' && (
        <Notice tone="neutral" title="Simulated in the demo">
          Reminders and follow-ups are generated in this browser every minute while the demo is open. With a real
          account, the database creates them on a schedule.
        </Notice>
      )}

      <section aria-labelledby="list-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="list-heading" className="text-lg font-semibold">
            {unread > 0 ? `${unread} unread` : 'All caught up'}
          </h2>
          <Checkbox label="Show unread only" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
        </div>
        <ActionError error={markAll.error} />
        {notifications.isPending ? (
          <LoadingState />
        ) : notifications.isError ? (
          <ErrorState error={notifications.error} onRetry={() => notifications.refetch()} />
        ) : shown.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-ink-muted">
            {unreadOnly ? 'No unread notifications.' : 'No notifications yet.'}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-canvas shadow-card">
            {shown.map((n) => (
              <NotificationRow
                key={n.id}
                n={n}
                now={now}
                date={n.occurrenceId ? dates.get(n.occurrenceId) : undefined}
              />
            ))}
          </ul>
        )}
      </section>

      <Preferences />
      <HowItWorks />
    </div>
  );
}

function NotificationRow({ n, now, date }: { n: AppNotification; now: Date; date: string | undefined }) {
  const { timeZone } = useCircle();
  const markRead = useAction((a) => a.markNotificationsRead([n.id]));
  const { Icon, tint, label } = KIND[n.kind];
  const unread = !n.readAt;

  return (
    <li className={cn('flex gap-3 px-4 py-4 sm:px-5', unread && 'bg-brand-50/40')}>
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', tint)} aria-hidden="true">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className={cn('text-ink', unread ? 'font-semibold' : 'font-medium')}>{n.title}</span>
          {unread && <Badge tone="brand">New</Badge>}
        </p>
        {n.body && <p className="mt-0.5 text-ink-muted">{n.body}</p>}
        <p className="mt-1 text-sm text-ink-subtle">
          {label} ·{' '}
          <time dateTime={n.createdAt} title={formatInstant(n.createdAt, timeZone)}>
            {formatRelative(n.createdAt, now)}
          </time>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {n.occurrenceId &&
            (date ? (
              <Link
                to={`/app/planner?date=${date}&occurrence=${n.occurrenceId}`}
                onClick={() => unread && markRead.mutate(undefined)}
                className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
              >
                Open task
              </Link>
            ) : (
              <span className="text-sm text-ink-subtle">The task is no longer in the recent schedule.</span>
            ))}
          {n.kind === 'update' && (
            <Link
              to="/app/activity"
              onClick={() => unread && markRead.mutate(undefined)}
              className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
            >
              Read updates
            </Link>
          )}
          {unread && (
            <Button variant="ghost" size="sm" disabled={markRead.isPending} onClick={() => markRead.mutate(undefined)}>
              Mark as read
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

function Preferences() {
  const prefs = usePreferences();
  return (
    <section aria-labelledby="prefs-heading">
      <h2 id="prefs-heading" className="text-lg font-semibold">
        Notification settings
      </h2>
      <Card className="mt-3">
        {prefs.isPending ? (
          <LoadingState />
        ) : prefs.isError ? (
          <ErrorState error={prefs.error} onRetry={() => prefs.refetch()} />
        ) : (
          <PreferencesForm key={JSON.stringify(prefs.data)} prefs={prefs.data} />
        )}
      </Card>
    </section>
  );
}

function PreferencesForm({ prefs }: { prefs: UserPreferences }) {
  const toast = useToast();
  const [inApp, setInApp] = useState(prefs.inApp);
  const [quiet, setQuiet] = useState(prefs.quietStart !== null && prefs.quietEnd !== null);
  const [start, setStart] = useState(prefs.quietStart ?? '22:00');
  const [end, setEnd] = useState(prefs.quietEnd ?? '07:00');
  const save = useAction((api) =>
    api.updatePreferences({
      inApp,
      email: prefs.email,
      push: prefs.push,
      quietStart: quiet ? start : null,
      quietEnd: quiet ? end : null,
    }),
  );

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await save.mutateAsync(undefined);
          toast('Notification settings saved');
        } catch {
          // Shown by <ActionError>.
        }
      }}
    >
      <ActionError error={save.error} />
      <Checkbox
        label="In-app notifications"
        hint="Reminders, follow-ups and updates appear on this page and in the bell."
        checked={inApp}
        onChange={(e) => setInApp(e.target.checked)}
      />
      <div>
        <Checkbox
          label="Quiet hours"
          hint="Nothing is sent during these hours. Anything still relevant arrives when they end."
          checked={quiet}
          onChange={(e) => setQuiet(e.target.checked)}
        />
        {quiet && (
          <div className="mt-3 grid max-w-sm grid-cols-2 gap-3 pl-8">
            <TextField label="From" type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
            <TextField label="Until" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </div>
        )}
      </div>
      <div className="space-y-2 rounded-xl bg-surface px-4 py-3">
        <p className="flex items-center justify-between gap-3">
          <span className="font-medium">Email</span>
          <Badge tone="neutral">Not configured</Badge>
        </p>
        <p className="flex items-center justify-between gap-3">
          <span className="font-medium">Push notifications</span>
          <Badge tone="neutral">Not configured</Badge>
        </p>
        <p className="text-sm text-ink-muted">
          No email or push provider is connected yet, so CareCircle doesn’t send anything outside the app.
        </p>
      </div>
      <Button type="submit" variant="secondary" loading={save.isPending}>
        Save settings
      </Button>
    </form>
  );
}

function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="max-w-3xl">
      <h2 id="how-heading" className="text-lg font-semibold">
        How reminders and follow-up work
      </h2>
      <ol className="mt-3 space-y-2 text-ink-muted">
        <li>
          <strong className="text-ink">Reminder:</strong> sent before a task is due, to the person it’s assigned to, or
          to the follow-up contacts if nobody is assigned.
        </li>
        <li>
          <strong className="text-ink">Follow-up:</strong> if nothing is recorded by the end of the task’s waiting
          period, or it’s recorded as not taken, the follow-up contacts and the assignee are told it needs review.
        </li>
        <li>
          <strong className="text-ink">Never twice:</strong> each person gets at most one reminder and one follow-up per
          task occurrence.
        </li>
      </ol>
      <p className="mt-3 text-sm text-ink-muted">
        A follow-up means a confirmation is missing, not that something is wrong. CareCircle is not an emergency
        service. In an emergency, call your local emergency number.
      </p>
    </section>
  );
}
