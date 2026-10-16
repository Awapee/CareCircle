-- CareCircle schema. See docs/ARCHITECTURE.md §2.
-- All timestamps are timestamptz (UTC). Local dates/times are stored with the circle's IANA time zone.

-- ---------------------------------------------------------------------------
-- Validation helpers used by CHECK constraints
-- ---------------------------------------------------------------------------

create or replace function public._valid_hhmm(t text) returns boolean
language sql immutable as $$ select t ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' $$;

create or replace function public._valid_times(ts text[]) returns boolean
language sql immutable as $$
  select coalesce(array_length(ts, 1), 0) between 1 and 8
     and not exists (select 1 from unnest(ts) x where not public._valid_hhmm(x))
$$;

create or replace function public._valid_recurrence(r jsonb) returns boolean
language sql immutable as $$
  select case r->>'kind'
    when 'once' then true
    when 'daily' then true
    when 'weekly' then jsonb_typeof(r->'days') = 'array'
      and jsonb_array_length(r->'days') between 1 and 7
      and not exists (
        select 1 from jsonb_array_elements_text(r->'days') d where d !~ '^[1-7]$'
      )
    when 'interval' then (r->>'everyDays') ~ '^[0-9]+$' and (r->>'everyDays')::int between 2 and 90
    else false
  end
$$;

create or replace function public._valid_time_zone(tz text) returns boolean
language sql stable as $$ select exists (select 1 from pg_timezone_names where name = tz) $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  time_zone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table public.care_circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  time_zone text not null,
  family_can_see_medication boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  version integer not null default 1
);

create table public.circle_members (
  circle_id uuid not null references public.care_circles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('admin', 'care_recipient', 'caregiver', 'family', 'read_only')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index circle_members_user_idx on public.circle_members (user_id);

create table public.care_profiles (
  circle_id uuid primary key references public.care_circles (id) on delete cascade,
  preferred_name text not null check (char_length(preferred_name) between 1 and 80),
  shared_notes text not null default '' check (char_length(shared_notes) <= 1000),
  version integer not null default 1
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.care_circles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  category text not null check (category in ('medication', 'meal', 'hydration', 'routine', 'appointment', 'other')),
  notes text not null default '' check (char_length(notes) <= 1000),
  recurrence jsonb not null check (public._valid_recurrence(recurrence)),
  times text[] not null check (public._valid_times(times)),
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  assignee_id uuid references public.profiles (id) on delete set null,
  follow_up_minutes integer not null default 30 check (follow_up_minutes between 5 and 1440),
  reminder_minutes_before integer check (reminder_minutes_before between 0 and 1440),
  paused_at timestamptz,
  version integer not null default 1,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_circle_idx on public.tasks (circle_id);

create table public.medication_details (
  task_id uuid primary key references public.tasks (id) on delete cascade,
  circle_id uuid not null references public.care_circles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  instructions text not null default '' check (char_length(instructions) <= 500)
);

create table public.appointment_details (
  task_id uuid primary key references public.tasks (id) on delete cascade,
  circle_id uuid not null references public.care_circles (id) on delete cascade,
  location text not null default '' check (char_length(location) <= 200),
  meeting_link text not null default '' check (
    char_length(meeting_link) <= 500 and (meeting_link = '' or meeting_link ~ '^https://\S+$')
  ),
  professional text not null default '' check (char_length(professional) <= 120)
);

create table public.task_occurrences (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  circle_id uuid not null references public.care_circles (id) on delete cascade,
  -- The series slot this occurrence fills. Never changes, so regenerating can't duplicate it.
  occurrence_date date not null,
  local_time text not null check (public._valid_hhmm(local_time)),
  -- When it actually happens. Differs from the slot only when this one occurrence was rescheduled.
  scheduled_at timestamptz not null,
  time_override text check (time_override is null or public._valid_hhmm(time_override)),
  outcome text check (outcome in ('completed', 'taken', 'not_taken', 'skipped', 'cancelled')),
  outcome_by uuid references public.profiles (id) on delete set null,
  outcome_at timestamptz,
  note text not null default '' check (char_length(note) <= 500),
  title_override text check (title_override is null or char_length(title_override) between 1 and 120),
  assignee_override uuid references public.profiles (id) on delete set null,
  follow_up_logged_at timestamptz,
  version integer not null default 1,
  unique (task_id, occurrence_date, local_time)
);
create index task_occurrences_circle_time_idx on public.task_occurrences (circle_id, scheduled_at);

create table public.care_updates (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.care_circles (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 1000),
  visibility text not null check (visibility in ('circle', 'private')),
  occurrence_id uuid references public.task_occurrences (id) on delete set null,
  created_at timestamptz not null default now()
);
create index care_updates_circle_idx on public.care_updates (circle_id, created_at desc);

create table public.acknowledgements (
  update_id uuid not null references public.care_updates (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  circle_id uuid not null references public.care_circles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (update_id, user_id)
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.care_circles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null,
  summary text not null check (char_length(summary) <= 300),
  subject_id uuid,
  created_at timestamptz not null default now()
);
create index activity_events_circle_idx on public.activity_events (circle_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.care_circles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('reminder', 'follow_up', 'update', 'circle')),
  title text not null,
  body text not null default '',
  occurrence_id uuid references public.task_occurrences (id) on delete set null,
  dedupe_key text not null unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  channel text not null check (channel in ('email', 'push')),
  status text not null check (status in ('pending', 'sent', 'failed', 'not_configured')),
  attempts integer not null default 0,
  last_error text,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  unique (notification_id, channel)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.care_circles (id) on delete cascade,
  -- SHA-256 of the random token. The token itself is never stored.
  token_hash text not null unique,
  role text not null check (role in ('admin', 'care_recipient', 'caregiver', 'family', 'read_only')),
  label text not null default '' check (char_length(label) <= 60),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz
);

create table public.follow_up_contacts (
  circle_id uuid not null,
  user_id uuid not null,
  primary key (circle_id, user_id),
  foreign key (circle_id, user_id) references public.circle_members (circle_id, user_id) on delete cascade
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  quiet_start text check (quiet_start is null or public._valid_hhmm(quiet_start)),
  quiet_end text check (quiet_end is null or public._valid_hhmm(quiet_end)),
  in_app boolean not null default true,
  email boolean not null default false,
  push boolean not null default false
);

-- ---------------------------------------------------------------------------
-- New auth users get a profile and default preferences
-- ---------------------------------------------------------------------------

create or replace function public._handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, time_zone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(coalesce(new.email, 'Member'), '@', 1)),
    case when public._valid_time_zone(new.raw_user_meta_data->>'time_zone')
      then new.raw_user_meta_data->>'time_zone' else 'UTC' end
  );
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public._handle_new_user();
