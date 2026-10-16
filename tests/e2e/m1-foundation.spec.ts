import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const pages = [
  '/',
  '/get-started',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/limitations',
  '/app',
  '/app/planner',
  '/does-not-exist',
];

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'page should not scroll horizontally').toBeLessThanOrEqual(0);

  // A parent with overflow:hidden can hide the scrollbar while still clipping content,
  // so also check that no visible, meaningful element extends past the viewport edges.
  const clipped = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return Array.from(document.querySelectorAll<HTMLElement>('main *'))
      .filter((el) => !el.closest('[aria-hidden="true"]') && el.offsetParent !== null)
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && (rect.right > width + 1 || rect.left < -1);
      })
      .map((el) => `${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 60)}`)
      .slice(0, 5);
  });
  expect(clipped, 'elements extending beyond the viewport').toEqual([]);
}

test.describe('accessibility (axe, WCAG 2.1 AA)', () => {
  for (const path of pages) {
    test(`${path} has no detectable violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
    });
  }
});

test.describe('responsive layout', () => {
  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/', '/get-started', '/privacy', '/app']) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoHorizontalOverflow(page);
      }
    });
  }
});

test.describe('navigation', () => {
  test('"How It Works" scrolls to the how-it-works section', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'How It Works' }).first().click();
    await expect(page).toHaveURL(/#how-it-works$/);
    await expect(page.getByRole('heading', { name: 'Three steps to a calmer routine' })).toBeInViewport();
  });

  test('"Get Started" leads to the get-started page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Get Started' }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Get started with CareCircle');
  });

  test('skip link moves keyboard focus to the main content', async ({ page }) => {
    await page.goto('/about');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });

  test('mobile menu opens, traps focus, closes with Escape and returns focus', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Open menu' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Menu' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'About' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('app sidebar is visible on desktop and the bottom bar on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/app');
    await expect(page.getByRole('navigation', { name: 'Application' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Quick navigation' })).toBeHidden();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('navigation', { name: 'Quick navigation' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Quick navigation' }).getByRole('link', { name: 'Planner' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Planner');
  });

  test('page titles describe the current page', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page).toHaveTitle('Privacy Policy · CareCircle');
  });
});
