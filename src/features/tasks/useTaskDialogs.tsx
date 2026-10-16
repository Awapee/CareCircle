import { useState } from 'react';
import type { Category, Task } from '@/domain/types';
import { OccurrenceDialog } from './OccurrenceDialog';
import type { ScheduleItem } from './schedule';
import { TaskFormDialog } from './TaskFormDialog';

/**
 * The occurrence-details and task-form dialogs, wired together the same way on every page.
 * The open item is looked up by ID from fresh data, so it updates after each change.
 */
export function useTaskDialogs({ items, tasks, today }: { items: ScheduleItem[]; tasks: Task[]; today: string }) {
  const [occurrenceId, setOccurrenceId] = useState<string | null>(null);
  const [form, setForm] = useState<{ taskId: string | null; category: Category } | null>(null);

  const item = items.find((i) => i.occurrence.id === occurrenceId) ?? null;
  const task = form?.taskId ? (tasks.find((t) => t.id === form.taskId) ?? null) : null;

  const dialogs = (
    <>
      <OccurrenceDialog
        item={item}
        onClose={() => setOccurrenceId(null)}
        onEditSeries={(taskId) => {
          setOccurrenceId(null);
          setForm({ taskId, category: 'routine' });
        }}
      />
      <TaskFormDialog
        open={!!form}
        onOpenChange={(open) => !open && setForm(null)}
        task={task}
        today={today}
        defaultCategory={form?.category}
      />
    </>
  );

  return {
    dialogs,
    openOccurrence: setOccurrenceId,
    editTask: (taskId: string) => setForm({ taskId, category: 'routine' }),
    newTask: (category: Category = 'routine') => setForm({ taskId: null, category }),
  };
}
