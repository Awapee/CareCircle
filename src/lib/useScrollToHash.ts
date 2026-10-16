import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Client-side navigation does not scroll to `#anchors` or reset scroll on its own.
 * This scrolls to the hash target when present, otherwise to the top of the new page.
 */
export function useScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
}
