import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DemoApi } from '@/api/demo/DemoApi';
import { buildSeed } from '@/api/demo/seed';
import { demoApi, renderRoute } from '@/test/renderRoute';

/** End-to-end journeys through the real pages, using the demo backend. */

describe('signing in to the demo', () => {
  it('lets a visitor choose a person and lands on their dashboard', async () => {
    const user = userEvent.setup();
    renderRoute('/sign-in', demoApi(null));
    await user.click(await screen.findByRole('button', { name: /continue as priya/i }));
    expect(await screen.findByRole('heading', { level: 1, name: /priya/i })).toBeInTheDocument();
    expect(screen.getByText(/scheduled today/i)).toBeInTheDocument();
  });

  it('takes a brand-new account through creating a circle', async () => {
    const user = userEvent.setup();
    renderRoute('/sign-in', demoApi(null));
    await user.type(await screen.findByLabelText(/your first name/i), 'Alex');
    await user.click(screen.getByRole('button', { name: /start fresh/i }));
    expect(await screen.findByRole('heading', { name: /welcome, alex/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/who is receiving care/i), 'Jo');
    await user.click(screen.getByRole('button', { name: /create circle/i }));
    expect(await screen.findByRole('heading', { level: 1, name: /alex/i })).toBeInTheDocument();
    expect(screen.getByText(/care for jo/i)).toBeInTheDocument();
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
    expect(await screen.findByRole('heading', { name: /join margaret’s circle/i })).toBeInTheDocument();
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
    await user.type(await screen.findByLabelText('Update'), 'Margaret slept well.');
    await user.click(screen.getByRole('button', { name: /post update/i }));
    expect(await screen.findByText('Margaret slept well.')).toBeInTheDocument();
  });

  it('lists notifications and marks them all as read', async () => {
    const user = userEvent.setup();
    renderRoute('/app/notifications', demoApi('demo-priya'));
    await user.click(await screen.findByRole('button', { name: /mark all as read/i }));
    expect(await screen.findByRole('heading', { name: /all caught up/i })).toBeInTheDocument();
  });
});
