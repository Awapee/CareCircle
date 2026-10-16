import { addDays, zonedTimeToUtc } from '@/domain/dates';
import { can, type Action } from '@/domain/permissions';
import { OCCURRENCE_WINDOW_DAYS } from '@/domain/recurrence';
import { OUTCOME_PAST } from '@/domain/status';
import type {
  ActivityEvent,
  AppNotification,
  CareUpdate,
  Invitation,
  Occurrence,
  Outcome,
  Profile,
  Role,
  Task,
  UserPreferences,
} from '@/domain/types';
import {
  careUpdateInputSchema,
  circleInputSchema,
  invitationInputSchema,
  profileInputSchema,
  taskInputSchema,
  type CareUpdateInput,
  type CircleInput,
  type InvitationInput,
  type TaskInput,
} from '@/domain/validation';
import {
  ApiError,
  type CareCircleApi,
  type CircleBundle,
  type CircleSettingsInput,
  type CircleSummary,
  type InvitationPreview,
  type OccurrenceEdit,
  type Session,
  type SignUpInput,
} from '../types';
import {
  circleTimeZone,
  circleToday,
  displayName,
  dropFutureUnrecorded,
  generateOccurrences,
  log,
  notify,
  runScheduler,
} from './engine';
import { buildSeed, DEMO_PEOPLE } from './seed';
import { clearDb, loadDb, newId, randomToken, saveDb, sha256Hex, type DemoDb, type TaskRow } from './store';

export interface DemoPersona {
  userId: string;
  displayName: string;
  role: Role | null;
  blurb: string;
}

/** Extra controls only the demo has: choose who you are, reset, or start an empty account. */
export interface DemoControls {
  personas(): DemoPersona[];
  switchPersona(userId: string): Promise<void>;
  startFresh(displayName: string, timeZone: string): Promise<void>;
  reset(): Promise<void>;
  /** Runs the simulated scheduler (normally every minute while the tab is open). */
  tick(): void;
}

const fail = (code: ApiError['code'], message: string): never => {
  throw new ApiError(code, message);
};

function validate<T>(
  schema: { safeParse(v: unknown): { success: boolean; data?: T; error?: unknown } },
  v: unknown,
): T {
  const r = schema.safeParse(v);
  if (!r.success) {
    const issues = (r.error as { issues?: { message: string }[] }).issues;
    fail('invalid', issues?.[0]?.message ?? 'Check the form and try again.');
  }
  return r.data as T;
}

/**
 * In-browser backend with fictional data. It applies the same rules as the database functions,
 * so the demo behaves like the real app, including what each role may see and do.
 */
export class DemoApi implements CareCircleApi, DemoControls {
  readonly mode = 'demo' as const;
  private db: DemoDb;
  private listeners = new Set<(s: Session | null) => void>();
  private readonly clock: () => Date;

  constructor(options: { clock?: () => Date; db?: DemoDb } = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.db = options.db ?? loadDb() ?? buildSeed(this.clock());
    this.tick();
  }

  // ---------------------------------------------------------------------------
  // Internals

  private now() {
    return this.clock();
  }

  private commit() {
    saveDb(this.db);
  }

  private me(): string {
    return this.db.sessionUserId ?? fail('unauthenticated', 'You need to sign in first.');
  }

  private roleIn(circleId: string): Role {
    const m = this.db.members.find((x) => x.circleId === circleId && x.userId === this.me());
    return m?.role ?? fail('forbidden', 'You are not a member of this care circle.');
  }

  private require(circleId: string, action: Action, ctx: Parameters<typeof can>[2] = {}): Role {
    const role = this.roleIn(circleId);
    if (!can(role, action, ctx)) fail('forbidden', 'Your role doesn’t allow this action.');
    return role;
  }

  private circle(circleId: string) {
    return this.db.circles.find((c) => c.id === circleId) ?? fail('not_found', 'That circle no longer exists.');
  }

  private task(taskId: string): TaskRow {
    return this.db.tasks.find((t) => t.id === taskId) ?? fail('not_found', 'That task no longer exists.');
  }

