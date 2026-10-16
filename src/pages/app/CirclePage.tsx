import { Check, Copy, LogOut, Settings2, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApi } from '@/api/ApiProvider';
import { useAction, useInvitations } from '@/api/queries';
import { useCircle } from '@/app/session';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { Checkbox, SelectField, TextArea, TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { ActionError, ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { formatInstant } from '@/domain/dates';
import { ROLE_DESCRIPTIONS } from '@/domain/permissions';
import { ROLES, ROLE_LABELS, type CircleMember, type Invitation, type Role } from '@/domain/types';
import { TIME_ZONES } from '@/lib/timeZones';
import { usePageTitle } from '@/lib/usePageTitle';

export function CirclePage() {
  usePageTitle('My Care Circle');
  const { circle, careProfile, can } = useCircle();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Care Circle"
        description="The people sharing care, and what each of them can see and do."
        actions={
          can('edit_circle') && (
            <Button
              variant="secondary"
              icon={<Settings2 className="size-4" aria-hidden="true" />}
              onClick={() => setSettingsOpen(true)}
            >
              Circle settings
            </Button>
          )
        }
      />

      <Card as="section" aria-labelledby="about-heading">
        <h2 id="about-heading" className="text-lg font-semibold">
          About {careProfile.preferredName}
        </h2>
        {careProfile.sharedNotes ? (
          <p className="mt-2 whitespace-pre-line text-ink-muted">{careProfile.sharedNotes}</p>
        ) : (
          <p className="mt-2 text-ink-muted">
            No shared notes yet.
            {can('edit_circle') && ' Add helpful details in circle settings, like preferences or how to get in.'}
          </p>
        )}
        <p className="mt-3 text-sm text-ink-subtle">
          {circle.name} · Times shown in {circle.timeZone.replace(/_/g, ' ')} ·{' '}
          {circle.familyCanSeeMedication
            ? 'Family can see medication details'
            : 'Medication details hidden from Family'}
        </p>
      </Card>

      <Members />
      {can('manage_members') && <Invitations />}
      <FollowUp />
      <RolesTable />

      {can('edit_circle') && <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />}
    </div>
  );
}

function Members() {
  const { members, userId, can, circleId } = useCircle();
  const navigate = useNavigate();
  const toast = useToast();
  const [editing, setEditing] = useState<CircleMember | null>(null);
  const [removing, setRemoving] = useState<CircleMember | null>(null);
  const remove = useAction((api, m: CircleMember) => api.removeMember(circleId, m.userId));
  const sorted = [...members].sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role));
  const leaving = removing?.userId === userId;

  return (
    <section aria-labelledby="members-heading">
      <h2 id="members-heading" className="text-lg font-semibold">
        Members ({members.length})
      </h2>
      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-canvas shadow-card">
        {sorted.map((m) => (
          <li key={m.userId} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-700"
                aria-hidden="true"
              >
                {m.displayName.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="font-medium">
                  {m.displayName}
                  {m.userId === userId && <span className="font-normal text-ink-muted"> (you)</span>}
                </p>
                <p className="text-sm text-ink-muted">{ROLE_DESCRIPTIONS[m.role]}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <Badge tone={m.role === 'admin' ? 'brand' : 'neutral'}>{ROLE_LABELS[m.role]}</Badge>
              {can('manage_members') && (
                <Button variant="ghost" size="sm" onClick={() => setEditing(m)}>
                  Change role
                </Button>
              )}
              {can('manage_members') && m.userId !== userId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger-700 hover:text-danger-700"
                  onClick={() => setRemoving(m)}
                >
                  Remove
                </Button>
              )}
              {m.userId === userId && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<LogOut className="size-4" aria-hidden="true" />}
                  onClick={() => setRemoving(m)}
                >
                  Leave
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <RoleDialog member={editing} onClose={() => setEditing(null)} />

      <Dialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) {
            setRemoving(null);
            remove.reset();
          }
        }}
        title={leaving ? 'Leave this circle?' : `Remove ${removing?.displayName ?? ''}?`}
        description={
          leaving
            ? 'You’ll lose access to this circle’s schedule and updates. An admin can invite you again.'
            : 'They’ll lose access straight away. What they recorded stays in the history.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={async () => {
                if (!removing) return;
                try {
                  await remove.mutateAsync(removing);
                  setRemoving(null);
                  if (leaving) navigate('/app', { replace: true });
                  else toast(`${removing.displayName} was removed`);
                } catch {
                  // Shown below.
                }
              }}
            >
              {leaving ? 'Leave circle' : 'Remove'}
            </Button>
          </>
        }
      >
        <ActionError error={remove.error} />
        <p className="text-ink-muted">Tasks assigned to {leaving ? 'you' : 'them'} become unassigned.</p>
      </Dialog>
    </section>
  );
}

