import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';

/** Shown if a page throws while rendering. Avoids leaking technical details to the user. */
export function RouteErrorPage() {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <Container className="max-w-xl py-24 text-center">
      <h1 className="text-3xl font-semibold">{notFound ? 'Page not found' : 'Something went wrong'}</h1>
      <p className="mt-4 text-ink-muted">
        {notFound
          ? 'The link may be out of date, or the page may have moved.'
          : 'An unexpected error stopped this page from loading. Your saved information has not been affected. Please try again.'}
      </p>
      <div className="mt-8">
        <ButtonLink to="/">Go to the home page</ButtonLink>
      </div>
    </Container>
  );
}
