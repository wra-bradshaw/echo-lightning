import { createMockEchoServer, expect, test } from './fixtures';
import {
  clearExtensionLocalStorage,
  hasLightningRules,
  readExtensionLocalStorage,
  setReplacementMode,
  setStockMode,
  tabIdForUrl,
} from './extension-helpers';
import { SETTINGS_STORAGE_KEY } from '../../src/features/settings';

test('mounts an isolated Lightning shell for active tab rules', async ({ page, serviceWorker }) => {
  await page.bringToFront();
  const tabId = await tabIdForUrl(serviceWorker, page.url());
  await setReplacementMode(serviceWorker, tabId);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#echo-lightning-host')).toBeVisible();
  await expect(page.getByText('Lightning active')).toHaveCount(0);
  await expect(page.locator('#lightning-app.dark')).toBeVisible();
  await expect(page.getByRole('button', { name: /Switch to (dark|light) mode/ })).toHaveCount(0);
  await expect
    .poll(() =>
      page.locator('#lightning-app').evaluate((app) => ({
        background: getComputedStyle(app).getPropertyValue('--background').trim(),
        card: getComputedStyle(app).getPropertyValue('--card').trim(),
        border: getComputedStyle(app).getPropertyValue('--border').trim(),
      })),
    )
    .toEqual({ background: '0 0% 7%', card: '0 0% 11%', border: '0 0% 38%' });
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('#lightning-app:not(.dark)')).toBeVisible();
  await expect
    .poll(() =>
      page.locator('#lightning-app').evaluate((app) => getComputedStyle(app).getPropertyValue('--background').trim()),
    )
    .toBe('0 0% 98%');
});

