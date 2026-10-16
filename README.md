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

| Area                                                | Status                      |
| --------------------------------------------------- | --------------------------- |
| Design system, landing page, info pages, app layout | ✅ Milestone 1              |
| Real sign-in, saved data (Supabase), demo mode      | ⏳ Planned (Milestones 2–3) |
| Dashboard, planner, tasks, medication, appointments | ⏳ Planned (Milestones 4–5) |
| Care circle, invitations, activity, notifications   | ⏳ Planned (Milestones 6–7) |

The app pages under `/app` currently show clearly labelled placeholders — they contain no data and no controls.

## Tech stack

React 19 + TypeScript, Vite, Tailwind CSS v4, React Router, Radix UI (accessible dialogs), lucide icons.
Testing: Vitest + Testing Library (unit), Playwright + axe-core (browser and accessibility).
Planned: Supabase (Postgres, Auth, row-level security, scheduled jobs) and TanStack Query.

## Getting started

Requirements: **Node.js 20.19 or newer** (check with `node -v`).

Run these in a terminal, inside the project folder:

```bash
npm install          # install dependencies (first time only)
npm run dev          # start the development server, then open the URL it prints (usually http://localhost:5173)
```

### Environment variables

Not needed yet. From Milestone 3, copy `.env.example` to `.env.local` and fill in your Supabase project URL and
**anon** key. Never commit `.env.local`, and never put the Supabase `service_role` key in frontend code.

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
  app/            route table and navigation config
  components/
    ui/           reusable design-system components (Button, Card, Badge, Sheet…)
    layout/       public layout, app shell, info-page layout
    brand/        logo
  pages/          one file per page (public/ and app/)
  lib/            small shared helpers and hooks
  styles/         design tokens (colours, fonts) and base styles
  test/           test setup and helpers
tests/e2e/        Playwright browser tests
docs/             architecture, permissions plan and progress log
```
