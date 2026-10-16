-- Write operations. Each function checks the caller's role (docs/ARCHITECTURE.md §3), applies
-- optimistic version checks where rows are editable, and records activity, all in one transaction.
--
-- Error codes (SQLSTATE) the app understands:
--   CC400 invalid input · CC401 not signed in · CC403 not allowed · CC404 not found · CC409 version conflict

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------

create or replace function public._uid() returns uuid
language plpgsql stable as $$
begin
  if auth.uid() is null then
    raise exception 'You need to sign in first.' using errcode = 'CC401';
  end if;
  return auth.uid();
end $$;

/** The caller's role in a circle, or an error if they aren't a member. */
create or replace function public._require_member(p_circle uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare r text;
begin
  perform public._uid();
  select role into r from circle_members where circle_id = p_circle and user_id = auth.uid();
  if r is null then
    raise exception 'You are not a member of this care circle.' using errcode = 'CC403';
  end if;
  return r;
end $$;

create or replace function public._require_role(p_circle uuid, p_roles text[]) returns text
language plpgsql stable security definer set search_path = public as $$
declare r text := public._require_member(p_circle);
begin
  if not (r = any (p_roles)) then
    raise exception 'Your role doesn''t allow this action.' using errcode = 'CC403';
  end if;
  return r;
end $$;

create or replace function public._display_name(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select display_name from profiles where id = p_user), 'Someone')
$$;

create or replace function public._log(p_circle uuid, p_type text, p_summary text, p_subject uuid)
returns void language sql security definer set search_path = public as $$
  insert into activity_events (circle_id, actor_id, type, summary, subject_id)
  values (p_circle, auth.uid(), p_type, left(p_summary, 300), p_subject)
$$;

create or replace function public._check_version(p_current int, p_expected int) returns void
language plpgsql immutable as $$
begin
  if p_expected is null or p_current <> p_expected then
    raise exception 'Someone else changed this while you were editing. Review the latest version and try again.'
      using errcode = 'CC409';
  end if;
end $$;

/** "Today" in a circle's time zone. */
create or replace function public._circle_today(p_circle uuid, p_now timestamptz default now()) returns date
language sql stable security definer set search_path = public as $$
  select (p_now at time zone time_zone)::date from care_circles where id = p_circle
$$;

create or replace function public._recurs_on(r jsonb, p_start date, d date) returns boolean
language sql immutable as $$
  select d >= p_start and case r->>'kind'
    when 'once' then d = p_start
    when 'daily' then true
    when 'weekly' then extract(isodow from d)::int in (select x::int from jsonb_array_elements_text(r->'days') x)
    when 'interval' then (d - p_start) % greatest(1, (r->>'everyDays')::int) = 0
    else false
  end
$$;

/**
 * Creates occurrences for a series between two local dates. Slots that already exist are left
 * alone (unique constraint), and slots before `p_not_before` are never created, so editing a
 * series doesn't invent records for times that have already passed.
 */
create or replace function public._generate_occurrences(p_task uuid, p_from date, p_to date, p_not_before timestamptz)
returns integer language plpgsql security definer set search_path = public as $$
declare
  t tasks;
  tz text;
  d date;
  tm text;
  at timestamptz;
  n integer := 0;
begin
  select * into t from tasks where id = p_task;
  if t.id is null or t.paused_at is not null then return 0; end if;
  select time_zone into tz from care_circles where id = t.circle_id;
  d := greatest(p_from, t.start_date);
  while d <= least(p_to, coalesce(t.end_date, p_to)) loop
    if public._recurs_on(t.recurrence, t.start_date, d) then
      foreach tm in array t.times loop
        -- A local time skipped by daylight saving is read as standard time, i.e. moved forward.
        at := (d + tm::time) at time zone tz;
        if p_not_before is null or at >= p_not_before then
          insert into task_occurrences (task_id, circle_id, occurrence_date, local_time, scheduled_at)
          values (t.id, t.circle_id, d, tm, at)
          on conflict (task_id, occurrence_date, local_time) do nothing;
          if found then n := n + 1; end if;
        end if;
      end loop;
    end if;
    d := d + 1;
  end loop;
  return n;
