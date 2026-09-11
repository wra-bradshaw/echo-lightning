import { expect, test } from './fixtures';
import { clearExtensionLocalStorage, setReplacementMode, setStockMode, tabIdForUrl } from './extension-helpers';
import { SETTINGS_STORAGE_KEY } from '../../src/features/settings';

test('matches YouTube video-player hotkeys', async ({ page, serviceWorker }) => {
  await page.route('**/user/enrollments', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: [
          {
            userSections: [
              {
                sectionId: 'section-hotkeys',
                sectionName: 'Test Section',
                courseId: 'course-hotkeys',
                courseCode: 'TEST101',
                courseName: 'Test Course',
                lessonCount: 1,
                termId: 'term-hotkeys',
              },
            ],
            termsById: {
              'term-hotkeys': { id: 'term-hotkeys', name: '2026_SM1', startDate: '2026-01-01', isActiveOrFuture: true },
            },
          },
        ],
      }),
    }),
  );
  await page.route('**/section/section-hotkeys/syllabus', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: [
          {
            type: 'SyllabusLessonType',
            lesson: {
              lesson: {
                id: 'lesson-hotkeys',
                sectionId: 'section-hotkeys',
                displayName: 'Lecture Hotkeys',
                timing: { start: '2026-03-03T15:05:00.000', end: '2026-03-03T16:00:00.000' },
              },
              medias: [{ id: 'media-hotkeys', title: 'Lecture Hotkeys', isAvailable: true, isAudioOnly: false }],
            },
          },
        ],
      }),
    }),
  );
  await page.route('**/api/ui/echoplayer/lessons/lesson-hotkeys/media/media-hotkeys/player-properties', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          mediaId: 'media-hotkeys',
          mediaName: 'Lecture Hotkeys',
          captions: 'https://content.example.test/captions.vtt',
          lastPlayedToSeconds: 125,
          playableAudioVideo: {
            duration: 'PT600S',
            mediaId: 'media-hotkeys',
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
            ],
          },
        },
      }),
    }),
  );
  await page.route('https://content.example.test/**', (route) => route.fulfill({ status: 200, body: '' }));

  await page.bringToFront();
  const tabId = await tabIdForUrl(serviceWorker, page.url());
  await clearExtensionLocalStorage(serviceWorker, SETTINGS_STORAGE_KEY);
  await setReplacementMode(serviceWorker, tabId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    history.pushState(null, '', '/lesson/lesson-hotkeys/classroom');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  const player = page.getByTestId('classroom-player');
  await expect(player).toBeVisible();
  await expect(player.locator('video')).toHaveCount(2);
  await player.evaluate((element) => {
    for (const video of element.querySelectorAll('video')) {
      video.currentTime = 125;
    }
  });
  await page.waitForTimeout(1000);
  await player.focus();

  await player.press('k');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await player.press('k');
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();

  await player.press('j');
  await expect
    .poll(() =>
      player.locator('video').evaluateAll((videos) => videos.map((video) => (video as HTMLVideoElement).currentTime)),
    )
    .toEqual([115, 115]);
  await player.press('ArrowRight');
  await expect
    .poll(() =>
      player.locator('video').evaluateAll((videos) => videos.map((video) => (video as HTMLVideoElement).currentTime)),
    )
    .toEqual([120, 120]);
  await player.press('5');
  await expect
    .poll(() =>
      player.locator('video').evaluateAll((videos) => videos.map((video) => (video as HTMLVideoElement).currentTime)),
    )
    .toEqual([300, 300]);

  await player.press('ArrowDown');
  await expect
    .poll(() =>
      player.locator('video').evaluateAll((videos) => videos.map((video) => (video as HTMLVideoElement).volume)),
    )
    .toEqual([0.95, 0.95]);
  const volumeSlider = page.getByTestId('player-volume-slider');
  const volumeThumb = volumeSlider.locator('[data-slot="slider-thumb"] input');
  const volumeTrack = volumeSlider.locator('[data-slot="slider-track"]');
  const volumeTrackBox = await volumeTrack.boundingBox();
  if (!volumeTrackBox) throw new Error('Volume slider track is not measurable');
  await page.mouse.click(volumeTrackBox.x + volumeTrackBox.width - 1, volumeTrackBox.y + volumeTrackBox.height / 2);
  await expect(player.getByTestId('player-volume-value')).toHaveText('1000%');
  await volumeThumb.focus();
  await expect(volumeThumb).toBeFocused();
  await expect(player.getByTestId('player-volume-value')).toHaveText('1000%');
  await player.press('m');
  await expect
    .poll(() =>
      player.locator('video').evaluateAll((videos) => videos.map((video) => (video as HTMLVideoElement).muted)),
    )
    .toEqual([true, true]);
  await player.press('m');
  await expect
    .poll(() =>
      player.locator('video').evaluateAll((videos) => videos.map((video) => (video as HTMLVideoElement).muted)),
    )
    .toEqual([false, true]);

  await player.press('c');
  await expect(page.getByRole('button', { name: 'Captions off' })).toBeVisible();
  await player.press('Shift+Period');
  await expect(page.getByTestId('player-speed-value')).toHaveText('1.25x');
  await player.press('Shift+Comma');
  await expect(page.getByTestId('player-speed-value')).toHaveText('1x');

  await player.press('f');
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await player.press('f');
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  await player.press('i');

  await player.press('k');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await player.press(',');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await player.press('k');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();

  await setStockMode(serviceWorker, tabId);
});

