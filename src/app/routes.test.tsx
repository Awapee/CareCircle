import { screen, within } from '@testing-library/react';
import { matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { createUnavailableApi } from '@/api/unavailable/UnavailableApi';
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

describe('accounts before the database is connected', () => {
  it('get started offers the walkthrough and says accounts are coming soon', async () => {
    renderRoute('/get-started', createUnavailableApi());
    await screen.findByRole('heading', { level: 1, name: /get started/i });
    expect(screen.getByRole('link', { name: /start the walkthrough/i })).toHaveAttribute('href', '/demo/');
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('sign-up explains that accounts are almost ready instead of pretending', async () => {
    renderRoute('/sign-up', createUnavailableApi());
    expect(await screen.findByText(/accounts are almost ready/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see how it works/i })).toHaveAttribute('href', '/demo/');
  });
});

describe('app shell', () => {
  it('sends signed-out walkthrough visitors to name a circle first', async () => {
    renderRoute('/app/planner');
    expect(await screen.findByRole('heading', { level: 1, name: /see how carecircle works/i })).toBeInTheDocument();
  });

  it('marks the current page in the navigation', async () => {
    renderRoute('/app/planner', demoApi());
    await screen.findByRole('heading', { level: 1, name: 'Planner' });
    const nav = screen.getAllByRole('navigation', { name: 'Application' })[0]!;
    expect(within(nav).getByRole('link', { name: 'Planner' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the walkthrough banner on every app page', async () => {
    renderRoute('/app', demoApi());
    expect(await screen.findByText(/sample data, saved only in this browser/i)).toBeInTheDocument();
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
