import { expect, test } from './fixtures';
import { hasLightningRules, injectRuntime, setReplacementMode, setStockMode, tabIdForUrl } from './extension-helpers';

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
  await expect(page.getByText('Lightning active')).toBeVisible();
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

test('loads the happy path from courses through a resumable multi-camera lecture', async ({ page, serviceWorker }) => {
  await page.route('**/user/enrollments', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: [
          {
            userSections: [
              {
                sectionId: 'section-current',
                sectionName: 'COMP20007_2026_SM1',
                courseId: 'course-current',
                courseCode: 'COMP20007',
                courseName: 'Design of Algorithms',
                lessonCount: 2,
                termId: 'term-current',
              },
              {
                sectionId: 'section-old',
                sectionName: 'COMP10002_2025_SM2',
                courseId: 'course-old',
                courseCode: 'COMP10002',
                courseName: 'Foundations of Algorithms',
                lessonCount: 1,
                termId: 'term-old',
              },
            ],
            termsById: {
              'term-current': { id: 'term-current', name: '2026_SM1', startDate: '2026-01-01', isActiveOrFuture: true },
              'term-old': { id: 'term-old', name: '2025_SM2', startDate: '2025-01-01', isActiveOrFuture: false },
            },
          },
        ],
      }),
    }),
  );
  await page.route('**/section/section-current/syllabus', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: [
          {
            type: 'SyllabusLessonType',
            lesson: {
              lesson: {
                id: 'lesson-one',
                sectionId: 'section-current',
                displayName: 'Lecture 1 — Graphs',
                timing: { start: '2026-03-03T15:05:00.000', end: '2026-03-03T16:00:00.000' },
              },
              medias: [{ id: 'media-one', title: 'Lecture 1 — Graphs', isAvailable: true, isAudioOnly: false }],
            },
          },
        ],
      }),
    }),
  );
  await page.route('**/api/ui/echoplayer/lessons/lesson-one/media/media-one/player-properties', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          mediaId: 'media-one',
          mediaName: 'Lecture 1 — Graphs',
          captions: 'https://content.example.test/captions.vtt',
          lastPlayedToSeconds: 125,
          playableAudioVideo: {
            duration: 'PT600S',
            mediaId: 'media-one',
            playableMedias: [
              {
                sourceIndex: 0,
                trackType: ['Audio', 'Video'],
                uri: 'https://content.example.test/camera-1.m3u8',
                isHls: true,
              },
              {
                sourceIndex: 1,
                trackType: ['Audio', 'Video'],
                uri: 'https://content.example.test/camera-2.m3u8',
                isHls: true,
              },
              {
                sourceIndex: 2,
                trackType: ['Audio', 'Video'],
                uri: 'https://content.example.test/camera-3.m3u8',
                isHls: true,
              },
            ],
          },
        },
      }),
    }),
  );
  await page.route('https://content.example.test/**', (route) => route.fulfill({ status: 200, body: '' }));

  await page.bringToFront();
  const tabId = await tabIdForUrl(serviceWorker, page.url());
  await setStockMode(serviceWorker, tabId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await injectRuntime(serviceWorker, tabId);
  await expect(page.getByRole('heading', { name: 'Your courses' })).toBeVisible();
  await expect(page.getByText('Current term')).toBeVisible();
  await expect(page.getByText('Design of Algorithms')).toBeVisible();
  await page.getByRole('link', { name: /Design of Algorithms/ }).click();
  await expect(page.getByRole('heading', { name: 'Section section-current' })).toBeVisible();
  await expect(page.getByText('Lecture 1 — Graphs')).toBeVisible();
  await page.getByRole('link', { name: /Resume|Watch lecture/ }).click();
  await expect(page.getByRole('heading', { name: 'Lecture 1 — Graphs' })).toBeVisible();
  await expect(page.getByText('Resuming at 2:05')).toBeVisible();
  await expect(page.getByTestId('camera-grid').getByLabel('Camera 1')).toBeVisible();
  await expect(page.getByTestId('camera-grid').getByLabel('Camera 2')).toBeVisible();
  await page.getByRole('button', { name: 'Add Camera 3' }).click();
  await expect(page.getByTestId('camera-grid').getByLabel('Camera 3')).toBeVisible();
  await page.getByRole('button', { name: 'Remove Camera 2' }).click();
  await expect(page.getByTestId('camera-grid').getByLabel('Camera 2')).toHaveCount(0);
  await page.getByRole('button', { name: 'Captions on' }).click();
  await expect(page.getByRole('button', { name: 'Captions off' })).toBeVisible();
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await setStockMode(serviceWorker, tabId);
});
