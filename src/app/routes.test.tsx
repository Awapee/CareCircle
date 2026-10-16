import { screen, within } from '@testing-library/react';
import { matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { demoApi, renderRoute } from '@/test/renderRoute';
import { routes } from './routes';

/** True when a path is handled by a real page rather than the catch-all 404 route. */
function resolvesToRealPage(href: string): boolean {
  const { pathname } = new URL(href, 'http://localhost');
  const matches = matchRoutes(routes, pathname);
  return !!matches && matches[matches.length - 1]?.route.path !== '*';
}

const publicPages: [string, RegExp][] = [
  ['/', /everyday care, made easier together/i],
  ['/get-started', /get started with carecircle/i],
  ['/about', /about carecircle/i],
  ['/contact', /contact & support/i],
  ['/privacy', /privacy policy/i],
  ['/terms', /terms of use/i],
  ['/limitations', /limitations & appropriate use/i],
];

describe('public pages', () => {
  it.each(publicPages)('%s renders its main heading', async (path, heading) => {
    renderRoute(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it.each(publicPages)('%s contains no links to missing pages', async (path) => {
    renderRoute(path);
    await screen.findByRole('heading', { level: 1 });
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href') ?? '');
    const broken = hrefs.filter((href) => href.startsWith('/') && !resolvesToRealPage(href));
    expect(broken).toEqual([]);
  });

  it('landing page shows the required hero copy and calls to action', async () => {
    renderRoute('/');
    const hero = (await screen.findByRole('heading', { level: 1 })).closest('section')!;
    expect(within(hero).getByText('One circle. Shared care.')).toBeInTheDocument();
    expect(within(hero).getByRole('link', { name: /get started/i })).toHaveAttribute('href', '/get-started');
    expect(within(hero).getByRole('link', { name: /how it works/i })).toHaveAttribute('href', '/#how-it-works');
  });

  it('landing page anchors exist for in-page links', async () => {
    const { container } = renderRoute('/');
    await screen.findByRole('heading', { level: 1 });
    expect(container.querySelector('#features')).not.toBeNull();
    expect(container.querySelector('#how-it-works')).not.toBeNull();
  });

  it('footer links to About, Contact, Privacy Policy and Terms of Use', async () => {
    renderRoute('/');
    const footer = await screen.findByRole('contentinfo');
    for (const name of ['About', 'Contact', 'Privacy Policy', 'Terms of Use']) {
      expect(within(footer).getByRole('link', { name })).toBeInTheDocument();
    }
  });

  it('shows a 404 page for unknown URLs', async () => {
    renderRoute('/does-not-exist');
    expect(await screen.findByRole('heading', { name: /couldn’t find that page/i })).toBeInTheDocument();
  });
});

describe('app shell', () => {
  it('sends signed-out visitors to sign in', async () => {
    renderRoute('/app/planner');
    expect(await screen.findByRole('heading', { level: 1, name: /try the carecircle demo/i })).toBeInTheDocument();
  });

  it('marks the current page in the navigation', async () => {
    renderRoute('/app/planner', demoApi());
    await screen.findByRole('heading', { level: 1, name: 'Planner' });
    const nav = screen.getAllByRole('navigation', { name: 'Application' })[0]!;
    expect(within(nav).getByRole('link', { name: 'Planner' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the demo-mode banner on every app page', async () => {
    renderRoute('/app', demoApi());
    expect(await screen.findByText(/demo mode, simulated/i)).toBeInTheDocument();
  });

  it('labels unbuilt pages honestly and shows no interactive controls inside them', async () => {
    renderRoute('/app/settings', demoApi());
    await screen.findByRole('heading', { level: 1, name: 'Settings' });
    const main = screen.getByRole('main');
    expect(within(main).getByText(/planned · milestone 8/i)).toBeInTheDocument();
    expect(within(main).queryAllByRole('button')).toHaveLength(0);
  });

  it('every navigation item resolves to a real page', () => {
    for (const path of [
      '/app',
      '/app/planner',
      '/app/medication',
      '/app/appointments',
      '/app/routines',
      '/app/circle',
      '/app/activity',
      '/app/notifications',
      '/app/settings',
    ]) {
      expect(resolvesToRealPage(path)).toBe(true);
    }
  });
});
