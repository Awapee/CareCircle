import { useQuery } from '@tanstack/react-query';
import { MailOpen } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { useApi, useSession } from '@/api/ApiProvider';
import { useAction } from '@/api/queries';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { Notice } from '@/components/ui/Notice';
import { ActionError, ErrorState, LoadingState } from '@/components/ui/States';
import { ROLE_DESCRIPTIONS } from '@/domain/permissions';
import { ROLE_LABELS } from '@/domain/types';
import { usePageTitle } from '@/lib/usePageTitle';

const STATUS_TEXT = {
  used: 'This invitation has already been used.',
  expired: 'This invitation has expired.',
  revoked: 'This invitation was cancelled by the circle admin.',
} as const;

const ACTIVE_KEY = 'carecircle-active-circle';

/** Lands from an invitation link: shows what you're joining, then joins after you confirm. */
export function InvitePage() {
  usePageTitle('Invitation');
  const { token = '' } = useParams();
  const api = useApi();
  const session = useSession();
  const navigate = useNavigate();
  const preview = useQuery({
    queryKey: [session?.userId ?? 'anonymous', 'invitation', token],
    queryFn: () => api.previewInvitation(token),
    enabled: !!session,
  });
  const accept = useAction((a, t: string) => a.acceptInvitation(t));

  if (session === undefined) return <LoadingState />;

  if (!session) {
    const next = encodeURIComponent(`/invite/${token}`);
    return (
      <Container className="max-w-lg py-16">
        <h1 className="text-3xl font-semibold">You’ve been invited to a care circle</h1>
        <p className="mt-3 text-ink-muted">Sign in or create an account to see the invitation and join.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink to={`/sign-in?next=${next}`}>Sign in</ButtonLink>
          <ButtonLink to={`/sign-up?next=${next}`} variant="secondary">
            Create an account
          </ButtonLink>
        </div>
      </Container>
    );
  }

  const join = async () => {
    try {
      const circleId = await accept.mutateAsync(token);
      try {
        localStorage.setItem(ACTIVE_KEY, circleId);
      } catch {
        // Not essential.
      }
      navigate('/app', { replace: true });
    } catch {
      // Shown by <ActionError>.
    }
  };

  return (
    <Container className="max-w-lg py-16">
      <span
        className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600"
        aria-hidden="true"
      >
        <MailOpen className="size-6" />
      </span>
      {preview.isPending ? (
        <LoadingState />
      ) : preview.isError ? (
        <ErrorState className="mt-6" error={preview.error} onRetry={() => preview.refetch()} />
      ) : !preview.data ? (
        <>
          <h1 className="mt-4 text-3xl font-semibold">Invitation not found</h1>
          <p className="mt-3 text-ink-muted">
            Check that you opened the whole link. If it still doesn’t work, ask the circle admin to send a new one.
          </p>
        </>
      ) : preview.data.status !== 'valid' ? (
        <>
          <h1 className="mt-4 text-3xl font-semibold">This link can’t be used</h1>
          <p className="mt-3 text-ink-muted">
            {STATUS_TEXT[preview.data.status]} Ask the admin of {preview.data.circleName} for a new invitation.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-4 text-3xl font-semibold">Join {preview.data.circleName}</h1>
          <Card className="mt-6">
            <p className="text-ink-muted">You’ve been invited to join as</p>
            <p className="mt-1">
              <Badge tone="brand">{ROLE_LABELS[preview.data.role]}</Badge>
            </p>
            <p className="mt-3 text-ink-muted">{ROLE_DESCRIPTIONS[preview.data.role]}</p>
          </Card>
          <div className="mt-6 space-y-4">
            <ActionError error={accept.error} />
            <div className="flex flex-wrap gap-3">
              <Button loading={accept.isPending} onClick={join}>
                Join circle
              </Button>
              <ButtonLink to="/app" variant="ghost">
                Not now
              </ButtonLink>
            </div>
          </div>
          <Notice tone="neutral" className="mt-8">
            Joining lets everyone in this circle see your name and what you record. You can leave the circle at any time
            from <Link to="/app/circle">My Care Circle</Link>.
          </Notice>
        </>
      )}
    </Container>
  );
}
