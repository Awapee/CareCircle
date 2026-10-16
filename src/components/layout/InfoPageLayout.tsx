import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';
import { Notice } from '@/components/ui/Notice';
import { usePageTitle } from '@/lib/usePageTitle';

/**
 * Shared layout for informational pages. `provisional` adds a visible draft notice so
 * nobody mistakes placeholder policy text for a reviewed legal document.
 */
export function InfoPageLayout({
  title,
  intro,
  provisional = false,
  updated,
  children,
}: {
  title: string;
  intro?: ReactNode;
  provisional?: boolean;
  updated?: string;
  children: ReactNode;
}) {
  usePageTitle(title);
  return (
    <Container className="max-w-3xl py-14 sm:py-20">
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      {updated && <p className="mt-2 text-sm text-ink-subtle">Last updated {updated}</p>}
      {intro && <p className="mt-4 text-lg text-ink-muted">{intro}</p>}
      {provisional && (
        <Notice tone="warning" title="Draft — not yet reviewed" className="mt-6">
          This page is a provisional draft for a student project prototype. It has not been reviewed by a legal
          professional and must be replaced with reviewed text before any real public launch.
        </Notice>
      )}
      <div className="prose-cc mt-10">{children}</div>
    </Container>
  );
}
