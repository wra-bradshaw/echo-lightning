import { expect, type Page, type Worker } from '@playwright/test';
import type { E2EBrowser } from './browser-env';
import {
  clearExtensionLocalStorage,
  hasLightningRules,
  injectRuntime,
  readExtensionLocalStorage,
  setReplacementMode,
  setStockMode,
  tabIdForUrl,
} from './extension-helpers';

export interface ExtensionDriver {
  readonly browser: E2EBrowser;
  readonly canManageRules: boolean;
  readonly canReadStorage: boolean;
  activate(page: Page): Promise<void>;
  deactivate(page: Page): Promise<void>;
  inject(page: Page): Promise<void>;
  hasRules(page: Page): Promise<boolean>;
  clearStorage(page: Page, key: string): Promise<void>;
  readStorage(page: Page, key: string): Promise<Record<string, unknown>>;
}

export function createDriver(browser: E2EBrowser, serviceWorker?: Worker): ExtensionDriver {
  return browser === 'firefox' ? new FirefoxDriver() : new ChromiumDriver(serviceWorker as Worker);
}

class ChromiumDriver implements ExtensionDriver {
  readonly browser: E2EBrowser = 'chromium';
  readonly canManageRules = true;
  readonly canReadStorage = true;

  constructor(private readonly serviceWorker: Worker) {}

  async activate(page: Page): Promise<void> {
    const tabId = await tabIdForUrl(this.serviceWorker, page.url());
    await setReplacementMode(this.serviceWorker, tabId);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#echo-lightning-host')).toBeVisible();
  }

  async deactivate(page: Page): Promise<void> {
    const tabId = await tabIdForUrl(this.serviceWorker, page.url());
    await setStockMode(this.serviceWorker, tabId);
  }

  async inject(page: Page): Promise<void> {
    const tabId = await tabIdForUrl(this.serviceWorker, page.url());
    await injectRuntime(this.serviceWorker, tabId);
    await expect(page.locator('#echo-lightning-host')).toBeVisible();
  }

  async hasRules(page: Page): Promise<boolean> {
    const tabId = await tabIdForUrl(this.serviceWorker, page.url());
    return hasLightningRules(this.serviceWorker, tabId);
  }

  async clearStorage(page: Page, key: string): Promise<void> {
    void page;
    await clearExtensionLocalStorage(this.serviceWorker, key);
  }

  async readStorage(page: Page, key: string): Promise<Record<string, unknown>> {
    void page;
    return readExtensionLocalStorage(this.serviceWorker, key);
  }
}

class FirefoxDriver implements ExtensionDriver {
  readonly browser: E2EBrowser = 'firefox';
  readonly canManageRules = false;
  readonly canReadStorage = false;

  async activate(page: Page): Promise<void> {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#echo-lightning-host')).toBeVisible();
  }

  async deactivate(): Promise<void> {
    return undefined;
  }

  async inject(): Promise<void> {
    throw new Error('Runtime injection requires extension privileges unavailable in the Firefox harness.');
  }

  async hasRules(page: Page): Promise<boolean> {
    return (await page.locator('#echo-lightning-host').count()) > 0;
  }

  async clearStorage(): Promise<void> {
    return undefined;
  }

  async readStorage(): Promise<Record<string, unknown>> {
    throw new Error('Storage reads require extension privileges unavailable in the Firefox harness.');
  }
}
