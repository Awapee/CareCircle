import { ChevronLeft, ChevronRight, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAction } from '@/api/queries';
import { useCircle } from '@/app/session';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField } from '@/components/ui/Field';
import { PageHeader } from '@/components/ui/PageHeader';
import { ActionError, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { addDays, daysBetween, formatDateLabel, formatTimeLabel, startOfIsoWeek } from '@/domain/dates';
import { describeRecurrence } from '@/domain/recurrence';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  STATUS_LABELS,
  type Category,
  type DisplayStatus,
  type Task,
} from '@/domain/types';
import { CategoryIcon } from '@/features/tasks/CategoryIcon';
import { OccurrenceList } from '@/features/tasks/OccurrenceList';
import { useSchedule, useToday, type ScheduleItem } from '@/features/tasks/schedule';
import { useTaskDialogs } from '@/features/tasks/useTaskDialogs';
import { cn } from '@/lib/cn';
import { usePageTitle } from '@/lib/usePageTitle';

type View = 'day' | 'week' | 'list' | 'series';

const VIEWS: { id: View; label: string; short: string }[] = [
  { id: 'day', label: 'Day', short: 'Day' },
  { id: 'week', label: 'Week', short: 'Week' },
  { id: 'list', label: 'Next 14 days', short: '14 days' },
  { id: 'series', label: 'All tasks', short: 'All tasks' },
];