function RoleDialog({ member, onClose }: { member: CircleMember | null; onClose: () => void }) {
  return (
    <Dialog
      open={!!member}
      onOpenChange={(open) => !open && onClose()}
      title={`Change ${member?.displayName ?? ''}’s role`}
    >
      {member && <RoleForm key={member.userId} member={member} onClose={onClose} />}
    </Dialog>
  );
}

function RoleForm({ member, onClose }: { member: CircleMember; onClose: () => void }) {
  const { circleId } = useCircle();
  const toast = useToast();
  const [role, setRole] = useState<Role>(member.role);
  const save = useAction((api, r: Role) => api.changeMemberRole(circleId, member.userId, r));
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await save.mutateAsync(role);
          toast(`${member.displayName} is now ${ROLE_LABELS[role]}`);
          onClose();
        } catch {
          // Shown by <ActionError>.
        }
      }}
    >
      <ActionError error={save.error} />
      <RolePicker value={role} onChange={setRole} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} disabled={role === member.role}>
          Save role
        </Button>
      </div>
    </form>
  );
}

function RolePicker({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <fieldset>
      <legend className="font-medium">Role</legend>
      <div className="mt-2 space-y-2">
        {ROLES.map((r) => (
          <label
            key={r}
            className="grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 rounded-xl border border-line px-4 py-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50"
          >
            <input
              type="radio"
              name="role"
              value={r}
              checked={value === r}
              onChange={() => onChange(r)}
              className="row-span-2 mt-1 size-4 accent-brand-600"
            />
            <span className="font-medium">{ROLE_LABELS[r]}</span>
            <span className="text-sm text-ink-muted">{ROLE_DESCRIPTIONS[r]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function invitationStatus(inv: Invitation, now: Date) {
  if (inv.revokedAt) return { label: 'Cancelled', tone: 'neutral' as const };
  if (inv.acceptedAt) return { label: 'Used', tone: 'success' as const };
  if (new Date(inv.expiresAt) < now) return { label: 'Expired', tone: 'neutral' as const };
  return { label: 'Waiting', tone: 'info' as const };
}

function Invitations() {
  const { circleId, timeZone, memberName } = useCircle();
  const api = useApi();
  const invitations = useInvitations(circleId, true);
  const revoke = useAction((a, id: string) => a.revokeInvitation(id));
  const [open, setOpen] = useState(false);
  const now = new Date();

  return (
    <section aria-labelledby="invites-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="invites-heading" className="text-lg font-semibold">
            Invitations
          </h2>
          <p className="text-sm text-ink-muted">Each link works once, for the role you choose, until it expires.</p>
        </div>
        <Button icon={<UserPlus className="size-4" aria-hidden="true" />} onClick={() => setOpen(true)}>
          Invite someone
        </Button>
      </div>
      <ActionError error={revoke.error} />
      {invitations.isPending ? (
        <LoadingState />
      ) : invitations.isError ? (
        <ErrorState error={invitations.error} onRetry={() => invitations.refetch()} />
      ) : invitations.data.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-ink-muted">
          No invitations yet.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-canvas shadow-card">
          {invitations.data.map((inv) => {
            const st = invitationStatus(inv, now);
            return (
              <li key={inv.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {inv.label || 'Invitation'} · {ROLE_LABELS[inv.role]}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {inv.acceptedAt
                      ? `Used by ${memberName(inv.acceptedBy)}, ${formatInstant(inv.acceptedAt, timeZone)}`
                      : `Expires ${formatInstant(inv.expiresAt, timeZone)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={st.tone}>{st.label}</Badge>
                  {st.label === 'Waiting' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={revoke.isPending}
                      icon={<Trash2 className="size-4" aria-hidden="true" />}
                      onClick={() => revoke.mutate(inv.id)}
                    >
                      Cancel invitation
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <InviteDialog open={open} onOpenChange={setOpen} demo={api.mode === 'demo'} />
    </section>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  demo,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  demo: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Invite someone">
      {open && <InviteForm demo={demo} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function InviteForm({ demo, onClose }: { demo: boolean; onClose: () => void }) {
  const { circleId } = useCircle();
  const [role, setRole] = useState<Role>('family');
  const [label, setLabel] = useState('');
  const [days, setDays] = useState(7);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const create = useAction((api) => api.createInvitation(circleId, { role, label, expiresInDays: days }));

  if (link) {
    return (
      <div className="space-y-4">
        <Notice tone="info" title="Copy this link now">
          For security, it’s only shown once. Send it to the person you’re inviting, for example by text message.
        </Notice>
        <TextField label="Invitation link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
        <div className="flex flex-wrap gap-2">
          <Button
            icon={
              copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />
            }
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
        {demo && (
          <p className="text-sm text-ink-muted">
            In the demo, you can try joining: switch person, start an empty demo account, then open this link.
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const token = await create.mutateAsync(undefined);
          setLink(`${window.location.origin}${import.meta.env.BASE_URL}invite/${token}`);
        } catch {
          // Shown by <ActionError>.
        }
      }}
    >
      <ActionError error={create.error} />
      <RolePicker value={role} onChange={setRole} />
      <TextField
        label="Who is it for?"
        optional
        hint="Only you and other admins see this, to tell invitations apart."
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        maxLength={60}
      />
      <SelectField label="Link expires after" value={days} onChange={(e) => setDays(Number(e.target.value))}>
        <option value={1}>1 day</option>
        <option value={3}>3 days</option>
        <option value={7}>7 days</option>
        <option value={14}>14 days</option>
        <option value={30}>30 days</option>
      </SelectField>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={create.isPending}>
          Create link
        </Button>
      </div>
    </form>
  );
}

function FollowUp() {
  const { members, followUpContactIds, can, circleId } = useCircle();
  const toast = useToast();
  const eligible = members.filter((m) => m.role !== 'read_only');
  const [selected, setSelected] = useState<string[]>(followUpContactIds);
  const save = useAction((api, ids: string[]) => api.setFollowUpContacts(circleId, ids));
  const editable = can('manage_members');
  const changed = [...selected].sort().join() !== [...followUpContactIds].sort().join();

  return (
    <section aria-labelledby="followup-heading">
      <h2 id="followup-heading" className="text-lg font-semibold">
        Follow-up contacts
      </h2>
      <p className="mt-1 max-w-2xl text-ink-muted">
        When nothing is recorded for a task after its waiting period, these people are notified, along with the person
        it’s assigned to. They also get reminders for tasks that aren’t assigned to anyone.
      </p>
      <Card className="mt-3">
        {editable ? (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await save.mutateAsync(selected);
                toast('Follow-up contacts saved');
              } catch {
                // Shown by <ActionError>.
              }
            }}
          >
            <ActionError error={save.error} />
            {eligible.map((m) => (
              <Checkbox
                key={m.userId}
                label={m.displayName}
                hint={ROLE_LABELS[m.role]}
                checked={selected.includes(m.userId)}
                onChange={(e) =>
                  setSelected((prev) => (e.target.checked ? [...prev, m.userId] : prev.filter((x) => x !== m.userId)))
                }
              />
            ))}
            {selected.length === 0 && (
              <Notice tone="warning">With nobody selected, unassigned tasks won’t send reminders or follow-up.</Notice>
            )}
            <Button type="submit" variant="secondary" loading={save.isPending} disabled={!changed}>
              Save follow-up contacts
            </Button>
          </form>
        ) : followUpContactIds.length ? (
          <ul className="flex flex-wrap gap-2">
            {followUpContactIds.map((id) => (
              <li key={id}>
                <Badge>{members.find((m) => m.userId === id)?.displayName ?? 'Former member'}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">Nobody is set up for follow-up yet.</p>
        )}
      </Card>
    </section>
  );
}

const MATRIX: { action: string; roles: Record<Role, string> }[] = [
  {
    action: 'See the schedule and appointments',
    roles: { admin: '✓', care_recipient: '✓', caregiver: '✓', family: '✓', read_only: '✓' },
  },
  {
    action: 'See medication details',
    roles: { admin: '✓', care_recipient: '✓', caregiver: '✓', family: 'If allowed', read_only: '✗' },
  },
  {
    action: 'Create and edit tasks',
    roles: { admin: '✓', care_recipient: '✓', caregiver: '✓', family: '✗', read_only: '✗' },
  },
  {
    action: 'Record what happened',
    roles: { admin: '✓', care_recipient: '✓', caregiver: '✓', family: 'Own tasks', read_only: '✗' },
  },
  { action: 'Delete tasks', roles: { admin: '✓', care_recipient: '✓', caregiver: '✗', family: '✗', read_only: '✗' } },
  { action: 'Post updates', roles: { admin: '✓', care_recipient: '✓', caregiver: '✓', family: '✓', read_only: '✗' } },
  { action: 'Manage members', roles: { admin: '✓', care_recipient: '✗', caregiver: '✗', family: '✗', read_only: '✗' } },
];

function RolesTable() {
  return (
    <section aria-labelledby="roles-heading">
      <h2 id="roles-heading" className="flex items-center gap-2 text-lg font-semibold">
        <ShieldCheck className="size-5 text-brand-600" aria-hidden="true" />
        What each role can do
      </h2>
      <div
        role="region"
        aria-label="Role permissions table (scrolls sideways on small screens)"
        // A scrollable region must be keyboard-focusable so it can be scrolled without a mouse (WCAG 2.1.1).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="relative mt-3 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-canvas shadow-card"
      >
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-surface text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Action
              </th>
              {ROLES.map((r) => (
                <th key={r} scope="col" className="px-3 py-3 text-center font-medium">
                  {ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {MATRIX.map((row) => (
              <tr key={row.action}>
                <th scope="row" className="px-4 py-3 font-medium text-ink">
                  {row.action}
                </th>
                {ROLES.map((r) => (
                  <td key={r} className="px-3 py-3 text-center text-ink-muted">
                    {row.roles[r] === '✓' ? (
                      <span>
                        <span aria-hidden="true">✓</span>
                        <span className="sr-only">Yes</span>
                      </span>
                    ) : row.roles[r] === '✗' ? (
                      <span>
                        <span aria-hidden="true">✗</span>
                        <span className="sr-only">No</span>
                      </span>
                    ) : (
                      row.roles[r]
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-ink-muted">
        Private notes are only ever visible to the person who wrote them. These rules are enforced by the database, not
        just hidden in the app.
      </p>
    </section>
  );
}

function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Circle settings" size="lg">
      {open && <SettingsForm onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function SettingsForm({ onClose }: { onClose: () => void }) {
  const { circle, careProfile, circleId } = useCircle();
  const toast = useToast();
  const [name, setName] = useState(circle.name);
  const [timeZone, setTimeZone] = useState(circle.timeZone);
  const [family, setFamily] = useState(circle.familyCanSeeMedication);
  const [recipient, setRecipient] = useState(careProfile.preferredName);
  const [notes, setNotes] = useState(careProfile.sharedNotes);
  const save = useAction((api) =>
    api.updateCircle(
      circleId,
      { name, timeZone, familyCanSeeMedication: family, recipientName: recipient, sharedNotes: notes },
      circle.version,
    ),
  );
  const zones = TIME_ZONES.includes(timeZone) ? TIME_ZONES : [timeZone, ...TIME_ZONES];

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await save.mutateAsync(undefined);
          toast('Circle settings saved');
          onClose();
        } catch {
          // Shown by <ActionError>.
        }
      }}
    >
      <ActionError error={save.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Circle name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
        <TextField
          label="Name of the person receiving care"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          maxLength={80}
          required
        />
      </div>
      <TextArea
        label="Shared notes"
        optional
        hint="Visible to everyone in the circle. Avoid detailed medical information."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={1000}
        rows={4}
      />
      <SelectField
        label="Time zone"
        hint="Changing it doesn’t move tasks that are already scheduled; new ones follow the new time zone."
        value={timeZone}
        onChange={(e) => setTimeZone(e.target.value)}
      >
        {zones.map((z) => (
          <option key={z} value={z}>
            {z.replace(/_/g, ' ')}
          </option>
        ))}
      </SelectField>
      <Checkbox
        label="Family members can see medication details"
        hint="Off by default. When off, Family see that a dose is scheduled, but not the medicine’s name or instructions."
        checked={family}
        onChange={(e) => setFamily(e.target.checked)}
      />
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
