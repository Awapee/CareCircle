-- Milestone 8: deleting an account or a whole circle.
-- Deleting an account removes the profile and personal preferences. Shared history that others rely on stays,
-- with the person's name replaced by "A former member" (docs/ARCHITECTURE.md §2).

create or replace function public._regex_escape(p text) returns text
language sql immutable as $$ select regexp_replace(p, '([.*+?^${}()|\[\]\\])', '\\\1', 'g') $$;

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := public._uid();
  pattern text := '\m' || public._regex_escape(public._display_name(me)) || '\M';
begin
  if exists (
    select 1 from circle_members m
    where m.user_id = me and m.role = 'admin' and public._admin_count(m.circle_id) = 1
      and exists (select 1 from circle_members o where o.circle_id = m.circle_id and o.user_id <> me)
  ) then
    raise exception 'You’re the only admin of a circle with other members. Make someone else an admin first, or delete the circle.'
      using errcode = 'CC400';
  end if;

  -- Circles where this person is the only member go with the account.
  delete from care_circles c
  where exists (select 1 from circle_members m where m.circle_id = c.id and m.user_id = me)
    and not exists (select 1 from circle_members m where m.circle_id = c.id and m.user_id <> me);

  -- Private notes were only ever theirs.
  delete from care_updates where author_id = me and visibility = 'private';

  -- Shared history keeps what happened, but not who.
  update activity_events set summary = regexp_replace(summary, pattern, 'A former member', 'g')
  where circle_id in (select circle_id from circle_members where user_id = me);

  -- Cascades to the profile, memberships, preferences and notifications; shared rows keep a null actor.
  delete from auth.users where id = me;
end $$;

/** Deletes a circle and everything in it. The admin must type the circle's name to confirm. */
create or replace function public.delete_circle(p_circle uuid, p_confirm_name text)
returns void language plpgsql security definer set search_path = public as $$
declare c care_circles;
begin
  perform public._require_role(p_circle, array['admin']);
  select * into c from care_circles where id = p_circle;
  if trim(p_confirm_name) <> c.name then
    raise exception 'Type the circle’s name exactly to confirm.' using errcode = 'CC400';
  end if;
  delete from care_circles where id = p_circle;
end $$;

revoke all on function public._regex_escape(text), public.delete_my_account(), public.delete_circle(uuid, text)
  from public, anon, authenticated;
grant execute on function public.delete_my_account(), public.delete_circle(uuid, text) to authenticated;
