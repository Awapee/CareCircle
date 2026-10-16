import { Check, ChevronRight, Clock3, EyeOff } from 'lucide-react';
import { useAction } from '@/api/queries';
import { errorMessage } from '@/api/types';
import { useCircle } from '@/app/session';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { formatDateLabel, formatTimeLabel } from '@/domain/dates';
import { OUTCOME_LABELS, STATUS_TONES } from '@/domain/status';
import { CATEGORY_LABELS, STATUS_LABELS, type Outcome } from '@/domain/types';
import { cn } from '@/lib/cn';
import { CategoryIcon } from './CategoryIcon';
import type { ScheduleItem } from './schedule';

/** Whether the current user may record this item, and its one-tap "done" outcome. */
export function useRecordPermission(item: ScheduleItem) {
  const { can, userId } = useCircle();
  const allowed = can('record_outcome', { assignedToMe: item.assigneeId === userId });
  const quick: Outcome = item.task.category === 'medication' ? 'taken' : 'completed';
  return { allowed, quick };
}

export function StatusBadge({ status }: { status: ScheduleItem['status'] }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}

/** A list of scheduled items in time order. Each opens its details; open items can be marked done in one tap. */
export function OccurrenceList({
  items,
  onOpen,
  showDate = false,
  emptyText = 'Nothing scheduled.',
}: {
  items: ScheduleItem[];
  onOpen: (occurrenceId: string) => void;
  showDate?: boolean;
  emptyText?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-ink-muted">
        {emptyText}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-canvas shadow-card">
      {items.map((item) => (
        <OccurrenceRow key={item.occurrence.id} item={item} onOpen={onOpen} showDate={showDate} />
      ))}
    </ul>
  );
}

function OccurrenceRow({
  item,
  onOpen,
  showDate,
}: {
  item: ScheduleItem;
  onOpen: (id: string) => void;
  showDate: boolean;
}) {
  const { memberName } = useCircle();
  const { allowed, quick } = useRecordPermission(item);
  const toast = useToast();
  const record = useAction((api, args: { id: string; version: number; outcome: Outcome }) =>
    api.recordOutcome(args.id, args.outcome, '', args.version),
  );
  const open = item.occurrence.outcome === null && item.status !== 'upcoming';
  const canQuick = allowed && item.occurrence.outcome === null;
  const rescheduled = item.occurrence.timeOverride !== null;

  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-5',
        item.status === 'needs_review' && 'bg-warning-50/50',
      )}
    >
      <div className="w-[4.75rem] shrink-0 whitespace-nowrap text-sm tabular-nums">
        <p className={cn('font-semibold', item.status === 'cancelled' ? 'text-ink-subtle line-through' : 'text-ink')}>
          {formatTimeLabel(item.time)}
        </p>
        {showDate && <p className="text-ink-subtle">{formatDateLabel(item.date, { month: undefined })}</p>}
      </div>
      <CategoryIcon category={item.task.category} className="hidden sm:flex" />
      <button
        type="button"
        onClick={() => onOpen(item.occurrence.id)}
        className="group min-w-0 flex-1 rounded-lg text-left"
      >
        <span className="flex items-center gap-1 font-medium text-ink group-hover:underline">
          <span className="min-w-0 break-words">{item.title}</span>
          <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-ink-muted">
          <span>{CATEGORY_LABELS[item.task.category]}</span>
          <span aria-hidden="true">·</span>
          <span>{item.assigneeId ? memberName(item.assigneeId) : 'Unassigned'}</span>
          {rescheduled && (
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden="true" />
              Moved from {formatTimeLabel(item.occurrence.localTime)}
            </span>
          )}
          {item.task.medicationHidden && (
            <span className="inline-flex items-center gap-1">
              <EyeOff className="size-3.5" aria-hidden="true" />
              Details hidden
            </span>
          )}
        </span>
      </button>
      {/* On phones the status and action sit on their own line under the title, so titles aren't cut off. */}
      <div className="flex w-full items-center justify-between gap-3 pl-[5.5rem] sm:w-auto sm:shrink-0 sm:justify-end sm:pl-0">
        <StatusBadge status={item.status} />
        {canQuick && (open || item.status === 'upcoming') && (
          <Button
            size="sm"
            variant={open ? 'primary' : 'secondary'}
            loading={record.isPending}
            aria-label={`${OUTCOME_LABELS[quick]}: ${item.title} at ${formatTimeLabel(item.time)}`}
            icon={<Check className="size-4" aria-hidden="true" />}
            onClick={async () => {
              try {
                await record.mutateAsync({ id: item.occurrence.id, version: item.occurrence.version, outcome: quick });
                toast(quick === 'taken' ? `“${item.title}” marked as taken` : `“${item.title}” marked as done`);
              } catch (e) {
                toast(errorMessage(e), 'error');
              }
            }}
          >
            {quick === 'taken' ? 'Taken' : 'Done'}
          </Button>
        )}
      </div>
    </li>
  );
}
