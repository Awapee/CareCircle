import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ApiError, type CareCircleApi, type Session } from './types';

interface ApiContextValue {
  api: CareCircleApi;
  /** `undefined` while the session is still loading. */
  session: Session | null | undefined;
}

const ApiContext = createContext<ApiContextValue | null>(null);

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // Don't retry errors the user has to act on (signed out, not allowed, not found).
        retry: (count, error) => !(error instanceof ApiError && error.code !== 'network') && count < 2,
      },
    },
  });
}

/** Provides the data interface, the current session and the query cache to the whole app. */
export function ApiProvider({
  api,
  queryClient,
  children,
}: {
  api: CareCircleApi;
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider api={api}>{children}</SessionProvider>
    </QueryClientProvider>
  );
}

function SessionProvider({ api, children }: { api: CareCircleApi; children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    api.getSession().then((s) => active && setSession(s));
    const unsubscribe = api.onSessionChange((s) => {
      setSession((prev) => {
        // A different person means different data: drop everything cached for the previous one.
        if (prev?.userId !== s?.userId) queryClient.clear();
        return s;
      });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [api, queryClient]);

  // The demo runs its scheduler in the browser while the tab is open.
  useEffect(() => {
    if (api.mode !== 'demo' || !session) return;
    const demo = api as CareCircleApi & { tick(): void };
    const id = window.setInterval(() => {
      demo.tick();
      queryClient.invalidateQueries();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [api, session, queryClient]);

  return <ApiContext.Provider value={{ api, session }}>{children}</ApiContext.Provider>;
}

export function useApi(): CareCircleApi {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApi must be used inside <ApiProvider>');
  return ctx.api;
}

export function useSession(): Session | null | undefined {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useSession must be used inside <ApiProvider>');
  return ctx.session;
}
