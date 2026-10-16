# Progress log

A short, honest record of what has been implemented, what has been verified and what remains.

## Milestone 1 — Foundation & design system ✅

**Implemented**

- Vite + React 19 + TypeScript project with strict type checking, ESLint (including `jsx-a11y` accessibility rules),
  Prettier, Vitest and Playwright.
- Design tokens in `src/styles/index.css`: muted-teal brand, warm-yellow accent, neutral greys, status colours. Text
  colours checked against WCAG AA contrast.
- UI components: `Button` / `ButtonLink` (loading state blocks duplicate submits), `Card`, `Badge`, `Notice`,
  `EmptyState`, `PageHeader`, `Container`, `Sheet` (accessible slide-in menu built on Radix Dialog), logo.
- Public site: landing page (hero, problem, features, how it works, benefits, boundaries, final call to action), Get
  Started, About, Contact, Privacy Policy (draft), Terms of Use (draft), Limitations & appropriate use, 404 page and
  error page.
- App shell at `/app`: persistent sidebar on desktop; top bar, slide-in menu and bottom navigation on mobile and tablet.
  App pages are honest placeholders, labelled with the milestone they belong to, with no fake controls.
- Accessibility basics: skip link, visible focus ring, semantic landmarks, descriptive page titles, reduced-motion
  support, 44px+ touch targets.

**Verified (commands run, results inspected)**

- `npm run check`: formatting, type check, lint, 24 unit tests and production build all pass.
- `npm run test:e2e`: 44 Playwright tests pass on a desktop (1440px) and a mobile (Pixel 7) profile:
  - no axe-core WCAG 2.1 A/AA violations on 10 pages;
  - no horizontal overflow or clipped content at 320, 375, 768, 1024, 1440 and 1920px;
  - in-page anchors, skip link, mobile menu (opens, closes with Escape, returns focus), sidebar and bottom bar, page
    titles.
- Screenshots reviewed at mobile, tablet and desktop widths.

**Bugs found and fixed during verification**

- Footer text contrast was 4.47:1 (below the 4.5:1 minimum) → darkened the `ink-subtle` token.
- Closing the mobile menu didn't return keyboard focus to the menu button → the button is now the dialog's own trigger.
- Hero content was clipped on phones (a grid column grew to fit its widest child, and `overflow-hidden` hid the
  scrollbar). Fixed with `minmax(0, …)` columns. The overflow test now also detects clipped content, and was confirmed to
  fail on the old layout.
- The preview banner pushed the desktop sidebar's footer links off screen → moved the banner into the content column.

**Known limitations**

- No accounts, data or backend yet. "Create an account" is clearly marked as not available.
- Privacy Policy and Terms are drafts and are labelled as such.
- Contact page intentionally lists no contact address until a real, monitored one exists.

## Milestone 2 — Core rules & database ✅

**Implemented**

- `src/domain/`: shared types, `deriveStatus()`, recurrence with IANA time zones (08:00 stays 08:00 across daylight
  saving; times skipped by the clock change move forward), permission matrix, quiet hours, day metrics, Zod schemas.
- `supabase/migrations/`: schema with CHECK constraints mirroring the Zod limits; RLS on every table; all shared writes
  go through `SECURITY DEFINER` functions that check the caller's role, enforce `version` checks and log activity in
  one transaction. Users can write directly only to their own profile and preferences.
- Invitation tokens are 256-bit random values; only their SHA-256 hash is stored, and admins can't read the hash column.
- Occurrence slots are unique per `(task, date, local time)`; a rescheduled occurrence keeps its slot, so regenerating
  can never duplicate it.

**Verified**

- 22 domain unit tests (status boundaries, DST in London and New York, recurrence kinds, permissions, quiet hours
  across midnight, metrics, validation).
- 21 database tests running the real migrations in PGlite: anonymous visitors read nothing; a member of one circle
  can't read or change another circle's tasks, occurrences, members or profiles by ID; direct table writes are refused;
  medication visibility for Family follows the circle setting; Family can record only their own tasks; caregivers
  can't delete; read-only can't post; private notes stay private; the last admin can't leave; invitations work once
  and can be revoked; stale versions are rejected; the scheduler never duplicates occurrences or notifications and
  respects quiet hours.

**Bugs found and fixed during verification**

- `record_outcome` let a Family member record an **unassigned** task: `NULL = user` is `NULL`, which made the
  permission `IF` silently pass. Fixed with `IS NOT DISTINCT FROM`; the same pattern was fixed in
  `acknowledge_update`. The test that caught it stays in the suite.

