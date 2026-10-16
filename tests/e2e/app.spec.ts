import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, signInDemo } from './helpers';

const appPages = [
  '/app',
  '/app/planner',
  '/app/planner?view=week',
  '/app/planner?view=series',
  '/app/medication',
  '/app/appointments',
  '/app/routines',
  '/app/circle',
  '/app/activity',
  '/app/activity?tab=history',
  '/app/notifications',
  '/app/settings',
];

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}

test.describe('app pages: accessibility (axe, WCAG 2.1 AA)', () => {
  test('every app page, as an admin', async ({ page }) => {
    await signInDemo(page);
    for (const path of appPages) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      expect(await axe(page), path).toEqual([]);
    }
  });

  test('pages seen by a family member and a read-only member', async ({ page }) => {
    for (const name of ['Leo', 'Sam']) {
      await signInDemo(page, name);
      for (const path of ['/app', '/app/medication', '/app/circle']) {
        await page.goto(path);
        await expect(page.locator('main h1')).toBeVisible();
        expect(await axe(page), `${name} ${path}`).toEqual([]);
      }
    }
  });

  test('dialogs', async ({ page }) => {
    await signInDemo(page);
    await page.goto('/app/planner');
    await page.getByRole('button', { name: 'New task' }).click();
    await expect(page.getByRole('dialog', { name: 'New task' })).toBeVisible();
    expect(await axe(page), 'task form').toEqual([]);
    await page.keyboard.press('Escape');

    await page.locator('main ul li button').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await axe(page), 'occurrence details').toEqual([]);
    await page.keyboard.press('Escape');

    await page.goto('/app/circle');
    await page.getByRole('button', { name: 'Invite someone' }).click();
    await expect(page.getByRole('dialog', { name: 'Invite someone' })).toBeVisible();
    expect(await axe(page), 'invite form').toEqual([]);
    await page.keyboard.press('Escape');

    await page.goto('/app/settings');
    await page.getByRole('button', { name: 'Delete account' }).click();
    await expect(page.getByRole('dialog', { name: 'Delete your account?' })).toBeVisible();
    expect(await axe(page), 'delete account').toEqual([]);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Delete circle' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await axe(page), 'delete circle').toEqual([]);
  });
});

test.describe('app pages: responsive layout', () => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await signInDemo(page);
      for (const path of appPages) {
        await page.goto(path);
        await expect(page.locator('main h1')).toBeVisible();
        await expectNoHorizontalOverflow(page);
      }
    });
  }
});

test.describe('app journeys in a real browser', () => {
  test('record a task from its details, then undo it', async ({ page }) => {
    await signInDemo(page);
    await page.goto('/app/planner?view=list');
    const row = page
      .locator('main ul li')
      .filter({ has: page.getByRole('button', { name: /^Mark (done|taken):/ }) })
      .first();
    await row.locator('button').first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Note').fill('Recorded in an automated test');
    await dialog.getByRole('button', { name: /^Mark (done|taken)$/ }).click();
    await expect(dialog.getByText('Recorded in an automated test')).toBeVisible();
    await dialog.getByRole('button', { name: 'Clear this record' }).click();
    await expect(dialog.getByLabel('Note')).toBeVisible();
  });

  test('dialogs close with Escape and return focus', async ({ page }) => {
    await signInDemo(page);
    await page.goto('/app/planner');
    const trigger = page.getByRole('button', { name: 'New task' });
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('the demo survives a reload and can be reset', async ({ page }) => {
    await signInDemo(page, 'Tom');
    await page.goto('/app/activity');
    await page.getByRole('textbox', { name: 'Update' }).fill('Persisted across reloads');
    await page.getByRole('button', { name: 'Post update' }).click();
    await expect(page.getByText('Persisted across reloads')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Persisted across reloads')).toBeVisible();
    await page.getByRole('button', { name: 'Reset demo' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Reset demo' }).click();
    await signInDemo(page, 'Tom');
    await page.goto('/app/activity');
    await expect(page.getByText('Persisted across reloads')).toBeHidden();
  });
});

test.describe('settings in a real browser', () => {
  test('larger text survives a reload', async ({ page }) => {
    await signInDemo(page, 'Tom');
    await page.goto('/app/settings');
    await page.getByRole('radio', { name: 'Larger' }).check();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-text-size', 'larger');
    await expectNoHorizontalOverflow(page);
  });

  test('downloads the data export as a JSON file', async ({ page }) => {
    await signInDemo(page, 'Leo');
    await page.goto('/app/settings');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download my data' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^carecircle-data-\d{4}-\d{2}-\d{2}\.json$/);
  });
});
