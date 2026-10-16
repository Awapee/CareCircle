import { render } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { createQueryClient } from '@/api/ApiProvider';
import { DemoApi } from '@/api/demo/DemoApi';
import { buildSeed } from '@/api/demo/seed';
import type { CareCircleApi } from '@/api/types';
import { AppProviders } from '@/app/AppProviders';
import { routes } from '@/app/routes';

/** A demo backend with fresh fictional data, signed in as `userId` (or signed out with null). */
export function demoApi(userId: string | null = 'demo-priya', now = new Date()): DemoApi {
  const db = buildSeed(now);
  db.sessionUserId = userId;
  return new DemoApi({ db, clock: () => now });
}

/** Renders the real route table at a given URL, so tests exercise the same navigation users do. */
export function renderRoute(path: string, api: CareCircleApi = demoApi(null)) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, retry: false } });
  return {
    router,
    api,
    ...render(
      <AppProviders api={api} queryClient={queryClient}>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  };
}
