import { ArrowRight, CalendarDays, MessageSquareText, Pill, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useApi, useSession } from '@/api/ApiProvider';
import { isDemo } from '@/api/createApi';
import { suggestedCircleName } from '@/api/demo/seed';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { TextField } from '@/components/ui/Field';
import { ActionError } from '@/components/ui/States';
import { browserTimeZone } from '@/domain/dates';
import { guideStore } from '@/features/demo/guideStore';
import { usePageTitle } from '@/lib/usePageTitle';

const highlights = [
  { icon: CalendarDays, text: 'A shared plan for the day and week' },
  { icon: Pill, text: 'Medication and appointment reminders' },
  { icon: MessageSquareText, text: 'Updates everyone can see and acknowledge' },
  { icon: Users, text: 'Roles that control who sees what' },
];

/**
 * Start of the walkthrough. The visitor names the circle (for anyone: a parent, partner, friend
 * or themselves), and a sample circle is built around those names before the guided tour starts.
 */
export function DemoStartPage() {
  usePageTitle('See how it works');
  const api = useApi();
  const session = useSession();
  const navigate = useNavigate();
  const [recipient, setRecipient] = useState('');
  const [you, setYou] = useState('');
  const [circleName, setCircleName] = useState('');
  const [errors, setErrors] = useState<{ recipient?: string; you?: string }>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  if (!isDemo(api)) return null;

  const suggested = suggestedCircleName(recipient);

  const start = async (e: FormEvent) => {
    e.preventDefault();
    const next = {
      recipient: recipient.trim() ? undefined : 'Enter a name for the person you care for',
      you: you.trim() ? undefined : 'Enter your name',
    };
    setErrors(next);
    if (next.recipient || next.you) return;
    setBusy(true);
    setError(null);
    try {
      await api.startWalkthrough({
        recipientName: recipient.trim(),
        yourName: you.trim(),
        circleName: circleName.trim() || suggested,
        timeZone: browserTimeZone(),
      });
      guideStore.set({ step: 0, open: true });
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <Container className="max-w-5xl py-10 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_26rem] lg:items-start">
        <div>
          <Badge tone="accent">Guided walkthrough</Badge>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">See how CareCircle works</h1>
          <p className="mt-3 max-w-xl text-lg text-ink-muted">
            Name a circle for anyone you help look after, like a parent, a partner or a friend. We’ll fill it with a
            sample week, then a short tour shows each part working. You can click around and change anything as you go.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-ink">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"
                  aria-hidden="true"
                >
                  <Icon className="size-5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-ink-subtle">
            Takes about two minutes. The sample data stays in this browser and nothing is sent anywhere.
          </p>
        </div>

        <Card as="section" padding="lg" aria-labelledby="start-heading">
          <h2 id="start-heading" className="text-xl font-semibold">
            Name your circle
          </h2>
          <form className="mt-5 space-y-5" onSubmit={start} noValidate>
            <ActionError error={error} />
            <TextField
              label="Who is the circle for?"
              hint="The person receiving care, e.g. Mum, Grandpa or Alex."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              error={errors.recipient}
              maxLength={80}
            />
            <TextField
              label="Your name"
              hint="You’ll run the circle."
              autoComplete="given-name"
              value={you}
              onChange={(e) => setYou(e.target.value)}
              error={errors.you}
              maxLength={80}
            />
            <TextField
              label="Circle name"
              optional
              placeholder={suggested || 'e.g. Mum’s circle'}
              value={circleName}
              onChange={(e) => setCircleName(e.target.value)}
              maxLength={80}
            />
            <Button
              type="submit"
              fullWidth
              loading={busy}
              icon={<ArrowRight className="order-last size-5" aria-hidden="true" />}
            >
              Start the walkthrough
            </Button>
          </form>
          {session && (
            <p className="mt-4 text-center text-sm text-ink-muted">
              Already started?{' '}
              <button
                type="button"
                className="font-semibold text-brand-700 underline underline-offset-2"
                onClick={() => {
                  guideStore.set({ open: true });
                  navigate('/app');
                }}
              >
                Continue where you left off
              </button>
            </p>
          )}
        </Card>
      </div>
    </Container>
  );
}
