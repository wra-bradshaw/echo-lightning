import type { Worker } from '@playwright/test';
import { ruleIdsForTab } from '../../src/platform/extension/replacement-policy';
import { TAB_MODES_STORAGE_KEY } from '../../src/platform/extension/mode-store';
import { LIGHTNING_RUNTIME_SCRIPT } from '../../src/platform/extension/runtime-injector';

type ChromeApi = {
  tabs: {
    query: (queryInfo: {
      url?: string[];
      active?: boolean;
      currentWindow?: boolean;
    }) => Promise<Array<{ id?: number }>>;
  };
  declarativeNetRequest: {
    updateSessionRules: (options: { addRules?: unknown[]; removeRuleIds?: number[] }) => Promise<void>;
    getSessionRules: () => Promise<Array<{ id: number }>>;
  };
  storage: {
    session: {
      get: (keys?: string | string[]) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
      remove: (keys: string | string[]) => Promise<void>;
    };
  };
  scripting: {
    executeScript: (options: { target: { tabId: number }; files: string[] }) => Promise<unknown>;
  };
};

export async function tabIdForUrl(serviceWorker: Worker, url: string): Promise<number> {
  const tabId = await serviceWorker.evaluate(async (targetUrl) => {
    const api = (globalThis as unknown as { chrome: ChromeApi }).chrome;
    const tabs = await api.tabs.query({ url: [`${new URL(targetUrl).origin}/*`] });
    return tabs[0]?.id;
  }, url);
  if (tabId === undefined) throw new Error(`No browser tab found for ${url}.`);
  return tabId;
}

export async function setReplacementMode(serviceWorker: Worker, tabId: number): Promise<void> {
  await serviceWorker.evaluate(
    async ({ key, tabId: currentTabId }) => {
      const api = (globalThis as unknown as { chrome: ChromeApi }).chrome;
      const current = await api.storage.session.get(key);
      await api.storage.session.set({
        [key]: { ...(current[key] as Record<string, string> | undefined), [String(currentTabId)]: 'replacement' },
      });
    },
    { key: TAB_MODES_STORAGE_KEY, tabId },
  );
}

export async function setStockMode(serviceWorker: Worker, tabId: number): Promise<void> {
  await serviceWorker.evaluate(
    async ({ key, tabId: currentTabId }) => {
      const api = (globalThis as unknown as { chrome: ChromeApi }).chrome;
      const current = await api.storage.session.get(key);
      const modes = { ...(current[key] as Record<string, string> | undefined) };
      delete modes[String(currentTabId)];
      if (Object.keys(modes).length) await api.storage.session.set({ [key]: modes });
      else await api.storage.session.remove(key);
      await api.declarativeNetRequest.updateSessionRules({ removeRuleIds: [currentTabId] });
    },
    { key: TAB_MODES_STORAGE_KEY, tabId },
  );
}

export async function injectRuntime(serviceWorker: Worker, tabId: number): Promise<void> {
  await serviceWorker.evaluate(
    async ({ currentTabId, script }) => {
      const api = (globalThis as unknown as { chrome: ChromeApi }).chrome;
      await api.scripting.executeScript({ target: { tabId: currentTabId }, files: [script] });
    },
    { currentTabId: tabId, script: LIGHTNING_RUNTIME_SCRIPT },
  );
}

export async function hasLightningRules(serviceWorker: Worker, tabId: number): Promise<boolean> {
  return serviceWorker.evaluate(async (ids) => {
    const api = (globalThis as unknown as { chrome: ChromeApi }).chrome;
    const current = await api.declarativeNetRequest.getSessionRules();
    return current.some((rule) => ids.includes(rule.id));
  }, ruleIdsForTab(tabId));
}
