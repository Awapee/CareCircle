import { useEffect } from 'react';

const APP_NAME = 'CareCircle';

/** Sets a descriptive document title so screen-reader users and browser tabs know where they are. */
export function usePageTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : `${APP_NAME}: One circle. Shared care.`;
  }, [title]);
}