## Milestone 3 — Data layer, authentication & onboarding, demo mode ✅

- `CareCircleApi` interface with `SupabaseApi` and `DemoApi`. Pages only use the interface, through TanStack Query hooks.
- Demo mode is chosen when Supabase isn't configured (or `VITE_DEMO_MODE=true`). It seeds a fictional circle (five
  people, one per role, a week of history) in `localStorage`, applies the same permission rules as the SQL functions,
  and runs the same scheduler logic every minute while the tab is open. A permanent banner says it's simulated, shows
  who you're viewing as, and offers "Switch person" and "Reset demo".
- Sign in / sign up (Supabase), "continue as" persona picker or empty account (demo), first-run circle setup,
  invitation landing page, sign-out, a route guard that returns people to where they were going.

## Milestone 4 — Dashboard, planner, task management ✅

- Dashboard: greeting, metrics from real occurrences, yesterday's items needing review, today's schedule, upcoming
  appointments, recent activity.
- Planner: day, week and 14-day views with date navigation; filters by type, status and person; "All tasks" with edit,
  pause/resume and delete (with confirmation).
- Task form for every category and recurrence kind, with multiple times, start/end dates, assignee, reminder and
  follow-up wait. Occurrence details: record an outcome with a note, clear it, change just this occurrence (title, time,
  assignee) or edit the whole series. Conflicting edits show a "someone else changed this" message.

## Milestone 5 — Medication, meals/hydration/routines, appointments ✅

- Medication page: today's doses, each medicine with its label instructions and what was recorded in the last 7 days
  (taken / not taken / skipped / no record), framed as a record, not adherence or advice. Family see that doses are
  scheduled but not names or instructions unless the circle allows it.
- Appointments page: upcoming and earlier appointments with who it's with, where, video link and who's going.
- Meals & routines page: meals, drinks and routines for today with progress.

## Milestone 6 — Care circle, invitations, activity, care updates ✅

- Members with roles; admins change roles and remove members; anyone can leave (never the last admin).
- Invitations by role with a label and expiry; the link is shown once with a copy button; list with status and cancel.
- Follow-up contacts, circle settings (name, time zone, Family medication visibility, shared notes) and a table of what
  each role can do.
- Updates feed (circle-wide or private notes) with "Mark as seen"; filterable history grouped by day.

## Milestone 7 — Notification centre, follow-up & scheduling ✅

- Scheduler (`run_scheduler()`, every minute via `pg_cron`; in the demo, every minute in the browser): rolling 14-day
  occurrences, reminders before tasks, follow-up after the waiting period or a "not taken" record, one history entry
  per follow-up, quiet hours respected (held until they end), at most one reminder and one follow-up per person per
  occurrence.
- Notification centre: unread/read, mark one or all as read, "Open task" deep links into the planner, unread badge in
  the navigation, in-app and quiet-hours preferences. Email and push are shown as "Not configured" and nothing is sent
  outside the app.

**Verified for Milestones 3–7**

- `npm test`: 93 tests (domain, database, demo backend parity, route tests and 14 user journeys through the real
  pages: demo sign-in, onboarding, one-tap recording, creating a task, validation errors, role-based hiding, medication
  visibility, invitations end to end, posting an update, notifications).
- `npm run test:e2e`: 64 Playwright tests on desktop and mobile: no axe WCAG 2.1 AA violations on every app page (as
  admin, family and read-only) and in the task, occurrence and invitation dialogs; no horizontal overflow on any app
  page at 320–1440px; recording and clearing an outcome; dialogs closing with Escape and returning focus; demo data
  surviving a reload and resetting.
- Screenshots of every page reviewed at 1440px and 390px.

**Bugs found and fixed during verification**

- On phones, task titles were cut to a few letters by the status and button → they now move to their own line.
- The roles table's screen-reader-only labels escaped its scroll area and widened the page → the area is now
  positioned, labelled and keyboard-focusable.
- Dialogs opened from page state didn't return keyboard focus to the button that opened them → fixed in `Dialog`.
- The dashboard's single-column grid grew wider than a 320px screen → fixed with an explicit `minmax(0, 1fr)` column.

**Known limitations**

- `SupabaseApi` hasn't been run against a live Supabase project yet (see `supabase/README.md`).
- Email and push delivery are not configured.
- Changing a circle's time zone doesn't move occurrences that already exist.
- Settings (profile, data export, account deletion) are Milestone 8 and still a labelled placeholder.

## Next: Milestone 8 — Profile & settings, privacy, data export & deletion
