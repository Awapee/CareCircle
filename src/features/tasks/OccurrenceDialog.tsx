import { CalendarClock, EyeOff, Link2, MapPin, Pencil, Repeat, Stethoscope, Undo2, UserRound } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useAction } from '@/api/queries';
import { useCircle } from '@/app/session';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextArea, TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { ActionError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { formatDateLabel, formatInstant, formatTimeLabel } from '@/domain/dates';
import { describeRecurrence } from '@/domain/recurrence';
import { OUTCOME_LABELS, OUTCOME_PAST, outcomesFor } from '@/domain/status';
import { CATEGORY_LABELS, type Outcome } from '@/domain/types';
import { CategoryIcon } from './CategoryIcon';
import { StatusBadge, useRecordPermission } from './OccurrenceList';
import type { ScheduleItem } from './schedule';

/**
 * Details of one scheduled item: what it is, what was recorded, and the actions the current
 * person's role allows (record an outcome, undo it, change this one occurrence, edit the series).
 */
export function OccurrenceDialog({
  item,
  onClose,
  onEditSeries,
}: {
  item: ScheduleItem | null;
  onClose: () => void;
  onEditSeries: (taskId: string) => void;
}) {
  return (
    <Dialog
      open={!!item}
      onOpenChange={(open) => !open && onClose()}
      title={item?.title ?? ''}
      description={item ? `${formatDateLabel(item.date)} at ${formatTimeLabel(item.time)}` : undefined}
    >
      {item && <Body key={item.occurrence.id + item.occurrence.version} item={item} onEditSeries={onEditSeries} />}
    </Dialog>
  );
}

function Body({ item, onEditSeries }: { item: ScheduleItem; onEditSeries: (taskId: string) => void }) {
  const { can, memberName, timeZone, myRole } = useCircle();
  const { allowed } = useRecordPermission(item);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const { occurrence: o, task } = item;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <CategoryIcon category={task.category} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{CATEGORY_LABELS[task.category]}</p>
          <p className="text-sm text-ink-muted">{describeRecurrence(task.recurrence)}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      {item.status === 'needs_review' && o.outcome === null && (
        <Notice tone="warning" title="Nothing recorded yet">
          The waiting period has passed without a record. This is a missed confirmation, not proof that anything is
          wrong. Check in, then record what happened.
        </Notice>
      )}

      <dl className="grid gap-3 text-[0.9375rem]">
        <Detail icon={<UserRound className="size-4" />} label="Assigned to">
          {item.assigneeId ? memberName(item.assigneeId) : 'Not assigned'}
        </Detail>
        {o.timeOverride && (
          <Detail icon={<CalendarClock className="size-4" />} label="Rescheduled">
            Moved from {formatTimeLabel(o.localTime)} for this day only
          </Detail>
        )}
        {task.medication && (
          <Detail icon={<Stethoscope className="size-4" />} label="Medication">
            <span className="font-medium text-ink">{task.medication.name}</span>
            {task.medication.instructions && (
              <span className="block text-ink-muted">{task.medication.instructions}</span>
            )}
          </Detail>
        )}
        {task.medicationHidden && (
          <Detail icon={<EyeOff className="size-4" />} label="Medication">
            Hidden for your role. The circle admin can change this.
          </Detail>
        )}
        {task.appointment?.professional && (
          <Detail icon={<Stethoscope className="size-4" />} label="With">
            {task.appointment.professional}
          </Detail>
        )}
        {task.appointment?.location && (
          <Detail icon={<MapPin className="size-4" />} label="Where">
            {task.appointment.location}
          </Detail>
        )}
        {task.appointment?.meetingLink && (
          <Detail icon={<Link2 className="size-4" />} label="Video link">
            <a
              href={task.appointment.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="break-all text-brand-700 underline"
            >
              {task.appointment.meetingLink}
            </a>
          </Detail>
        )}
        {task.notes && (
          <Detail icon={<Repeat className="size-4" />} label="Notes">
            <span className="whitespace-pre-line">{task.notes}</span>
          </Detail>
        )}
      </dl>

      {o.outcome && (
        <div className="rounded-xl bg-surface px-4 py-3">
          <p className="font-medium">
            {memberName(o.outcomeBy)} {OUTCOME_PAST[o.outcome]}
            {o.outcomeAt && (
              <span className="font-normal text-ink-muted"> · {formatInstant(o.outcomeAt, timeZone)}</span>
            )}
          </p>
          {o.note && <p className="mt-1 whitespace-pre-line text-ink-muted">“{o.note}”</p>}
          <p className="mt-1 text-sm text-ink-subtle">This is what was recorded, not independent confirmation.</p>
        </div>
      )}

      {mode === 'view' ? (
        <>
          {allowed ? (
            <RecordForm item={item} />
          ) : (
            <p className="text-sm text-ink-muted">
              {myRole === 'family'
                ? 'Family members can record tasks assigned to them. A caregiver or admin can record this one.'
                : 'Your role can see this task but not record it.'}
            </p>
          )}
          {can('edit_tasks') && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button
                variant="secondary"
                size="sm"
                icon={<Pencil className="size-4" aria-hidden="true" />}
                onClick={() => setMode('edit')}
              >
                Change this occurrence
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Repeat className="size-4" aria-hidden="true" />}
                onClick={() => onEditSeries(task.id)}
              >
                Edit the whole series
              </Button>
            </div>
          )}
        </>
      ) : (
        <EditOccurrenceForm item={item} onDone={() => setMode('view')} />
      )}
    </div>
  );
}