test('keeps controls visible while holding the volume slider', async ({ page, serviceWorker }) => {
  await page.route('**/user/enrollments', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: [
          {
            userSections: [
              {
                sectionId: 'section-hold',
                sectionName: 'Test Section',
                courseId: 'course-hold',
                courseCode: 'TEST101',
                courseName: 'Test Course',
                lessonCount: 1,
                termId: 'term-hold',
              },
            ],
            termsById: {
              'term-hold': { id: 'term-hold', name: '2026_SM1', startDate: '2026-01-01', isActiveOrFuture: true },
            },
          },
        ],
      }),
    }),
  );
  await page.route('**/section/section-hold/syllabus', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: [
          {
            type: 'SyllabusLessonType',
            lesson: {
              lesson: {
                id: 'lesson-hold',
                sectionId: 'section-hold',
                displayName: 'Lecture Hold',
                timing: { start: '2026-03-03T15:05:00.000', end: '2026-03-03T16:00:00.000' },
              },
              medias: [{ id: 'media-hold', title: 'Lecture Hold', isAvailable: true, isAudioOnly: false }],
            },
          },
        ],
      }),
    }),
  );
  await page.route('**/api/ui/echoplayer/lessons/lesson-hold/media/media-hold/player-properties', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          mediaId: 'media-hold',
          mediaName: 'Lecture Hold',
          captions: 'https://content.example.test/captions.vtt',
          lastPlayedToSeconds: 125,
          playableAudioVideo: {
            duration: 'PT600S',
            mediaId: 'media-hold',
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
            ],
          },
        },
      }),
    }),
  );
  await page.route('https://content.example.test/**', (route) => route.fulfill({ status: 200, body: '' }));

  await page.bringToFront();
  const tabId = await tabIdForUrl(serviceWorker, page.url());
  await clearExtensionLocalStorage(serviceWorker, SETTINGS_STORAGE_KEY);
  await setReplacementMode(serviceWorker, tabId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    history.pushState(null, '', '/lesson/lesson-hold/classroom');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  const player = page.getByTestId('classroom-player');
  await expect(player).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  const bottomControls = player.getByTestId('player-bottom-controls');

  await player.evaluate(() => {
    document.body.tabIndex = -1;
    (document.activeElement as HTMLElement | null)?.blur();
    document.body.focus();
  });
  await page.waitForTimeout(2600);
  await expect(bottomControls).toHaveAttribute('data-visible', 'false');

  const thumb = player.getByTestId('player-volume-slider').locator('[data-slot="slider-thumb"]');
  const thumbBox = await thumb.boundingBox();
  if (!thumbBox) throw new Error('Volume slider thumb is not measurable');
  await page.mouse.move(thumbBox.x + thumbBox.width / 2, thumbBox.y + thumbBox.height / 2);
  await expect(bottomControls).toHaveAttribute('data-visible', 'true');
  await page.mouse.down();
  await page.waitForTimeout(2600);
  await expect(bottomControls).toHaveAttribute('data-visible', 'true');

  await page.mouse.up();
  await page.waitForTimeout(2600);
  await expect(bottomControls).toHaveAttribute('data-visible', 'false');

  await setStockMode(serviceWorker, tabId);
});
