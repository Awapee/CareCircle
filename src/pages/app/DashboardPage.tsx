import { ArrowRight, CalendarClock, MapPin, Plus, TriangleAlert, Video } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useActivity, useProfile } from '@/api/queries';
import { useCircle } from '@/app/session';
import { ButtonLink, Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { addDays, formatDateLabel, formatRelative, formatTimeLabel, localTime } from '@/domain/dates';
import { dayMetrics } from '@/domain/metrics';
import { OccurrenceList } from '@/features/tasks/OccurrenceList';
import { useSchedule, useToday } from '@/features/tasks/schedule';
import { useTaskDialogs } from '@/features/tasks/useTaskDialogs';
import { cn } from '@/lib/cn';
import { usePageTitle } from '@/lib/usePageTitle';

function greeting(hhmm: string): string {
  const h = Number(hhmm.slice(0, 2));
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function DashboardPage() {
  usePageTitle('Dashboard');
  const { careProfile, can, timeZone, circleId } = useCircle();
  const profile = useProfile();
  const today = useToday();
  const recent = useSchedule(addDays(today, -1), 2);
  const ahead = useSchedule(today, 15);
  const activity = useActivity(circleId, 5);

  const todayItems = useMemo(() => recent.items.filter((i) => i.date === today), [recent.items, today]);
  const overdueYesterday = recent.items.filter((i) => i.date !== today && i.status === 'needs_review');
  const metrics = useMemo(
    () =>
      dayMetrics(
        recent.items.map((i) => i.occurrence),
        new Map(recent.tasks.map((t) => [t.id, t])),
        today,
        timeZone,
        recent.now,
      ),
    [recent.items, recent.tasks, today, timeZone, recent.now],
  );
  const appointments = ahead.items.filter(
    (i) => i.task.category === 'appointment' && i.status !== 'cancelled' && i.occurrence.outcome === null,
  );
  const dialogs = useTaskDialogs({ items: [...recent.items, ...ahead.items], tasks: recent.tasks, today });

  const name = profile.data?.displayName;
  const nowLocal = localTime(recent.now, timeZone);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting(nowLocal)}${name ? `, ${name}` : ''}`}
        description={
          <>
            {formatDateLabel(today, { weekday: 'long', month: 'long' })} · Care for {careProfile.preferredName}
          </>
        }
        actions={
          can('edit_tasks') && (
            <Button icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => dialogs.newTask()}>
              New task
            </Button>
          )
        }
      />

      {recent.error ? (
        <ErrorState error={recent.error} onRetry={recent.refetch} />
      ) : recent.isPending ? (
        <LoadingState label="Loading today…" />
      ) : (
        <>
          <section aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="sr-only">
              Today at a glance
            </h2>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric label="Scheduled today" value={metrics.scheduled} />
              <Metric label="Completed" value={metrics.completed} tone="success" />
              <Metric label="Still to do" value={metrics.upcoming} />
              <Metric
                label="Needs review"
                value={metrics.needsReview}
                tone={metrics.needsReview ? 'warning' : undefined}
              />
            </dl>
          </section>

          {overdueYesterday.length > 0 && (
            <section
              aria-labelledby="yesterday-heading"
              className="rounded-[var(--radius-card)] border border-warning-700/25 bg-warning-50 p-5"
            >
              <h2 id="yesterday-heading" className="flex items-center gap-2 font-semibold text-warning-700">
                <TriangleAlert className="size-5" aria-hidden="true" />
                {overdueYesterday.length === 1
                  ? '1 item from yesterday needs review'
                  : `${overdueYesterday.length} items from yesterday need review`}
              </h2>
              <p className="mt-1 text-ink-muted">Nothing was recorded. Check in, then record what happened.</p>
              <div className="mt-4">
                <OccurrenceList items={overdueYesterday} onOpen={dialogs.openOccurrence} showDate />
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section aria-labelledby="today-heading">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="today-heading" className="text-lg font-semibold">
                  Today’s schedule
                </h2>
                <Link
                  to="/app/planner"
                  className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
                >
                  Open planner
                </Link>
              </div>
              <div className="mt-3">
                <OccurrenceList
                  items={todayItems}
                  onOpen={dialogs.openOccurrence}
                  emptyText={
                    can('edit_tasks')
                      ? 'Nothing is scheduled today. Add a task to get started.'
                      : 'Nothing is scheduled today.'
                  }
                />
              </div>
            </section>

            <div className="space-y-8">
              <section aria-labelledby="appointments-heading">
                <h2 id="appointments-heading" className="text-lg font-semibold">
                  Upcoming appointments
                </h2>
                {appointments.length === 0 ? (
                  <p className="mt-3 text-ink-muted">No appointments in the next two weeks.</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {appointments.slice(0, 4).map((a) => (
                      <li key={a.occurrence.id}>
                        <Card padding="none">
                          <button
                            type="button"
                            onClick={() => dialogs.openOccurrence(a.occurrence.id)}
                            className="block w-full rounded-[var(--radius-card)] p-4 text-left hover:bg-surface"
                          >
                            <span className="flex items-center gap-2 text-sm font-medium text-warning-700">
                              <CalendarClock className="size-4" aria-hidden="true" />
                              {a.date === today ? 'Today' : formatDateLabel(a.date)}, {formatTimeLabel(a.time)}
                            </span>
                            <span className="mt-1 block font-semibold text-ink">{a.title}</span>
                            {a.task.appointment?.location && (
                              <span className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                                <MapPin className="size-3.5" aria-hidden="true" />
                                {a.task.appointment.location}
                              </span>
                            )}
                            {a.task.appointment?.meetingLink && (
                              <span className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                                <Video className="size-3.5" aria-hidden="true" />
                                Video call
                              </span>
                            )}
                          </button>
                        </Card>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="recent-heading">
                <h2 id="recent-heading" className="text-lg font-semibold">
                  Recent activity
                </h2>
                {activity.data && activity.data.length > 0 ? (
                  <ul className="mt-3 space-y-3">
                    {activity.data.map((e) => (
                      <li key={e.id} className="text-[0.9375rem]">
                        <p className="text-ink">{e.summary}</p>
                        <p className="text-sm text-ink-subtle">{formatRelative(e.createdAt, recent.now)}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-ink-muted">Nothing has happened yet.</p>
                )}
                <ButtonLink
                  to="/app/activity"
                  variant="ghost"
                  size="sm"
                  className="mt-3 -ml-3"
                  icon={<ArrowRight className="order-last size-4" aria-hidden="true" />}
                >
                  All activity and updates
                </ButtonLink>
              </section>
            </div>
          </div>
        </>
      )}
      {dialogs.dialogs}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'warning' }) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border bg-canvas px-4 py-3 shadow-card',
        tone === 'warning' ? 'border-warning-700/25 bg-warning-50' : 'border-line',
      )}
    >
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd
        className={cn(
          'mt-1 text-2xl font-semibold tabular-nums',
          tone === 'success' ? 'text-success-700' : tone === 'warning' ? 'text-warning-700' : 'text-ink',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
