import { test, expect } from './fixtures';
import { hasLightningRules, injectRuntime, setStockMode, tabIdForUrl } from './extension-helpers';

test('starts the Manifest V3 service worker', async ({ serviceWorker, extensionId }) => {
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

test('mounts the authenticated debug overlay without replacement rules', async ({ page, serviceWorker }) => {
  await page.bringToFront();
  const tabId = await tabIdForUrl(serviceWorker, page.url());
  await setStockMode(serviceWorker, tabId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#echo-lightning-host')).toHaveCount(0);
  await injectRuntime(serviceWorker, tabId);
  await expect(page.locator('#echo-lightning-host')).toBeVisible();
  await expect.poll(() => hasLightningRules(serviceWorker, tabId)).toBe(false);
});
