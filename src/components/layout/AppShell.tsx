import { Bell, Menu } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { appNavItems } from '@/app/navigation';
import { Logo } from '@/components/brand/Logo';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/cn';
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
          <nav aria-label="Application" className="flex-1 overflow-y-auto px-3 py-2">
            <NavList />
          </nav>
          <SidebarFooter />
        </aside>

        <div className="min-w-0 flex-1">
          <PreviewBanner />
          {/* Mobile / tablet top bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-line bg-canvas px-4 lg:hidden">
            <Link to="/app" className="rounded-lg" aria-label="CareCircle dashboard">
              <Logo />
            </Link>
            <div className="flex items-center gap-1">
              <NavLink
                to="/app/notifications"
                aria-label="Notifications"
                className="inline-flex size-11 items-center justify-center rounded-xl text-ink-muted hover:bg-surface hover:text-ink aria-[current=page]:text-brand-700"
              >
                <Bell className="size-5" aria-hidden="true" />
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
                <nav aria-label="Application">
                  <NavList onNavigate={() => setMenuOpen(false)} />
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

function NavList({ onNavigate }: { onNavigate?: () => void }) {
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
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
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

/** Makes the prototype state impossible to miss. Replaced by the demo-mode banner once data exists (Milestone 3). */
function PreviewBanner() {
  return (
    <div role="note" className="bg-accent-100 px-4 py-2 text-center text-sm text-accent-800">
      <strong className="font-semibold">Preview build:</strong> the app pages below are under construction and don’t
      contain any data yet.
    </div>
  );
}
