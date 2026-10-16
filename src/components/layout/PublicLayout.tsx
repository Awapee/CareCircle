import { Outlet } from 'react-router';
import { PublicFooter } from './PublicFooter';
import { PublicHeader } from './PublicHeader';
import { SkipLink } from './SkipLink';
import { useScrollToHash } from '@/lib/useScrollToHash';

export function PublicLayout() {
  useScrollToHash();
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <PublicHeader />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