test('returns home when the Lightning branding is clicked', async ({ page, serviceWorker }) => {
  await page.bringToFront();
  const tabId = await tabIdForUrl(serviceWorker, page.url());
  await setReplacementMode(serviceWorker, tabId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#echo-lightning-host')).toBeVisible();

  await page.evaluate(() => history.pushState(null, '', '/section/home-link-test/home'));
  await expect(page.getByRole('heading', { name: 'Course recordings' })).toBeVisible();
  await page.getByRole('link', { name: 'Echo360 Lightning' }).click();

  await expect(page).toHaveURL(/\/courses$/);
  await expect(page.getByRole('heading', { name: 'Your courses' })).toBeVisible();
  await setStockMode(serviceWorker, tabId);
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

test('follows Echo history changes without a reload', async ({ page, serviceWorker }) => {
  await page.bringToFront();
  const tabId = await tabIdForUrl(serviceWorker, page.url());
  await setReplacementMode(serviceWorker, tabId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#echo-lightning-host')).toBeVisible();
  await expect(page.getByText('Lightning active')).toHaveCount(0);
  await page.evaluate(() => history.pushState(null, '', '/section/history-test/home'));
  await expect(page.getByRole('heading', { name: 'Course recordings' })).toBeVisible();

  await setStockMode(serviceWorker, tabId);
});

test('leaves authenticated login routes in stock mode', async ({ page, serviceWorker }) => {
  await page.route('https://login.echo360.net.au/login', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body><div id="login-app"><form action="/login"><input id="email"></form></div></body></html>',
    }),
  );
  const tabId = await tabIdForUrl(serviceWorker, page.url());
  await setReplacementMode(serviceWorker, tabId);
  await page.goto('https://login.echo360.net.au/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#echo-lightning-host')).toHaveCount(0);
  await expect.poll(() => hasLightningRules(serviceWorker, tabId)).toBe(false);
  await setStockMode(serviceWorker, tabId);
});

test('plays a full-viewport multi-stream lecture with grid, focus, and per-section selection', async ({
  page,
  serviceWorker,
}) => {
  const { positionRequests } = await createMockEchoServer(page);

  await page.bringToFront();
  const tabId = await tabIdForUrl(serviceWorker, page.url());
  const navigate = async (path: string) => {
    await page.evaluate((nextPath) => {
      history.pushState(null, '', nextPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, path);
  };
  await clearExtensionLocalStorage(serviceWorker, SETTINGS_STORAGE_KEY);
  await setReplacementMode(serviceWorker, tabId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#echo-lightning-host')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your courses' })).toBeVisible();
  await navigate('/section/section-current/home');
  await expect(page).toHaveURL(/\/section\/section-current\/home/);
  await expect(page.getByRole('heading', { name: 'Design of Algorithms' })).toBeVisible();
  await expect(page.getByText('section-current', { exact: true })).toHaveCount(0);
  const watchedProgress = page.getByRole('progressbar', { name: '21% watched' });
  await expect(watchedProgress).toBeVisible();
  await expect
    .poll(async () => {
      const boxes = await Promise.all([
        watchedProgress.locator('[data-slot="progress-track"]').boundingBox(),
        watchedProgress.locator('[data-slot="progress-indicator"]').boundingBox(),
      ]);
      const [track, indicator] = boxes;
      return track && indicator ? indicator.width / track.width : 0;
    })
    .toBeCloseTo(125 / 600, 1);
  await expect
    .poll(() =>
      watchedProgress
        .locator('[data-slot="progress-indicator"]')
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    )
    .toBe('oklch(0.623 0.214 259.815)');
  await expect(page.locator('#lightning-app').getByRole('banner')).toBeVisible();
  const lectureCard = page.getByRole('link', { name: /Lecture 1 — Graphs/ });
  await expect(lectureCard).toBeVisible();
  await expect(page.getByText('Watch lecture', { exact: true })).toHaveCount(0);
  await lectureCard.click();
  await expect(page).toHaveURL(/\/lesson\/lesson-one\/classroom/);

  const player = page.getByTestId('classroom-player');
  await expect(player).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect(player).toHaveAttribute('data-mode', 'grid');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Browser viewport size was unavailable.');
  await expect
    .poll(async () => {
      const box = await player.boundingBox();
      return box ? [Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)] : [];
    })
    .toEqual([0, 0, viewport.width, viewport.height]);
  await expect(page.locator('#lightning-app').getByRole('banner')).toHaveCount(0);
  await expect(player.getByTestId('camera-grid').locator('video')).toHaveCount(3);
  await expect
    .poll(() =>
      player
        .getByTestId('camera-grid')
        .locator('video')
        .evaluateAll((videos) => videos.map((video) => (video as HTMLVideoElement).muted)),
    )
    .toEqual([false, true, true]);

  await expect(page.getByRole('button', { name: 'Toggle stream selector' })).toHaveCount(0);
  const streamsButton = page.getByRole('button', { name: /Streams 3\/3/ });
  await streamsButton.click();
  const streamManager = player.getByTestId('stream-manager');
  await expect(streamManager).toBeVisible();
  await expect
    .poll(async () => {
      const managerBox = await streamManager.boundingBox();
      const buttonBox = await streamsButton.boundingBox();
      return managerBox && buttonBox ? managerBox.y + managerBox.height <= buttonBox.y : false;
    })
    .toBe(true);
  await page.getByRole('button', { name: 'Camera 3', exact: true }).click();
  await expect(page.getByRole('button', { name: /Streams 2\/3/ })).toBeVisible();
  await expect(player.getByTestId('camera-grid').locator('video')).toHaveCount(2);
  await streamManager.getByLabel('Make Camera 2 audio source').click();
  await expect
    .poll(() =>
      player
        .getByTestId('camera-grid')
        .locator('video')
        .evaluateAll((videos) => videos.map((video) => (video as HTMLVideoElement).muted)),
    )
    .toEqual([true, false]);
  await page.getByRole('button', { name: /Streams 2\/3/ }).click();

  await player.getByLabel('Camera 2', { exact: true }).click();
  await expect(player).toHaveAttribute('data-mode', 'grid');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await player.getByLabel('Camera 2', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Focus', exact: true }).click();
  await expect(player).toHaveAttribute('data-mode', 'focus');
  await expect(player.getByTestId('main-stream').getByLabel('Camera 1')).toBeVisible();
  await expect(player.getByTestId('pip-stream')).toHaveCount(1);
  await expect(player.locator('[data-testid="pip-stream"][data-stream-id="camera-2"]')).toHaveCount(1);
  const playButton = page.getByRole('button', { name: 'Play', exact: true });
  if (await playButton.isVisible()) await playButton.click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await player.locator('[data-testid="pip-stream"][data-stream-id="camera-2"]').click();
  await expect(player.getByTestId('main-stream').getByLabel('Camera 2')).toBeVisible();
  await expect(player.locator('[data-testid="pip-stream"][data-stream-id="camera-1"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await player.locator('[data-testid="pip-stream"][data-stream-id="camera-1"]').click();
  await expect(player.getByTestId('main-stream').getByLabel('Camera 1')).toBeVisible();
  await expect(player.locator('[data-testid="pip-stream"][data-stream-id="camera-2"]')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect(player.getByTestId('main-stream').locator('video')).toHaveJSProperty('muted', false);
  await expect(player.locator('[data-testid="pip-stream"][data-stream-id="camera-2"] video')).toHaveJSProperty(
    'muted',
    true,
  );

  const pip = player.locator('[data-testid="pip-stream"][data-stream-id="camera-2"]');
  const before = await pip.boundingBox();
  if (!before) throw new Error('PiP did not have a browser bounding box.');
  await pip.dragTo(player, { targetPosition: { x: 30, y: 30 } });
  await expect.poll(async () => (await pip.boundingBox())?.x ?? Number.POSITIVE_INFINITY).toBeLessThan(before.x);
  await expect.poll(async () => (await pip.boundingBox())?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(before.y);
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toHaveCount(1);
  const after = await pip.boundingBox();
  if (!after) throw new Error('Dragged PiP did not have a browser bounding box.');
  expect(after.x).toBeLessThan(before.x);
  expect(after.y).toBeLessThan(before.y);

  await player.evaluate(() => {
    document.body.tabIndex = -1;
    (document.activeElement as HTMLElement | null)?.blur();
    document.body.focus();
  });
  await page.waitForTimeout(2600);
  await expect(player.getByTestId('player-top-controls')).toHaveAttribute('data-visible', 'false');
  await player.focus();
  await expect(player.getByTestId('player-top-controls')).toHaveAttribute('data-visible', 'true');
  await page.getByLabel('Lecture timeline').focus();
  await page.keyboard.press('ArrowRight');
  await page.locator('[data-testid="main-stream"] video').evaluate((video) => {
    Object.defineProperty(video, 'currentTime', { configurable: true, value: 137.8 });
    video.dispatchEvent(new Event('timeupdate'));
    video.dispatchEvent(new Event('pause'));
  });
  await expect.poll(() => positionRequests.length).toBeGreaterThan(0);
  expect(positionRequests.every(({ method, seconds }) => method === 'POST' && /^\d+$/.test(seconds))).toBe(true);

  await navigate('/section/section-current/home');
  await expect(page).toHaveURL(/\/section\/section-current\/home$/);
  await expect(page.getByRole('heading', { name: 'Design of Algorithms' })).toBeVisible();
  await navigate('/lesson/lesson-one/classroom');
  await expect(page).toHaveURL(/\/lesson\/lesson-one\/classroom/);
  await expect(page.getByTestId('classroom-player')).toHaveAttribute('data-mode', 'focus');
  await expect(page.getByTestId('classroom-player').getByTestId('main-stream')).toBeVisible();
  const storedSettings = await readExtensionLocalStorage(serviceWorker, SETTINGS_STORAGE_KEY);
  const storedValue = storedSettings[SETTINGS_STORAGE_KEY];
  expect(typeof storedValue).toBe('string');
  const parsedStored = JSON.parse(String(storedValue));
  expect(parsedStored.state.selectedStreamIds['section-current']).toEqual(['camera-1', 'camera-2']);
  expect(parsedStored.state.playerStateBySection['section-current']).toMatchObject({
    mode: 'focus',
  });

  await setStockMode(serviceWorker, tabId);
});
