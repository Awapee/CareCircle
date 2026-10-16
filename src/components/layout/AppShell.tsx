import { Bell, LogOut, Menu, RotateCcw, UserRound, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useApi, useEndSession } from '@/api/ApiProvider';
import { isDemo } from '@/api/createApi';
import { useNotifications } from '@/api/queries';
import { appNavItems } from '@/app/navigation';
import { useCircle } from '@/app/session';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Sheet } from '@/components/ui/Sheet';
import { ROLE_LABELS } from '@/domain/types';
import { cn } from '@/lib/cn';
import { useOnline } from '@/lib/pwa';
import { useScrollToHash } from '@/lib/useScrollToHash';
import { SkipLink } from './SkipLink';

/**
 * Authenticated application layout.
 * - ≥ lg: persistent left sidebar.
 * - < lg: compact top bar with a slide-in menu, plus a bottom bar for the most-used pages.
 */
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  useScrollToHash();
  const unread = useUnreadCount();

  return (
    <div className="min-h-dvh bg-surface">
      <SkipLink />

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:border-line lg:bg-canvas">
          <div className="flex h-16 items-center px-5">
            <Link to="/app" className="rounded-lg" aria-label="CareCircle dashboard">
              <Logo />
            </Link>
          </div>
          <CircleSummary />
          <nav aria-label="Application" className="flex-1 overflow-y-auto px-3 py-2">
            <NavList unread={unread} />
          </nav>
          <SidebarFooter />
        </aside>

        <div className="min-w-0 flex-1">
          <ModeBanner />
          <OfflineBanner />
          {/* Mobile / tablet top bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-line bg-canvas px-4 lg:hidden">
            <Link to="/app" className="rounded-lg" aria-label="CareCircle dashboard">
              <Logo />
            </Link>
            <div className="flex items-center gap-1">
              <NavLink
                to="/app/notifications"
                aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                className="relative inline-flex size-11 items-center justify-center rounded-xl text-ink-muted hover:bg-surface hover:text-ink aria-[current=page]:text-brand-700"
              >
                <Bell className="size-5" aria-hidden="true" />
                {unread > 0 && <CountDot count={unread} className="absolute right-1.5 top-1.5" />}
              </NavLink>
              <Sheet
                open={menuOpen}
                onOpenChange={setMenuOpen}
                title="Menu"
                trigger={
                  <button
                    type="button"
                    className="inline-flex size-11 items-center justify-center rounded-xl text-ink hover:bg-surface"
                    aria-label="Open menu"
                  >
                    <Menu className="size-6" aria-hidden="true" />
                  </button>
                }
              >
                <CircleSummary className="-mx-3 -mt-1 mb-2" />
                <nav aria-label="Application">
                  <NavList unread={unread} onNavigate={() => setMenuOpen(false)} />
                </nav>
                <div className="mt-4 border-t border-line pt-4">
                  <SidebarFooter onNavigate={() => setMenuOpen(false)} />
                </div>
              </Sheet>
            </div>
          </header>

          <main id="main" tabIndex={-1} className="px-4 pb-28 pt-6 outline-none sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
            <div className="mx-auto max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function useUnreadCount(): number {
  const notifications = useNotifications();
  return notifications.data?.filter((n) => !n.readAt).length ?? 0;
}

function CountDot({ count, className }: { count: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex min-w-5 items-center justify-center rounded-full bg-danger-600 px-1.5 text-[0.6875rem] font-semibold leading-5 text-white',
        className,
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function CircleSummary({ className }: { className?: string }) {
  const { circle, myRole, members, userId, circles, switchCircle } = useCircle();
  const me = members.find((m) => m.userId === userId);
  return (
    <div className={cn('mx-3 mb-2 rounded-xl bg-surface px-3 py-2.5', className)}>
      {circles.length > 1 ? (
        <label className="block">
          <span className="sr-only">Care circle</span>
          <select
            value={circle.id}
            onChange={(e) => switchCircle(e.target.value)}
            className="w-full truncate rounded-lg bg-transparent font-semibold text-ink"
          >
            {circles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="truncate font-semibold text-ink">{circle.name}</p>
      )}
      <p className="truncate text-sm text-ink-muted">
        {me?.displayName ?? 'You'} · {ROLE_LABELS[myRole]}
      </p>
    </div>
  );
}

function NavList({ unread, onNavigate }: { unread: number; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {appNavItems.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.to === '/app'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium transition-colors',
                isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:bg-surface hover:text-ink',
              )
            }
          >
            <item.icon className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {item.to === '/app/notifications' && unread > 0 && (
              <>
                <CountDot count={unread} />
                <span className="sr-only">, {unread} unread</span>
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  const api = useApi();
  const endSession = useEndSession();
  const [busy, setBusy] = useState(false);
  const signOut = async () => {
    setBusy(true);
    onNavigate?.();
    await endSession('/', () => api.signOut());
  };
  return (
    <div className="space-y-1 px-3 py-4 text-sm lg:border-t lg:border-line">
      <Link
        to="/limitations"
        onClick={onNavigate}
        className="block rounded-lg px-3 py-2 text-ink-muted hover:bg-surface hover:text-ink"
      >
        Appropriate use
      </Link>
      <Link
        to="/"
        onClick={onNavigate}
        className="block rounded-lg px-3 py-2 text-ink-muted hover:bg-surface hover:text-ink"
      >
        Back to website
      </Link>
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-ink-muted hover:bg-surface hover:text-ink"
      >
        <LogOut className="size-4" aria-hidden="true" />
        {api.mode === 'demo' ? 'Leave demo' : 'Sign out'}
      </button>
    </div>
  );
}

function BottomNav() {
  const items = appNavItems.filter((item) => item.primary);
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/app'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium',
                  isActive ? 'text-brand-700' : 'text-ink-muted hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn('flex h-7 w-12 items-center justify-center rounded-full', isActive && 'bg-brand-50')}
                  >
                    <item.icon className="size-5" aria-hidden="true" />
                  </span>
                  {item.shortLabel}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Demo mode is impossible to miss: fictional data, stored only in this browser. */
/** Real accounts need a connection to save; the demo keeps working offline because it lives in the browser. */
function OfflineBanner() {
  const api = useApi();
  const online = useOnline();
  if (online || isDemo(api)) return null;
  return (
    <div role="status" className="bg-ink px-4 py-2 text-sm text-canvas">
      <p className="mx-auto flex max-w-6xl items-center gap-2">
        <WifiOff className="size-4 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-semibold">You’re offline.</strong> You can still read what’s already loaded. Changes
          will fail until you reconnect.
        </span>
      </p>
    </div>
  );
}

function ModeBanner() {
  const api = useApi();
  const { members, userId, myRole } = useCircle();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  if (!isDemo(api)) return null;
  const me = members.find((m) => m.userId === userId);

  const reset = async () => {
    setResetting(true);
    await api.reset();
    setResetting(false);
    setConfirmReset(false);
    navigate('/sign-in', { replace: true });
  };

  return (
    <div role="note" className="bg-accent-100 px-4 py-2 text-sm text-accent-800">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p>
          <strong className="font-semibold">Demo mode, simulated.</strong> Fictional data, stored only in this browser.
          Viewing as {me?.displayName ?? 'you'} ({ROLE_LABELS[myRole]}).
        </p>
        <div className="flex items-center gap-1">
          <Link
            to={`/sign-in?next=${encodeURIComponent(location.pathname)}`}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 font-semibold underline-offset-2 hover:underline"
          >
            <UserRound className="size-4" aria-hidden="true" />
            Switch person
          </Link>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 font-semibold underline-offset-2 hover:underline"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset demo
          </button>
        </div>
      </div>
      <Dialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset the demo?"
        description="Everything you changed in the demo is replaced with the original fictional data."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Keep my changes
            </Button>
            <Button variant="danger" loading={resetting} onClick={reset}>
              Reset demo
            </Button>
          </>
        }
      >
        <p className="text-ink-muted">This only affects this browser. Nothing is stored anywhere else.</p>
      </Dialog>
    </div>
  );
}
