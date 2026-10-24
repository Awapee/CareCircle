import { expect, type Page } from '@playwright/test';

const ROLES: Record<string, string> = {
  Gita: 'Admin',
  Sita: 'Care recipient',
  Ram: 'Caregiver',
  Hari: 'Family',
  Bina: 'Read-only',
};

/**
 * Opens the walkthrough and views it as `name`. The first call names the sample circle
 * (Sita, run by Gita); later calls keep the same circle and just switch who is viewing.
 */
export async function signInDemo(page: Page, name = 'Gita') {
  await page.goto('/demo/app');
  const start = page.getByRole('heading', { level: 1, name: 'See how CareCircle works' });
  const dashboard = page.locator('main h1');
  await expect(start.or(dashboard).first()).toBeVisible();
  if (await start.isVisible()) {
    await page.getByLabel('Who is the circle for?').fill('Sita');
    await page.getByLabel('Your name').fill('Gita');
    await page.getByRole('button', { name: 'Start the walkthrough' }).click();
  }
  await expect(page.getByLabel('View as')).toBeVisible();
  // Fold the guide away so it doesn't cover the page under test.
  const fold = page.getByRole('button', { name: 'Fold the guide away' });
  if (await fold.isVisible()) await fold.click();
  await page.getByLabel('View as').selectOption({ label: `${name} (${ROLES[name]})` });
  await expect(dashboard).toBeVisible();
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'page should not scroll horizontally').toBeLessThanOrEqual(0);

  // A parent with overflow:hidden can hide the scrollbar while still clipping content,
  // so also check that no visible, meaningful element extends past the viewport edges.
  const clipped = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return (
      Array.from(document.querySelectorAll<HTMLElement>('main *'))
        .filter((el) => !el.closest('[aria-hidden="true"]') && el.offsetParent !== null)
        // Content inside a deliberate horizontal scroll area (e.g. a wide table) is reachable by scrolling it.
        .filter((el) => {
          for (let p = el.parentElement; p; p = p.parentElement) {
            if (['auto', 'scroll'].includes(getComputedStyle(p).overflowX)) return false;
          }
          return true;
        })
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && (rect.right > width + 1 || rect.left < -1);
        })
        .map((el) => `${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 60)}`)
        .slice(0, 5)
    );
  });
  expect(clipped, 'elements extending beyond the viewport').toEqual([]);
}
