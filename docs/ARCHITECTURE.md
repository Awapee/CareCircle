# CareCircle architecture & plan

This document records the main design decisions. It is a plan: sections marked _planned_ are not implemented yet (see
[`PROGRESS.md`](PROGRESS.md) for current status).

## 1. Key decisions

| Decision              | Choice                                                                        | Reason                                                                                 |
| --------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Frontend              | Vite + React + TypeScript single-page app                                     | The app sits behind sign-in, so server rendering adds complexity without much benefit. |
| Styling               | Tailwind CSS with design tokens in `src/styles/index.css`                     | One small, consistent palette; components reuse the same styles.                       |
| Accessible primitives | Radix UI                                                                      | Dialogs and menus with correct focus management and ARIA.                              |
| Server data           | TanStack Query (the only state library)                                       | Handles loading, error and stale states and cache refreshes.                           |
| Forms                 | React Hook Form + Zod                                                         | The same validation schemas on the client mirror database constraints.                 |
| Backend               | Supabase: Postgres, Auth, row-level security (RLS), `pg_cron`, Edge Functions | Real authentication and data protection enforced inside the database.                  |
| Dates                 | `date-fns` + `@date-fns/tz`                                                   | Time-zone and daylight-saving-correct calculations.                                    |

### One data interface, two backends

Every page talks to a single `CareCircleApi` TypeScript interface, which has two implementations:

- **Supabase backend:** real accounts and shared data, with access enforced by RLS.
- **Demo backend:** fictional, seeded data stored only in the browser, shown with a permanent "Demo mode, simulated"
  banner. It applies the same rules as the database functions.

Pages never import Supabase directly, so the backend can be swapped without rewriting the UI.

### Status: one source of truth

The database stores only the **recorded outcome** of a task occurrence: none yet, `completed`, `taken`, `not_taken`,
`skipped` or `cancelled`. The status a user sees is computed by a single, unit-tested `deriveStatus()` function from
that outcome, the scheduled time, the current time and the follow-up settings:

| Displayed status | Meaning                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Upcoming         | No outcome yet; scheduled time is in the future.                                                                                      |
| Pending          | No outcome yet; scheduled time has passed, still within the follow-up waiting period.                                                 |
| Needs review     | No outcome after the waiting period, or recorded as "not taken". This is a missed **confirmation**, not proof that anything is wrong. |
| Completed        | Recorded as completed or taken.                                                                                                       |
| Skipped          | Deliberately skipped.                                                                                                                 |
| Cancelled        | Cancelled.                                                                                                                            |

### Four separate events

These are recorded separately and never treated as the same thing:

