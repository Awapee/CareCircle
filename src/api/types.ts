import type {
  ActivityEvent,
  AppNotification,
  CareCircle,
  CareProfile,
  CareUpdate,
  CircleMember,
  Invitation,
  Occurrence,
  Outcome,
  Profile,
  Role,
  Task,
  UserPreferences,
} from '@/domain/types';
import type { CareUpdateInput, CircleInput, InvitationInput, TaskInput } from '@/domain/validation';

/**
 * The one data interface every page uses (docs/ARCHITECTURE.md §1). Two implementations:
 * `SupabaseApi` (real accounts, access enforced by RLS) and `DemoApi` (fictional data in this browser).
 */

export type BackendMode = 'demo' | 'supabase';

export interface Session {
  userId: string;
  email: string | null;
}

export interface CircleSummary {
  circle: CareCircle;
  role: Role;
}

export interface CircleBundle {
  circle: CareCircle;
  careProfile: CareProfile;
  members: CircleMember[];
  followUpContactIds: string[];
  myRole: Role;
}

export interface OccurrenceEdit {
  titleOverride: string | null;
  assigneeOverride: string | null;
  timeOverride: string | null;
}

export interface CircleSettingsInput {
  name: string;
  timeZone: string;
  familyCanSeeMedication: boolean;
  recipientName: string;
  sharedNotes: string;
}

export type InvitationStatus = 'valid' | 'used' | 'expired' | 'revoked';

export interface InvitationPreview {
  circleName: string;
  role: Role;
  status: InvitationStatus;
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  timeZone: string;
}

export interface CareCircleApi {
  readonly mode: BackendMode;

  // Session
  getSession(): Promise<Session | null>;
  onSessionChange(listener: (session: Session | null) => void): () => void;
  signUp(input: SignUpInput): Promise<{ needsEmailConfirmation: boolean }>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;

  // Profile & preferences
  getProfile(): Promise<Profile>;
  updateProfile(input: { displayName: string; timeZone: string }): Promise<void>;
  getPreferences(): Promise<UserPreferences>;
  updatePreferences(input: Omit<UserPreferences, 'userId'>): Promise<void>;

  // Circles
  listMyCircles(): Promise<CircleSummary[]>;
  createCircle(input: CircleInput): Promise<string>;
  getCircle(circleId: string): Promise<CircleBundle>;
  updateCircle(circleId: string, input: CircleSettingsInput, version: number): Promise<void>;

  // Tasks & occurrences
  listTasks(circleId: string): Promise<Task[]>;
  /** Occurrences scheduled in [fromIso, toIso). */
  listOccurrences(circleId: string, fromIso: string, toIso: string): Promise<Occurrence[]>;
  saveTask(circleId: string, taskId: string | null, version: number | null, input: TaskInput): Promise<string>;
  setTaskPaused(taskId: string, paused: boolean, version: number): Promise<void>;
  deleteTask(taskId: string): Promise<void>;
  recordOutcome(occurrenceId: string, outcome: Outcome | null, note: string, version: number): Promise<void>;
  updateOccurrence(occurrenceId: string, edit: OccurrenceEdit, version: number): Promise<void>;

  // Care updates & activity
  listUpdates(circleId: string): Promise<CareUpdate[]>;
  postUpdate(circleId: string, input: CareUpdateInput): Promise<string>;
  acknowledgeUpdate(updateId: string): Promise<void>;
  listActivity(circleId: string, limit: number): Promise<ActivityEvent[]>;

  // Members & invitations
  listInvitations(circleId: string): Promise<Invitation[]>;
  /** Returns the secret token. It is shown once; only its hash is stored. */
  createInvitation(circleId: string, input: InvitationInput): Promise<string>;
  revokeInvitation(invitationId: string): Promise<void>;
  previewInvitation(token: string): Promise<InvitationPreview | null>;
  acceptInvitation(token: string): Promise<string>;
  changeMemberRole(circleId: string, userId: string, role: Role): Promise<void>;
  removeMember(circleId: string, userId: string): Promise<void>;
  setFollowUpContacts(circleId: string, userIds: string[]): Promise<void>;

  // Notifications
  listNotifications(): Promise<AppNotification[]>;
  markNotificationsRead(ids: string[] | null): Promise<void>;
}

export type ApiErrorCode = 'invalid' | 'unauthenticated' | 'forbidden' | 'not_found' | 'conflict' | 'network';

/** An error with a message that is safe and helpful to show to the user. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Check your connection and try again.';
}
