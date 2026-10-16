import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useAction } from '@/api/queries';
import { useCircle } from '@/app/session';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Fieldset, SelectField, TextArea, TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { ActionError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { WEEKDAY_NAMES } from '@/domain/recurrence';
import { CATEGORIES, CATEGORY_LABELS, type Category, type Recurrence, type Task, type Weekday } from '@/domain/types';
import { taskInputSchema, type TaskInput } from '@/domain/validation';
import { cn } from '@/lib/cn';

type Kind = Recurrence['kind'];

interface FormState {
  title: string;
  category: Category;
  notes: string;
  kind: Kind;
  days: Weekday[];
  everyDays: number;
  times: string[];
  startDate: string;
  endDate: string;
  assigneeId: string;
  followUpMinutes: number;
  reminder: string;
  medName: string;
  medInstructions: string;
  location: string;
  meetingLink: string;
  professional: string;
}

function initialState(task: Task | null, today: string, category: Category): FormState {
  const r = task?.recurrence;
  return {
    title: task?.title ?? '',
    category: task?.category ?? category,
    notes: task?.notes ?? '',
    kind: r?.kind ?? (category === 'appointment' ? 'once' : 'daily'),
    days: r?.kind === 'weekly' ? r.days : [1, 2, 3, 4, 5],
    everyDays: r?.kind === 'interval' ? r.everyDays : 2,
    times: task?.times ?? ['09:00'],
    startDate: task?.startDate ?? today,
    endDate: task?.endDate ?? '',
    assigneeId: task?.assigneeId ?? '',
    followUpMinutes: task?.followUpMinutes ?? 30,
    reminder: task ? (task.reminderMinutesBefore === null ? 'none' : String(task.reminderMinutesBefore)) : '15',
    medName: task?.medication?.name ?? '',
    medInstructions: task?.medication?.instructions ?? '',
    location: task?.appointment?.location ?? '',
    meetingLink: task?.appointment?.meetingLink ?? '',
    professional: task?.appointment?.professional ?? '',
  };
}

function toInput(s: FormState): TaskInput {
  const recurrence: Recurrence =
    s.kind === 'weekly'
      ? { kind: 'weekly', days: [...s.days].sort() }
      : s.kind === 'interval'
        ? { kind: 'interval', everyDays: s.everyDays }
        : { kind: s.kind };
  return {
    title: s.title,
    category: s.category,
    notes: s.notes,
    recurrence,
    times: [...new Set(s.times)],
    startDate: s.startDate,
    endDate: s.kind === 'once' ? null : s.endDate || null,
    assigneeId: s.assigneeId || null,
    followUpMinutes: s.followUpMinutes,
    reminderMinutesBefore: s.reminder === 'none' ? null : Number(s.reminder),
    medication: s.category === 'medication' ? { name: s.medName, instructions: s.medInstructions } : null,
    appointment:
      s.category === 'appointment'
        ? { location: s.location, meetingLink: s.meetingLink.trim(), professional: s.professional }
        : null,
  };
}

/**
 * Create a task series, or edit one. Editing changes future occurrences that have nothing
 * recorded; anything already recorded stays exactly as it was.
 */
export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  today,
  defaultCategory = 'routine',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  today: string;
  defaultCategory?: Category;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={task ? `Edit “${task.title}”` : 'New task'}
      description={task ? 'Changes apply to future occurrences that haven’t been recorded yet.' : undefined}
    >
      {open && (
        <Form
          key={task?.id ?? 'new'}
          task={task}
          today={today}
          defaultCategory={defaultCategory}
          onDone={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
}

function Form({
  task,
  today,
  defaultCategory,
  onDone,
}: {
  task: Task | null;
  today: string;
  defaultCategory: Category;
  onDone: () => void;
}) {
  const { circleId, assignableMembers, timeZone } = useCircle();
  const toast = useToast();
  const [s, setS] = useState<FormState>(() => initialState(task, today, defaultCategory));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useAction((api, input: TaskInput) =>
    api.saveTask(circleId, task?.id ?? null, task?.version ?? null, input),
  );
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setS((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    const parsed = taskInputSchema.safeParse(toInput(s));
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.slice(0, 2).join('.');
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      await save.mutateAsync(parsed.data);
      toast(task ? `“${parsed.data.title}” updated` : `“${parsed.data.title}” added`);
      onDone();
    } catch {
      // Shown by <ActionError>.
    }
  };

  const isMed = s.category === 'medication';
  const isAppt = s.category === 'appointment';

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <ActionError error={save.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Type"
          value={s.category}
          disabled={!!task}
          hint={task ? 'The type can’t be changed after a task is created.' : undefined}
          onChange={(e) => {
            const category = e.target.value as Category;
            setS((prev) => ({ ...prev, category, kind: category === 'appointment' ? 'once' : prev.kind }));
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Title"
          placeholder={isMed ? 'e.g. Morning tablets' : isAppt ? 'e.g. Dentist check-up' : 'e.g. Afternoon walk'}
          value={s.title}
          onChange={(e) => set('title', e.target.value)}
          error={errors.title}
          maxLength={120}
        />
      </div>

      {isMed && (
        <div className="space-y-4 rounded-xl bg-surface p-4">
          <Notice tone="info">
            Record only what’s on the prescription or pharmacy label. CareCircle doesn’t give medical advice or check
            doses.
          </Notice>
          <TextField
            label="Medication name"
            value={s.medName}
            onChange={(e) => set('medName', e.target.value)}
            error={errors['medication.name'] ?? errors.medication}
            maxLength={120}
          />
          <TextArea
            label="Instructions"
            optional
            hint="Copied from the label, e.g. “One tablet with breakfast”."
            value={s.medInstructions}
            onChange={(e) => set('medInstructions', e.target.value)}
            maxLength={500}
          />
        </div>
      )}

      {isAppt && (
        <div className="grid gap-4 rounded-xl bg-surface p-4 sm:grid-cols-2">
          <TextField
            label="With"
            optional
            placeholder="e.g. Dr Patel (GP)"
            value={s.professional}
            onChange={(e) => set('professional', e.target.value)}
            maxLength={120}
          />
          <TextField
            label="Location"
            optional
            placeholder="e.g. Riverside Health Centre"
            value={s.location}
            onChange={(e) => set('location', e.target.value)}
            maxLength={200}
          />
          <TextField
            label="Video call link"
            optional
            className="sm:col-span-2"
            type="url"
            placeholder="https://"
            value={s.meetingLink}
            onChange={(e) => set('meetingLink', e.target.value)}
            error={errors['appointment.meetingLink']}
            maxLength={500}
          />
        </div>
      )}

      <Fieldset legend="When" hint={`Times are in the circle’s time zone (${timeZone.replace(/_/g, ' ')}).`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Repeats" value={s.kind} onChange={(e) => set('kind', e.target.value as Kind)}>
            <option value="once">Once</option>
            <option value="daily">Every day</option>
            <option value="weekly">On certain days of the week</option>
            <option value="interval">Every few days</option>
          </SelectField>
          {s.kind === 'interval' && (
            <TextField
              label="Every how many days?"
              type="number"
              min={2}
              max={90}
              value={s.everyDays}
              onChange={(e) => set('everyDays', Number(e.target.value))}
              error={errors['recurrence.everyDays']}
            />
          )}
        </div>

        {s.kind === 'weekly' && (
          <Fieldset legend="Days" className="mt-4" error={errors['recurrence.days']}>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_NAMES.map((name, i) => {
                const day = (i + 1) as Weekday;
                const on = s.days.includes(day);
                return (
                  <label
                    key={name}
                    className={cn(
                      'inline-flex min-h-11 min-w-12 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-medium',
                      'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600',
                      on ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line-strong text-ink-muted',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() => set('days', on ? s.days.filter((d) => d !== day) : [...s.days, day])}
                    />
                    {name}
                  </label>
                );
              })}
            </div>
          </Fieldset>
        )}

        <Fieldset legend="Times" className="mt-4" error={errors.times}>
          <ul className="flex flex-wrap gap-2">
            {s.times.map((t, i) => (
              <li key={i} className="flex items-center gap-1">
                <label className="sr-only" htmlFor={`time-${i}`}>
                  Time {i + 1}
                </label>
                <input
                  id={`time-${i}`}
                  type="time"
                  value={t}
                  required
                  onChange={(e) =>
                    set(
                      'times',
                      s.times.map((x, j) => (j === i ? e.target.value : x)),
                    )
                  }
                  className="min-h-11 rounded-xl border border-line-strong bg-canvas px-3 tabular-nums"
                />
                {s.times.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        'times',
                        s.times.filter((_, j) => j !== i),
                      )
                    }
                    className="inline-flex size-11 items-center justify-center rounded-xl text-ink-muted hover:bg-surface hover:text-danger-700"
                    aria-label={`Remove time ${i + 1}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {s.kind !== 'once' && s.times.length < 8 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              icon={<Plus className="size-4" aria-hidden="true" />}
              onClick={() => set('times', [...s.times, '12:00'])}
            >
              Add a time
            </Button>
          )}
        </Fieldset>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField
            label={s.kind === 'once' ? 'Date' : 'Starts'}
            type="date"
            value={s.startDate}
            onChange={(e) => set('startDate', e.target.value)}
            error={errors.startDate}
          />
          {s.kind !== 'once' && (
            <TextField
              label="Ends"
              optional
              type="date"
              value={s.endDate}
              min={s.startDate}
              onChange={(e) => set('endDate', e.target.value)}
              error={errors.endDate}
            />
          )}
        </div>
      </Fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="Assigned to" value={s.assigneeId} onChange={(e) => set('assigneeId', e.target.value)}>
          <option value="">Anyone</option>
          {assignableMembers.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.displayName}
            </option>
          ))}
        </SelectField>
        <SelectField label="Reminder" value={s.reminder} onChange={(e) => set('reminder', e.target.value)}>
          <option value="none">No reminder</option>
          <option value="0">At the time</option>
          <option value="5">5 minutes before</option>
          <option value="15">15 minutes before</option>
          <option value="30">30 minutes before</option>
          <option value="60">1 hour before</option>
          <option value="1440">1 day before</option>
        </SelectField>
        <SelectField
          label="Follow up after"
          hint="If nothing is recorded by then, it needs review."
          value={s.followUpMinutes}
          onChange={(e) => set('followUpMinutes', Number(e.target.value))}
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={120}>2 hours</option>
          <option value={240}>4 hours</option>
        </SelectField>
      </div>

      <TextArea
        label="Notes"
        optional
        hint="Shared with everyone in the circle."
        value={s.notes}
        onChange={(e) => set('notes', e.target.value)}
        maxLength={1000}
      />

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          {task ? 'Save changes' : 'Add task'}
        </Button>
      </div>
    </form>
  );
}
