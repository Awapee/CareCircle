import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from '@/app/routes';
import '@/styles/index.css';

// VITE_MEMORY_ROUTER=true builds a copy that runs from a single file with no server-side
// routing (e.g. an embedded preview), so routes live in memory instead of the address bar.
const router =
  import.meta.env.VITE_MEMORY_ROUTER === 'true'
    ? createMemoryRouter(routes)
    : createBrowserRouter(routes, {
        basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
      });

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found in index.html');

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