const isDate = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function PlannerPage() {
  usePageTitle('Planner');
  const { can, memberName, assignableMembers } = useCircle();
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const view = (VIEWS.find((v) => v.id === params.get('view'))?.id ?? 'day') as View;
  const date = isDate(params.get('date')) ? params.get('date')! : today;
  const [category, setCategory] = useState<Category | ''>('');
  const [status, setStatus] = useState<DisplayStatus | ''>('');
  const [person, setPerson] = useState('');

  const from = view === 'week' ? startOfIsoWeek(date) : date;
  const days = view === 'day' ? 1 : view === 'week' ? 7 : 14;
  const schedule = useSchedule(from, days);
  const dialogs = useTaskDialogs({ items: schedule.items, tasks: schedule.tasks, today });

  // Deep link from a notification: ?occurrence=ID opens that item.
  const linked = params.get('occurrence');
  useEffect(() => {
    if (linked && schedule.items.some((i) => i.occurrence.id === linked)) {
      dialogs.openOccurrence(linked);
      setParams(
        (p) => {
          p.delete('occurrence');
          return p;
        },
        { replace: true },
      );
    }
  }, [linked, schedule.items, dialogs, setParams]);

  const update = (changes: Record<string, string | null>) =>
    setParams((p) => {
      for (const [k, v] of Object.entries(changes)) {
        if (v === null) p.delete(k);
        else p.set(k, v);
      }
      return p;
    });

  const filtered = useMemo(
    () =>
      schedule.items.filter(
        (i) =>
          (!category || i.task.category === category) &&
          (!status || i.status === status) &&
          (!person || (person === 'none' ? i.assigneeId === null : i.assigneeId === person)),
      ),
    [schedule.items, category, status, person],
  );

  const step = view === 'day' ? 1 : view === 'week' ? 7 : 14;
  const rangeLabel =
    view === 'day'
      ? date === today
        ? `Today, ${formatDateLabel(date, { weekday: undefined, month: 'long' })}`
        : formatDateLabel(date, { weekday: 'long', month: 'long' })
      : `${formatDateLabel(from, { weekday: undefined })} – ${formatDateLabel(addDays(from, days - 1), { weekday: undefined })}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planner"
        description="Plan and manage tasks, routines and appointments."
        actions={
          can('edit_tasks') && (
            <Button icon={<Plus className="size-4" aria-hidden="true" />} onClick={() => dialogs.newTask()}>
              New task
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-4">
        <div
          role="tablist"
          aria-label="Planner view"
          className="grid grid-cols-4 gap-1 rounded-xl bg-canvas p-1 ring-1 ring-line"
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              onClick={() => update({ view: v.id === 'day' ? null : v.id })}
              className={cn(
                'min-h-10 whitespace-nowrap rounded-lg px-1 text-sm font-medium sm:px-3',
                view === v.id ? 'bg-brand-600 text-white' : 'text-ink-muted hover:bg-surface hover:text-ink',
              )}
            >
              <span className="sm:hidden">{v.short}</span>
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>

        {view !== 'series' && (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                aria-label="Previous"
                onClick={() => update({ date: addDays(date, -step) })}
                icon={<ChevronLeft className="size-4" aria-hidden="true" />}
              />
              <p className="min-w-0 flex-1 text-center font-semibold sm:min-w-56" aria-live="polite">
                {rangeLabel}
              </p>
              <Button
                variant="secondary"
                size="sm"
                aria-label="Next"
                onClick={() => update({ date: addDays(date, step) })}
                icon={<ChevronRight className="size-4" aria-hidden="true" />}
              />
              {date !== today && (
                <Button variant="ghost" size="sm" onClick={() => update({ date: null })}>
                  Today
                </Button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <SelectField label="Type" value={category} onChange={(e) => setCategory(e.target.value as Category | '')}>
                <option value="">All types</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as DisplayStatus | '')}
              >
                <option value="">Any status</option>
                {(Object.keys(STATUS_LABELS) as DisplayStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </SelectField>
              <SelectField label="Person" value={person} onChange={(e) => setPerson(e.target.value)}>
                <option value="">Everyone</option>
                <option value="none">Unassigned</option>
                {assignableMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {memberName(m.userId)}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
        )}
      </div>

      {schedule.error ? (
        <ErrorState error={schedule.error} onRetry={schedule.refetch} />
      ) : schedule.isPending ? (
        <LoadingState />
      ) : view === 'series' ? (
        <SeriesList tasks={schedule.tasks} onEdit={dialogs.editTask} />
      ) : view === 'day' ? (
        <OccurrenceList
          items={filtered}
          onOpen={dialogs.openOccurrence}
          emptyText={schedule.items.length ? 'Nothing matches these filters.' : 'Nothing is scheduled on this day.'}
        />
      ) : (
        <DayGroups from={from} days={days} items={filtered} today={today} onOpen={dialogs.openOccurrence} />
      )}

      {dialogs.dialogs}
    </div>
  );
}

function DayGroups({
  from,
  days,
  items,
  today,
  onOpen,
}: {
  from: string;
  days: number;
  items: ScheduleItem[];
  today: string;
  onOpen: (id: string) => void;
}) {
  const dates = Array.from({ length: days }, (_, i) => addDays(from, i));
  return (
    <div className="space-y-6">
      {dates.map((d) => {
        const dayItems = items.filter((i) => i.date === d);
        const past = daysBetween(d, today) > 0;
        return (
          <section key={d} aria-label={formatDateLabel(d, { weekday: 'long', month: 'long' })}>
            <h2 className={cn('mb-2 flex items-center gap-2 font-semibold', past && 'text-ink-muted')}>
              {formatDateLabel(d, { weekday: 'long', month: 'long' })}
              {d === today && <Badge tone="brand">Today</Badge>}
            </h2>
            <OccurrenceList items={dayItems} onOpen={onOpen} emptyText="Nothing scheduled." />
          </section>
        );
      })}
    </div>
  );
}

function SeriesList({ tasks, onEdit }: { tasks: Task[]; onEdit: (id: string) => void }) {
  const { can, memberName } = useCircle();
  const toast = useToast();
  const [deleting, setDeleting] = useState<Task | null>(null);
  const pause = useAction((api, t: Task) => api.setTaskPaused(t.id, !t.pausedAt, t.version));
  const remove = useAction((api, t: Task) => api.deleteTask(t.id));

  if (tasks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-ink-muted">
        No tasks yet.
      </p>
    );
  }

  const sorted = [...tasks].sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
  return (
    <>
      <ActionError error={pause.error} />
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-canvas shadow-card">
        {sorted.map((t) => (
          <li key={t.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <CategoryIcon category={t.category} />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {t.title}
                  {t.pausedAt && <Badge tone="neutral">Paused</Badge>}
                </p>
                <p className="text-sm text-ink-muted">
                  {CATEGORY_LABELS[t.category]} · {describeRecurrence(t.recurrence)} at{' '}
                  {t.times.map(formatTimeLabel).join(', ')} · {t.assigneeId ? memberName(t.assigneeId) : 'Unassigned'}
                </p>
              </div>
            </div>
            {can('edit_tasks') && (
              <div className="flex flex-wrap gap-2 sm:shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Pencil className="size-4" aria-hidden="true" />}
                  onClick={() => onEdit(t.id)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pause.isPending}
                  icon={
                    t.pausedAt ? (
                      <Play className="size-4" aria-hidden="true" />
                    ) : (
                      <Pause className="size-4" aria-hidden="true" />
                    )
                  }
                  onClick={async () => {
                    try {
                      await pause.mutateAsync(t);
                      toast(t.pausedAt ? `“${t.title}” resumed` : `“${t.title}” paused`);
                    } catch {
                      // Shown by <ActionError>.
                    }
                  }}
                >
                  {t.pausedAt ? 'Resume' : 'Pause'}
                </Button>
                {can('delete_tasks') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger-700 hover:text-danger-700"
                    icon={<Trash2 className="size-4" aria-hidden="true" />}
                    onClick={() => setDeleting(t)}
                  >
                    Delete
                  </Button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete “${deleting?.title ?? ''}”?`}
        description="This removes the task and all of its occurrences, including what was recorded. It can’t be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={async () => {
                if (!deleting) return;
                try {
                  await remove.mutateAsync(deleting);
                  toast(`“${deleting.title}” deleted`);
                  setDeleting(null);
                } catch {
                  // Shown below.
                }
              }}
            >
              Delete task
            </Button>
          </>
        }
      >
        <ActionError error={remove.error} />
        <p className="text-ink-muted">
          To stop it without losing its history, pause it instead. The activity history keeps a note that it was
          deleted.
        </p>
      </Dialog>
    </>
  );
}
