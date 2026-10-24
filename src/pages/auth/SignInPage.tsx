import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useApi } from '@/api/ApiProvider';
import { accountsAvailable, isDemo } from '@/api/createApi';
import { WorldButtonLink } from '@/components/nav/WorldLink';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { ActionError } from '@/components/ui/States';
import { browserTimeZone } from '@/domain/dates';
import { credentialsSchema } from '@/domain/validation';
import { usePageTitle } from '@/lib/usePageTitle';
import { DemoStartPage } from '@/pages/demo/DemoStartPage';

/** Only same-site paths are allowed as a return address. */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/app';
}

export function SignInPage() {
  const api = useApi();
  // In the walkthrough, "signing in" means naming a sample circle.
  if (isDemo(api)) return <DemoStartPage />;
  if (!accountsAvailable(api)) return <AccountsNotReady title="Sign in" />;
  return <AccountSignIn />;
}

/** Shown on the website until the Supabase project behind real accounts is connected. */
function AccountsNotReady({ title }: { title: string }) {
  usePageTitle(title);
  return (
    <Container className="max-w-md py-16">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <Notice className="mt-6" title="Accounts are almost ready">
        Sign-up switches on as soon as CareCircle’s secure database is connected to this site. Until then, you can see
        how everything works with a sample circle you name yourself.
      </Notice>
      <WorldButtonLink
        world="demo"
        to="/"
        className="mt-6"
        icon={<ArrowRight className="order-last size-5" aria-hidden="true" />}
      >
        See how it works
      </WorldButtonLink>
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

  if (!accountsAvailable(api)) return <AccountsNotReady title="Create an account" />;

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
