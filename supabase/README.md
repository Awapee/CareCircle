# Connecting CareCircle to Supabase

Without these steps the app runs in demo mode. With them, people can create real accounts and share real circles.

## 1. Create a project

1. Sign in at [supabase.com](https://supabase.com) and create a new project. Choose a region close to your users.
2. In **Authentication → URL Configuration**, set the **Site URL** to where the app is hosted, e.g.
   `https://awapee.github.io/CareCircle/`, and add the same URL under **Redirect URLs**. Confirmation emails link here.

## 2. Apply the database migrations

In **SQL Editor**, run each file in `supabase/migrations/` in order (0001 to 0005):

| File                 | What it does                                                                            |
| -------------------- | --------------------------------------------------------------------------------------- |
| `0001_schema.sql`    | Tables, constraints, and a trigger that creates a profile for each new user             |
| `0002_security.sql`  | Row-level security: who can read what. Anonymous visitors can read nothing.             |
| `0003_functions.sql` | Every write (tasks, outcomes, invitations, members…) as a permission-checked function   |
| `0005_account.sql`   | Deleting an account (history kept, name removed) or a whole circle                      |
| `0004_schedule.sql`  | Runs the scheduler every minute. Enable **pg_cron** in **Database → Extensions** first. |

If you use the Supabase CLI instead, `supabase db push` applies the same files.

## 3. Point the app at it

In **Project Settings → API**, copy the **Project URL** and the **anon public** key. Then:

- **Locally:** copy `.env.example` to `.env.local`, fill in both values and set `VITE_DEMO_MODE=false`.
- **GitHub Pages:** add repository **Settings → Secrets and variables → Actions → Variables** named
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_DEMO_MODE` (`false`), and pass them to the build step in
  `.github/workflows/deploy.yml` (`env: VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}` and so on).

The anon key is designed to be public: row-level security protects the data. **Never** put the `service_role` key in
the app or in a repository variable.

## What is and isn't verified

- The migrations run as part of `npm test`, in PGlite (PostgreSQL compiled to WebAssembly) with a small stand-in for
  Supabase's `auth` schema. Those tests check cross-circle isolation, every role rule, private notes, invitation
  tokens, version conflicts, daylight-saving times and the scheduler.
- The `SupabaseApi` client code has not yet been run against a live Supabase project. Test sign-up, onboarding and
  an invitation end to end after connecting one.
- Email and push delivery are not configured. Notifications are in-app only, and deliveries are recorded as
  `not_configured`.
