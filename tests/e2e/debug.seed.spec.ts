import { expect, test } from './fixtures';
import { injectRuntime, setReplacementMode, tabIdForUrl } from './extension-helpers';
import type { DebugLaunchMode } from '../../src/platform/extension/messages';

async function pauseForCli(page: import('@playwright/test').Page): Promise<void> {
  await page.pause();
}

async function leavePagePaused(
  context: import('@playwright/test').BrowserContext,
  mode: DebugLaunchMode,
): Promise<void> {
  for (const existingPage of context.pages()) await existingPage.close();
  const page = await context.newPage();
  await page.bringToFront();
  try {
    const debugUrl =
      process.env.ECHO360_DEBUG_URL?.trim() || process.env.ECHO360_BASE_URL?.trim() || 'https://echo360.net.au';
    await page.goto(debugUrl, { waitUntil: 'domcontentloaded' });
    await pauseForCli(page);

    if (mode === 'stock') {
      await expect(page.locator('body')).toBeAttached();
      await pauseForCli(page);
    } else {
      let [serviceWorker] = context.serviceWorkers();
      if (!serviceWorker) serviceWorker = await context.waitForEvent('serviceworker');
      const tabId = await tabIdForUrl(serviceWorker, page.url());
      if (mode === 'replacement') {
        await setReplacementMode(serviceWorker, tabId);
        await pauseForCli(page);
        await page.reload({ waitUntil: 'domcontentloaded' });
      } else {
        await injectRuntime(serviceWorker, tabId);
      }
      await pauseForCli(page);
      await expect(page.locator('#echo-lightning-host')).toBeVisible();
      await expect(page.getByText('Lightning active')).toHaveCount(0);
      await pauseForCli(page);
    }

    await new Promise<void>(() => undefined);
  } finally {
    await page.close();
  }
}

test('leaves authenticated Echo360 ready for CLI debugging', async ({ authenticatedContext }) => {
  const configuredMode = process.env.ECHO360_DEBUG_MODE?.trim();
  const mode: DebugLaunchMode =
    configuredMode === 'stock' ? 'stock' : configuredMode === 'overlay' ? 'overlay' : 'replacement';
  await leavePagePaused(authenticatedContext, mode);
});
