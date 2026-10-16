import type { QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiProvider } from '@/api/ApiProvider';
import type { CareCircleApi } from '@/api/types';
import { ToastProvider } from '@/components/ui/Toast';

/** Everything the app needs around the router: data interface, query cache and toasts. */
export function AppProviders({
  api,
  queryClient,
  children,
}: {
  api: CareCircleApi;
  queryClient: QueryClient;
  children: ReactNode;
}) {
  return (
    <ApiProvider api={api} queryClient={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </ApiProvider>
  );
}
