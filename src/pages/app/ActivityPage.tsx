import { CheckCheck, Lock, MessageSquarePlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAction, useActivity, useUpdates } from '@/api/queries';
import { useCircle } from '@/app/session';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SelectField, TextArea } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { ActionError, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { formatDateLabel, formatInstant, formatRelative, localDate, localTime, formatTimeLabel } from '@/domain/dates';
import type { ActivityEvent, ActivityType, CareUpdate } from '@/domain/types';
import { useNow } from '@/features/tasks/schedule';
import { cn } from '@/lib/cn';
import { usePageTitle } from '@/lib/usePageTitle';

type Tab = 'updates' | 'history';

const GROUPS: { id: string; label: string; types: ActivityType[] }[] = [
  { id: 'records', label: 'Recorded tasks', types: ['outcome_recorded', 'outcome_cleared'] },
  {
    id: 'schedule',
    label: 'Schedule changes',
    types: ['task_created', 'task_updated', 'task_deleted', 'task_paused', 'task_resumed', 'occurrence_updated'],
  },
  { id: 'updates', label: 'Updates', types: ['update_posted', 'update_acknowledged'] },
  { id: 'followup', label: 'Follow-up', types: ['follow_up_due'] },
  {
    id: 'circle',
    label: 'Members and settings',
    types: [
      'member_joined',
      'member_role_changed',
      'member_removed',
      'invitation_created',
      'invitation_revoked',
      'circle_updated',
    ],
  },
];

export function ActivityPage() {
  usePageTitle('Activity & updates');
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'history' ? 'history' : 'updates';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity & updates"
        description="Short updates from the circle, and a shared history of what happened."
      />
      <div
        role="tablist"
        aria-label="Activity view"
        className="flex gap-1 rounded-xl bg-canvas p-1 ring-1 ring-line sm:w-fit"
      >
        {(
          [
            ['updates', 'Updates'],
            ['history', 'History'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setParams(id === 'updates' ? {} : { tab: id })}
            className={cn(
              'min-h-10 flex-1 rounded-lg px-5 text-sm font-medium sm:flex-none',
              tab === id ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-surface hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'updates' ? <Updates /> : <History />}
    </div>
  );
}

function Updates() {
  const { circleId, can } = useCircle();
  const updates = useUpdates(circleId);
  const now = useNow(60_000);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="feed-heading" className="lg:order-1">
        <h2 id="feed-heading" className="sr-only">
          Updates
        </h2>
        {updates.isPending ? (
          <LoadingState />
        ) : updates.isError ? (
          <ErrorState error={updates.error} onRetry={() => updates.refetch()} />
        ) : updates.data.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-ink-muted">
            No updates yet. Share how the day went, or anything others should know.
          </p>
        ) : (
          <ul className="space-y-3">
            {updates.data.map((u) => (
              <li key={u.id}>
                <UpdateCard update={u} now={now} />
              </li>
            ))}
          </ul>
        )}
      </section>
      {can('post_updates') && (
        <div className="lg:order-2">
          <Composer />
        </div>
      )}
    </div>
  );
}

function Composer() {
  const { circleId } = useCircle();
  const toast = useToast();
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<'circle' | 'private'>('circle');
  const post = useAction((api) => api.postUpdate(circleId, { body, visibility, occurrenceId: null }));

  return (
    <Card as="section" aria-labelledby="composer-heading" className="lg:sticky lg:top-6">
      <h2 id="composer-heading" className="flex items-center gap-2 font-semibold">
        <MessageSquarePlus className="size-5 text-brand-600" aria-hidden="true" />
        Write an update
      </h2>
      <form
        className="mt-4 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await post.mutateAsync(undefined);
            setBody('');
            toast(visibility === 'private' ? 'Private note saved' : 'Update posted');
          } catch {
            // Shown by <ActionError>.
          }
        }}
      >
        <ActionError error={post.error} />
        <TextArea
          label="Update"
          hint="Keep it short and practical. Avoid detailed medical information."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          rows={4}
          required
        />
        <SelectField
          label="Who can see it"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as 'circle' | 'private')}
        >
          <option value="circle">Everyone in the circle</option>
          <option value="private">Only me (private note)</option>
        </SelectField>
        <Button type="submit" fullWidth loading={post.isPending} disabled={!body.trim()}>
          {visibility === 'private' ? 'Save private note' : 'Post update'}
        </Button>
      </form>
    </Card>
  );
}

