import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { usePageTitle } from '@/lib/usePageTitle';

export function NotFoundPage() {
  usePageTitle('Page not found');
  return (
    <Container className="max-w-xl py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">404</p>
      <h1 className="mt-3 text-3xl font-semibold">We couldn’t find that page</h1>
      <p className="mt-4 text-ink-muted">The link may be out of date, or the page may have moved.</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <ButtonLink to="/">Go to the home page</ButtonLink>
        <ButtonLink to="/app" variant="secondary">
          Open the app
        </ButtonLink>
      </div>
    </Container>
  );
}
