import { HeartHandshake } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAction, useMyCircles, useProfile } from '@/api/queries';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox, SelectField, TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { ActionError, LoadingState } from '@/components/ui/States';
import { browserTimeZone } from '@/domain/dates';
import { circleInputSchema } from '@/domain/validation';
import { usePageTitle } from '@/lib/usePageTitle';
import { TIME_ZONES } from '@/lib/timeZones';

/** First-run setup: create a care circle. People with an invitation open their link instead. */
export function WelcomePage() {
  usePageTitle('Set up your circle');
  const navigate = useNavigate();
  const profile = useProfile();
  const circles = useMyCircles();
  const [recipientIsMe, setRecipientIsMe] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [circleName, setCircleName] = useState('');
  const [timeZone, setTimeZone] = useState(browserTimeZone());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useAction((api, input: Parameters<typeof api.createCircle>[0]) => api.createCircle(input));

  if (profile.isPending || circles.isPending) return <LoadingState className="min-h-dvh" />;
  if (circles.data && circles.data.length > 0 && !create.isPending && !create.isSuccess) {
    return <Navigate to="/app" replace />;
  }

  const myName = profile.data?.displayName ?? '';
  const effectiveRecipient = recipientIsMe ? myName : recipientName;
  const suggestedName = effectiveRecipient.trim() ? `${effectiveRecipient.trim()}’s circle` : '';

  const submit = async () => {
    const input = {
      name: circleName.trim() || suggestedName,
      timeZone,
      recipientName: effectiveRecipient,
      myRole: 'admin' as const,
    };
    const parsed = circleInputSchema.safeParse(input);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    try {
      await create.mutateAsync(parsed.data);
      navigate('/app', { replace: true });
    } catch {
      // Shown by <ActionError>.
    }
  };

  const zones = TIME_ZONES.includes(timeZone) ? TIME_ZONES : [timeZone, ...TIME_ZONES];

  return (
    <div className="min-h-dvh bg-surface px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-xl">
        <Logo />
        <main id="main" className="mt-8">
          <div className="flex items-center gap-3">
            <span
              className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"
              aria-hidden="true"
            >
              <HeartHandshake className="size-6" />
            </span>
            <h1 className="text-2xl font-semibold sm:text-3xl">Welcome{myName ? `, ${myName}` : ''}</h1>
          </div>
          <p className="mt-3 text-ink-muted">
            A care circle is the shared space for one person’s care: their routine, appointments and the people who
            help. You’ll be its admin, and can invite others afterwards.
          </p>

          <Card className="mt-6">
            <form
              className="space-y-5"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <ActionError error={create.error} />
              <Checkbox
                label="I’m the person receiving care"
                hint="Leave this unticked if you’re setting it up for someone else."
                checked={recipientIsMe}
                onChange={(e) => setRecipientIsMe(e.target.checked)}
              />
              {!recipientIsMe && (
                <TextField
                  label="Who is receiving care?"
                  hint="The name they like to be called."
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  error={errors.recipientName}
                  maxLength={80}
                  autoComplete="off"
                />
              )}
              <TextField
                label="Circle name"
                optional
                placeholder={suggestedName || 'e.g. Sita’s circle'}
                value={circleName}
                onChange={(e) => setCircleName(e.target.value)}
                error={errors.name}
                maxLength={80}
              />
              <SelectField
                label="Time zone"
                hint="Where the person receiving care lives. Task times follow this time zone."
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                error={errors.timeZone}
              >
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z.replace(/_/g, ' ')}
                  </option>
                ))}
              </SelectField>
              <Button type="submit" fullWidth loading={create.isPending}>
                Create circle
              </Button>
            </form>
          </Card>

          <Notice tone="neutral" className="mt-6" title="Joining someone else’s circle?">
            Open the invitation link they sent you. It adds you to their circle with the role they chose.
          </Notice>
        </main>
      </div>
    </div>
  );
}
