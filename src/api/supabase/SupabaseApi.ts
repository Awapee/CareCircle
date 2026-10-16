import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import type {
  ActivityEvent,
  ActivityType,
  AppNotification,
  CareUpdate,
  Category,
  Invitation,
  NotificationKind,
  Occurrence,
  Outcome,
  Recurrence,
  Role,
  Task,
  UpdateVisibility,
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

/**
 * Real backend. Reads go through row-level security; writes call the permission-checked
 * database functions in supabase/migrations/0003_functions.sql. Pages never import this
 * directly; they use the CareCircleApi interface.
 */

const SQLSTATE: Record<string, ApiError['code']> = {
  CC400: 'invalid',
  CC401: 'unauthenticated',
  CC403: 'forbidden',
  CC404: 'not_found',
  CC409: 'conflict',
  '42501': 'forbidden',
  '23514': 'invalid',
  '23505': 'conflict',
};

function toApiError(e: PostgrestError | { message: string; code?: string; status?: number }): ApiError {
  const code = e.code ? SQLSTATE[e.code] : undefined;
  if (code === 'forbidden' && e.code === '42501') return new ApiError(code, 'Your role doesn’t allow this action.');
  if (e.code === '23514') return new ApiError('invalid', 'Some details aren’t valid. Check the form and try again.');
  if (code) return new ApiError(code, e.message);
  if ('status' in e && e.status === 400) return new ApiError('invalid', e.message);
  return new ApiError('network', 'Couldn’t reach the server. Check your connection and try again.');
}

function check<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) throw toApiError(res.error);
  return res.data;
}

function validate<T>(
  schema: { safeParse(v: unknown): { success: boolean; data?: T; error?: unknown } },
  v: unknown,
): T {
  const r = schema.safeParse(v);
  if (!r.success) {
    const issues = (r.error as { issues?: { message: string }[] }).issues;
    throw new ApiError('invalid', issues?.[0]?.message ?? 'Check the form and try again.');
  }
  return r.data as T;
}

type Row = Record<string, unknown>;
const str = (v: unknown) => v as string;
const strOrNull = (v: unknown) => (v ?? null) as string | null;
const nameOf = (v: unknown, fallback: string) => (v as { display_name?: string } | null)?.display_name ?? fallback;

function toOccurrence(r: Row): Occurrence {
  return {
    id: str(r.id),
    taskId: str(r.task_id),
    circleId: str(r.circle_id),
    occurrenceDate: str(r.occurrence_date),
    localTime: str(r.local_time),
    scheduledAt: new Date(str(r.scheduled_at)).toISOString(),
    outcome: (r.outcome ?? null) as Outcome | null,
    outcomeBy: strOrNull(r.outcome_by),
    outcomeAt: r.outcome_at ? new Date(str(r.outcome_at)).toISOString() : null,
    note: str(r.note),
    titleOverride: strOrNull(r.title_override),
    assigneeOverride: strOrNull(r.assignee_override),
    timeOverride: strOrNull(r.time_override),
    version: r.version as number,
  };
}