  private occurrence(id: string) {
    return this.db.occurrences.find((o) => o.id === id) ?? fail('not_found', 'That task no longer exists.');
  }

  private checkVersion(current: number, expected: number | null) {
    if (expected === null || current !== expected) {
      fail('conflict', 'Someone else changed this while you were editing. Review the latest version and try again.');
    }
  }

  private checkAssignee(circleId: string, userId: string | null) {
    if (!userId) return;
    const m = this.db.members.find((x) => x.circleId === circleId && x.userId === userId);
    if (!m || m.role === 'read_only') fail('invalid', 'Choose someone in the circle who can record tasks.');
  }

  private log(circleId: string, type: ActivityEvent['type'], summary: string, subjectId: string | null) {
    log(this.db, circleId, this.db.sessionUserId, type, summary, subjectId, this.now());
  }

  private emit() {
    const s = this.sessionSync();
    for (const l of this.listeners) l(s);
  }

  private sessionSync(): Session | null {
    const u = this.db.users.find((x) => x.id === this.db.sessionUserId);
    return u ? { userId: u.id, email: u.email } : null;
  }

  private toTask(row: TaskRow, role: Role, familyCanSeeMedication: boolean): Task {
    const canSee = row.category !== 'medication' || can(role, 'view_medication', { familyCanSeeMedication });
    return {
      ...row,
      medication: row.category === 'medication' && canSee ? (this.db.medication[row.id] ?? null) : null,
      medicationHidden: row.category === 'medication' && !canSee,
      appointment: row.category === 'appointment' ? (this.db.appointments[row.id] ?? null) : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Demo controls

  personas(): DemoPersona[] {
    return this.db.users.map((u) => {
      const seeded = DEMO_PEOPLE.find((p) => p.id === u.id);
      return {
        userId: u.id,
        displayName: u.displayName,
        role: this.db.members.find((m) => m.userId === u.id)?.role ?? null,
        blurb: seeded?.blurb ?? u.blurb,
      };
    });
  }

  async switchPersona(userId: string) {
    if (!this.db.users.some((u) => u.id === userId)) fail('not_found', 'That person isn’t in the demo.');
    this.db.sessionUserId = userId;
    this.commit();
    this.emit();
  }

  async startFresh(name: string, timeZone: string) {
    const input = validate(profileInputSchema, { displayName: name, timeZone });
    const id = newId();
    this.db.users.push({
      id,
      email: `${id.slice(0, 8)}@demo.carecircle`,
      displayName: input.displayName,
      timeZone: input.timeZone,
      blurb: 'A new demo account you created.',
    });
    this.db.prefs.push({ userId: id, quietStart: null, quietEnd: null, inApp: true, email: false, push: false });
    this.db.sessionUserId = id;
    this.commit();
    this.emit();
  }

  async reset() {
    clearDb();
    this.db = buildSeed(this.now());
    this.commit();
    this.emit();
  }

  tick() {
    runScheduler(this.db, this.now());
    this.commit();
  }

  // ---------------------------------------------------------------------------
  // Session

  async getSession() {
    return this.sessionSync();
  }

  onSessionChange(listener: (s: Session | null) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async signUp(input: SignUpInput) {
    await this.startFresh(input.displayName, input.timeZone);
    return { needsEmailConfirmation: false };
  }

  async signIn(email: string) {
    const u = this.db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) fail('invalid', 'In the demo, choose a person to continue as instead of signing in.');
    await this.switchPersona(u!.id);
  }

  async signOut() {
    this.db.sessionUserId = null;
    this.commit();
    this.emit();
  }

  async changePassword() {
    fail('invalid', 'Demo accounts don’t have passwords.');
  }

  /** Same rules as `delete_my_account()`. */
  async deleteAccount() {
    const me = this.me();
    const mine = this.db.members.filter((m) => m.userId === me);
    for (const m of mine) {
      const others = this.db.members.some((o) => o.circleId === m.circleId && o.userId !== me);
      if (m.role === 'admin' && this.adminCount(m.circleId) === 1 && others) {
        fail(
          'invalid',
          'You’re the only admin of a circle with other members. Make someone else an admin first, or delete the circle.',
        );
      }
    }
    for (const m of mine) {
      if (!this.db.members.some((o) => o.circleId === m.circleId && o.userId !== me)) this.removeCircleData(m.circleId);
    }
    const name = displayName(this.db, me).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${name}\\b`, 'g');
    const myCircles = new Set(mine.map((m) => m.circleId));
    for (const a of this.db.activity) {
      if (myCircles.has(a.circleId)) a.summary = a.summary.replace(pattern, 'A former member');
      if (a.actorId === me) a.actorId = null;
    }
    this.db.updates = this.db.updates
      .filter((u) => !(u.authorId === me && u.visibility === 'private'))
      .map((u) => (u.authorId === me ? { ...u, authorId: null } : u));
    this.db.acks = this.db.acks.filter((a) => a.userId !== me);
    for (const t of this.db.tasks) {
      if (t.assigneeId === me) t.assigneeId = null;
      if (t.createdBy === me) t.createdBy = null;
    }
    for (const o of this.db.occurrences) {
      if (o.assigneeOverride === me) o.assigneeOverride = null;
      if (o.outcomeBy === me) o.outcomeBy = null;
    }
    this.db.members = this.db.members.filter((m) => m.userId !== me);
    this.db.followUps = this.db.followUps.filter((f) => f.userId !== me);
    this.db.notifications = this.db.notifications.filter((n) => n.recipientId !== me);
    this.db.prefs = this.db.prefs.filter((p) => p.userId !== me);
    this.db.users = this.db.users.filter((u) => u.id !== me);
    this.db.sessionUserId = null;
    this.commit();
    this.emit();
  }

  // ---------------------------------------------------------------------------
  // Profile & preferences

  async getProfile(): Promise<Profile> {
    const u = this.db.users.find((x) => x.id === this.me())!;
    return { id: u.id, displayName: u.displayName, timeZone: u.timeZone };
  }

  async updateProfile(input: { displayName: string; timeZone: string }) {
    const v = validate(profileInputSchema, input);
    const u = this.db.users.find((x) => x.id === this.me())!;
    u.displayName = v.displayName;
    u.timeZone = v.timeZone;
    this.commit();
  }

  async getPreferences(): Promise<UserPreferences> {
    const me = this.me();
    return (
      this.db.prefs.find((p) => p.userId === me) ?? {
        userId: me,
        quietStart: null,
        quietEnd: null,
        inApp: true,
        email: false,
        push: false,
      }
    );
  }

  async updatePreferences(input: Omit<UserPreferences, 'userId'>) {
    const me = this.me();
    this.db.prefs = this.db.prefs.filter((p) => p.userId !== me);
    this.db.prefs.push({ ...input, userId: me });
    this.commit();
  }

  // ---------------------------------------------------------------------------
  // Circles

  async listMyCircles(): Promise<CircleSummary[]> {
    const me = this.me();
    return this.db.members
      .filter((m) => m.userId === me)
      .map((m) => ({ circle: this.circle(m.circleId), role: m.role }));
  }

  async createCircle(input: CircleInput) {
    const v = validate(circleInputSchema, input);
    const me = this.me();
    const id = newId();
    this.db.circles.push({
      id,
      name: v.name,
      timeZone: v.timeZone,
      familyCanSeeMedication: false,
      createdAt: this.now().toISOString(),
      version: 1,
    });
    this.db.members.push({ circleId: id, userId: me, role: 'admin', joinedAt: this.now().toISOString() });
    this.db.careProfiles.push({ circleId: id, preferredName: v.recipientName, sharedNotes: '', version: 1 });
    this.db.followUps.push({ circleId: id, userId: me });
    this.log(id, 'circle_updated', `${displayName(this.db, me)} created the circle`, id);
    this.commit();
    return id;
  }

  async getCircle(circleId: string): Promise<CircleBundle> {
    const myRole = this.roleIn(circleId);
    const circle = this.circle(circleId);
    return {
      circle,
      careProfile: this.db.careProfiles.find((p) => p.circleId === circleId)!,
      members: this.db.members
        .filter((m) => m.circleId === circleId)
        .map((m) => ({ ...m, displayName: displayName(this.db, m.userId) })),
      followUpContactIds: this.db.followUps.filter((f) => f.circleId === circleId).map((f) => f.userId),
      myRole,
    };
  }

  async updateCircle(circleId: string, input: CircleSettingsInput, version: number) {
    this.require(circleId, 'edit_circle');
    const c = this.circle(circleId);
    this.checkVersion(c.version, version);
    validate(circleInputSchema, {
      name: input.name,
      timeZone: input.timeZone,
      recipientName: input.recipientName,
      myRole: 'admin',
    });
    if (input.sharedNotes.length > 1000) fail('invalid', 'Shared notes can be up to 1,000 characters.');
    Object.assign(c, {
      name: input.name.trim(),
      timeZone: input.timeZone,
      familyCanSeeMedication: input.familyCanSeeMedication,
      version: c.version + 1,
    });
    const p = this.db.careProfiles.find((x) => x.circleId === circleId)!;
    Object.assign(p, {
      preferredName: input.recipientName.trim(),
      sharedNotes: input.sharedNotes,
      version: p.version + 1,
    });
    this.log(circleId, 'circle_updated', `${displayName(this.db, this.me())} updated the circle settings`, circleId);
    this.commit();
  }

  async deleteCircle(circleId: string, confirmName: string) {
    this.require(circleId, 'edit_circle');
    if (confirmName.trim() !== this.circle(circleId).name)
      fail('invalid', 'Type the circle’s name exactly to confirm.');
    this.removeCircleData(circleId);
    this.commit();
  }

  private removeCircleData(circleId: string) {
    const taskIds = new Set(this.db.tasks.filter((t) => t.circleId === circleId).map((t) => t.id));
    const updateIds = new Set(this.db.updates.filter((u) => u.circleId === circleId).map((u) => u.id));
    const notificationIds = new Set(this.db.notifications.filter((n) => n.circleId === circleId).map((n) => n.id));
    this.db.circles = this.db.circles.filter((c) => c.id !== circleId);
    this.db.members = this.db.members.filter((m) => m.circleId !== circleId);
    this.db.careProfiles = this.db.careProfiles.filter((p) => p.circleId !== circleId);
    this.db.tasks = this.db.tasks.filter((t) => t.circleId !== circleId);
    for (const id of taskIds) {
      delete this.db.medication[id];
      delete this.db.appointments[id];
    }
    this.db.occurrences = this.db.occurrences.filter((o) => o.circleId !== circleId);
    this.db.updates = this.db.updates.filter((u) => u.circleId !== circleId);
    this.db.acks = this.db.acks.filter((a) => !updateIds.has(a.updateId));
    this.db.activity = this.db.activity.filter((a) => a.circleId !== circleId);
    this.db.notifications = this.db.notifications.filter((n) => n.circleId !== circleId);
    this.db.deliveries = this.db.deliveries.filter((d) => !notificationIds.has(d.notificationId));
    this.db.invitations = this.db.invitations.filter((i) => i.circleId !== circleId);
    this.db.followUps = this.db.followUps.filter((f) => f.circleId !== circleId);
  }

  // ---------------------------------------------------------------------------
  // Tasks

  async listTasks(circleId: string): Promise<Task[]> {
    const role = this.roleIn(circleId);
    const fam = this.circle(circleId).familyCanSeeMedication;
    return this.db.tasks.filter((t) => t.circleId === circleId).map((t) => this.toTask(t, role, fam));
  }

  async listOccurrences(circleId: string, fromIso: string, toIso: string): Promise<Occurrence[]> {
    this.roleIn(circleId);
    return this.db.occurrences
      .filter((o) => o.circleId === circleId && o.scheduledAt >= fromIso && o.scheduledAt < toIso)
      .map(({ followUpLoggedAt: _f, ...o }) => o)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }

  async saveTask(circleId: string, taskId: string | null, version: number | null, input: TaskInput) {
    this.require(circleId, 'edit_tasks');
    const v = validate(taskInputSchema, input);
    this.checkAssignee(circleId, v.assigneeId);
    const now = this.now();
    const me = this.me();
    let row: TaskRow;
    if (taskId === null) {
      row = {
        id: newId(),
        circleId,
        title: v.title,
        category: v.category,
        notes: v.notes,
        recurrence: v.recurrence,
        times: [...v.times].sort(),
        startDate: v.startDate,
        endDate: v.endDate,
        assigneeId: v.assigneeId,
        followUpMinutes: v.followUpMinutes,
        reminderMinutesBefore: v.reminderMinutesBefore,
        pausedAt: null,
        version: 1,
        createdBy: me,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      this.db.tasks.push(row);
      this.log(circleId, 'task_created', `${displayName(this.db, me)} added “${v.title}”`, row.id);
    } else {
      row = this.task(taskId);
      if (row.circleId !== circleId) fail('not_found', 'That task no longer exists.');
      this.checkVersion(row.version, version);
      if (row.category !== v.category)
        fail('invalid', 'A task’s category can’t be changed. Create a new task instead.');
      Object.assign(row, {
        title: v.title,
        notes: v.notes,
        recurrence: v.recurrence,
        times: [...v.times].sort(),
        startDate: v.startDate,
        endDate: v.endDate,
        assigneeId: v.assigneeId,
        followUpMinutes: v.followUpMinutes,
        reminderMinutesBefore: v.reminderMinutesBefore,
        version: row.version + 1,
        updatedAt: now.toISOString(),
      });
      dropFutureUnrecorded(this.db, row.id, now);
      this.log(circleId, 'task_updated', `${displayName(this.db, me)} updated “${v.title}”`, row.id);
    }
    if (v.medication) this.db.medication[row.id] = v.medication;
    if (v.appointment) this.db.appointments[row.id] = v.appointment;
    const today = circleToday(this.db, circleId, now);
    generateOccurrences(this.db, row, today, addDays(today, OCCURRENCE_WINDOW_DAYS), now);
    this.commit();
    return row.id;
  }

  async setTaskPaused(taskId: string, paused: boolean, version: number) {
    const row = this.task(taskId);
    this.require(row.circleId, 'edit_tasks');
    this.checkVersion(row.version, version);
    const now = this.now();
    row.pausedAt = paused ? now.toISOString() : null;
    row.version += 1;
    row.updatedAt = now.toISOString();
    const who = displayName(this.db, this.me());
    if (paused) {
      dropFutureUnrecorded(this.db, taskId, now);
      this.log(row.circleId, 'task_paused', `${who} paused “${row.title}”`, taskId);
    } else {
      const today = circleToday(this.db, row.circleId, now);
      generateOccurrences(this.db, row, today, addDays(today, OCCURRENCE_WINDOW_DAYS), now);
      this.log(row.circleId, 'task_resumed', `${who} resumed “${row.title}”`, taskId);
    }
    this.commit();
  }

  async deleteTask(taskId: string) {
    const row = this.task(taskId);
    this.require(row.circleId, 'delete_tasks');
    const occIds = new Set(this.db.occurrences.filter((o) => o.taskId === taskId).map((o) => o.id));
    this.db.tasks = this.db.tasks.filter((t) => t.id !== taskId);
    this.db.occurrences = this.db.occurrences.filter((o) => o.taskId !== taskId);
    for (const n of this.db.notifications) if (n.occurrenceId && occIds.has(n.occurrenceId)) n.occurrenceId = null;
    for (const u of this.db.updates) if (u.occurrenceId && occIds.has(u.occurrenceId)) u.occurrenceId = null;
    delete this.db.medication[taskId];
    delete this.db.appointments[taskId];
    this.log(row.circleId, 'task_deleted', `${displayName(this.db, this.me())} deleted “${row.title}”`, null);
    this.commit();
  }

  async recordOutcome(occurrenceId: string, outcome: Outcome | null, note: string, version: number) {
    const o = this.occurrence(occurrenceId);
    const t = this.task(o.taskId);
    const me = this.me();
    this.require(o.circleId, 'record_outcome', { assignedToMe: (o.assigneeOverride ?? t.assigneeId) === me });
    this.checkVersion(o.version, version);
    const allowed: Outcome[] =
      t.category === 'medication'
        ? ['taken', 'not_taken', 'skipped', 'cancelled']
        : ['completed', 'skipped', 'cancelled'];
    if (outcome !== null && !allowed.includes(outcome)) fail('invalid', 'That outcome doesn’t apply to this task.');
    if (note.length > 500) fail('invalid', 'Notes can be up to 500 characters.');
    const now = this.now();
    Object.assign(o, {
      outcome,
      outcomeBy: outcome ? me : null,
      outcomeAt: outcome ? now.toISOString() : null,
      note,
      version: o.version + 1,
    });
    const label = o.titleOverride ?? t.title;
    const who = displayName(this.db, me);
    if (outcome === null) this.log(o.circleId, 'outcome_cleared', `${who} cleared the record for “${label}”`, o.id);
    else {
      const past = OUTCOME_PAST[outcome];
      const text = past.startsWith('marked') ? `${past.replace('marked', `marked “${label}”`)}` : `${past} “${label}”`;
      this.log(o.circleId, 'outcome_recorded', `${who} ${text}`, o.id);
    }
    runScheduler(this.db, now);
    this.commit();
  }

  async updateOccurrence(occurrenceId: string, edit: OccurrenceEdit, version: number) {
    const o = this.occurrence(occurrenceId);
    this.require(o.circleId, 'edit_tasks');
    this.checkVersion(o.version, version);
    this.checkAssignee(o.circleId, edit.assigneeOverride);
    const title = edit.titleOverride?.trim() || null;
    if (title && title.length > 120) fail('invalid', 'Titles can be up to 120 characters.');
    const time = edit.timeOverride || null;
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) fail('invalid', 'Use a time like 08:30.');
    Object.assign(o, {
      titleOverride: title,
      assigneeOverride: edit.assigneeOverride,
      timeOverride: time,
      scheduledAt: zonedTimeToUtc(
        o.occurrenceDate,
        time ?? o.localTime,
        circleTimeZone(this.db, o.circleId),
      ).toISOString(),
      version: o.version + 1,
    });
    const t = this.task(o.taskId);
    this.log(
      o.circleId,
      'occurrence_updated',
      `${displayName(this.db, this.me())} changed one occurrence of “${t.title}”`,
      o.id,
    );
    this.commit();
  }

  // ---------------------------------------------------------------------------
  // Updates & activity

  async listUpdates(circleId: string): Promise<CareUpdate[]> {
    this.roleIn(circleId);
    const me = this.me();
    return this.db.updates
      .filter((u) => u.circleId === circleId && (u.visibility === 'circle' || u.authorId === me))
      .map((u) => ({
        ...u,
        authorName: u.authorId ? displayName(this.db, u.authorId) : 'Former member',
        acknowledgedBy: this.db.acks
          .filter((a) => a.updateId === u.id)
          .map((a) => ({ userId: a.userId, displayName: displayName(this.db, a.userId), at: a.createdAt })),
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async postUpdate(circleId: string, input: CareUpdateInput) {
    this.require(circleId, 'post_updates');
    const v = validate(careUpdateInputSchema, input);
    if (v.occurrenceId && !this.db.occurrences.some((o) => o.id === v.occurrenceId && o.circleId === circleId)) {
      fail('invalid', 'That task isn’t in this circle.');
    }
    const me = this.me();
    const now = this.now();
    const id = newId();
    this.db.updates.push({ id, circleId, authorId: me, ...v, createdAt: now.toISOString() });
    if (v.visibility === 'circle') {
      const who = displayName(this.db, me);
      this.log(circleId, 'update_posted', `${who} posted an update`, id);
      for (const m of this.db.members.filter((x) => x.circleId === circleId && x.userId !== me)) {
        notify(
          this.db,
          {
            circleId,
            recipientId: m.userId,
            kind: 'update',
            title: `${who} posted an update`,
            body: v.body.slice(0, 140),
            occurrenceId: null,
            dedupeKey: `update:${id}:${m.userId}`,
          },
          now,
        );
      }
    }
    this.commit();
    return id;
  }

  async acknowledgeUpdate(updateId: string) {
    const me = this.me();
    const u = this.db.updates.find((x) => x.id === updateId);
    if (!u || (u.visibility === 'private' && u.authorId !== me)) fail('not_found', 'That update no longer exists.');
    this.roleIn(u!.circleId);
    if (this.db.acks.some((a) => a.updateId === updateId && a.userId === me)) return;
    this.db.acks.push({ updateId, userId: me, circleId: u!.circleId, createdAt: this.now().toISOString() });
    this.log(u!.circleId, 'update_acknowledged', `${displayName(this.db, me)} acknowledged an update`, updateId);
    this.commit();
  }

  async listActivity(circleId: string, limit: number): Promise<ActivityEvent[]> {
    this.roleIn(circleId);
    const memberIds = new Set(this.db.members.filter((m) => m.circleId === circleId).map((m) => m.userId));
    return this.db.activity
      .filter((a) => a.circleId === circleId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((a) => ({
        ...a,
        actorName:
          a.actorId === null
            ? 'CareCircle'
            : memberIds.has(a.actorId)
              ? displayName(this.db, a.actorId)
              : 'Former member',
      }));
  }

  // ---------------------------------------------------------------------------
  // Members & invitations

  async listInvitations(circleId: string): Promise<Invitation[]> {
    this.require(circleId, 'manage_members');
    return this.db.invitations
      .filter((i) => i.circleId === circleId)
      .map(({ tokenHash: _t, ...i }) => i)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createInvitation(circleId: string, input: InvitationInput) {
    this.require(circleId, 'manage_members');
    const v = validate(invitationInputSchema, input);
    const token = randomToken();
    const now = this.now();
    const id = newId();
    this.db.invitations.push({
      id,
      circleId,
      role: v.role,
      label: v.label,
      createdBy: this.me(),
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + v.expiresInDays * 86_400_000).toISOString(),
      acceptedAt: null,
      acceptedBy: null,
      revokedAt: null,
      tokenHash: await sha256Hex(token),
    });
    this.log(
      circleId,
      'invitation_created',
      `${displayName(this.db, this.me())} created an invitation for a new ${v.role.replace('_', ' ')}`,
      id,
    );
    this.commit();
    return token;
  }

  async revokeInvitation(invitationId: string) {
    const inv =
      this.db.invitations.find((i) => i.id === invitationId) ?? fail('not_found', 'That invitation no longer exists.');
    this.require(inv.circleId, 'manage_members');
    if (!inv.revokedAt && !inv.acceptedAt) inv.revokedAt = this.now().toISOString();
    this.log(inv.circleId, 'invitation_revoked', `${displayName(this.db, this.me())} revoked an invitation`, inv.id);
    this.commit();
  }

  private async findInvitation(token: string) {
    const hash = await sha256Hex(token);
    return this.db.invitations.find((i) => i.tokenHash === hash) ?? null;
  }

  async previewInvitation(token: string): Promise<InvitationPreview | null> {
    const inv = await this.findInvitation(token);
    if (!inv) return null;
    const status = inv.revokedAt
      ? 'revoked'
      : inv.acceptedAt
        ? 'used'
        : new Date(inv.expiresAt) < this.now()
          ? 'expired'
          : 'valid';
    return { circleName: this.circle(inv.circleId).name, role: inv.role, status };
  }

  async acceptInvitation(token: string) {
    const me = this.me();
    const inv = await this.findInvitation(token);
    if (!inv || inv.revokedAt || inv.acceptedAt || new Date(inv.expiresAt) < this.now()) {
      fail('not_found', 'This invitation link is no longer valid. Ask the circle admin for a new one.');
    }
    if (this.db.members.some((m) => m.circleId === inv!.circleId && m.userId === me)) {
      fail('invalid', 'You are already a member of this circle.');
    }
    const now = this.now().toISOString();
    this.db.members.push({ circleId: inv!.circleId, userId: me, role: inv!.role, joinedAt: now });
    inv!.acceptedAt = now;
    inv!.acceptedBy = me;
    this.log(
      inv!.circleId,
      'member_joined',
      `${displayName(this.db, me)} joined as ${inv!.role.replace('_', ' ')}`,
      me,
    );
    this.commit();
    return inv!.circleId;
  }

  private adminCount(circleId: string) {
    return this.db.members.filter((m) => m.circleId === circleId && m.role === 'admin').length;
  }

  async changeMemberRole(circleId: string, userId: string, role: Role) {
    this.require(circleId, 'manage_members');
    const m =
      this.db.members.find((x) => x.circleId === circleId && x.userId === userId) ??
      fail('not_found', 'That person isn’t in this circle.');
    if (m.role === 'admin' && role !== 'admin' && this.adminCount(circleId) === 1) {
      fail('invalid', 'A circle needs at least one admin. Make someone else an admin first.');
    }
    m.role = role;
    if (role === 'read_only') {
      for (const t of this.db.tasks) if (t.circleId === circleId && t.assigneeId === userId) t.assigneeId = null;
      this.db.followUps = this.db.followUps.filter((f) => !(f.circleId === circleId && f.userId === userId));
    }
    this.log(
      circleId,
      'member_role_changed',
      `${displayName(this.db, this.me())} changed ${displayName(this.db, userId)}’s role to ${role.replace('_', ' ')}`,
      userId,
    );
    this.commit();
  }

  async removeMember(circleId: string, userId: string) {
    const me = this.me();
    const role = this.roleIn(circleId);
    if (userId !== me && role !== 'admin') fail('forbidden', 'Only an admin can remove members.');
    const target =
      this.db.members.find((x) => x.circleId === circleId && x.userId === userId) ??
      fail('not_found', 'That person isn’t in this circle.');
    if (target.role === 'admin' && this.adminCount(circleId) === 1) {
      fail('invalid', 'A circle needs at least one admin. Make someone else an admin first.');
    }
    this.log(
      circleId,
      'member_removed',
      userId === me
        ? `${displayName(this.db, me)} left the circle`
        : `${displayName(this.db, me)} removed ${displayName(this.db, userId)}`,
      null,
    );
    for (const t of this.db.tasks) if (t.circleId === circleId && t.assigneeId === userId) t.assigneeId = null;
    for (const o of this.db.occurrences)
      if (o.circleId === circleId && o.assigneeOverride === userId) o.assigneeOverride = null;
    this.db.members = this.db.members.filter((x) => !(x.circleId === circleId && x.userId === userId));
    this.db.followUps = this.db.followUps.filter((f) => !(f.circleId === circleId && f.userId === userId));
    this.commit();
  }

  async setFollowUpContacts(circleId: string, userIds: string[]) {
    this.require(circleId, 'manage_members');
    for (const id of userIds) {
      const m = this.db.members.find((x) => x.circleId === circleId && x.userId === id);
      if (!m || m.role === 'read_only') fail('invalid', 'Follow-up contacts must be members who can record tasks.');
    }
    this.db.followUps = [
      ...this.db.followUps.filter((f) => f.circleId !== circleId),
      ...[...new Set(userIds)].map((userId) => ({ circleId, userId })),
    ];
    this.log(circleId, 'circle_updated', `${displayName(this.db, this.me())} changed who receives follow-up`, circleId);
    this.commit();
  }

  // ---------------------------------------------------------------------------
  // Notifications

  async listNotifications(): Promise<AppNotification[]> {
    const me = this.me();
    return this.db.notifications
      .filter((n) => n.recipientId === me)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async markNotificationsRead(ids: string[] | null) {
    const me = this.me();
    const now = this.now().toISOString();
    for (const n of this.db.notifications) {
      if (n.recipientId === me && !n.readAt && (ids === null || ids.includes(n.id))) n.readAt = now;
    }
    this.commit();
  }
}

/** Fictional people available in the demo, for the sign-in screen. */
export { DEMO_PEOPLE };