end $$;

/** Assignees must be members who can record outcomes (anyone except read-only). */
create or replace function public._check_assignee(p_circle uuid, p_user uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if p_user is not null and not exists (
    select 1 from circle_members where circle_id = p_circle and user_id = p_user and role <> 'read_only'
  ) then
    raise exception 'Choose someone in the circle who can record tasks.' using errcode = 'CC400';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Circles
-- ---------------------------------------------------------------------------

create or replace function public.create_circle(p_name text, p_time_zone text, p_recipient_name text, p_my_role text)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := public._uid(); c uuid;
begin
  if not public._valid_time_zone(p_time_zone) then
    raise exception 'Choose a valid time zone.' using errcode = 'CC400';
  end if;
  if p_my_role not in ('admin', 'care_recipient') then
    raise exception 'The person creating a circle is its admin or the care recipient.' using errcode = 'CC400';
  end if;
  insert into care_circles (name, time_zone, created_by) values (trim(p_name), p_time_zone, me) returning id into c;
  -- Whoever creates the circle can always manage it.
  insert into circle_members (circle_id, user_id, role) values (c, me, 'admin');
  insert into care_profiles (circle_id, preferred_name) values (c, trim(p_recipient_name));
  insert into follow_up_contacts (circle_id, user_id) values (c, me);
  perform public._log(c, 'circle_updated', public._display_name(me) || ' created the circle', c);
  return c;
end $$;

create or replace function public.update_circle(
  p_circle uuid, p_name text, p_time_zone text, p_family_can_see_medication boolean,
  p_recipient_name text, p_shared_notes text, p_version int
) returns void language plpgsql security definer set search_path = public as $$
declare cur care_circles;
begin
  perform public._require_role(p_circle, array['admin']);
  select * into cur from care_circles where id = p_circle for update;
  perform public._check_version(cur.version, p_version);
  if not public._valid_time_zone(p_time_zone) then
    raise exception 'Choose a valid time zone.' using errcode = 'CC400';
  end if;
  update care_circles set name = trim(p_name), time_zone = p_time_zone,
    family_can_see_medication = p_family_can_see_medication, version = version + 1
  where id = p_circle;
  update care_profiles set preferred_name = trim(p_recipient_name), shared_notes = p_shared_notes,
    version = version + 1
  where circle_id = p_circle;
  perform public._log(p_circle, 'circle_updated', public._display_name(auth.uid()) || ' updated the circle settings', p_circle);
end $$;

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

create or replace function public.save_task(p_circle uuid, p_task uuid, p_version int, p_input jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := public._uid();
  id_ uuid := p_task;
  cur tasks;
  cat text := p_input->>'category';
  times_ text[] := array(select jsonb_array_elements_text(p_input->'times') order by 1);
  assignee uuid := nullif(p_input->>'assigneeId', '')::uuid;
  today date;
begin
  perform public._require_role(p_circle, array['admin', 'care_recipient', 'caregiver']);
  perform public._check_assignee(p_circle, assignee);
  if (cat = 'medication') <> (jsonb_typeof(p_input->'medication') = 'object') then
    raise exception 'Medication details are required for medication tasks only.' using errcode = 'CC400';
  end if;
  if cat <> 'appointment' and jsonb_typeof(p_input->'appointment') = 'object' then
    raise exception 'Appointment details apply to appointments only.' using errcode = 'CC400';
  end if;

  if id_ is null then
    insert into tasks (circle_id, title, category, notes, recurrence, times, start_date, end_date, assignee_id,
      follow_up_minutes, reminder_minutes_before, created_by)
    values (p_circle, trim(p_input->>'title'), cat, coalesce(p_input->>'notes', ''), p_input->'recurrence', times_,
      (p_input->>'startDate')::date, nullif(p_input->>'endDate', '')::date, assignee,
      (p_input->>'followUpMinutes')::int, nullif(p_input->>'reminderMinutesBefore', '')::int, me)
    returning id into id_;
    perform public._log(p_circle, 'task_created',
      public._display_name(me) || ' added “' || trim(p_input->>'title') || '”', id_);
  else
    select * into cur from tasks where id = id_ and circle_id = p_circle for update;
    if cur.id is null then raise exception 'That task no longer exists.' using errcode = 'CC404'; end if;
    perform public._check_version(cur.version, p_version);
    if cur.category <> cat then
      raise exception 'A task''s category can''t be changed. Create a new task instead.' using errcode = 'CC400';
    end if;
    update tasks set title = trim(p_input->>'title'), notes = coalesce(p_input->>'notes', ''),
      recurrence = p_input->'recurrence', times = times_, start_date = (p_input->>'startDate')::date,
      end_date = nullif(p_input->>'endDate', '')::date, assignee_id = assignee,
      follow_up_minutes = (p_input->>'followUpMinutes')::int,
      reminder_minutes_before = nullif(p_input->>'reminderMinutesBefore', '')::int,
      version = version + 1, updated_at = now()
    where id = id_;
    -- Edit the series: future occurrences with nothing recorded are regenerated; history stays.
    delete from task_occurrences where task_id = id_ and outcome is null and scheduled_at > now();
    perform public._log(p_circle, 'task_updated',
      public._display_name(me) || ' updated “' || trim(p_input->>'title') || '”', id_);
  end if;

  if cat = 'medication' then
    insert into medication_details (task_id, circle_id, name, instructions)
    values (id_, p_circle, trim(p_input->'medication'->>'name'), coalesce(p_input->'medication'->>'instructions', ''))
    on conflict (task_id) do update set name = excluded.name, instructions = excluded.instructions;
  end if;
  if cat = 'appointment' then
    insert into appointment_details (task_id, circle_id, location, meeting_link, professional)
    values (id_, p_circle,
      coalesce(p_input->'appointment'->>'location', ''), coalesce(p_input->'appointment'->>'meetingLink', ''),
      coalesce(p_input->'appointment'->>'professional', ''))
    on conflict (task_id) do update set location = excluded.location, meeting_link = excluded.meeting_link,
      professional = excluded.professional;
  end if;

  today := public._circle_today(p_circle);
  perform public._generate_occurrences(id_, today, today + 14, now());
  return id_;
end $$;

create or replace function public.set_task_paused(p_task uuid, p_paused boolean, p_version int)
returns void language plpgsql security definer set search_path = public as $$
declare cur tasks; today date;
begin
  select * into cur from tasks where id = p_task for update;
  if cur.id is null then raise exception 'That task no longer exists.' using errcode = 'CC404'; end if;
  perform public._require_role(cur.circle_id, array['admin', 'care_recipient', 'caregiver']);
  perform public._check_version(cur.version, p_version);
  update tasks set paused_at = case when p_paused then now() end, version = version + 1, updated_at = now()
  where id = p_task;
  if p_paused then
    delete from task_occurrences where task_id = p_task and outcome is null and scheduled_at > now();
    perform public._log(cur.circle_id, 'task_paused', public._display_name(auth.uid()) || ' paused “' || cur.title || '”', p_task);
  else
    today := public._circle_today(cur.circle_id);
    perform public._generate_occurrences(p_task, today, today + 14, now());
    perform public._log(cur.circle_id, 'task_resumed', public._display_name(auth.uid()) || ' resumed “' || cur.title || '”', p_task);
  end if;
end $$;

create or replace function public.delete_task(p_task uuid)
returns void language plpgsql security definer set search_path = public as $$
declare cur tasks;
begin
  select * into cur from tasks where id = p_task;
  if cur.id is null then raise exception 'That task no longer exists.' using errcode = 'CC404'; end if;
  perform public._require_role(cur.circle_id, array['admin', 'care_recipient']);
  delete from tasks where id = p_task;
  perform public._log(cur.circle_id, 'task_deleted', public._display_name(auth.uid()) || ' deleted “' || cur.title || '”', null);
end $$;

-- ---------------------------------------------------------------------------
-- Occurrences
-- ---------------------------------------------------------------------------

create or replace function public.record_outcome(p_occurrence uuid, p_outcome text, p_note text, p_version int)
returns void language plpgsql security definer set search_path = public as $$
declare
  o task_occurrences;
  t tasks;
  r text;
  me uuid := public._uid();
  label text;
begin
  select * into o from task_occurrences where id = p_occurrence for update;
  if o.id is null then raise exception 'That task no longer exists.' using errcode = 'CC404'; end if;
  select * into t from tasks where id = o.task_id;
  r := public._require_member(o.circle_id);
  -- `is not distinct from` keeps an unassigned task (NULL) from silently passing this check.
  if not (r in ('admin', 'care_recipient', 'caregiver')
          or (r = 'family' and coalesce(o.assignee_override, t.assignee_id) is not distinct from me)) then
    raise exception 'Your role doesn''t allow recording this task.' using errcode = 'CC403';
  end if;
  perform public._check_version(o.version, p_version);
  if p_outcome is not null and p_outcome not in (
    case when t.category = 'medication' then 'taken' else 'completed' end, 'not_taken', 'skipped', 'cancelled'
  ) or (p_outcome = 'not_taken' and t.category <> 'medication') then
    raise exception 'That outcome doesn''t apply to this task.' using errcode = 'CC400';
  end if;
  update task_occurrences set outcome = p_outcome,
    outcome_by = case when p_outcome is null then null else me end,
    outcome_at = case when p_outcome is null then null else now() end,
    note = coalesce(p_note, ''), version = version + 1
  where id = p_occurrence;
  label := coalesce(o.title_override, t.title);
  if p_outcome is null then
    perform public._log(o.circle_id, 'outcome_cleared', public._display_name(me) || ' cleared the record for “' || label || '”', o.id);
  else
    perform public._log(o.circle_id, 'outcome_recorded', public._display_name(me) || ' ' || case p_outcome
      when 'completed' then 'marked “' || label || '” as done'
      when 'taken' then 'marked “' || label || '” as taken'
      when 'not_taken' then 'marked “' || label || '” as not taken'
      when 'skipped' then 'skipped “' || label || '”'
      else 'cancelled “' || label || '”' end, o.id);
  end if;
end $$;

/** Edit this occurrence only: title, assignee or time. The series is untouched. */
create or replace function public.update_occurrence(
  p_occurrence uuid, p_title_override text, p_assignee_override uuid, p_time_override text, p_version int
) returns void language plpgsql security definer set search_path = public as $$
declare o task_occurrences; t tasks; tz text;
begin
  select * into o from task_occurrences where id = p_occurrence for update;
  if o.id is null then raise exception 'That task no longer exists.' using errcode = 'CC404'; end if;
  perform public._require_role(o.circle_id, array['admin', 'care_recipient', 'caregiver']);
  perform public._check_version(o.version, p_version);
  perform public._check_assignee(o.circle_id, p_assignee_override);
  select * into t from tasks where id = o.task_id;
  select time_zone into tz from care_circles where id = o.circle_id;
  update task_occurrences set
    title_override = nullif(trim(p_title_override), ''),
    assignee_override = p_assignee_override,
    time_override = nullif(p_time_override, ''),
    scheduled_at = (o.occurrence_date + coalesce(nullif(p_time_override, ''), o.local_time)::time) at time zone tz,
    version = version + 1
  where id = p_occurrence;
  perform public._log(o.circle_id, 'occurrence_updated',
    public._display_name(auth.uid()) || ' changed one occurrence of “' || t.title || '”', o.id);
end $$;

-- ---------------------------------------------------------------------------
-- Care updates
-- ---------------------------------------------------------------------------

create or replace function public.post_care_update(p_circle uuid, p_body text, p_visibility text, p_occurrence uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := public._uid(); u uuid;
begin
  perform public._require_role(p_circle, array['admin', 'care_recipient', 'caregiver', 'family']);
  if p_occurrence is not null and not exists (
    select 1 from task_occurrences where id = p_occurrence and circle_id = p_circle
  ) then
    raise exception 'That task isn''t in this circle.' using errcode = 'CC400';
  end if;
  insert into care_updates (circle_id, author_id, body, visibility, occurrence_id)
  values (p_circle, me, trim(p_body), p_visibility, p_occurrence) returning id into u;
  -- Private notes stay private: no activity, no notifications.
  if p_visibility = 'circle' then
    perform public._log(p_circle, 'update_posted', public._display_name(me) || ' posted an update', u);
    insert into notifications (circle_id, recipient_id, kind, title, body, dedupe_key)
    select p_circle, m.user_id, 'update', public._display_name(me) || ' posted an update', left(trim(p_body), 140),
      'update:' || u || ':' || m.user_id
    from circle_members m
    join user_preferences p on p.user_id = m.user_id
    where m.circle_id = p_circle and m.user_id <> me and p.in_app
    on conflict (dedupe_key) do nothing;
  end if;
  return u;
end $$;

create or replace function public.acknowledge_update(p_update uuid)
returns void language plpgsql security definer set search_path = public as $$
declare u care_updates; me uuid := public._uid();
begin
  select * into u from care_updates where id = p_update;
  if u.id is null or (u.visibility = 'private' and u.author_id is distinct from me) then
    raise exception 'That update no longer exists.' using errcode = 'CC404';
  end if;
  perform public._require_member(u.circle_id);
  insert into acknowledgements (update_id, user_id, circle_id) values (p_update, me, u.circle_id)
  on conflict do nothing;
  if found then
    perform public._log(u.circle_id, 'update_acknowledged', public._display_name(me) || ' acknowledged an update', p_update);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Members and invitations
-- ---------------------------------------------------------------------------

create or replace function public._hash_token(p_token text) returns text
language sql immutable as $$ select encode(sha256(convert_to(p_token, 'UTF8')), 'hex') $$;

/** Returns the invitation token. It is shown once and only its hash is stored. */
create or replace function public.create_invitation(p_circle uuid, p_role text, p_label text, p_expires_in_days int)
returns text language plpgsql security definer set search_path = public as $$
declare token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''); inv uuid;
begin
  perform public._require_role(p_circle, array['admin']);
  if p_expires_in_days not between 1 and 30 then
    raise exception 'Invitations last between 1 and 30 days.' using errcode = 'CC400';
  end if;
  insert into invitations (circle_id, token_hash, role, label, created_by, expires_at)
  values (p_circle, public._hash_token(token), p_role, trim(coalesce(p_label, '')), auth.uid(),
    now() + make_interval(days => p_expires_in_days))
  returning id into inv;
  perform public._log(p_circle, 'invitation_created',
    public._display_name(auth.uid()) || ' created an invitation for a new ' || replace(p_role, '_', ' '), inv);
  return token;
end $$;

create or replace function public.revoke_invitation(p_invitation uuid)
returns void language plpgsql security definer set search_path = public as $$
declare inv invitations;
begin
  select * into inv from invitations where id = p_invitation;
  if inv.id is null then raise exception 'That invitation no longer exists.' using errcode = 'CC404'; end if;
  perform public._require_role(inv.circle_id, array['admin']);
  update invitations set revoked_at = now() where id = p_invitation and revoked_at is null and accepted_at is null;
  perform public._log(inv.circle_id, 'invitation_revoked', public._display_name(auth.uid()) || ' revoked an invitation', inv.id);
end $$;

/** What an invitation link leads to, so the person can decide before joining. */
create or replace function public.invitation_preview(p_token text)
returns table (circle_name text, role text, status text)
language sql stable security definer set search_path = public as $$
  select c.name, i.role, case
    when i.revoked_at is not null then 'revoked'
    when i.accepted_at is not null then 'used'
    when i.expires_at < now() then 'expired'
    else 'valid' end
  from invitations i join care_circles c on c.id = i.circle_id
  where i.token_hash = public._hash_token(p_token)
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv invitations; me uuid := public._uid();
begin
  select * into inv from invitations where token_hash = public._hash_token(p_token) for update;
  if inv.id is null or inv.revoked_at is not null or inv.accepted_at is not null or inv.expires_at < now() then
    raise exception 'This invitation link is no longer valid. Ask the circle admin for a new one.' using errcode = 'CC404';
  end if;
  if exists (select 1 from circle_members where circle_id = inv.circle_id and user_id = me) then
    raise exception 'You are already a member of this circle.' using errcode = 'CC400';
  end if;
  insert into circle_members (circle_id, user_id, role) values (inv.circle_id, me, inv.role);
  update invitations set accepted_at = now(), accepted_by = me where id = inv.id;
  perform public._log(inv.circle_id, 'member_joined',
    public._display_name(me) || ' joined as ' || replace(inv.role, '_', ' '), me);
  return inv.circle_id;
end $$;

create or replace function public._admin_count(p_circle uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from circle_members where circle_id = p_circle and role = 'admin'
$$;

create or replace function public.change_member_role(p_circle uuid, p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare old text;
begin
  perform public._require_role(p_circle, array['admin']);
  select role into old from circle_members where circle_id = p_circle and user_id = p_user for update;
  if old is null then raise exception 'That person isn''t in this circle.' using errcode = 'CC404'; end if;
  if old = 'admin' and p_role <> 'admin' and public._admin_count(p_circle) = 1 then
    raise exception 'A circle needs at least one admin. Make someone else an admin first.' using errcode = 'CC400';
  end if;
  update circle_members set role = p_role where circle_id = p_circle and user_id = p_user;
  if p_role = 'read_only' then
    update tasks set assignee_id = null where circle_id = p_circle and assignee_id = p_user;
  end if;
  perform public._log(p_circle, 'member_role_changed', public._display_name(auth.uid()) || ' changed '
    || public._display_name(p_user) || '’s role to ' || replace(p_role, '_', ' '), p_user);
end $$;

/** Admins can remove anyone; anyone can leave. The last admin can't leave or be removed. */
create or replace function public.remove_member(p_circle uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r text; me uuid := public._uid(); target text;
begin
  r := public._require_member(p_circle);
  if p_user <> me and r <> 'admin' then
    raise exception 'Only an admin can remove members.' using errcode = 'CC403';
  end if;
  select role into target from circle_members where circle_id = p_circle and user_id = p_user;
  if target is null then raise exception 'That person isn''t in this circle.' using errcode = 'CC404'; end if;
  if target = 'admin' and public._admin_count(p_circle) = 1 then
    raise exception 'A circle needs at least one admin. Make someone else an admin first.' using errcode = 'CC400';
  end if;
  perform public._log(p_circle, 'member_removed', case when p_user = me
    then public._display_name(me) || ' left the circle'
    else public._display_name(me) || ' removed ' || public._display_name(p_user) end, null);
  update tasks set assignee_id = null where circle_id = p_circle and assignee_id = p_user;
  update task_occurrences set assignee_override = null where circle_id = p_circle and assignee_override = p_user;
  delete from circle_members where circle_id = p_circle and user_id = p_user;
end $$;

create or replace function public.set_follow_up_contacts(p_circle uuid, p_users uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._require_role(p_circle, array['admin']);
  if exists (
    select 1 from unnest(p_users) u
    where not exists (select 1 from circle_members m where m.circle_id = p_circle and m.user_id = u and m.role <> 'read_only')
  ) then
    raise exception 'Follow-up contacts must be members who can record tasks.' using errcode = 'CC400';
  end if;
  delete from follow_up_contacts where circle_id = p_circle and not (user_id = any (p_users));
  insert into follow_up_contacts (circle_id, user_id) select p_circle, u from unnest(p_users) u on conflict do nothing;
  perform public._log(p_circle, 'circle_updated', public._display_name(auth.uid()) || ' changed who receives follow-up', p_circle);
end $$;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

/** Marks the caller's notifications as read: the given ones, or all of them when `p_ids` is null. */
create or replace function public.mark_notifications_read(p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  update notifications set read_at = now()
  where recipient_id = public._uid() and read_at is null and (p_ids is null or id = any (p_ids));
end $$;

create or replace function public._in_quiet_hours(p_user uuid, p_now timestamptz) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when p.quiet_start is null or p.quiet_end is null or p.quiet_start = p.quiet_end then false
      when p.quiet_start < p.quiet_end then t >= p.quiet_start and t < p.quiet_end
      else t >= p.quiet_start or t < p.quiet_end
    end
    from user_preferences p
    join profiles pr on pr.id = p.user_id
    cross join lateral (select to_char(p_now at time zone pr.time_zone, 'HH24:MI') as t) x
    where p.user_id = p_user
  ), false)
$$;

/**
 * The scheduler, run every minute by pg_cron (0004_schedule.sql). Every step is idempotent,
 * so overlapping or repeated runs can't create duplicates:
 *   1. create occurrences for the next 14 days;
 *   2. send reminders before tasks are due;
 *   3. send follow-up when a task is still unconfirmed after its waiting period, or was not taken.
 * Notifications during someone's quiet hours wait until the quiet hours end.
 */
create or replace function public.run_scheduler(p_now timestamptz default now())
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  t record;
  created int := 0;
  reminders int := 0;
  follow_ups int := 0;
  n int;
begin
  -- 1. Rolling window of occurrences.
  for t in select tk.id, tk.circle_id, tk.updated_at from tasks tk where tk.paused_at is null loop
    created := created + public._generate_occurrences(
      t.id, public._circle_today(t.circle_id, p_now) - 1, public._circle_today(t.circle_id, p_now) + 14, t.updated_at);
  end loop;

  -- 2. Reminders: to the assignee, or the follow-up contacts when nobody is assigned.
  with due as (
    select o.id, o.circle_id, coalesce(o.title_override, tk.title) as title, coalesce(o.assignee_override, tk.assignee_id) as assignee
    from task_occurrences o join tasks tk on tk.id = o.task_id
    where o.outcome is null and tk.paused_at is null and tk.reminder_minutes_before is not null
      and p_now >= o.scheduled_at - make_interval(mins => tk.reminder_minutes_before)
      and p_now < o.scheduled_at + make_interval(mins => tk.follow_up_minutes)
  ), recipients as (
    select d.*, d.assignee as user_id from due d where d.assignee is not null
    union
    select d.*, f.user_id from due d join follow_up_contacts f on f.circle_id = d.circle_id where d.assignee is null
  )
  insert into notifications (circle_id, recipient_id, kind, title, body, occurrence_id, dedupe_key)
  select r.circle_id, r.user_id, 'reminder', 'Coming up: ' || r.title, 'Scheduled soon. Open the task to record what happened.',
    r.id, 'reminder:' || r.id || ':' || r.user_id
  from recipients r join user_preferences p on p.user_id = r.user_id
  where p.in_app and not public._in_quiet_hours(r.user_id, p_now)
    and exists (select 1 from circle_members m where m.circle_id = r.circle_id and m.user_id = r.user_id)
  on conflict (dedupe_key) do nothing;
  get diagnostics reminders = row_count;

  -- 3. Follow-up: to the follow-up contacts and the assignee. Only for the last 2 days, so a
  --    newly connected scheduler doesn't flood people with old items.
  with overdue as (
    select o.id, o.circle_id, coalesce(o.title_override, tk.title) as title,
      coalesce(o.assignee_override, tk.assignee_id) as assignee, o.outcome
    from task_occurrences o join tasks tk on tk.id = o.task_id
    where o.scheduled_at > p_now - interval '2 days'
      and ((o.outcome is null and p_now >= o.scheduled_at + make_interval(mins => tk.follow_up_minutes))
           or o.outcome = 'not_taken')
  ), recipients as (
    select d.*, f.user_id from overdue d join follow_up_contacts f on f.circle_id = d.circle_id
    union
    select d.*, d.assignee from overdue d where d.assignee is not null
  )
  insert into notifications (circle_id, recipient_id, kind, title, body, occurrence_id, dedupe_key)
  select r.circle_id, r.user_id, 'follow_up', 'Needs review: ' || r.title,
    case when r.outcome = 'not_taken' then 'Recorded as not taken. Check in when you can.'
      else 'Nothing has been recorded yet. This is a missed confirmation, not proof that anything is wrong.' end,
    r.id, 'follow_up:' || r.id || ':' || r.user_id
  from recipients r join user_preferences p on p.user_id = r.user_id
  where p.in_app and not public._in_quiet_hours(r.user_id, p_now)
    and exists (select 1 from circle_members m where m.circle_id = r.circle_id and m.user_id = r.user_id)
  on conflict (dedupe_key) do nothing;
  get diagnostics follow_ups = row_count;

  -- Log follow-up once per occurrence in the shared history.
  with marked as (
    update task_occurrences o set follow_up_logged_at = p_now
    from tasks tk
    where tk.id = o.task_id and o.follow_up_logged_at is null and o.outcome is null
      and o.scheduled_at > p_now - interval '2 days'
      and p_now >= o.scheduled_at + make_interval(mins => tk.follow_up_minutes)
    returning o.id, o.circle_id, coalesce(o.title_override, tk.title) as title
  )
  insert into activity_events (circle_id, actor_id, type, summary, subject_id)
  select circle_id, null, 'follow_up_due', '“' || title || '” needs review: nothing recorded yet', id from marked;

  -- Delivery beyond in-app: no provider is configured yet, and that is recorded honestly.
  insert into notification_deliveries (notification_id, channel, status)
  select nt.id, ch.channel, 'not_configured'
  from notifications nt
  join user_preferences p on p.user_id = nt.recipient_id
  cross join lateral (values ('email', p.email), ('push', p.push)) ch(channel, enabled)
  where ch.enabled and nt.created_at > p_now - interval '1 day'
  on conflict (notification_id, channel) do nothing;
  get diagnostics n = row_count;

  return jsonb_build_object('occurrences', created, 'reminders', reminders, 'followUps', follow_ups, 'deliveries', n);
end $$;

-- ---------------------------------------------------------------------------
-- Who may call what. New functions are executable by everyone by default (and Supabase also
-- grants them to anon/authenticated), so start from nothing and grant only what the app calls.
-- ---------------------------------------------------------------------------

revoke all on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.member_role(uuid), public.is_member(uuid), public.can_view_medication(uuid), public.shares_circle_with(uuid),
  public._valid_hhmm(text), public._valid_times(text[]), public._valid_recurrence(jsonb), public._valid_time_zone(text)
to authenticated;

grant execute on function
  public.create_circle(text, text, text, text),
  public.update_circle(uuid, text, text, boolean, text, text, int),
  public.save_task(uuid, uuid, int, jsonb),
  public.set_task_paused(uuid, boolean, int),
  public.delete_task(uuid),
  public.record_outcome(uuid, text, text, int),
  public.update_occurrence(uuid, text, uuid, text, int),
  public.post_care_update(uuid, text, text, uuid),
  public.acknowledge_update(uuid),
  public.create_invitation(uuid, text, text, int),
  public.revoke_invitation(uuid),
  public.invitation_preview(text),
  public.accept_invitation(text),
  public.change_member_role(uuid, uuid, text),
  public.remove_member(uuid, uuid),
  public.set_follow_up_contacts(uuid, uuid[]),
  public.mark_notifications_read(uuid[])
to authenticated;
-- run_scheduler and the _helpers are deliberately not granted: only the database itself runs them.
