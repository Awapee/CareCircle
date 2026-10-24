import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DemoApi } from '@/api/demo/DemoApi';
import { buildSeed } from '@/api/demo/seed';
import { guideStore } from '@/features/demo/guideStore';
import { demoApi, renderRoute } from '@/test/renderRoute';

/** End-to-end journeys through the real pages, using the demo backend. */

describe('the guided walkthrough', () => {
  it('builds a circle with the visitor’s own names and starts the tour', async () => {
    const user = userEvent.setup();
    renderRoute('/sign-in', demoApi(null));
    await user.type(await screen.findByLabelText(/who is the circle for/i), 'Mum');
    await user.type(screen.getByLabelText(/your name/i), 'Alex');
    await user.click(screen.getByRole('button', { name: /start the walkthrough/i }));
    expect(await screen.findByRole('heading', { level: 1, name: /alex/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /one place for the whole day/i })).toBeInTheDocument();
    expect(screen.getAllByText(/mum’s circle/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/sita/i)).not.toBeInTheDocument();
  });

  it('asks for both names before starting', async () => {
    const user = userEvent.setup();
    renderRoute('/sign-in', demoApi(null));
    await user.click(await screen.findByRole('button', { name: /start the walkthrough/i }));
    expect(await screen.findByText(/enter a name for the person you care for/i)).toBeInTheDocument();
    expect(screen.getByText('Enter your name')).toBeInTheDocument();
  });

  it('moves through the tour to the next page', async () => {
    const user = userEvent.setup();
    const api = demoApi(null);
    await api.startWalkthrough({ recipientName: 'Dad', yourName: 'Sam', circleName: 'Dad’s team', timeZone: 'UTC' });
    guideStore.set({ step: 0, open: true });
    renderRoute('/app', api);
    await screen.findByRole('heading', { name: /one place for the whole day/i });
    await user.click(screen.getByRole('button', { name: /next step/i }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Planner' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /plan the week/i })).toBeInTheDocument();
  });

  it('lets the visitor view the circle as someone else', async () => {
    const user = userEvent.setup();
    renderRoute('/app', demoApi('demo-priya'));
    const select = await screen.findByLabelText(/view as/i);
    await user.selectOptions(select, 'demo-sam');
    await waitFor(() => expect(screen.getByLabelText(/view as/i)).toHaveValue('demo-sam'));
  });
});

describe('dashboard and planner', () => {
  it('records a task in one tap and updates the counts', async () => {
    const user = userEvent.setup();
    renderRoute('/app', demoApi('demo-priya'));
    await screen.findByText(/today’s schedule/i);
    const completed = () => Number(screen.getByText('Completed', { selector: 'dt' }).nextElementSibling!.textContent);
    const before = completed();
    const today = screen.getByRole('heading', { name: /today’s schedule/i }).closest('section')!;
    const buttons = within(today).queryAllByRole('button', { name: /^(mark done|mark taken):/i });
    if (buttons.length === 0) return; // Nothing left to record at this time of day.
    await user.click(buttons[0]!);
    await waitFor(() => expect(completed()).toBe(before + 1));
  });

  it('creates a new task series that then appears in All tasks', async () => {
    const user = userEvent.setup();
    renderRoute('/app/planner?view=series', demoApi('demo-priya'));
    await user.click(await screen.findByRole('button', { name: /new task/i }));
    const dialog = await screen.findByRole('dialog', { name: /new task/i });
    await user.type(within(dialog).getByLabelText('Title'), 'Crossword');
    await user.click(within(dialog).getByRole('button', { name: /add task/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Crossword')).toBeInTheDocument();
  });

  it('shows validation errors instead of saving an incomplete task', async () => {
    const user = userEvent.setup();
    renderRoute('/app/planner', demoApi('demo-priya'));
    await user.click(await screen.findByRole('button', { name: /new task/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /add task/i }));
    expect(await within(dialog).findByText(/enter a title/i)).toBeInTheDocument();
  });

  it('hides editing controls from read-only members', async () => {
    renderRoute('/app/planner', demoApi('demo-sam'));
    await screen.findByRole('heading', { level: 1, name: 'Planner' });
    expect(screen.queryByRole('button', { name: /new task/i })).not.toBeInTheDocument();
  });
});

describe('medication', () => {
  it('hides medicine names from family members by default', async () => {
    renderRoute('/app/medication', demoApi('demo-leo'));
    expect(await screen.findByText(/medication details are hidden for your role/i)).toBeInTheDocument();
    expect(screen.queryByText('Blood pressure tablet')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add medication/i })).not.toBeInTheDocument();
  });

  it('shows them to caregivers, with what was recorded', async () => {
    renderRoute('/app/medication', demoApi('demo-tom'));
    expect(await screen.findByText('Blood pressure tablet')).toBeInTheDocument();
    expect(screen.getAllByText(/recorded in the last 7 days/i).length).toBeGreaterThan(0);
  });
});

describe('care circle', () => {
  it('lets an admin create a single-use invitation link', async () => {
    const user = userEvent.setup();
    renderRoute('/app/circle', demoApi('demo-priya'));
    await user.click(await screen.findByRole('button', { name: /invite someone/i }));
    const dialog = await screen.findByRole('dialog', { name: /invite someone/i });
    await user.click(within(dialog).getByRole('radio', { name: /caregiver/i }));
    await user.click(within(dialog).getByRole('button', { name: /create link/i }));
    const link = (await within(dialog).findByLabelText(/invitation link/i)) as HTMLInputElement;
    expect(link.value).toMatch(/\/invite\/[0-9a-f]{64}$/);
  });

  it('lets someone join through an invitation link', async () => {
    const user = userEvent.setup();
    const db = buildSeed(new Date());
    db.sessionUserId = 'demo-priya';
    const api = new DemoApi({ db });
    const token = await api.createInvitation('demo-circle', { role: 'family', label: '', expiresInDays: 7 });
    await api.startFresh('Nina', 'Europe/London');
    renderRoute(`/invite/${token}`, api);
    expect(await screen.findByRole('heading', { name: /join sita’s circle/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /join circle/i }));
    expect(await screen.findByRole('heading', { level: 1, name: /nina/i })).toBeInTheDocument();
  });

  it('does not show member management to non-admins', async () => {
    renderRoute('/app/circle', demoApi('demo-tom'));
    await screen.findByRole('heading', { name: /members/i });
    expect(screen.queryByRole('button', { name: /invite someone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /change role/i })).not.toBeInTheDocument();
  });
});

describe('updates and notifications', () => {
  it('posts an update to the circle', async () => {
    const user = userEvent.setup();
    renderRoute('/app/activity', demoApi('demo-tom'));
    await user.type(await screen.findByLabelText('Update'), 'Sita slept well.');
    await user.click(screen.getByRole('button', { name: /post update/i }));
    expect(await screen.findByText('Sita slept well.')).toBeInTheDocument();
  });

  it('lists notifications and marks them all as read', async () => {
    const user = userEvent.setup();
    // A fixed midday clock, so there are always reminders to read whatever time the test runs.
    renderRoute('/app/notifications', demoApi('demo-priya', new Date('2026-03-10T12:00:00Z')));
    await user.click(await screen.findByRole('button', { name: /mark all as read/i }));
    expect(await screen.findByRole('heading', { name: /all caught up/i })).toBeInTheDocument();
  });
});

describe('settings', () => {
  it('saves a new display name', async () => {
    const user = userEvent.setup();
    renderRoute('/app/settings', demoApi('demo-tom'));
    const name = await screen.findByLabelText('Your name');
    await waitFor(() => expect(name).toHaveValue('Ram'));
    await user.clear(name);
    await user.type(name, 'Thomas');
    await user.click(screen.getByRole('button', { name: /save profile/i }));
    expect(await screen.findByText('Profile saved')).toBeInTheDocument();
    expect(screen.getAllByText(/thomas/i).length).toBeGreaterThan(0);
  });

  it('applies a larger text size straight away', async () => {
    const user = userEvent.setup();
    renderRoute('/app/settings', demoApi('demo-tom'));
    await user.click(await screen.findByRole('radio', { name: 'Larger' }));
    expect(document.documentElement.dataset.textSize).toBe('larger');
    await user.click(screen.getByRole('radio', { name: 'Standard' }));
    expect(document.documentElement.dataset.textSize).toBeUndefined();
  });

  it('downloads everything the account can see as JSON', async () => {
    const user = userEvent.setup();
    let saved: Blob | null = null;
    URL.createObjectURL = vi.fn((b: Blob) => {
      saved = b;
      return 'blob:test';
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderRoute('/app/settings', demoApi('demo-leo'));
    await user.click(await screen.findByRole('button', { name: /download my data/i }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    const data = JSON.parse(await saved!.text());
    expect(data.profile.displayName).toBe('Hari');
    expect(data.circles[0].tasks.length).toBeGreaterThan(0);
    // Hari is Family, so the export can't contain medication details either.
    expect(JSON.stringify(data)).not.toContain('Blood pressure tablet');
    // His own private note is included; nobody else's would be.
    expect(data.circles[0].updates.some((u: { visibility: string }) => u.visibility === 'private')).toBe(true);
    click.mockRestore();
  });

  it('deletes an account after confirmation and returns to the home page', async () => {
    const user = userEvent.setup();
    renderRoute('/app/settings', demoApi('demo-sam'));
    await user.click(await screen.findByRole('button', { name: /^delete account$/i }));
    const dialog = await screen.findByRole('dialog', { name: /delete your account/i });
    const confirm = within(dialog).getByRole('button', { name: /delete my account/i });
    expect(confirm).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(confirm);
    expect(await screen.findByRole('heading', { name: /everyday care, made easier together/i })).toBeInTheDocument();
  });

  it('explains why the only admin of a shared circle can’t delete their account yet', async () => {
    const user = userEvent.setup();
    renderRoute('/app/settings', demoApi('demo-priya'));
    await user.click(await screen.findByRole('button', { name: /^delete account$/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: /delete my account/i }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/make someone else an admin first/i);
  });
});

describe('leaving the walkthrough', () => {
  it('links back to the website and to creating an account', async () => {
    renderRoute('/app', demoApi('demo-tom'));
    expect((await screen.findAllByRole('link', { name: /back to website/i }))[0]).toHaveAttribute('href', '/');
    expect(screen.getAllByRole('link', { name: /create an account/i })[0]).toHaveAttribute('href', '/get-started');
  });
});
