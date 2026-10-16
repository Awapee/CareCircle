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

## Next: Milestone 2 — Core rules & database

Shared types and validation, task status rules, recurrence with time zones, permission matrix, dashboard metrics (all
unit-tested); Supabase SQL schema with row-level security, tested against a local PostgreSQL database.
