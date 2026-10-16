import { DemoApi } from './demo/DemoApi';
import { SupabaseApi } from './supabase/SupabaseApi';
import type { CareCircleApi } from './types';

/**
 * Chooses the backend. Demo mode is used when VITE_DEMO_MODE is "true", or when Supabase isn't
 * configured, so the app always works, and is always honest about which mode it's in.
 */
export function createApi(env: ImportMetaEnv = import.meta.env): CareCircleApi {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  const forceDemo = env.VITE_DEMO_MODE === 'true';
  if (!forceDemo && url && key) return new SupabaseApi(url, key);
  return new DemoApi();
}

export function isDemo(api: CareCircleApi): api is DemoApi {
  return api.mode === 'demo';
}
