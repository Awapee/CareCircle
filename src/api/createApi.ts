import { DemoApi } from './demo/DemoApi';
import { SupabaseApi } from './supabase/SupabaseApi';
import type { CareCircleApi } from './types';
import { createUnavailableApi } from './unavailable/UnavailableApi';

/**
 * Chooses the backend for real accounts. Supabase is used when it's configured (and
 * VITE_DEMO_MODE isn't "true"); otherwise accounts are honestly reported as unavailable.
 * The demo always runs separately, on its own `/demo` section with `DemoApi`.
 */
export function createAccountsApi(env: ImportMetaEnv = import.meta.env): CareCircleApi {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  const forceDemo = env.VITE_DEMO_MODE === 'true';
  if (!forceDemo && url && key) return new SupabaseApi(url, key);
  return createUnavailableApi();
}

export function createDemoApi(): DemoApi {
  return new DemoApi();
}

export function isDemo(api: CareCircleApi): api is DemoApi {
  return api.mode === 'demo';
}

/** True when people can create real accounts and sign in on this site. */
export function accountsAvailable(api: CareCircleApi): boolean {
  return api.mode === 'supabase';
}
