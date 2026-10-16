import { ArrowRight, Compass, UserPlus } from 'lucide-react';
import { useApi } from '@/api/ApiProvider';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { usePageTitle } from '@/lib/usePageTitle';

export function GetStartedPage() {
  usePageTitle('Get started');
  const demoOnly = useApi().mode === 'demo';
  return (
    <Container className="max-w-4xl py-14 sm:py-20">
      <div className="text-center">
        <h1 className="text-3xl font-semibold sm:text-4xl">Get started with CareCircle</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-muted">
          Choose how you’d like to begin. You can explore the app first and create an account whenever you’re ready.
        </p>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <Card padding="lg" as="section" aria-labelledby="explore-heading" className="flex flex-col">
          <span
            className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"
            aria-hidden="true"
          >
            <Compass className="size-[22px]" />
          </span>
          <h2 id="explore-heading" className="mt-4 text-xl font-semibold">
            Try the demo
          </h2>
          <p className="mt-2 flex-1 text-ink-muted">
            Explore a fictional care circle as any of its members. Nothing you see uses real people or real health
            information, and your changes stay in this browser.
          </p>
          <ButtonLink
            to="/sign-in"
            className="mt-6 self-start"
            icon={<ArrowRight className="order-last size-5" aria-hidden="true" />}
          >
            Open the demo
          </ButtonLink>
        </Card>

        <Card padding="lg" as="section" aria-labelledby="account-heading" className="flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <span
              className="flex size-11 items-center justify-center rounded-xl bg-surface text-ink-subtle"
              aria-hidden="true"
            >
              <UserPlus className="size-[22px]" />
            </span>
            {demoOnly && <Badge tone="accent">Not available on this site</Badge>}
          </div>
          <h2 id="account-heading" className="mt-4 text-xl font-semibold">
            Create an account
          </h2>
          {demoOnly ? (
            <p className="mt-2 flex-1 text-ink-muted">
              Real accounts need CareCircle’s secure backend, which isn’t connected to this site. Until it is, there’s
              nothing to sign up for, and we won’t pretend otherwise.
            </p>
          ) : (
            <>
              <p className="mt-2 flex-1 text-ink-muted">
                Set up a care circle for someone you support, or join one you’ve been invited to.
              </p>
              <ButtonLink to="/sign-up" variant="secondary" className="mt-6 self-start">
                Create an account
              </ButtonLink>
            </>
          )}
        </Card>
      </div>
    </Container>
  );
}
