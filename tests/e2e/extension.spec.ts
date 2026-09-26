import { test, expect } from './fixtures';

test('starts the Manifest V3 service worker', async ({ serviceWorker, extensionId, driver }) => {
  test.skip(driver.browser === 'firefox', 'Firefox exposes no service worker to Playwright.');
  expect(serviceWorker.url()).toBe(`chrome-extension://${extensionId}/background.js`);
});

test('keeps stock Echo untouched while Lightning is inactive', async ({ page }) => {
  await expect(page.locator('#echo-lightning-host')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        performance.getEntriesByType('resource').some((entry) => entry.name.includes('lightning-runtime.js')),
      ),
    )
    .toBe(false);
});

test('mounts the authenticated debug overlay without replacement rules', async ({ page, driver }) => {
  await page.bringToFront();
  await page.goto(`${new URL(page.url()).origin}/dashboard`, { waitUntil: 'domcontentloaded' });
  await driver.deactivate(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#echo-lightning-host')).toHaveCount(0);
  test.skip(!driver.canManageRules, 'Manual runtime injection needs extension privileges.');
  await driver.inject(page);
  await expect(page.locator('#echo-lightning-host')).toBeVisible();
  await expect.poll(() => driver.hasRules(page)).toBe(false);
});
