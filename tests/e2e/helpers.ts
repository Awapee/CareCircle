import { expect, type Page } from '@playwright/test';

/** Opens the demo as Priya (admin). */
export async function signInDemo(page: Page, name = 'Priya') {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: `Continue as ${name}` }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
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
