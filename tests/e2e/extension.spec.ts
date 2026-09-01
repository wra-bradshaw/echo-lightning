import { test, expect } from './fixtures';

test('starts the Manifest V3 service worker', async ({ serviceWorker, extensionId }) => {
  expect(serviceWorker.url()).toBe(`chrome-extension://${extensionId}/background.js`);
});

test('opens the extension popup', async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await expect(page).toHaveTitle('Default Popup Title');
  await expect(page.getByRole('heading', { name: 'WXT + React' })).toBeVisible();

  const countButton = page.getByRole('button', { name: 'count is 0' });
  await countButton.click();
  await expect(page.getByRole('button', { name: 'count is 1' })).toBeVisible();
});
