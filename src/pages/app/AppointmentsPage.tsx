import { CalendarClock, MapPin, Plus, UserRound, Video } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCircle } from '@/app/session';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { addDays, formatDateLabel, formatTimeLabel } from '@/domain/dates';
import { StatusBadge } from '@/features/tasks/OccurrenceList';
import { useSchedule, useToday, type ScheduleItem } from '@/features/tasks/schedule';
import { useTaskDialogs } from '@/features/tasks/useTaskDialogs';
import { usePageTitle } from '@/lib/usePageTitle';

export function AppointmentsPage() {
  usePageTitle('Appointments');
  const { can } = useCircle();
  const today = useToday();
  const upcoming = useSchedule(today, 90);
  const past = useSchedule(addDays(today, -60), 60);
  const items = [...past.items, ...upcoming.items];
  const dialogs = useTaskDialogs({ items, tasks: upcoming.tasks, today });

  const isAppt = (i: ScheduleItem) => i.task.category === 'appointment';
  const next = upcoming.items.filter((i) => isAppt(i) && i.status !== 'cancelled' && i.occurrence.outcome === null);
  const earlier = [...past.items, ...upcoming.items]
    .filter((i) => isAppt(i) && !next.includes(i))
    .sort((a, b) => b.occurrence.scheduledAt.localeCompare(a.occurrence.scheduledAt));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Appointments"
        description="Visits, check-ups and calls, with where to go and who it’s with."
        actions={
          can('edit_tasks') && (
            <Button
              icon={<Plus className="size-4" aria-hidden="true" />}
              onClick={() => dialogs.newTask('appointment')}
            >
              Add appointment
            </Button>
          )
        }
      />

      {upcoming.error ? (
        <ErrorState error={upcoming.error} onRetry={upcoming.refetch} />
      ) : upcoming.isPending || past.isPending ? (
        <LoadingState />
      ) : (
        <>
          <section aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" className="text-lg font-semibold">
              Coming up
            </h2>
            {next.length === 0 ? (
              <EmptyState
                className="mt-3"
                icon={<CalendarClock className="size-6" />}
                title="No upcoming appointments"
                description={
                  can('edit_tasks') ? 'Add an appointment so everyone knows when and where it is.' : undefined
                }
              />
            ) : (
              <ul className="mt-3 grid gap-4 md:grid-cols-2">
                {next.map((a) => (
                  <li key={a.occurrence.id}>
                    <AppointmentCard item={a} today={today} onOpen={dialogs.openOccurrence} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {earlier.length > 0 && (
            <section aria-labelledby="past-heading">
              <h2 id="past-heading" className="text-lg font-semibold">
                Earlier and recorded
              </h2>
              <ul className="mt-3 grid gap-4 md:grid-cols-2">
                {earlier.map((a) => (
                  <li key={a.occurrence.id}>
                    <AppointmentCard item={a} today={today} onOpen={dialogs.openOccurrence} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {dialogs.dialogs}
    </div>
  );
}

function AppointmentCard({ item, today, onOpen }: { item: ScheduleItem; today: string; onOpen: (id: string) => void }) {
  const { memberName } = useCircle();
  const appt = item.task.appointment;
  return (
    <Card padding="none" className="h-full">
      <button
        type="button"
        onClick={() => onOpen(item.occurrence.id)}
        className="flex h-full w-full flex-col rounded-[var(--radius-card)] p-5 text-left hover:bg-surface"
      >
        <span className="flex w-full items-start justify-between gap-3">
          <span className="text-sm font-semibold text-warning-700">
            {item.date === today ? 'Today' : formatDateLabel(item.date, { month: 'long' })},{' '}
            {formatTimeLabel(item.time)}
          </span>
          <StatusBadge status={item.status} />
        </span>
        <span className="mt-1 text-lg font-semibold text-ink">{item.title}</span>
        <span className="mt-2 space-y-1 text-[0.9375rem] text-ink-muted">
          {appt?.professional && <Line icon={<UserRound className="size-4" />}>{appt.professional}</Line>}
          {appt?.location && <Line icon={<MapPin className="size-4" />}>{appt.location}</Line>}
          {appt?.meetingLink && <Line icon={<Video className="size-4" />}>Video call (link in details)</Line>}
          <Line icon={<CalendarClock className="size-4" />}>
            Going with: {item.assigneeId ? memberName(item.assigneeId) : 'not decided yet'}
          </Line>
        </span>
      </button>
    </Card>
  );
}

function Line({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="shrink-0">
        {icon}
      </span>
      <span className="min-w-0">{children}</span>
    </span>
  );
}