1. A task is **due** (an occurrence reaches its scheduled time).
2. A notification is **generated** (a row in `notifications`).
3. A notification is **delivered** (a row in `notification_deliveries`, with status, attempts and errors).
4. Someone **records an outcome** (the occurrence's outcome fields).

### Recurring tasks

- A `tasks` row defines a series: category, recurrence rule, local time(s), start and end dates, assignee and settings.
- `task_occurrences` holds one row per scheduled instance, created for a rolling window ahead. A unique constraint on
  `(task_id, occurrence_date, local_time)` makes duplicate occurrences impossible, even if the scheduler runs twice.
- **Edit this occurrence:** change only that row (an override). **Edit the series:** update the task and regenerate
  future occurrences that have no outcome yet. Past records are never rewritten.
- Times are stored as **local wall-clock time plus the circle's IANA time zone** (e.g. `Europe/London`) and converted
  to `timestamptz` per occurrence, so "08:00 every day" stays at 08:00 across daylight-saving changes.

### Concurrent edits

Editable rows carry a `version` integer. Updates must state the version they started from. If someone else saved in
the meantime, the update is rejected and the user is asked to review the latest version instead of silently
overwriting it.

## 2. Data model

| Table                     | Purpose / key constraints                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`                | One per auth user: display name, time zone.                                                                                               |
| `care_circles`            | Name, time zone, circle-level settings (e.g. whether family members can see medication details).                                          |
| `circle_members`          | `(circle_id, user_id)` unique, `role`, joined date.                                                                                       |
| `care_profiles`           | Minimal profile of the person receiving care (preferred name, optional shared notes).                                                     |
| `tasks`                   | Series definition, `category`, recurrence, times, assignee, reminder and follow-up settings, `paused_at`, `version`, creator, timestamps. |
| `medication_details`      | 1:1 with medication tasks: name and user-entered instructions only.                                                                       |
| `appointment_details`     | 1:1 with appointment tasks: location, meeting link, professional or service name.                                                         |
| `task_occurrences`        | One per scheduled instance: `scheduled_at`, outcome, `outcome_by`, `outcome_at`, note, overrides, `version`.                              |
| `care_updates`            | Short updates and comments; visibility `circle` or `private` (author only).                                                               |
| `acknowledgements`        | Who acknowledged an update or follow-up, and when.                                                                                        |
| `activity_events`         | Append-only history: actor, type, subject, minimal non-sensitive payload, timestamp.                                                      |
| `notifications`           | In-app, per recipient; read state; `dedupe_key` unique to prevent duplicates.                                                             |
| `notification_deliveries` | One row per channel attempt: status, attempts, last error, next retry time.                                                               |
| `invitations`             | `token_hash` (SHA-256 of a random token; the token itself is never stored), role, expiry, accepted, revoked.                              |
| `follow_up_contacts`      | Which members receive follow-up for a circle.                                                                                             |
| `user_preferences`        | Quiet hours, channels, accessibility preferences.                                                                                         |

Deletion: removing a circle cascades to its data. Deleting an account removes the profile and personal preferences;
history rows others rely on keep a null or anonymised actor. All timestamps are `timestamptz` (UTC).

## 3. Roles & permissions _(enforced by the database, mirrored in the UI)_

| Action                             |    Admin    | Care recipient | Caregiver |             Family              | Read-only |
| ---------------------------------- | :---------: | :------------: | :-------: | :-----------------------------: | :-------: |
| View schedule & appointments       |      ✓      |       ✓        |     ✓     |                ✓                |     ✓     |
| View medication details            |      ✓      |       ✓        |     ✓     | circle setting (off by default) |     ✗     |
| Create / edit tasks                |      ✓      |       ✓        |     ✓     |                ✗                |     ✗     |
| Record outcomes                    |      ✓      |       ✓        |     ✓     |   only tasks assigned to them   |     ✗     |
| Delete tasks / series              |      ✓      |       ✓        |     ✗     |                ✗                |     ✗     |
| Post care updates                  |      ✓      |       ✓        |     ✓     |                ✓                |     ✗     |
| Manage members, invitations, roles |      ✓      |   view only    |     ✗     |                ✗                |     ✗     |
| Private notes                      | Author only |                |           |                                 |           |

The frontend hides actions a role cannot perform, but **the database is the real gatekeeper**: RLS decides what each
user can read, and every shared write goes through a `SECURITY DEFINER` function that checks the caller's role first
(direct table writes are refused). SQL tests in `supabase/tests/` verify that a user cannot read or change another
circle's data by altering an ID or calling the API directly.

## 4. Scheduling & notifications

- A `pg_cron` job runs a SQL function every minute. The function:
  1. creates upcoming occurrences;
  2. generates reminder notifications (idempotent via `dedupe_key`);
  3. marks follow-up as due for unconfirmed tasks after the waiting period, respecting quiet hours and reminder limits.

  Because each step is idempotent, a run that repeats or overlaps cannot create duplicates.

- Delivery beyond in-app (email, push) goes through an Edge Function with retries and recorded failures. Until a
  provider is configured, these channels are shown as **"Not configured"**.
- In demo mode, the same logic runs in the browser while the tab is open, and is labelled as a simulation.

## 5. Milestones

1. Foundation & design system ✅
2. Core rules & database (domain logic, SQL schema, RLS tests) ✅
3. Data layer, authentication & onboarding, demo mode ✅
4. Dashboard, planner, task management ✅
5. Medication, meals/hydration/routines, appointments ✅
6. Care circle, invitations, activity feed, care updates ✅
7. Notification centre, follow-up & scheduling ✅
8. Profile & settings, privacy, data export & deletion
9. Hardening: end-to-end journeys, accessibility, edge cases, deployment guide
