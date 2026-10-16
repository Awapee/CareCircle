import { Plus } from 'lucide-react';
import { useCircle } from '@/app/session';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { CATEGORY_LABELS, type Category } from '@/domain/types';
import { CategoryIcon } from '@/features/tasks/CategoryIcon';
import { OccurrenceList } from '@/features/tasks/OccurrenceList';
import { useSchedule, useToday } from '@/features/tasks/schedule';
import { useTaskDialogs } from '@/features/tasks/useTaskDialogs';
import { usePageTitle } from '@/lib/usePageTitle';

const GROUPS: { category: Category; heading: string; hint: string; empty: string }[] = [
  {
    category: 'meal',
    heading: 'Meals',
    hint: 'Set to the times that suit the person, not fixed targets.',
    empty: 'No meals planned today.',
  },
  {
    category: 'hydration',
    heading: 'Drinks',
    hint: 'Gentle prompts for a drink through the day.',
    empty: 'No drink reminders today.',
  },
  {
    category: 'routine',
    heading: 'Routines',
    hint: 'Walks, exercises, personal care and anything else that happens regularly.',
    empty: 'No routines today.',
  },
];

/** Meals, drinks and daily routines for today, each with simple progress. */
export function RoutinesPage() {
  usePageTitle('Meals & routines');
  const { can, careProfile } = useCircle();
  const today = useToday();
  const schedule = useSchedule(today, 1);
  const dialogs = useTaskDialogs({ items: schedule.items, tasks: schedule.tasks, today });

  return (
    <div className="space-y-8">
      <PageHeader title="Meals & routines" description={`Today’s everyday routine for ${careProfile.preferredName}.`} />

      {schedule.error ? (
        <ErrorState error={schedule.error} onRetry={schedule.refetch} />
      ) : schedule.isPending ? (
        <LoadingState />
      ) : (
        GROUPS.map((g) => {
          const items = schedule.items.filter((i) => i.task.category === g.category && i.status !== 'cancelled');
          const done = items.filter((i) => i.status === 'completed').length;
          return (
            <section key={g.category} aria-labelledby={`${g.category}-heading`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CategoryIcon category={g.category} />
                  <div>
                    <h2 id={`${g.category}-heading`} className="text-lg font-semibold">
                      {g.heading}
                    </h2>
                    <p className="text-sm text-ink-muted">{g.hint}</p>
                  </div>
                </div>
                {can('edit_tasks') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Plus className="size-4" aria-hidden="true" />}
                    onClick={() => dialogs.newTask(g.category)}
                  >
                    Add {CATEGORY_LABELS[g.category].toLowerCase()}
                  </Button>
                )}
              </div>
              {items.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {done} of {items.length} done today
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-2 overflow-hidden rounded-full bg-line"
                    role="progressbar"
                    aria-label={`${g.heading} done today`}
                    aria-valuemin={0}
                    aria-valuemax={items.length}
                    aria-valuenow={done}
                  >
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${(done / items.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="mt-3">
                <OccurrenceList items={items} onOpen={dialogs.openOccurrence} emptyText={g.empty} />
              </div>
            </section>
          );
        })
      )}
      {dialogs.dialogs}
    </div>
  );
}
