import { ApiError, type CareCircleApi, type Session } from '../types';

/**
 * Stands in for real accounts until a Supabase project is connected. Nobody is ever signed in,
 * and every other call fails with a clear message, so the site never pretends accounts exist.
 */
export function createUnavailableApi(): CareCircleApi {
  const known: Partial<CareCircleApi> = {
    mode: 'unavailable',
    getSession: async (): Promise<Session | null> => null,
    onSessionChange: () => () => {},
  };
  return new Proxy(known as CareCircleApi, {
    get(target, prop: string) {
      if (prop in target) return target[prop as keyof CareCircleApi];
      // Promise-like checks (`then`) must not look like an API method.
      if (prop === 'then') return undefined;
      return async () => {
        throw new ApiError('invalid', 'Accounts aren’t switched on for this site yet.');
      };
    },
  });
}
