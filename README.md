# CareCircle

**One circle. Shared care.**

CareCircle is a family-connected daily-care coordination web app. It helps a person organise their daily routines
— tasks, medication reminders, meals, hydration and appointments — and lets authorised family members and caregivers
coordinate and stay informed.

> CareCircle is **not** a medical, diagnostic, prescription or emergency service. See
> [`src/pages/public/LimitationsPage.tsx`](src/pages/public/LimitationsPage.tsx) for the appropriate-use statement shown in the app.

## Project status

Student project, built in milestones. See [`docs/PROGRESS.md`](docs/PROGRESS.md) for what is implemented and tested, and
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the overall plan, data model and permission design.

| Area                                                  | Status                   |
| ----------------------------------------------------- | ------------------------ |
| Design system, landing page, info pages, app layout   | ✅ Milestone 1           |
| Domain rules, database schema, row-level security     | ✅ Milestone 2           |
| Data layer, sign-in, onboarding, demo mode            | ✅ Milestone 3           |
| Dashboard, planner, task management                   | ✅ Milestone 4           |
| Medication, meals/hydration/routines, appointments    | ✅ Milestone 5           |
| Care circle, invitations, activity feed, care updates | ✅ Milestone 6           |
| Notification centre, follow-up, scheduling            | ✅ Milestone 7           |
| Profile & settings, data export & deletion            | ✅ Milestone 8           |
| Hardening, deployment guide                           | ⏳ Planned (Milestone 9) |

Without Supabase configured, the app runs in **demo mode**: a fictional care circle stored only in your browser, with a
permanent "Demo mode, simulated" banner. That's how the public GitHub Pages site runs. To use real accounts, follow
[`supabase/README.md`](supabase/README.md).

## Tech stack

React 19 + TypeScript, Vite, Tailwind CSS v4, React Router, Radix UI (accessible dialogs), lucide icons, TanStack
Query, React Hook Form + Zod, date-fns with `@date-fns/tz`.
Backend: Supabase (Postgres, Auth, row-level security, `pg_cron`), or the built-in demo backend.
Testing: Vitest + Testing Library (unit and journeys), PGlite (database and RLS tests against the real migrations),
Playwright + axe-core (browser and accessibility).

## Getting started

Requirements: **Node.js 20.19 or newer** (check with `node -v`).

Run these in a terminal, inside the project folder:

```bash
npm install          # install dependencies (first time only)
npm run dev          # start the development server, then open the URL it prints (usually http://localhost:5173)
```

### Environment variables

Not needed for demo mode. For real accounts, copy `.env.example` to `.env.local`, fill in your Supabase project URL and
**anon** key, and set `VITE_DEMO_MODE=false`. Never commit `.env.local`, and never put the Supabase `service_role` key
in frontend code. See [`supabase/README.md`](supabase/README.md).

## Quality checks

```bash
npm run check        # formatting, type check, lint, unit tests and production build — run before every commit
npm run test         # unit tests only
npm run test:e2e     # browser tests (accessibility, responsive layout, keyboard navigation)
```

The first time you run browser tests on your own computer, install the test browser once:

```bash
npx playwright install chromium
```

(If you are in an environment with a pre-installed Chromium, point to it with `PW_CHROMIUM_PATH=/path/to/chromium`.)

## Project structure

```
src/
  domain/         shared types and rules: status, recurrence, permissions, validation (no React, no backend)
  api/            the CareCircleApi interface, its two backends (supabase/, demo/) and data hooks
  app/            route table, navigation, session and active-circle context
  features/tasks/ schedule hooks, occurrence list and dialogs, task form (shared by several pages)
  components/
    ui/           reusable design-system components (Button, Card, Dialog, Field, Toast…)
    layout/       public layout, app shell, info-page layout
    brand/        logo
  pages/          one file per page (public/, auth/ and app/)
  lib/            small shared helpers and hooks
  styles/         design tokens (colours, fonts) and base styles
  test/           test setup and helpers
supabase/
  migrations/     SQL schema, row-level security, write functions and the scheduler
  tests/          database tests (run in PGlite as part of `npm test`)
tests/e2e/        Playwright browser tests
docs/             architecture, permissions plan and progress log
```