function UpdateCard({ update, now }: { update: CareUpdate; now: Date }) {
  const { userId, timeZone } = useCircle();
  const toast = useToast();
  const ack = useAction((api) => api.acknowledgeUpdate(update.id));
  const mine = update.authorId === userId;
  const acked = update.acknowledgedBy.some((a) => a.userId === userId);

  return (
    <Card as="article">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {update.authorName}
          {mine && <span className="font-normal text-ink-muted"> (you)</span>}
        </p>
        <div className="flex items-center gap-2 text-sm text-ink-subtle">
          {update.visibility === 'private' && (
            <Badge tone="neutral" icon={<Lock className="size-3" aria-hidden="true" />}>
              Private note
            </Badge>
          )}
          <time dateTime={update.createdAt} title={formatInstant(update.createdAt, timeZone)}>
            {formatRelative(update.createdAt, now)}
          </time>
        </div>
      </header>
      <p className="mt-2 whitespace-pre-line">{update.body}</p>
      {update.visibility === 'circle' && (
        <footer className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-sm">
          {update.acknowledgedBy.length > 0 && (
            <p className="flex items-center gap-1.5 text-ink-muted">
              <CheckCheck className="size-4 text-success-700" aria-hidden="true" />
              Seen by {update.acknowledgedBy.map((a) => a.displayName).join(', ')}
            </p>
          )}
          {!mine && !acked && (
            <Button
              variant="secondary"
              size="sm"
              loading={ack.isPending}
              onClick={async () => {
                try {
                  await ack.mutateAsync(undefined);
                  toast('Marked as seen');
                } catch {
                  // Shown below.
                }
              }}
            >
              Mark as seen
            </Button>
          )}
          <ActionError error={ack.error} />
        </footer>
      )}
    </Card>
  );
}

function History() {
  const { circleId, members, timeZone } = useCircle();
  const activity = useActivity(circleId, 500);
  const [group, setGroup] = useState('');
  const [person, setPerson] = useState('');

  const filtered = useMemo(() => {
    const types = GROUPS.find((g) => g.id === group)?.types;
    return (activity.data ?? []).filter(
      (e) =>
        (!types || types.includes(e.type)) &&
        (!person || (person === 'system' ? e.actorId === null : e.actorId === person)),
    );
  }, [activity.data, group, person]);

  const byDay = useMemo(() => {
    const days = new Map<string, ActivityEvent[]>();
    for (const e of filtered) {
      const d = localDate(new Date(e.createdAt), timeZone);
      days.set(d, [...(days.get(d) ?? []), e]);
    }
    return [...days.entries()];
  }, [filtered, timeZone]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <SelectField label="Type" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">Everything</option>
          {GROUPS.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </SelectField>
        <SelectField label="Person" value={person} onChange={(e) => setPerson(e.target.value)}>
          <option value="">Everyone</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.displayName}
            </option>
          ))}
          <option value="system">CareCircle (automatic)</option>
        </SelectField>
      </div>

      {activity.isPending ? (
        <LoadingState />
      ) : activity.isError ? (
        <ErrorState error={activity.error} onRetry={() => activity.refetch()} />
      ) : byDay.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-ink-muted">
          Nothing matches these filters.
        </p>
      ) : (
        byDay.map(([day, events]) => (
          <section key={day} aria-label={formatDateLabel(day, { weekday: 'long', month: 'long' })}>
            <h2 className="mb-2 font-semibold">{formatDateLabel(day, { weekday: 'long', month: 'long' })}</h2>
            <ol className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-canvas shadow-card">
              {events.map((e) => (
                <li key={e.id} className="flex gap-4 px-4 py-3 sm:px-5">
                  <time
                    dateTime={e.createdAt}
                    className="w-[4.75rem] shrink-0 whitespace-nowrap text-sm tabular-nums text-ink-muted"
                  >
                    {formatTimeLabel(localTime(new Date(e.createdAt), timeZone))}
                  </time>
                  <p className={cn('min-w-0', e.type === 'follow_up_due' && 'text-warning-700')}>{e.summary}</p>
                </li>
              ))}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
