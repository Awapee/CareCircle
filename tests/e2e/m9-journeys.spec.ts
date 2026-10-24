import { expect, test } from '@playwright/test';
import { signInDemo } from './helpers';

test.describe('end-to-end journeys', () => {
  test('an admin adds a task, a caregiver records it, and family see it happened', async ({ page }) => {
    // Gita (admin) adds a task for Ram late tonight, so it's still to do whenever the test runs.
    await signInDemo(page, 'Gita');
    await page.goto('/demo/app/planner');
    await page.getByRole('button', { name: 'New task' }).click();
    const form = page.getByRole('dialog', { name: 'New task' });
    await form.getByLabel('Title').fill('Water the plants');
    await form.getByLabel('Time 1').fill('23:58');
    await form.getByLabel('Assigned to').selectOption({ label: 'Ram' });
    await form.getByRole('button', { name: 'Add task' }).click();
    await expect(form).toBeHidden();

    // Ram (caregiver) sees it in today's plan and marks it done.
    await signInDemo(page, 'Ram');
    await page.goto('/demo/app/planner');
    await page.getByRole('button', { name: 'Mark done: Water the plants' }).click();
    await expect(page.getByRole('button', { name: 'Mark done: Water the plants' })).toBeHidden();

    // Hari (family) sees who did it in the history.
    await signInDemo(page, 'Hari');
    await page.goto('/demo/app/activity?tab=history');
    await expect(page.locator('main').getByText('Ram marked “Water the plants” as done')).toBeVisible();
  });
});

test.describe('installable app', () => {
  test('serves a valid manifest with its icons', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const manifest = await (await request.get(href!)).json();
    expect(manifest.name).toBe('CareCircle');
    expect(manifest.display).toBe('standalone');
    for (const icon of manifest.icons as { src: string }[]) {
      const res = await request.get(new URL(icon.src, new URL(href!, page.url())).href);
      expect(res.ok(), icon.src).toBe(true);
      expect(res.headers()['content-type']).toContain('image/png');
    }
  });

  test('opens the demo without a connection once it has been visited', async ({ page, context }) => {
    await signInDemo(page, 'Gita');
    await page.evaluate(() => navigator.serviceWorker.ready);
    // The first load happened before the service worker took control; load once more so it has everything.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await context.setOffline(true);
    await page.goto('/demo/app/planner');
    await expect(page.getByRole('heading', { level: 1, name: 'Planner' })).toBeVisible();
    // Demo data lives in this browser, so recording still works offline.
    await expect(page.locator('main ul li').first()).toBeVisible();
    await context.setOffline(false);
  });

  test('settings explains how to install it', async ({ page }) => {
    await signInDemo(page);
    await page.goto('/demo/app/settings');
    const section = page.getByRole('region', { name: 'Install on this device' });
    await expect(section).toBeVisible();
    await expect(section.getByText(/Install app|Install CareCircle|Add to Home Screen/).first()).toBeVisible();
  });
});
