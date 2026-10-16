import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useApi } from '@/api/ApiProvider';
import { isDemo } from '@/api/createApi';
import type { DemoApi } from '@/api/demo/DemoApi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { ActionError } from '@/components/ui/States';
import { browserTimeZone } from '@/domain/dates';
import { ROLE_LABELS } from '@/domain/types';
import { credentialsSchema } from '@/domain/validation';
import { usePageTitle } from '@/lib/usePageTitle';

/** Only same-site paths are allowed as a return address. */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/app';
}

export function SignInPage() {
  const api = useApi();
  return isDemo(api) ? <DemoSignIn demo={api} /> : <AccountSignIn />;
}

function DemoSignIn({ demo }: { demo: DemoApi }) {
  usePageTitle('Try the demo');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [error, setError] = useState<unknown>(null);
  const [freshName, setFreshName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const personas = demo.personas();

  const continueAs = async (userId: string) => {
    setBusy(userId);
    setError(null);
    try {
      await demo.switchPersona(userId);
      navigate(next, { replace: true });
    } catch (e) {
      setError(e);
      setBusy(null);
    }
  };

  const startFresh = async () => {
    setBusy('fresh');
    setError(null);
    try {
      await demo.startFresh(freshName, browserTimeZone());
      navigate(next === '/app' ? '/welcome' : next, { replace: true });
    } catch (e) {
      setError(e);
      setBusy(null);
    }
  };

  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <Badge tone="accent">Demo mode · simulated</Badge>
      <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Try the CareCircle demo</h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-muted">
        Choose someone in Sita’s fictional care circle. Each person has a different role, so you can see what each role
        can see and do. Everything is invented and stays in this browser.
      </p>

      <ActionError error={error} />

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {personas
          .filter((p) => p.role)
          .map((p) => (
            <li key={p.userId}>
              <Card className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{p.displayName}</h2>
                  <Badge tone={p.role === 'admin' ? 'brand' : 'neutral'}>{ROLE_LABELS[p.role!]}</Badge>
                </div>
                <p className="mt-1 flex-1 text-ink-muted">{p.blurb}</p>
                <Button
                  className="mt-4 self-start"
                  variant={p.role === 'admin' ? 'primary' : 'secondary'}
                  loading={busy === p.userId}
                  disabled={busy !== null}
                  onClick={() => continueAs(p.userId)}
                  icon={<ArrowRight className="order-last size-4" aria-hidden="true" />}
                >
                  Continue as {p.displayName}
                </Button>
              </Card>
            </li>
          ))}
      </ul>

      <Card as="section" aria-labelledby="fresh-heading" className="mt-6">
        <h2 id="fresh-heading" className="text-lg font-semibold">
          Or start with an empty demo account
        </h2>
        <p className="mt-1 text-ink-muted">Set up your own circle from scratch, the way a new user would.</p>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void startFresh();
          }}
        >
          <TextField
            label="Your first name"
            className="flex-1"
            value={freshName}
            onChange={(e) => setFreshName(e.target.value)}
            autoComplete="given-name"
            required
            maxLength={80}
          />
          <Button
            type="submit"
            variant="secondary"
            loading={busy === 'fresh'}
            disabled={busy !== null || !freshName.trim()}
          >
            Start fresh
          </Button>
        </form>
      </Card>

      <Notice tone="neutral" className="mt-6">
        Real accounts need CareCircle’s secure backend, which isn’t connected on this site. See{' '}
        <Link to="/limitations">appropriate use</Link> for what CareCircle is and isn’t for.
      </Notice>
    </Container>
  );
}

function AccountSignIn() {
  usePageTitle('Sign in');
  const api = useApi();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [error, setError] = useState<unknown>(null);
  const form = useForm({ resolver: zodResolver(credentialsSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await api.signIn(v.email, v.password);
      navigate(next, { replace: true });
    } catch (e) {
      setError(e);
    }
  });

  return (
    <Container className="max-w-md py-12 sm:py-16">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <p className="mt-2 text-ink-muted">Welcome back to your care circle.</p>
      <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
        <ActionError error={error} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <Button
          type="submit"
          fullWidth
          loading={form.formState.isSubmitting}
          icon={<LogIn className="size-4" aria-hidden="true" />}
        >
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-ink-muted">
        New to CareCircle?{' '}
        <Link to={`/sign-up?next=${encodeURIComponent(next)}`} className="font-medium text-brand-700 underline">
          Create an account
        </Link>
      </p>
    </Container>
  );
}

export function SignUpPage() {
  usePageTitle('Create an account');
  const api = useApi();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [error, setError] = useState<unknown>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();

  if (isDemo(api)) {
    return (
      <Container className="max-w-md py-16">
        <h1 className="text-3xl font-semibold">Create an account</h1>
        <Notice className="mt-6" title="Accounts aren’t available on this site">
          This site runs in demo mode because CareCircle’s secure backend isn’t connected. You can{' '}
          <Link to="/sign-in">try the demo</Link> with fictional data instead.
        </Notice>
      </Container>
    );
  }

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    if (!name.trim()) {
      setNameError('Enter your name');
      return;
    }
    setNameError(undefined);
    try {
      const res = await api.signUp({ ...v, displayName: name.trim(), timeZone: browserTimeZone() });
      if (res.needsEmailConfirmation) setConfirmEmail(v.email);
      else navigate(next === '/app' ? '/welcome' : next, { replace: true });
    } catch (e) {
      setError(e);
    }
  });

  if (confirmEmail) {
    return (
      <Container className="max-w-md py-16">
        <h1 className="text-3xl font-semibold">Check your email</h1>
        <p className="mt-3 text-ink-muted">
          We sent a confirmation link to <strong className="text-ink">{confirmEmail}</strong>. Open it on this device to
          finish creating your account, then sign in.
        </p>
        <Link to="/sign-in" className="mt-6 inline-block font-medium text-brand-700 underline">
          Go to sign in
        </Link>
      </Container>
    );
  }

  return (
    <Container className="max-w-md py-12 sm:py-16">
      <h1 className="text-3xl font-semibold">Create an account</h1>
      <p className="mt-2 text-ink-muted">You can set up a care circle or join one you’ve been invited to.</p>
      <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
        <ActionError error={error} />
        <TextField
          label="Your name"
          hint="Shown to people in your care circle."
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={nameError}
          maxLength={80}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <Button
          type="submit"
          fullWidth
          loading={form.formState.isSubmitting}
          icon={<UserPlus className="size-4" aria-hidden="true" />}
        >
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-ink-muted">
        Already have an account?{' '}
        <Link to={`/sign-in?next=${encodeURIComponent(next)}`} className="font-medium text-brand-700 underline">
          Sign in
        </Link>
      </p>
    </Container>
  );
}
