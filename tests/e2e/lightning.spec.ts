import { expect, test } from './fixtures';
import { hasLightningRules, setReplacementMode, setStockMode, tabIdForUrl } from './extension-helpers';

test('mounts an isolated Lightning shell for active tab rules', async ({ page, serviceWorker }) => {
  await page.bringToFront();
  const tabId = await tabIdForUrl(serviceWorker, page.url());
  await setReplacementMode(serviceWorker, tabId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#echo-lightning-host')).toBeVisible();
  await expect(page.getByText('Lightning active')).toBeVisible();
  const themeButton = page.getByRole('button', { name: 'Toggle theme' });
  await expect(themeButton.locator('svg')).toHaveCount(1);
  await themeButton.click();
  await expect(page.locator('#lightning-app.dark')).toBeVisible();
  await themeButton.click();
  await expect(page.locator('#lightning-app.light')).toBeVisible();
});

test('Use original Echo UI removes the tab-scoped rules', async ({ page, serviceWorker }) => {
  await page.bringToFront();
  const tabId = await tabIdForUrl(serviceWorker, page.url());
  await setReplacementMode(serviceWorker, tabId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page
    .getByRole('button', { name: /Use original Echo UI/ })
    .first()
    .click();
  await expect.poll(() => hasLightningRules(serviceWorker, tabId)).toBe(false);
  await setStockMode(serviceWorker, tabId);
});

test('follows Echo history changes without a reload and restores persisted settings', async ({
  page,
  serviceWorker,
}) => {
  await page.bringToFront();
  const tabId = await tabIdForUrl(serviceWorker, page.url());
  await setReplacementMode(serviceWorker, tabId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#echo-lightning-host')).toBeVisible();

  await page.evaluate(() => history.pushState(null, '', '/section/history-test'));
  await expect(page.getByRole('heading', { name: 'Section history-test' })).toBeVisible();

  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('#lightning-app.dark')).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#lightning-app.dark')).toBeVisible();
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await setStockMode(serviceWorker, tabId);
});

test('leaves authenticated login routes in stock mode', async ({ page, serviceWorker }) => {
  const tabId = await tabIdForUrl(serviceWorker, page.url());
  await setReplacementMode(serviceWorker, tabId);
  await page.goto('https://login.echo360.net.au/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#echo-lightning-host')).toHaveCount(0);
  await expect.poll(() => hasLightningRules(serviceWorker, tabId)).toBe(false);
  await setStockMode(serviceWorker, tabId);
});
