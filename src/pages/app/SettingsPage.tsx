import { Bell, Download, KeyRound, LogOut, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useApi, useEndSession, useSession } from '@/api/ApiProvider';
import { downloadJson, exportMyData } from '@/api/export';
import { useAction, useProfile } from '@/api/queries';
import { useCircle } from '@/app/session';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Checkbox, SelectField, TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { ActionError, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { localDate } from '@/domain/dates';
import { ROLE_LABELS } from '@/domain/types';
import { profileInputSchema } from '@/domain/validation';
import { useDisplayPrefs, type TextSize } from '@/lib/displayPrefs';
import { isInstalled, isIos, useInstallPrompt } from '@/lib/pwa';
import { TIME_ZONES } from '@/lib/timeZones';
import { usePageTitle } from '@/lib/usePageTitle';

export function SettingsPage() {
  usePageTitle('Settings');
  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Your profile, sign-in, display, privacy and data." />
      <Profile />
      <Security />
      <Section id="notifications" title="Notifications" icon={<Bell className="size-5" />}>
        <p className="text-ink-muted">Quiet hours and which notifications you get are on the Notifications page.</p>
        <ButtonLink to="/app/notifications" variant="secondary" size="sm" className="mt-4">
          Notification settings
        </ButtonLink>
      </Section>
      <Display />
      <InstallApp />
      <Privacy />
      <YourData />
      <DangerZone />
    </div>
  );
}

function Section({ id, title, icon, children }: { id: string; title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <Card as="section" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="flex items-center gap-2 text-lg font-semibold">
        {icon && (
          <span className="text-brand-600" aria-hidden="true">
            {icon}
          </span>
        )}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function Profile() {
  const profile = useProfile();
  return (
    <Section id="profile" title="Profile">
      {profile.isPending ? (
        <LoadingState />
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      ) : (
        <ProfileForm key={JSON.stringify(profile.data)} name={profile.data.displayName} zone={profile.data.timeZone} />
      )}
    </Section>
  );
}

function ProfileForm({ name: initialName, zone }: { name: string; zone: string }) {
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [timeZone, setTimeZone] = useState(zone);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useAction((api, v: { displayName: string; timeZone: string }) => api.updateProfile(v));
  const zones = TIME_ZONES.includes(timeZone) ? TIME_ZONES : [timeZone, ...TIME_ZONES];

  return (
    <form
      className="grid gap-4 sm:max-w-xl"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        const parsed = profileInputSchema.safeParse({ displayName: name, timeZone });
        if (!parsed.success) {
          const next: Record<string, string> = {};
          for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
          setErrors(next);
          return;
        }
        setErrors({});
        try {
          await save.mutateAsync(parsed.data);
          toast('Profile saved');
        } catch {
          // Shown by <ActionError>.
        }
      }}
    >
      <ActionError error={save.error} />
      <TextField
        label="Your name"
        hint="Shown to everyone in your circles."
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.displayName}
        maxLength={80}
        autoComplete="name"
      />
      <SelectField
        label="Your time zone"
        hint="Used for your quiet hours. Task times always follow the circle’s time zone."
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
      <div>
        <Button type="submit" variant="secondary" loading={save.isPending}>
          Save profile
        </Button>
      </div>
    </form>
  );
}

function Security() {
  const api = useApi();
  const session = useSession();
  const endSession = useEndSession();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState<string | undefined>();
  const change = useAction((a, p: string) => a.changePassword(p));
  const [signingOut, setSigningOut] = useState(false);

  if (api.mode === 'demo') {
    return (
      <Section id="security" title="Sign-in and security" icon={<KeyRound className="size-5" />}>
        <p className="text-ink-muted">
          Demo accounts don’t have an email address or password. With a real account, you can change your password and
          sign out of other devices here.
        </p>
      </Section>
    );
  }

  return (
    <Section id="security" title="Sign-in and security" icon={<KeyRound className="size-5" />}>
      <p className="text-ink-muted">
        Signed in as <strong className="text-ink">{session?.email ?? 'your account'}</strong>
      </p>
      <form
        className="mt-4 grid gap-4 sm:max-w-xl"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (password !== confirm) {
            setMismatch('The two passwords don’t match');
            return;
          }
          setMismatch(undefined);
          try {
            await change.mutateAsync(password);
            setPassword('');
            setConfirm('');
            toast('Password changed');
          } catch {
            // Shown by <ActionError>.
          }
        }}
      >
        <ActionError error={change.error} />
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch}
        />
        <div>
          <Button type="submit" variant="secondary" loading={change.isPending} disabled={!password}>
            Change password
          </Button>
        </div>
      </form>
      <div className="mt-6 border-t border-line pt-4">
        <p className="text-ink-muted">
          Lost a phone or used a shared computer? Sign out everywhere, including this device.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          loading={signingOut}
          icon={<LogOut className="size-4" aria-hidden="true" />}
          onClick={async () => {
            setSigningOut(true);
            await endSession('/sign-in', () => api.signOut({ everywhere: true }));
          }}
        >
          Sign out of all devices
        </Button>
      </div>
    </Section>
  );
}

