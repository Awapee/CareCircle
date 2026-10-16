import { EyeOff, Pill, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { useCircle } from '@/app/session';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { addDays, formatTimeLabel } from '@/domain/dates';
import { describeRecurrence } from '@/domain/recurrence';
import { OccurrenceList } from '@/features/tasks/OccurrenceList';
import { useSchedule, useToday, type ScheduleItem } from '@/features/tasks/schedule';
import { useTaskDialogs } from '@/features/tasks/useTaskDialogs';
import { usePageTitle } from '@/lib/usePageTitle';

/** What was recorded over a period. Never presented as adherence or proof. */
function recordSummary(items: ScheduleItem[]) {
  const s = { taken: 0, notTaken: 0, skipped: 0, noRecord: 0, total: 0 };
  for (const i of items) {
    if (i.status === 'cancelled' || i.status === 'upcoming' || i.status === 'pending') continue;
    s.total += 1;
    if (i.occurrence.outcome === 'taken') s.taken += 1;
    else if (i.occurrence.outcome === 'not_taken') s.notTaken += 1;
    else if (i.occurrence.outcome === 'skipped') s.skipped += 1;
    else s.noRecord += 1;
  }
  return s;
}

export function MedicationPage() {
  usePageTitle('Medication');
  const { can, memberName, careProfile, myRole } = useCircle();
  const today = useToday();
  const schedule = useSchedule(addDays(today, -6), 7);
  const dialogs = useTaskDialogs({ items: schedule.items, tasks: schedule.tasks, today });

  const meds = useMemo(() => schedule.tasks.filter((t) => t.category === 'medication'), [schedule.tasks]);
  const medItems = schedule.items.filter((i) => i.task.category === 'medication');
  const todayItems = medItems.filter((i) => i.date === today);
  const hidden = meds.some((t) => t.medicationHidden);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Medication"
        description={`Doses scheduled for ${careProfile.preferredName}, and what was recorded.`}
        actions={
          can('edit_tasks') && (
            <Button icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => dialogs.newTask('medication')}>
              Add medication
            </Button>
          )
        }
      />

      <Notice tone="info" title="A record, not medical advice">
        CareCircle shows what people recorded. It doesn’t check doses, interactions or whether a dose was really taken.
        Always follow the prescription and ask a pharmacist or doctor about medicines.
      </Notice>

      {hidden && (
        <Notice tone="neutral" title="Medication details are hidden for your role">
          {myRole === 'family'
            ? 'You can see when doses are scheduled, but not medication names or instructions. The circle admin can change this in circle settings.'
            : 'You can see when doses are scheduled, but not medication names or instructions.'}
        </Notice>
      )}

      {schedule.error ? (
        <ErrorState error={schedule.error} onRetry={schedule.refetch} />
      ) : schedule.isPending ? (
        <LoadingState />
      ) : meds.length === 0 ? (
        <EmptyState
          icon={<Pill className="size-6" />}
          title="No medication added"
          description="Add each medicine with its times, copied from the prescription or pharmacy label."
        />
      ) : (
        <>
          <section aria-labelledby="today-doses">
            <h2 id="today-doses" className="text-lg font-semibold">
              Today’s doses
            </h2>
            <div className="mt-3">
              <OccurrenceList
                items={todayItems}
                onOpen={dialogs.openOccurrence}
                emptyText="No doses scheduled today."
              />
            </div>
          </section>

          <section aria-labelledby="all-meds">
            <h2 id="all-meds" className="text-lg font-semibold">
              Medicines
            </h2>
            <ul className="mt-3 grid gap-4 md:grid-cols-2">
              {meds.map((t) => {
                const s = recordSummary(medItems.filter((i) => i.task.id === t.id));
                return (
                  <li key={t.id}>
                    <Card className="flex h-full flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold">{t.title}</h3>
                          {t.medication ? (
                            <p className="mt-0.5 text-ink">{t.medication.name}</p>
                          ) : (
                            <p className="mt-0.5 flex items-center gap-1.5 text-ink-muted">
                              <EyeOff className="size-4" aria-hidden="true" />
                              Name hidden for your role
                            </p>
                          )}
                        </div>
                        {t.pausedAt && <Badge>Paused</Badge>}
                      </div>
                      {t.medication?.instructions && <p className="mt-2 text-ink-muted">{t.medication.instructions}</p>}
                      <p className="mt-3 text-sm text-ink-muted">
                        {describeRecurrence(t.recurrence)} at {t.times.map(formatTimeLabel).join(', ')} ·{' '}
                        {t.assigneeId ? memberName(t.assigneeId) : 'Unassigned'}
                      </p>
                      <div className="mt-4 flex-1 border-t border-line pt-3">
                        <p className="text-sm font-medium">Recorded in the last 7 days</p>
                        {s.total === 0 ? (
                          <p className="mt-1 text-sm text-ink-muted">No doses were due yet.</p>
                        ) : (
                          <dl className="mt-2 grid grid-cols-4 gap-2 text-center text-sm">
                            <Count label="Taken" value={s.taken} />
                            <Count label="Not taken" value={s.notTaken} />
                            <Count label="Skipped" value={s.skipped} />
                            <Count label="No record" value={s.noRecord} />
                          </dl>
                        )}
                      </div>
                      {can('edit_tasks') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 mt-3 self-start"
                          onClick={() => dialogs.editTask(t.id)}
                        >
                          Edit schedule
                        </Button>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
      {dialogs.dialogs}
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-surface px-1 py-2">
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
      <dt className="text-ink-muted">{label}</dt>
    </div>
  );
}
