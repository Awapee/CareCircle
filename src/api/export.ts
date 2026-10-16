import { ROLE_LABELS } from '@/domain/types';
import type { CareCircleApi } from './types';

/**
 * Everything the signed-in person can see, as one JSON document: their profile and preferences,
 * and for each circle its members, tasks, the last year of occurrences, updates (including their
 * own private notes), history, and their notifications. Built through the same interface as the
 * pages, so it contains exactly what their role allows and nothing more.
 */
export async function exportMyData(api: CareCircleApi, now = new Date()) {
  const [profile, preferences, circles, notifications] = await Promise.all([
    api.getProfile(),
    api.getPreferences(),
    api.listMyCircles(),
    api.listNotifications(),
  ]);
  const from = new Date(now.getTime() - 366 * 86_400_000).toISOString();
  const to = new Date(now.getTime() + 15 * 86_400_000).toISOString();

  const circleData = await Promise.all(
    circles.map(async ({ circle, role }) => {
      const [bundle, tasks, occurrences, updates, activity] = await Promise.all([
        api.getCircle(circle.id),
        api.listTasks(circle.id),
        api.listOccurrences(circle.id, from, to),
        api.listUpdates(circle.id),
        api.listActivity(circle.id, 5000),
      ]);
      return {
        circle: bundle.circle,
        yourRole: ROLE_LABELS[role],
        careProfile: bundle.careProfile,
        members: bundle.members.map((m) => ({ name: m.displayName, role: ROLE_LABELS[m.role], joinedAt: m.joinedAt })),
        tasks,
        occurrences,
        updates,
        activity,
      };
    }),
  );

  return {
    exportedAt: now.toISOString(),
    about:
      'Your CareCircle data: everything your account can see. Medication details are included only if your role allows it.',
    backend: api.mode === 'demo' ? 'Demo mode (fictional data stored in this browser)' : 'CareCircle account',
    profile,
    preferences,
    circles: circleData,
    notifications,
  };
}

/** Saves a JSON document as a file download. */
export function downloadJson(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
