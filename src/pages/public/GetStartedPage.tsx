import { ArrowRight, Compass, UserPlus } from 'lucide-react';
import { Link } from 'react-router';
import { useApi } from '@/api/ApiProvider';
import { accountsAvailable } from '@/api/createApi';
import { WorldButtonLink } from '@/components/nav/WorldLink';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { usePageTitle } from '@/lib/usePageTitle';

export function GetStartedPage() {
  usePageTitle('Get started');
  const accounts = accountsAvailable(useApi());
  return (
    <Container className="max-w-4xl py-14 sm:py-20">
      <div className="text-center">
        <h1 className="text-3xl font-semibold sm:text-4xl">Get started with CareCircle</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-muted">
          See how it works first, or create your account and set up a circle for someone you care for.
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
            See how it works
          </h2>
          <p className="mt-2 flex-1 text-ink-muted">
            Name a sample circle for anyone, like a parent, a partner or a friend, and take a short guided tour of each
            feature working. It takes about two minutes.
          </p>
          <WorldButtonLink
            world="demo"
            to="/"
            className="mt-6 self-start"
            icon={<ArrowRight className="order-last size-5" aria-hidden="true" />}
          >
            Start the walkthrough
          </WorldButtonLink>
        </Card>

        <Card padding="lg" as="section" aria-labelledby="account-heading" className="flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <span
              className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"
              aria-hidden="true"
            >
              <UserPlus className="size-[22px]" />
            </span>
            {!accounts && <Badge tone="accent">Coming soon</Badge>}
          </div>
          <h2 id="account-heading" className="mt-4 text-xl font-semibold">
            Create an account
          </h2>
          {accounts ? (
            <>
              <p className="mt-2 flex-1 text-ink-muted">
                Set up a care circle for someone you support, or join one you’ve been invited to.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
                <ButtonLink to="/sign-up">Create an account</ButtonLink>
                <Link to="/sign-in" className="font-medium text-brand-700 underline underline-offset-2">
                  I already have one
                </Link>
              </div>
            </>
          ) : (
            <p className="mt-2 flex-1 text-ink-muted">
              Sign-up switches on as soon as CareCircle’s secure database is connected to this site. Your circle and
              everything in it will then be saved to your account.
            </p>
          )}
        </Card>
      </div>
    </Container>
  );
}
