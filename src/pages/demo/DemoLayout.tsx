import { ArrowLeft } from 'lucide-react';
import { Outlet } from 'react-router';
import { Logo } from '@/components/brand/Logo';
import { SkipLink } from '@/components/layout/SkipLink';
import { WorldLink } from '@/components/nav/WorldLink';
import { Container } from '@/components/ui/Container';

/** Frame for the walkthrough's start page. Links lead back to the main website. */
export function DemoLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <SkipLink />
      <header className="border-b border-line bg-canvas">
        <Container className="flex h-16 items-center justify-between gap-4">
          <WorldLink world="main" to="/" className="rounded-lg" aria-label="CareCircle home">
            <Logo />
          </WorldLink>
          <WorldLink
            world="main"
            to="/"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[0.9375rem] font-medium text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to website
          </WorldLink>
        </Container>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-canvas">
        <Container className="py-6 text-sm text-ink-subtle">
          CareCircle is a coordination tool, not a medical or emergency service. The walkthrough uses sample data that
          stays in this browser.
        </Container>
      </footer>
    </div>
  );
}