export class SupabaseApi implements CareCircleApi {
  readonly mode = 'supabase' as const;
  private readonly sb: SupabaseClient;
  private userId: string | null = null;

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  }

  private async me(): Promise<string> {
    if (this.userId) return this.userId;
    const { data } = await this.sb.auth.getSession();
    this.userId = data.session?.user.id ?? null;
    if (!this.userId) throw new ApiError('unauthenticated', 'You need to sign in first.');
    return this.userId;
  }

  private async rpc<T>(fn: string, args: Row): Promise<T> {
    const res = await this.sb.rpc(fn, args);
    return check(res) as T;
  }

  // Session -------------------------------------------------------------------

  async getSession(): Promise<Session | null> {
    const { data } = await this.sb.auth.getSession();
    const u = data.session?.user;
    this.userId = u?.id ?? null;
    return u ? { userId: u.id, email: u.email ?? null } : null;
  }

  onSessionChange(listener: (s: Session | null) => void) {
    const { data } = this.sb.auth.onAuthStateChange((_event, session) => {
      this.userId = session?.user.id ?? null;
      listener(session ? { userId: session.user.id, email: session.user.email ?? null } : null);
    });
    return () => data.subscription.unsubscribe();
  }

  async signUp(input: SignUpInput) {
    const { data, error } = await this.sb.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { display_name: input.displayName, time_zone: input.timeZone },
        emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    });
    if (error) throw new ApiError('invalid', error.message);
    return { needsEmailConfirmation: !data.session };
  }

  async signIn(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw new ApiError('invalid', 'That email and password don’t match an account.');
  }

  async signOut() {
    await this.sb.auth.signOut();
    this.userId = null;
  }

  // Profile -------------------------------------------------------------------

  async getProfile() {
    const id = await this.me();
    const r = check(await this.sb.from('profiles').select('*').eq('id', id).single()) as Row;
    return { id, displayName: str(r.display_name), timeZone: str(r.time_zone) };
  }

  async updateProfile(input: { displayName: string; timeZone: string }) {
    const v = validate(profileInputSchema, input);
    const id = await this.me();
    check(await this.sb.from('profiles').update({ display_name: v.displayName, time_zone: v.timeZone }).eq('id', id));
  }

  async getPreferences(): Promise<UserPreferences> {
    const id = await this.me();
    const r = check(await this.sb.from('user_preferences').select('*').eq('user_id', id).single()) as Row;
    return {
      userId: id,
      quietStart: strOrNull(r.quiet_start),
      quietEnd: strOrNull(r.quiet_end),
      inApp: r.in_app as boolean,
      email: r.email as boolean,
      push: r.push as boolean,
    };
  }

  async updatePreferences(input: Omit<UserPreferences, 'userId'>) {
    const id = await this.me();
    check(
      await this.sb
        .from('user_preferences')
        .update({
          quiet_start: input.quietStart,
          quiet_end: input.quietEnd,
          in_app: input.inApp,
          email: input.email,
          push: input.push,
        })
        .eq('user_id', id),
    );
  }

  // Circles -------------------------------------------------------------------

  async listMyCircles(): Promise<CircleSummary[]> {
    const id = await this.me();
    const rows = check(
      await this.sb.from('circle_members').select('role, care_circles(*)').eq('user_id', id),
    ) as unknown as Row[];
    return rows.map((r) => {
      const c = r.care_circles as Row;
      return {
        role: r.role as Role,
        circle: {
          id: str(c.id),
          name: str(c.name),
          timeZone: str(c.time_zone),
          familyCanSeeMedication: c.family_can_see_medication as boolean,
          createdAt: str(c.created_at),
          version: c.version as number,
        },
      };
    });
  }

  async createCircle(input: CircleInput) {
    const v = validate(circleInputSchema, input);
    return this.rpc<string>('create_circle', {
      p_name: v.name,
      p_time_zone: v.timeZone,
      p_recipient_name: v.recipientName,
      p_my_role: v.myRole,
    });
  }

  async getCircle(circleId: string): Promise<CircleBundle> {
    const id = await this.me();
    const [c, p, m, f] = await Promise.all([
      this.sb.from('care_circles').select('*').eq('id', circleId).maybeSingle(),
      this.sb.from('care_profiles').select('*').eq('circle_id', circleId).maybeSingle(),
      this.sb.from('circle_members').select('*, profiles(display_name)').eq('circle_id', circleId),
      this.sb.from('follow_up_contacts').select('user_id').eq('circle_id', circleId),
    ]);
    const circle = check(c) as Row | null;
    if (!circle) throw new ApiError('not_found', 'That circle doesn’t exist or you’re no longer a member.');
    const profile = check(p) as Row;
    const members = (check(m) as unknown as Row[]).map((r) => ({
      circleId,
      userId: str(r.user_id),
      role: r.role as Role,
      joinedAt: str(r.joined_at),
      displayName: nameOf(r.profiles, 'Member'),
    }));
    return {
      circle: {
        id: str(circle.id),
        name: str(circle.name),
        timeZone: str(circle.time_zone),
        familyCanSeeMedication: circle.family_can_see_medication as boolean,
        createdAt: str(circle.created_at),
        version: circle.version as number,
      },
      careProfile: {
        circleId,
        preferredName: str(profile.preferred_name),
        sharedNotes: str(profile.shared_notes),
      },
      members,
      followUpContactIds: (check(f) as unknown as Row[]).map((r) => str(r.user_id)),
      myRole: members.find((x) => x.userId === id)?.role ?? 'read_only',
    };
  }

  async updateCircle(circleId: string, input: CircleSettingsInput, version: number) {
    await this.rpc('update_circle', {
      p_circle: circleId,
      p_name: input.name,
      p_time_zone: input.timeZone,
      p_family_can_see_medication: input.familyCanSeeMedication,
      p_recipient_name: input.recipientName,
      p_shared_notes: input.sharedNotes,
      p_version: version,
    });
  }

  // Tasks ---------------------------------------------------------------------

  async listTasks(circleId: string): Promise<Task[]> {
    const rows = check(
      await this.sb
        .from('tasks')
        .select('*, medication_details(name, instructions), appointment_details(location, meeting_link, professional)')
        .eq('circle_id', circleId)
        .order('created_at'),
    ) as unknown as Row[];
    return rows.map((r) => {
      const med = r.medication_details as Row | null;
      const appt = r.appointment_details as Row | null;
      const category = r.category as Category;
      return {
        id: str(r.id),
        circleId,
        title: str(r.title),
        category,
        notes: str(r.notes),
        recurrence: r.recurrence as Recurrence,
        times: r.times as string[],
        startDate: str(r.start_date),
        endDate: strOrNull(r.end_date),
        assigneeId: strOrNull(r.assignee_id),
        followUpMinutes: r.follow_up_minutes as number,
        reminderMinutesBefore: (r.reminder_minutes_before ?? null) as number | null,
        pausedAt: strOrNull(r.paused_at),
        version: r.version as number,
        createdBy: strOrNull(r.created_by),
        createdAt: str(r.created_at),
        updatedAt: str(r.updated_at),
        medication: med ? { name: str(med.name), instructions: str(med.instructions) } : null,
        medicationHidden: category === 'medication' && !med,
        appointment: appt
          ? { location: str(appt.location), meetingLink: str(appt.meeting_link), professional: str(appt.professional) }
          : null,
      };
    });
  }

  async listOccurrences(circleId: string, fromIso: string, toIso: string) {
    const rows = check(
      await this.sb
        .from('task_occurrences')
        .select('*')
        .eq('circle_id', circleId)
        .gte('scheduled_at', fromIso)
        .lt('scheduled_at', toIso)
        .order('scheduled_at'),
    ) as unknown as Row[];
    return rows.map(toOccurrence);
  }

  async saveTask(circleId: string, taskId: string | null, version: number | null, input: TaskInput) {
    const v = validate(taskInputSchema, input);
    return this.rpc<string>('save_task', { p_circle: circleId, p_task: taskId, p_version: version, p_input: v });
  }

  async setTaskPaused(taskId: string, paused: boolean, version: number) {
    await this.rpc('set_task_paused', { p_task: taskId, p_paused: paused, p_version: version });
  }

  async deleteTask(taskId: string) {
    await this.rpc('delete_task', { p_task: taskId });
  }

  async recordOutcome(occurrenceId: string, outcome: Outcome | null, note: string, version: number) {
    await this.rpc('record_outcome', {
      p_occurrence: occurrenceId,
      p_outcome: outcome,
      p_note: note,
      p_version: version,
    });
  }

  async updateOccurrence(occurrenceId: string, edit: OccurrenceEdit, version: number) {
    await this.rpc('update_occurrence', {
      p_occurrence: occurrenceId,
      p_title_override: edit.titleOverride,
      p_assignee_override: edit.assigneeOverride,
      p_time_override: edit.timeOverride,
      p_version: version,
    });
  }

  // Updates & activity --------------------------------------------------------

  async listUpdates(circleId: string): Promise<CareUpdate[]> {
    const rows = check(
      await this.sb
        .from('care_updates')
        .select(
          '*, author:profiles!care_updates_author_id_fkey(display_name), acknowledgements(user_id, created_at, profiles(display_name))',
        )
        .eq('circle_id', circleId)
        .order('created_at', { ascending: false })
        .limit(100),
    ) as unknown as Row[];
    return rows.map((r) => ({
      id: str(r.id),
      circleId,
      authorId: strOrNull(r.author_id),
      authorName: r.author_id ? nameOf(r.author, 'Former member') : 'Former member',
      body: str(r.body),
      visibility: r.visibility as UpdateVisibility,
      occurrenceId: strOrNull(r.occurrence_id),
      createdAt: str(r.created_at),
      acknowledgedBy: ((r.acknowledgements as Row[]) ?? []).map((a) => ({
        userId: str(a.user_id),
        displayName: nameOf(a.profiles, 'Former member'),
        at: str(a.created_at),
      })),
    }));
  }

  async postUpdate(circleId: string, input: CareUpdateInput) {
    const v = validate(careUpdateInputSchema, input);
    return this.rpc<string>('post_care_update', {
      p_circle: circleId,
      p_body: v.body,
      p_visibility: v.visibility,
      p_occurrence: v.occurrenceId,
    });
  }

  async acknowledgeUpdate(updateId: string) {
    await this.rpc('acknowledge_update', { p_update: updateId });
  }

  async listActivity(circleId: string, limit: number): Promise<ActivityEvent[]> {
    const rows = check(
      await this.sb
        .from('activity_events')
        .select('*, actor:profiles(display_name)')
        .eq('circle_id', circleId)
        .order('created_at', { ascending: false })
        .limit(limit),
    ) as unknown as Row[];
    return rows.map((r) => ({
      id: str(r.id),
      circleId,
      actorId: strOrNull(r.actor_id),
      actorName: r.actor_id ? nameOf(r.actor, 'Former member') : 'CareCircle',
      type: r.type as ActivityType,
      summary: str(r.summary),
      subjectId: strOrNull(r.subject_id),
      createdAt: str(r.created_at),
    }));
  }

  // Members & invitations -----------------------------------------------------

  async listInvitations(circleId: string): Promise<Invitation[]> {
    const rows = check(
      await this.sb
        .from('invitations')
        .select('id, circle_id, role, label, created_by, created_at, expires_at, accepted_at, accepted_by, revoked_at')
        .eq('circle_id', circleId)
        .order('created_at', { ascending: false }),
    ) as unknown as Row[];
    return rows.map((r) => ({
      id: str(r.id),
      circleId,
      role: r.role as Role,
      label: str(r.label),
      createdBy: strOrNull(r.created_by),
      createdAt: str(r.created_at),
      expiresAt: str(r.expires_at),
      acceptedAt: strOrNull(r.accepted_at),
      acceptedBy: strOrNull(r.accepted_by),
      revokedAt: strOrNull(r.revoked_at),
    }));
  }

  async createInvitation(circleId: string, input: InvitationInput) {
    const v = validate(invitationInputSchema, input);
    return this.rpc<string>('create_invitation', {
      p_circle: circleId,
      p_role: v.role,
      p_label: v.label,
      p_expires_in_days: v.expiresInDays,
    });
  }

  async revokeInvitation(invitationId: string) {
    await this.rpc('revoke_invitation', { p_invitation: invitationId });
  }

  async previewInvitation(token: string): Promise<InvitationPreview | null> {
    const rows = await this.rpc<Row[]>('invitation_preview', { p_token: token });
    const r = rows[0];
    return r
      ? { circleName: str(r.circle_name), role: r.role as Role, status: r.status as InvitationPreview['status'] }
      : null;
  }

  async acceptInvitation(token: string) {
    return this.rpc<string>('accept_invitation', { p_token: token });
  }

  async changeMemberRole(circleId: string, userId: string, role: Role) {
    await this.rpc('change_member_role', { p_circle: circleId, p_user: userId, p_role: role });
  }

  async removeMember(circleId: string, userId: string) {
    await this.rpc('remove_member', { p_circle: circleId, p_user: userId });
  }

  async setFollowUpContacts(circleId: string, userIds: string[]) {
    await this.rpc('set_follow_up_contacts', { p_circle: circleId, p_users: userIds });
  }

  // Notifications -------------------------------------------------------------

  async listNotifications(): Promise<AppNotification[]> {
    const rows = check(
      await this.sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(200),
    ) as unknown as Row[];
    return rows.map((r) => ({
      id: str(r.id),
      circleId: str(r.circle_id),
      recipientId: str(r.recipient_id),
      kind: r.kind as NotificationKind,
      title: str(r.title),
      body: str(r.body),
      occurrenceId: strOrNull(r.occurrence_id),
      dedupeKey: str(r.dedupe_key),
      readAt: strOrNull(r.read_at),
      createdAt: str(r.created_at),
    }));
  }

  async markNotificationsRead(ids: string[] | null) {
    await this.rpc('mark_notifications_read', { p_ids: ids });
  }
}
