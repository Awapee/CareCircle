import { useEffect, useMemo, useState } from 'react';
import { createBrowserRouter, createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createQueryClient } from '@/api/ApiProvider';
import { createAccountsApi, createDemoApi } from '@/api/createApi';
import { AppProviders } from './AppProviders';
import { demoRoutes, routes } from './routes';
import { initialWorld, MEMORY_ROUTER, setWorldRuntime, worldBasename, type World } from './worlds';

/**
 * Builds one "world" (website or walkthrough): its own backend, query cache and router.
 * VITE_MEMORY_ROUTER=true builds a copy that runs from a single file with no server-side
 * routing (e.g. an embedded preview), so routes live in memory instead of the address bar.
 */
function buildWorld(world: World, path: string) {
  const table = world === 'demo' ? demoRoutes : routes;
  return {
    api: world === 'demo' ? createDemoApi() : createAccountsApi(),
    queryClient: createQueryClient(),
    router: MEMORY_ROUTER
      ? createMemoryRouter(table, { initialEntries: [path] })
      : createBrowserRouter(table, { basename: worldBasename(world) }),
  };
}

export function Root() {
  const [place, setPlace] = useState<{ world: World; path: string; n: number }>(() => ({
    world: initialWorld(),
    path: '/',
    n: 0,
  }));
  const built = useMemo(() => buildWorld(place.world, place.path), [place]);
  setWorldRuntime(place.world, (world, path) => setPlace((p) => ({ world, path, n: p.n + 1 })));
  useEffect(() => {
    if (MEMORY_ROUTER) window.scrollTo(0, 0);
  }, [place]);
  return (
    <AppProviders key={place.n} api={built.api} queryClient={built.queryClient}>
      <RouterProvider router={built.router} />
    </AppProviders>
  );
}
