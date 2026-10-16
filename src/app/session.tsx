import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useSession } from '@/api/ApiProvider';
import { useCircleBundle, useMyCircles } from '@/api/queries';
import type { CircleBundle } from '@/api/types';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { can, type Action, type PermissionContext } from '@/domain/permissions';

/** Sends signed-out visitors to sign in, then brings them back. */
export function RequireSession({ children }: { children: ReactNode }) {
  const session = useSession();
  const location = useLocation();
  if (session === undefined) return <LoadingState className="min-h-dvh" />;
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search + location.hash);
    return <Navigate to={`/sign-in?next=${next}`} replace />;
  }
  return <>{children}</>;
}

interface CircleContextValue extends CircleBundle {
  userId: string;
  circleId: string;
  timeZone: string;
  can(action: Action, ctx?: PermissionContext): boolean;
  /** Members other than read-only, who can be assigned tasks. */
  assignableMembers: CircleBundle['members'];
  memberName(userId: string | null): string;
  switchCircle(circleId: string): void;
  circles: { id: string; name: string }[];
}

const CircleContext = createContext<CircleContextValue | null>(null);
const ACTIVE_KEY = 'carecircle-active-circle';

function readActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

/**
 * Loads the circles the user belongs to and provides the active one to every app page.
 * People without a circle go to onboarding.
 */
export function CircleGate({ children }: { children: ReactNode }) {
  const session = useSession()!;
  const circles = useMyCircles();
  const [preferred, setPreferred] = useState<string | null>(readActive);

  const list = useMemo(() => circles.data ?? [], [circles.data]);
  const activeId = list.find((c) => c.circle.id === preferred)?.circle.id ?? list[0]?.circle.id ?? null;
  const bundle = useCircleBundle(activeId);

  const switchCircle = useCallback((id: string) => {
    setPreferred(id);
    try {
      localStorage.setItem(ACTIVE_KEY, id);
    } catch {
      // Remembering the choice is a convenience only.
    }
  }, []);

  const value = useMemo<CircleContextValue | null>(() => {
    if (!bundle.data || !activeId) return null;
    const b = bundle.data;
    const names = new Map(b.members.map((m) => [m.userId, m.displayName]));
    return {
      ...b,
      userId: session.userId,
      circleId: activeId,
      timeZone: b.circle.timeZone,
      can: (action, ctx = {}) =>
        can(b.myRole, action, { familyCanSeeMedication: b.circle.familyCanSeeMedication, ...ctx }),
      assignableMembers: b.members.filter((m) => m.role !== 'read_only'),
      memberName: (id) => (id ? (names.get(id) ?? 'Former member') : 'Anyone'),
      switchCircle,
      circles: list.map((c) => ({ id: c.circle.id, name: c.circle.name })),
    };
  }, [bundle.data, activeId, session.userId, switchCircle, list]);

  if (circles.isPending) return <LoadingState className="min-h-dvh" label="Loading your circle…" />;
  if (circles.isError) return <FullPageError error={circles.error} onRetry={() => circles.refetch()} />;
  if (list.length === 0) return <Navigate to="/welcome" replace />;
  if (bundle.isError) return <FullPageError error={bundle.error} onRetry={() => bundle.refetch()} />;
  if (!value) return <LoadingState className="min-h-dvh" label="Loading your circle…" />;
  return <CircleContext.Provider value={value}>{children}</CircleContext.Provider>;
}

function FullPageError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <ErrorState error={error} onRetry={onRetry} />
    </div>
  );
}

export function useCircle(): CircleContextValue {
  const ctx = useContext(CircleContext);
  if (!ctx) throw new Error('useCircle must be used inside <CircleGate>');
  return ctx;
}
