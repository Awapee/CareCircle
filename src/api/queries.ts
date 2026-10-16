import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi, useSession } from './ApiProvider';
import type { CareCircleApi } from './types';

/**
 * Data hooks. Every page reads through these, so loading, error and refresh behaviour is the
 * same everywhere. Keys start with the user ID so switching person never shows stale data.
 */

function useUserKey() {
  return useSession()?.userId ?? 'anonymous';
}

export function useProfile() {
  const api = useApi();
  const user = useUserKey();
  return useQuery({ queryKey: [user, 'profile'], queryFn: () => api.getProfile() });
}

export function usePreferences() {
  const api = useApi();
  const user = useUserKey();
  return useQuery({ queryKey: [user, 'preferences'], queryFn: () => api.getPreferences() });
}

export function useMyCircles(enabled = true) {
  const api = useApi();
  const user = useUserKey();
  return useQuery({ queryKey: [user, 'circles'], queryFn: () => api.listMyCircles(), enabled });
}

export function useCircleBundle(circleId: string | null) {
  const api = useApi();
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'circle', circleId, 'bundle'],
    queryFn: () => api.getCircle(circleId!),
    enabled: !!circleId,
  });
}

export function useTasks(circleId: string) {
  const api = useApi();
  const user = useUserKey();
  return useQuery({ queryKey: [user, 'circle', circleId, 'tasks'], queryFn: () => api.listTasks(circleId) });
}

export function useOccurrences(circleId: string, fromIso: string, toIso: string) {
  const api = useApi();
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'circle', circleId, 'occurrences', fromIso, toIso],
    queryFn: () => api.listOccurrences(circleId, fromIso, toIso),
  });
}

export function useUpdates(circleId: string) {
  const api = useApi();
  const user = useUserKey();
  return useQuery({ queryKey: [user, 'circle', circleId, 'updates'], queryFn: () => api.listUpdates(circleId) });
}

export function useActivity(circleId: string, limit = 200) {
  const api = useApi();
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'circle', circleId, 'activity', limit],
    queryFn: () => api.listActivity(circleId, limit),
  });
}

export function useInvitations(circleId: string, enabled: boolean) {
  const api = useApi();
  const user = useUserKey();
  return useQuery({
    queryKey: [user, 'circle', circleId, 'invitations'],
    queryFn: () => api.listInvitations(circleId),
    enabled,
  });
}

export function useNotifications() {
  const api = useApi();
  const user = useUserKey();
  return useQuery({ queryKey: [user, 'notifications'], queryFn: () => api.listNotifications() });
}

/**
 * Runs a write and refreshes every query afterwards. Writes are infrequent and touch several
 * views at once (a completed task changes the dashboard, planner, activity and notifications),
 * so refreshing everything is simpler and safer than tracking each dependency.
 */
export function useAction<TArgs, TResult = unknown>(fn: (api: CareCircleApi, args: TArgs) => Promise<TResult>) {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: TArgs) => fn(api, args),
    onSettled: () => queryClient.invalidateQueries(),
  });
}
