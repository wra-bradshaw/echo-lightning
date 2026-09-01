import { test as base, chromium, type BrowserContext, type Worker } from '@playwright/test';
import { chmod, mkdir, open, readFile, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticateEcho360 } from './echo360-auth';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const pathToExtension = path.resolve(projectRoot, '../../.output/chrome-mv3');
const repositoryRoot = path.resolve(projectRoot, '../..');
const authStatePath = path.resolve(
  repositoryRoot,
  process.env.PLAYWRIGHT_AUTH_STATE?.trim() || '.playwright/auth/echo360.json',
);
const authLockPath = `${authStatePath}.lock`;
const AUTH_STATE_LOCK_TIMEOUT = 120_000;
const AUTH_STATE_LOCK_STALE = 10 * 60_000;
const AUTH_STATE_LOCK_RETRY = 250;

type TestFixtures = {
  context: BrowserContext;
  extensionId: string;
  serviceWorker: Worker;
};

type WorkerFixtures = {
  cleanAuthenticatedContext: BrowserContext;
  authenticatedContext: BrowserContext;
};

type DebugConfig = { debug?: unknown };

type InstrumentedTestInfo = {
  _configInternal?: { configCLIOverrides?: DebugConfig };
};

async function launchWithoutCliDebug<T>(testInfo: InstrumentedTestInfo, action: () => Promise<T>): Promise<T> {
  const overrides = testInfo._configInternal?.configCLIOverrides;
  const debug = overrides?.debug;
  if (overrides && debug === 'cli') overrides.debug = undefined;
  try {
    return await action();
  } finally {
    if (overrides && debug === 'cli') overrides.debug = debug;
  }
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function acquireAuthStateLock(): Promise<() => Promise<void>> {
  const startedAt = Date.now();
  await mkdir(path.dirname(authLockPath), { recursive: true, mode: 0o700 });
  while (true) {
    try {
      const handle = await open(authLockPath, 'wx', 0o600);
      await handle.close();
      return async () => {
        await unlink(authLockPath).catch(() => undefined);
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') throw new Error('Unable to acquire the Playwright auth cache lock.', { cause: error });
      try {
        const lock = await stat(authLockPath);
        if (Date.now() - lock.mtimeMs > AUTH_STATE_LOCK_STALE) {
          await unlink(authLockPath);
          continue;
        }
      } catch {
        // The competing worker may have released the lock between stat and retry.
      }
      if (Date.now() - startedAt > AUTH_STATE_LOCK_TIMEOUT) {
        throw new Error(`Timed out waiting for the Playwright auth cache lock at ${authLockPath}.`, { cause: error });
      }
      await sleep(AUTH_STATE_LOCK_RETRY);
    }
  }
}

function isAuthenticatedUrl(urlValue: string): boolean {
  const baseUrl = process.env.ECHO360_BASE_URL?.trim() || 'https://echo360.net.au';
  const base = new URL(baseUrl);
  const url = new URL(urlValue);
  return url.hostname === base.hostname && !/^\/login(?:\/|$)/i.test(url.pathname);
}

async function hasValidAuth(page: import('@playwright/test').Page): Promise<boolean> {
  try {
    const baseUrl = process.env.ECHO360_BASE_URL?.trim() || 'https://echo360.net.au';
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    return isAuthenticatedUrl(page.url());
  } catch {
    return false;
  }
}

type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

async function readAuthState(): Promise<StorageState | undefined> {
  try {
    return JSON.parse(await readFile(authStatePath, 'utf8')) as StorageState;
  } catch {
    return undefined;
  }
}

async function applyStorageState(context: BrowserContext, storageState: StorageState | undefined): Promise<void> {
  if (!storageState) return;
  if (storageState.cookies.length) await context.addCookies(storageState.cookies);
  for (const origin of storageState.origins) {
    await context.addInitScript(
      ({ origin: expectedOrigin, entries }) => {
        if (location.origin !== expectedOrigin) return;
        for (const entry of entries) localStorage.setItem(entry.name, entry.value);
      },
      { origin: origin.origin, entries: origin.localStorage },
    );
  }
}

async function createAuthenticatedContext(testInfo: InstrumentedTestInfo): Promise<{
  context: BrowserContext;
  authPage: import('@playwright/test').Page;
}> {
  const release = await acquireAuthStateLock();
  let context: BrowserContext | undefined;
  try {
    const storageState = await readAuthState();
    context = await launchWithoutCliDebug(testInfo, () =>
      chromium.launchPersistentContext('', {
        channel: 'chromium',
        headless: process.env.HEADED !== '1',
      }),
    );
    await applyStorageState(context, storageState);
    const authPage = await context.newPage();
    if (!storageState || !(await hasValidAuth(authPage))) {
      await context.clearCookies();
      await authenticateEcho360(authPage);
      await mkdir(path.dirname(authStatePath), { recursive: true, mode: 0o700 });
      await context.storageState({ path: authStatePath });
      await chmod(authStatePath, 0o600);
    }
    return { context, authPage };
  } catch (error) {
    await context?.close();
    throw error;
  } finally {
    await release();
  }
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  cleanAuthenticatedContext: [
    async ({ browser: browserFixture }, use) => {
      void browserFixture;
      const { context, authPage } = await createAuthenticatedContext(test.info() as unknown as InstrumentedTestInfo);
      try {
        await use(context);
      } finally {
        await authPage.close();
        await context.close();
      }
    },
    { scope: 'worker' },
  ],

  // Authentication is deliberately completed before this new extension
  // context is created. Lightning is never active during the SSO redirect.
  authenticatedContext: [
    async ({ cleanAuthenticatedContext }, use) => {
      const storageState = await cleanAuthenticatedContext.storageState();
      const context = await chromium.launchPersistentContext('', {
        channel: 'chromium',
        headless: process.env.HEADED !== '1',
        args: [`--disable-extensions-except=${pathToExtension}`, `--load-extension=${pathToExtension}`],
      });
      try {
        await applyStorageState(context, storageState);
        await use(context);
      } finally {
        await context.close();
      }
    },
    { scope: 'worker' },
  ],

  context: async ({ authenticatedContext }, use) => use(authenticatedContext),

  page: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();
    const baseUrl = process.env.ECHO360_BASE_URL?.trim() || 'https://echo360.net.au';
    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await use(page);
    } finally {
      await page.close();
    }
  },

  serviceWorker: async ({ authenticatedContext }, use) => {
    let [serviceWorker] = authenticatedContext.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await authenticatedContext.waitForEvent('serviceworker');
    }

    await use(serviceWorker);
  },

  extensionId: async ({ serviceWorker }, use) => {
    const extensionId = new URL(serviceWorker.url()).hostname;
    await use(extensionId);
  },
});

export const expect = test.expect;
