/**
 * Shared domain types. These mirror the database schema in `supabase/migrations` and are used by
 * both backends (Supabase and demo) and by every page.
 */

export type Role = 'admin' | 'care_recipient' | 'caregiver' | 'family' | 'read_only';

export const ROLES: Role[] = ['admin', 'care_recipient', 'caregiver', 'family', 'read_only'];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  care_recipient: 'Care recipient',
  caregiver: 'Caregiver',
  family: 'Family',
  read_only: 'Read-only',
};

export type Category = 'medication' | 'meal' | 'hydration' | 'routine' | 'appointment' | 'other';

export const CATEGORIES: Category[] = ['medication', 'meal', 'hydration', 'routine', 'appointment', 'other'];

export const CATEGORY_LABELS: Record<Category, string> = {
  medication: 'Medication',
  meal: 'Meal',
  hydration: 'Hydration',
  routine: 'Routine',
  appointment: 'Appointment',
  other: 'Other',
};

/** What someone recorded for an occurrence. `null` means nothing has been recorded yet. */
export type Outcome = 'completed' | 'taken' | 'not_taken' | 'skipped' | 'cancelled';

/** What the user sees. Always derived, never stored. See `deriveStatus()`. */
export type DisplayStatus = 'upcoming' | 'pending' | 'needs_review' | 'completed' | 'skipped' | 'cancelled';

export const STATUS_LABELS: Record<DisplayStatus, string> = {
  upcoming: 'Upcoming',
  pending: 'Pending',
  needs_review: 'Needs review',
  completed: 'Completed',
  skipped: 'Skipped',
  cancelled: 'Cancelled',
};

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Recurrence =
  { kind: 'once' } | { kind: 'daily' } | { kind: 'weekly'; days: Weekday[] } | { kind: 'interval'; everyDays: number };

export interface Profile {
  id: string;
  displayName: string;
  timeZone: string;
}

export interface CareCircle {
  id: string;
  name: string;
  timeZone: string;
  /** Whether members with the Family role can see medication names and instructions. */
  familyCanSeeMedication: boolean;
  createdAt: string;
  version: number;
}

export interface CircleMember {
  circleId: string;
  userId: string;
  displayName: string;
  role: Role;
  joinedAt: string;
}

export interface CareProfile {
  circleId: string;
  preferredName: string;
  sharedNotes: string;
}

export interface MedicationDetails {
  name: string;
  instructions: string;
}

export interface AppointmentDetails {
  location: string;
  meetingLink: string;
  professional: string;
}

export interface Task {
  id: string;
  circleId: string;
  title: string;
  category: Category;
  notes: string;
  recurrence: Recurrence;
  /** Local wall-clock times in the circle's time zone, "HH:mm". */
  times: string[];
  /** Local dates, "yyyy-MM-dd". */
  startDate: string;
  endDate: string | null;
  assigneeId: string | null;
  /** Minutes to wait after the scheduled time before an unconfirmed occurrence needs review. */
  followUpMinutes: number;
  /** Minutes before the scheduled time to send a reminder; `null` for no reminder. */
  reminderMinutesBefore: number | null;
  pausedAt: string | null;
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** Present for medication tasks the current user may see; `null` when hidden by permissions. */
  medication: MedicationDetails | null;
  /** True when this is a medication task whose details are hidden from the current user. */
  medicationHidden: boolean;
  appointment: AppointmentDetails | null;
}

export interface Occurrence {
  id: string;
  taskId: string;
  circleId: string;
  occurrenceDate: string;
  localTime: string;
  /** UTC instant, ISO string. */
  scheduledAt: string;
  outcome: Outcome | null;
  outcomeBy: string | null;
  outcomeAt: string | null;
  note: string;
  /** Per-occurrence overrides ("edit this occurrence"). */
  titleOverride: string | null;
  assigneeOverride: string | null;
  /** Local "HH:mm" when this one occurrence was moved to a different time. */
  timeOverride: string | null;
  version: number;
}

export type UpdateVisibility = 'circle' | 'private';

export interface CareUpdate {
  id: string;
  circleId: string;
  authorId: string | null;
  authorName: string;
  body: string;
  visibility: UpdateVisibility;
  occurrenceId: string | null;
  createdAt: string;
  acknowledgedBy: { userId: string; displayName: string; at: string }[];
}

export type ActivityType =
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_paused'
  | 'task_resumed'
  | 'occurrence_updated'
  | 'outcome_recorded'
  | 'outcome_cleared'
  | 'update_posted'
  | 'update_acknowledged'
  | 'member_joined'
  | 'member_role_changed'
  | 'member_removed'
  | 'invitation_created'
  | 'invitation_revoked'
  | 'circle_updated'
  | 'follow_up_due';

export interface ActivityEvent {
  id: string;
  circleId: string;
  actorId: string | null;
  actorName: string;
  type: ActivityType;
  /** Short, non-sensitive summary (never medication names). */
  summary: string;
  subjectId: string | null;
  createdAt: string;
}

export type NotificationKind = 'reminder' | 'follow_up' | 'update' | 'circle';

export interface AppNotification {
  id: string;
  circleId: string;
  recipientId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  occurrenceId: string | null;
  dedupeKey: string;
  readAt: string | null;
  createdAt: string;
}

export interface Invitation {
  id: string;
  circleId: string;
  role: Role;
  /** Optional label to help admins recognise the invitation, e.g. "Bina's phone". */
  label: string;
  createdBy: string | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedBy: string | null;
  revokedAt: string | null;
}

export interface UserPreferences {
  userId: string;
  /** Local "HH:mm" in the user's time zone, or null for no quiet hours. */
  quietStart: string | null;
  quietEnd: string | null;
  inApp: boolean;
  email: boolean;
  push: boolean;
}
