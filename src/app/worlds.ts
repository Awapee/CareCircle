/**
 * The site has two separate "worlds" that never share data:
 * - `main`: the website and real accounts (Supabase), at the site root.
 * - `demo`: the guided walkthrough with fictional data in this browser, under `/demo`.
 *
 * Each world gets its own backend and router (the demo router uses `/demo` as its basename, so
 * every in-app link like `/app/planner` stays inside the demo). Moving between worlds is a full
 * page load, or, in the single-file preview (memory router), a swap of the whole app.
 */

export type World = 'main' | 'demo';

export const DEMO_PREFIX = '/demo';
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const MEMORY_ROUTER = import.meta.env.VITE_MEMORY_ROUTER === 'true';

let current: World = 'main';
let switcher: ((world: World, path: string) => void) | null = null;

export function isDemoPath(pathname: string): boolean {
  const demoBase = BASE + DEMO_PREFIX;
  return pathname === demoBase || pathname.startsWith(`${demoBase}/`);
}

/** Which world this page load starts in. */
export function initialWorld(): World {
  if (MEMORY_ROUTER || typeof window === 'undefined') return 'main';
  return isDemoPath(window.location.pathname) ? 'demo' : 'main';
}

export function worldBasename(world: World): string {
  return (world === 'demo' ? BASE + DEMO_PREFIX : BASE) || '/';
}

/** The address of `path` inside `world`, for a plain link. */
export function worldHref(world: World, path = '/'): string {
  return `${world === 'demo' ? BASE + DEMO_PREFIX : BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function currentWorld(): World {
  return current;
}

/** Called by the app root whenever it renders a world. */
export function setWorldRuntime(world: World, swap: ((world: World, path: string) => void) | null) {
  current = world;
  switcher = swap;
}

export function goToWorld(world: World, path = '/') {
  if (MEMORY_ROUTER && switcher) switcher(world, path);
  else window.location.assign(worldHref(world, path));
}