function Detail({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="flex w-28 shrink-0 items-center gap-2 text-ink-muted">
        <span aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}

function RecordForm({ item }: { item: ScheduleItem }) {
  const toast = useToast();
  const [note, setNote] = useState(item.occurrence.note);
  const record = useAction((api, outcome: Outcome | null) =>
    api.recordOutcome(item.occurrence.id, outcome, outcome ? note.trim() : '', item.occurrence.version),
  );
  const run = async (outcome: Outcome | null) => {
    try {
      await record.mutateAsync(outcome);
      toast(outcome ? `“${item.title}” ${OUTCOME_PAST[outcome]}` : 'Record cleared');
    } catch {
      // Shown by <ActionError>.
    }
  };
  const outcomes = outcomesFor(item.task.category);

  return (
    <div className="space-y-3">
      <ActionError error={record.error} />
      {item.occurrence.outcome === null ? (
        <>
          <TextArea
            label="Note"
            optional
            hint="Anything others should know, e.g. “Taken late, after lunch”."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />
          <div className="flex flex-wrap gap-2">
            {outcomes.map((outcome, i) => (
              <Button
                key={outcome}
                variant={i === 0 ? 'primary' : 'secondary'}
                disabled={record.isPending}
                onClick={() => run(outcome)}
              >
                {OUTCOME_LABELS[outcome]}
              </Button>
            ))}
          </div>
        </>
      ) : (
        <Button
          variant="secondary"
          loading={record.isPending}
          icon={<Undo2 className="size-4" aria-hidden="true" />}
          onClick={() => run(null)}
        >
          Clear this record
        </Button>
      )}
    </div>
  );
}

function EditOccurrenceForm({ item, onDone }: { item: ScheduleItem; onDone: () => void }) {
  const { assignableMembers } = useCircle();
  const toast = useToast();
  const o = item.occurrence;
  const [title, setTitle] = useState(o.titleOverride ?? '');
  const [time, setTime] = useState(o.timeOverride ?? o.localTime);
  const [assignee, setAssignee] = useState(o.assigneeOverride ?? '');
  const save = useAction((api) =>
    api.updateOccurrence(
      o.id,
      {
        titleOverride: title.trim() || null,
        timeOverride: time === o.localTime ? null : time,
        assigneeOverride: assignee || null,
      },
      o.version,
    ),
  );

  return (
    <form
      className="space-y-4 border-t border-line pt-4"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await save.mutateAsync(undefined);
          toast('This occurrence was updated');
          onDone();
        } catch {
          // Shown by <ActionError>.
        }
      }}
    >
      <p className="text-sm text-ink-muted">
        Changes apply to {formatDateLabel(item.date)} only. The series stays the same.
      </p>
      <ActionError error={save.error} />
      <TextField
        label="Title for this day"
        optional
        placeholder={item.task.title}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
      />
      <TextField label="Time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
      <SelectField label="Assigned to" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
        <option value="">Same as the series</option>
        {assignableMembers.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.displayName}
          </option>
        ))}
      </SelectField>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={save.isPending}>
          Save this occurrence
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