const TEXT_SIZES: { value: TextSize; label: string }[] = [
  { value: 'default', label: 'Standard' },
  { value: 'large', label: 'Large' },
  { value: 'larger', label: 'Larger' },
];

function Display() {
  const [prefs, setPrefs] = useDisplayPrefs();
  return (
    <Section id="display" title="Display on this device">
      <fieldset>
        <legend className="font-medium">Text size</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TEXT_SIZES.map((t) => (
            <label
              key={t.value}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line-strong px-4 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600"
            >
              <input
                type="radio"
                name="text-size"
                value={t.value}
                checked={prefs.textSize === t.value}
                onChange={() => setPrefs({ ...prefs, textSize: t.value })}
                className="size-4 accent-brand-600"
              />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Checkbox
        className="mt-5"
        label="Reduce motion"
        hint="Turns off animations and smooth scrolling. Your device’s own setting is always respected too."
        checked={prefs.reduceMotion}
        onChange={(e) => setPrefs({ ...prefs, reduceMotion: e.target.checked })}
      />
      <p className="mt-4 text-sm text-ink-subtle">These apply straight away and are saved in this browser only.</p>
    </Section>
  );
}

function InstallApp() {
  const { canPrompt, install } = useInstallPrompt();
  const toast = useToast();
  const [installed, setInstalled] = useState(isInstalled);
  return (
    <Section id="install" title="Install on this device" icon={<Smartphone className="size-5" />}>
      <p className="text-ink-muted">
        Add CareCircle to your home screen or dock so it opens like an app, without the browser’s address bar. Pages
        you’ve already visited still open without a connection.
      </p>
      {installed ? (
        <p className="mt-4 font-medium text-brand-700">CareCircle is installed on this device.</p>
      ) : canPrompt ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={async () => {
            if (await install()) {
              setInstalled(true);
              toast('CareCircle installed');
            }
          }}
        >
          Install CareCircle
        </Button>
      ) : isIos() ? (
        <p className="mt-4">
          On iPhone or iPad: open this site in Safari, tap <strong>Share</strong>, then{' '}
          <strong>Add to Home Screen</strong>.
        </p>
      ) : (
        <p className="mt-4">
          Use your browser’s menu: look for <strong>Install app</strong> or <strong>Add to Home Screen</strong>. On
          Safari for Mac, choose <strong>File › Add to Dock</strong>.
        </p>
      )}
    </Section>
  );
}

function Privacy() {
  const { circle, myRole } = useCircle();
  return (
    <Section id="privacy" title="Privacy" icon={<ShieldCheck className="size-5" />}>
      <ul className="space-y-2 text-ink-muted">
        <li>
          <strong className="text-ink">People in your circles</strong> see your name, your role ({ROLE_LABELS[myRole]}{' '}
          in {circle.name}) and what you record or post to the circle.
        </li>
        <li>
          <strong className="text-ink">Private notes</strong> are visible only to you.
        </li>
        <li>
          <strong className="text-ink">Medication details</strong> are hidden from Family members unless the circle
          admin allows them, and always hidden from Read-only members.
        </li>
        <li>
          <strong className="text-ink">Nobody outside your circles</strong> can see anything. The database enforces
          this, not just the app.
        </li>
      </ul>
      <p className="mt-4 text-sm">
        <Link to="/privacy" className="font-medium text-brand-700 underline">
          Read the privacy policy
        </Link>
        <span className="text-ink-subtle"> · </span>
        <Link to="/app/circle" className="font-medium text-brand-700 underline">
          Leave a circle
        </Link>
      </p>
    </Section>
  );
}

function YourData() {
  const api = useApi();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <Section id="data" title="Your data" icon={<Download className="size-5" />}>
      <p className="text-ink-muted">
        Download everything your account can see, as a JSON file: your profile and preferences, and for each circle its
        members, tasks, the last year of records, updates, history and your notifications.
      </p>
      <ActionError error={error} />
      <Button
        variant="secondary"
        className="mt-4"
        loading={busy}
        icon={<Download className="size-4" aria-hidden="true" />}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const now = new Date();
            downloadJson(await exportMyData(api, now), `carecircle-data-${localDate(now, 'UTC')}.json`);
            toast('Your data was downloaded');
          } catch (e) {
            setError(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        Download my data
      </Button>
    </Section>
  );
}

function DangerZone() {
  const { circle, can } = useCircle();
  const navigate = useNavigate();
  const endSession = useEndSession();
  const toast = useToast();
  const [deleteCircleOpen, setDeleteCircleOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [understood, setUnderstood] = useState(false);
  const removeCircle = useAction((api, name: string) => api.deleteCircle(circle.id, name));
  const removeAccount = useAction((api) => api.deleteAccount());

  return (
    <section
      aria-labelledby="danger-heading"
      className="rounded-[var(--radius-card)] border border-danger-700/25 bg-canvas p-5"
    >
      <h2 id="danger-heading" className="flex items-center gap-2 text-lg font-semibold text-danger-700">
        <Trash2 className="size-5" aria-hidden="true" />
        Delete
      </h2>
      <div className="mt-3 divide-y divide-line">
        {can('edit_circle') && (
          <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Delete {circle.name}</p>
              <p className="text-sm text-ink-muted">
                Removes the circle and everything in it for every member: tasks, records, updates and history.
              </p>
            </div>
            <Button variant="secondary" className="shrink-0 text-danger-700" onClick={() => setDeleteCircleOpen(true)}>
              Delete circle
            </Button>
          </div>
        )}
        <div
          className={
            can('edit_circle')
              ? 'flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between'
              : 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
          }
        >
          <div>
            <p className="font-medium">Delete my account</p>
            <p className="text-sm text-ink-muted">
              Removes your profile, preferences, notifications and private notes. What you recorded for others stays,
              without your name.
            </p>
          </div>
          <Button variant="secondary" className="shrink-0 text-danger-700" onClick={() => setDeleteAccountOpen(true)}>
            Delete account
          </Button>
        </div>
      </div>

      <Dialog
        open={deleteCircleOpen}
        onOpenChange={(o) => {
          setDeleteCircleOpen(o);
          if (!o) {
            setTypedName('');
            removeCircle.reset();
          }
        }}
        title={`Delete ${circle.name}?`}
        description="This can’t be undone. Download your data first if you might need it."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteCircleOpen(false)}>
              Keep the circle
            </Button>
            <Button
              variant="danger"
              loading={removeCircle.isPending}
              disabled={typedName.trim() !== circle.name}
              onClick={async () => {
                try {
                  await removeCircle.mutateAsync(typedName);
                  setDeleteCircleOpen(false);
                  toast(`${circle.name} was deleted`);
                  navigate('/app', { replace: true });
                } catch {
                  // Shown in the dialog.
                }
              }}
            >
              Delete circle
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ActionError error={removeCircle.error} />
          <p className="text-ink-muted">
            Every member loses access, and all tasks, records, updates and history are removed.
          </p>
          <TextField
            label={`Type “${circle.name}” to confirm`}
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            autoComplete="off"
          />
        </div>
      </Dialog>

      <Dialog
        open={deleteAccountOpen}
        onOpenChange={(o) => {
          setDeleteAccountOpen(o);
          if (!o) {
            setUnderstood(false);
            removeAccount.reset();
          }
        }}
        title="Delete your account?"
        description="This can’t be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteAccountOpen(false)}>
              Keep my account
            </Button>
            <Button
              variant="danger"
              loading={removeAccount.isPending}
              disabled={!understood}
              onClick={async () => {
                try {
                  await endSession('/', () => removeAccount.mutateAsync(undefined));
                } catch {
                  // Shown in the dialog.
                }
              }}
            >
              Delete my account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ActionError error={removeAccount.error} />
          <ul className="list-disc space-y-1 pl-5 text-ink-muted">
            <li>Your profile, preferences, notifications and private notes are deleted.</li>
            <li>Circles where you’re the only member are deleted.</li>
            <li>In shared circles, what you recorded and posted stays, shown as “A former member”.</li>
            <li>If you’re the only admin of a shared circle, make someone else an admin first.</li>
          </ul>
          <Notice tone="warning">Download your data first if you might need it.</Notice>
          <Checkbox
            label="I understand that my account will be permanently deleted"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
          />
        </div>
      </Dialog>
    </section>
  );
}
