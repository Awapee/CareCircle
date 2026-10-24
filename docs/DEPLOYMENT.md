# Deployment guide

CareCircle is a static site: one build (`npm run build`) produces a `dist/` folder that any static host can serve.
Real accounts use a Supabase project. The guided walkthrough at `/demo` always uses the built-in demo backend
(sample data in the visitor's browser), so it works with or without Supabase and never touches real accounts.

## GitHub Pages (how the public site runs)

`.github/workflows/deploy.yml` builds and publishes the site on every push to `main`.

1. Repository **Settings → Pages → Source**: **GitHub Actions** (already set).
2. Push to `main`. The **Actions** tab shows the run; when it's green, the site is at
   `https://<user>.github.io/CareCircle/`.

How it works:

- `BASE_PATH=/CareCircle/` makes every link and file path start with the repository name.
- GitHub Pages can't route `/CareCircle/app/planner` to the app, so the workflow copies `index.html` to `404.html`.
  Deep links work, but the browser console shows a 404 for them. That's expected.
- To deploy a fork or a renamed repository, change `BASE_PATH` to `/<repository-name>/`. For a custom domain or a
  `<user>.github.io` repository, use `/`.

## Switching on real accounts

1. Set up a Supabase project by following [`supabase/README.md`](../supabase/README.md) (migrations `0001`–`0005`, in
   order).
2. In GitHub: **Settings → Secrets and variables → Actions → Variables**, add:

   | Name                     | Value                                                |
   | ------------------------ | ---------------------------------------------------- |
   | `VITE_SUPABASE_URL`      | Project URL (Supabase → Project Settings → API)      |
   | `VITE_SUPABASE_ANON_KEY` | The `anon` / publishable key (designed to be public) |
   | `VITE_DEMO_MODE`         | `false`                                              |

   Never use the `service_role` key here or anywhere in the frontend.

3. In Supabase → **Authentication → URL Configuration**, set the **Site URL** to the deployed address and add it to
   **Redirect URLs** (for example `https://<user>.github.io/CareCircle/**`), so password-reset and confirmation emails
   link back to the site.
4. Re-run the deploy (Actions → Deploy to GitHub Pages → **Run workflow**). **Get started** and **Create an account**
   then offer real sign-up. The walkthrough at `/demo` keeps working as before.

Until these are set, the sign-in and sign-up pages say accounts are almost ready and point to the walkthrough. To
switch accounts off again, set `VITE_DEMO_MODE` to `true` and re-run the deploy.

## Other static hosts (Netlify, Vercel, Cloudflare Pages)

- Build command `npm run build`, output folder `dist`, Node 20.19 or newer.
- Add a rewrite from every path to `/index.html` (the app does its own routing), instead of the `404.html` copy.
- Set the same three `VITE_` variables in the host's environment settings.

## Installing and offline use

The site has a web app manifest (`public/manifest.webmanifest`) and a service worker (`public/sw.js`), so people can
add it to their home screen. Once visited, the app opens without a connection:

- Pages are fetched from the network first and fall back to the last copy, so a new deploy shows up on the next visit
  with a connection.
- Built files have content-hashed names and are cached on first use.
- Requests to Supabase are never cached. With real accounts, offline means reading what's already on screen; the app
  shows a "You're offline" banner and changes fail until the connection returns. The demo works fully offline because
  its data lives in the browser.

If a change to `sw.js` itself must reach everyone at once, bump `CACHE` at the top of the file.

## Checks before a release

```bash
npm run check      # formatting, types, lint, unit + database tests, build
npm run test:e2e   # browser tests: accessibility, layout, journeys, offline
```

After deploying, open the site, choose **Start the walkthrough** (or sign in), and load a deep link such as
`/demo/app/settings` directly.
