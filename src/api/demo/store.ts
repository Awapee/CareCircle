import type {
  ActivityType,
  AppointmentDetails,
  AppNotification,
  CareCircle,
  CareProfile,
  Invitation,
  MedicationDetails,
  Occurrence,
  Role,
  Task,
  UpdateVisibility,
  UserPreferences,
} from '@/domain/types';

/**
 * The demo backend's "database": plain arrays mirroring the SQL tables, saved to localStorage.
 * Nothing here ever leaves the browser.
 */

export interface DemoUser {
  id: string;
  email: string;
  displayName: string;
  timeZone: string;
  /** Shown in the persona picker. */
  blurb: string;
}

export type TaskRow = Omit<Task, 'medication' | 'medicationHidden' | 'appointment'>;
export type OccurrenceRow = Occurrence & { followUpLoggedAt: string | null };

export interface DemoDb {
  schema: 2;
  users: DemoUser[];
  sessionUserId: string | null;
  circles: CareCircle[];
  members: { circleId: string; userId: string; role: Role; joinedAt: string }[];
  careProfiles: (CareProfile & { version: number })[];
  tasks: TaskRow[];
  medication: Record<string, MedicationDetails>;
  appointments: Record<string, AppointmentDetails>;
  occurrences: OccurrenceRow[];
  updates: {
    id: string;
    circleId: string;
    authorId: string | null;
    body: string;
    visibility: UpdateVisibility;
    occurrenceId: string | null;
    createdAt: string;
  }[];
  acks: { updateId: string; userId: string; circleId: string; createdAt: string }[];
  activity: {
    id: string;
    circleId: string;
    actorId: string | null;
    type: ActivityType;
    summary: string;
    subjectId: string | null;
    createdAt: string;
  }[];
  notifications: AppNotification[];
  deliveries: { notificationId: string; channel: 'email' | 'push'; status: 'not_configured' }[];
  invitations: (Invitation & { tokenHash: string })[];
  followUps: { circleId: string; userId: string }[];
  prefs: UserPreferences[];
}

const STORAGE_KEY = 'carecircle-demo';

export function loadDb(): DemoDb | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const db = JSON.parse(raw) as DemoDb;
    return db.schema === 2 ? db : null;
  } catch {
    return null;
  }
}

export function saveDb(db: DemoDb): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage can be full or blocked (private browsing). The demo keeps working for this visit.
  }
}

export function clearDb(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

export function newId(): string {
  return crypto.randomUUID();
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
