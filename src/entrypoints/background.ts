import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { isEchoAuthUrl, isReplacementRoute, stockEchoUrl } from '../integrations/echo/routing/routes';
import { isEchoUrl } from '../integrations/echo/routing/url';
import { createBackgroundController } from '../platform/extension/background-controller';
import { isExtensionMessage } from '../platform/extension/messages';
import { createTabModeStore, type SessionStorageArea } from '../platform/extension/mode-store';
import { createReplacementPolicy, type DnrApi } from '../platform/extension/replacement-policy';
import { LIGHTNING_RUNTIME_SCRIPT, createRuntimeInjector } from '../platform/extension/runtime-injector';

const GLOBAL_ENABLED_KEY = 'lightning.globalEnabled';

export default defineBackground(() => {
  const modes = createTabModeStore(browser.storage.session as unknown as SessionStorageArea);
  const policy = createReplacementPolicy(
    browser.declarativeNetRequest as unknown as DnrApi,
    (url) => isEchoUrl(url) && isReplacementRoute(url),
  );
  const injector = createRuntimeInjector((tabId) =>
    browser.scripting.executeScript({
      target: { tabId },
      files: [LIGHTNING_RUNTIME_SCRIPT as never],
    }),
  );
  const storageLocal = browser.storage.local as unknown as {
    get(keys?: string | string[] | null): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
  };

  async function getGlobalEnabled(): Promise<boolean> {
    try {
      const data = await storageLocal.get(GLOBAL_ENABLED_KEY);
      const value = data[GLOBAL_ENABLED_KEY];
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (typeof parsed === 'boolean') return parsed;
        } catch {
          void 0;
        }
        if (value === 'true') return true;
        if (value === 'false') return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  async function setGlobalEnabled(enabled: boolean): Promise<void> {
    await storageLocal.set({ [GLOBAL_ENABLED_KEY]: enabled });
  }

  const controller = createBackgroundController({
    modes,
    policy,
    injector,
    isEchoUrl: (url) => isEchoUrl(url),
    isAuthUrl: (url) => isEchoAuthUrl(url),
    isReplacementRoute: (url) => isReplacementRoute(url),
    canonicalUrl: (url) => stockEchoUrl(url),
    tabs: {
      reload: (tabId) => browser.tabs.reload(tabId),
      update: (tabId, updateProperties) => browser.tabs.update(tabId, updateProperties),
      get: async (tabId) => browser.tabs.get(tabId),
    },
    action: {
      setBadgeText: (details) => browser.action.setBadgeText(details),
      setBadgeBackgroundColor: (details) => browser.action.setBadgeBackgroundColor(details),
      setTitle: (details) => browser.action.setTitle(details),
    },
    globalEnabled: getGlobalEnabled,
    storageLocal,
  });

  async function setGlobalBadge(enabled: boolean) {
    if (enabled) {
      await browser.action.setBadgeText({ text: 'ON' });
      await browser.action.setBadgeBackgroundColor({ color: '#2563eb' });
      await browser.action.setTitle({ title: 'Disable Echo360 Lightning' });
    } else {
      await browser.action.setBadgeText({ text: '' });
      await browser.action.setTitle({ title: 'Enable Echo360 Lightning' });
    }
  }

  async function setTabBadge(tabId: number, enabled: boolean, url: string) {
    const eligible = enabled && isEchoUrl(url) && !isEchoAuthUrl(url) && isReplacementRoute(url);
    if (eligible) {
      await browser.action.setBadgeText({ tabId, text: 'ON' });
      await browser.action.setBadgeBackgroundColor({ tabId, color: '#2563eb' });
      await browser.action.setTitle({ tabId, title: 'Disable Echo360 Lightning' });
    } else {
      await browser.action.setBadgeText({ tabId, text: '' });
      await browser.action.setTitle({ tabId, title: 'Enable Echo360 Lightning' });
    }
  }

  async function syncAllTabs(enabled: boolean) {
    await setGlobalBadge(enabled);
    let tabs: Array<{ id?: number; url?: string }>;
    try {
      tabs = (await browser.tabs.query({ url: ['*://*.echo360.net.au/*'] })) as Array<{ id?: number; url?: string }>;
    } catch {
      tabs = [];
    }
    await Promise.all(
      tabs.map(async (tab) => {
        if (tab.id === undefined) return;
        const url = tab.url ?? '';
        try {
          if (enabled && isEchoUrl(url) && !isEchoAuthUrl(url) && isReplacementRoute(url)) {
            await policy.sync(tab.id, url);
            await injector.inject(tab.id);
          } else {
            await policy.remove(tab.id);
            injector.reset(tab.id);
          }
          await setTabBadge(tab.id, enabled, url);
        } catch {
          void 0;
        }
      }),
    );
    if (tabs.length === 0) {
      try {
        const allTabs = (await browser.tabs.query({})) as Array<{ id?: number; url?: string }>;
        await Promise.all(
          allTabs.map(async (tab) => {
            if (tab.id === undefined) return;
            const url = tab.url ?? '';
            if (!url || !isEchoUrl(url)) return;
            try {
              await setTabBadge(tab.id, enabled, url);
            } catch {
              void 0;
            }
          }),
        );
      } catch {
        void 0;
      }
    }
  }

  browser.action.onClicked.addListener(
    () =>
      void (async () => {
        const current = await getGlobalEnabled();
        const next = !current;
        await setGlobalEnabled(next);
        await setGlobalBadge(next);
        await syncAllTabs(next);
      })(),
  );

  function parseGlobalEnabledChange(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value === 'true') return true;
      if (value === 'false') return false;
      try {
        const parsed = JSON.parse(value) as unknown;
        if (typeof parsed === 'boolean') return parsed;
        if (parsed && typeof parsed === 'object') {
          const obj = parsed as Record<string, unknown>;
          if (typeof obj.globalEnabled === 'boolean') return obj.globalEnabled;
          if (obj.state && typeof obj.state === 'object') {
            const state = obj.state as Record<string, unknown>;
            if (typeof state.globalEnabled === 'boolean') return state.globalEnabled;
          }
        }
      } catch {
        void 0;
      }
    }
    if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      if (typeof obj.globalEnabled === 'boolean') return obj.globalEnabled;
      if (obj.state && typeof obj.state === 'object') {
        const state = obj.state as Record<string, unknown>;
        if (typeof state.globalEnabled === 'boolean') return state.globalEnabled;
      }
    }
    return value === true;
  }

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const change = (changes as Record<string, { newValue?: unknown }>)[GLOBAL_ENABLED_KEY];
    if (!change) return;
    const next = parseGlobalEnabledChange(change.newValue);
    void (async () => {
      await setGlobalBadge(next);
      await syncAllTabs(next);
    })();
  });

  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    if (!isExtensionMessage(message) || sender.tab?.id === undefined) return undefined;
    return controller.message(message, sender.tab.id);
  });
  browser.tabs.onRemoved.addListener((tabId) => void controller.tabRemoved(tabId));
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') void controller.tabLoading(tabId, changeInfo.url ?? tab.url);
  });
  void (async () => {
    try {
      const enabled = await getGlobalEnabled();
      await setGlobalBadge(enabled);
    } catch {
      void 0;
    }
    void controller.reconstruct().catch(() => undefined);
  })();
});
