-- Row-level security. See docs/ARCHITECTURE.md §3.
--
-- Design: signed-in users READ through RLS policies. Almost every WRITE goes through a
-- SECURITY DEFINER function in 0003_functions.sql, which checks the caller's role, enforces
-- version checks and records activity in one transaction. The only direct writes allowed are
-- on rows that belong to the caller alone (their profile and preferences).

-- ---------------------------------------------------------------------------
-- Membership helpers (SECURITY DEFINER so policies on circle_members don't recurse)
-- ---------------------------------------------------------------------------

create or replace function public.member_role(p_circle uuid) returns text
language sql stable security definer set search_path = public as $$
  select role from public.circle_members where circle_id = p_circle and user_id = auth.uid()
$$;

create or replace function public.is_member(p_circle uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.circle_members where circle_id = p_circle and user_id = auth.uid())
$$;

create or replace function public.can_view_medication(p_circle uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case public.member_role(p_circle)
    when 'admin' then true
    when 'care_recipient' then true
    when 'caregiver' then true
    when 'family' then (select family_can_see_medication from public.care_circles where id = p_circle)
    else false
  end
$$;

create or replace function public.shares_circle_with(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.circle_members a
    join public.circle_members b on a.circle_id = b.circle_id
    where a.user_id = auth.uid() and b.user_id = p_user
  )
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.care_circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.care_profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.medication_details enable row level security;
alter table public.appointment_details enable row level security;
alter table public.task_occurrences enable row level security;
alter table public.care_updates enable row level security;
alter table public.acknowledgements enable row level security;
alter table public.activity_events enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.invitations enable row level security;
alter table public.follow_up_contacts enable row level security;
alter table public.user_preferences enable row level security;

-- ---------------------------------------------------------------------------
-- Privileges: anonymous visitors get nothing; signed-in users read, and write only their own rows
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;

grant usage on schema public to authenticated;
grant select on
  public.profiles, public.care_circles, public.circle_members, public.care_profiles, public.tasks,
  public.medication_details, public.appointment_details, public.task_occurrences, public.care_updates,
  public.acknowledgements, public.activity_events, public.notifications, public.notification_deliveries,
  public.follow_up_contacts, public.user_preferences
to authenticated;
-- Admins may list invitations, but never read the token hash.
grant select (id, circle_id, role, label, created_by, created_at, expires_at, accepted_at, accepted_by, revoked_at)
  on public.invitations to authenticated;

grant update (display_name, time_zone) on public.profiles to authenticated;
grant update (quiet_start, quiet_end, in_app, email, push) on public.user_preferences to authenticated;

-- Function privileges are set at the end of 0003_functions.sql, once every function exists.

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_circle_with(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and public._valid_time_zone(time_zone));

create policy circles_select on public.care_circles for select to authenticated
  using (public.is_member(id));

create policy members_select on public.circle_members for select to authenticated
  using (public.is_member(circle_id));

create policy care_profiles_select on public.care_profiles for select to authenticated
  using (public.is_member(circle_id));

create policy tasks_select on public.tasks for select to authenticated
  using (public.is_member(circle_id));

create policy medication_select on public.medication_details for select to authenticated
  using (public.can_view_medication(circle_id));

create policy appointment_select on public.appointment_details for select to authenticated
  using (public.is_member(circle_id));

create policy occurrences_select on public.task_occurrences for select to authenticated
  using (public.is_member(circle_id));

create policy updates_select on public.care_updates for select to authenticated
  using (public.is_member(circle_id) and (visibility = 'circle' or author_id = auth.uid()));

create policy acks_select on public.acknowledgements for select to authenticated
  using (public.is_member(circle_id));

create policy activity_select on public.activity_events for select to authenticated
  using (public.is_member(circle_id));

create policy notifications_select on public.notifications for select to authenticated
  using (recipient_id = auth.uid());

create policy deliveries_select on public.notification_deliveries for select to authenticated
  using (exists (select 1 from public.notifications n where n.id = notification_id and n.recipient_id = auth.uid()));

create policy invitations_select on public.invitations for select to authenticated
  using (public.member_role(circle_id) = 'admin');

create policy follow_up_select on public.follow_up_contacts for select to authenticated
  using (public.is_member(circle_id));

create policy preferences_select on public.user_preferences for select to authenticated
  using (user_id = auth.uid());
create policy preferences_update on public.user_preferences for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
