import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { isEchoAuthUrl, isReplacementRoute } from '../integrations/echo/routing/routes';
import { isEchoUrl } from '../integrations/echo/routing/url';
import { createBackgroundController } from '../platform/extension/background-controller';
import { isExtensionMessage } from '../platform/extension/messages';
import { createTabModeStore, type SessionStorageArea } from '../platform/extension/mode-store';
import { createReplacementPolicy, type DnrApi } from '../platform/extension/replacement-policy';
import { LIGHTNING_RUNTIME_SCRIPT, createRuntimeInjector } from '../platform/extension/runtime-injector';

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
  const controller = createBackgroundController({
    modes,
    policy,
    injector,
    isEchoUrl: (url) => isEchoUrl(url),
    isAuthUrl: (url) => isEchoAuthUrl(url),
    isReplacementRoute: (url) => isReplacementRoute(url),
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
  });

  browser.action.onClicked.addListener((tab) => void controller.toolbarClick(tab));
  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    if (!isExtensionMessage(message) || sender.tab?.id === undefined) return undefined;
    return controller.message(message, sender.tab.id);
  });
  browser.tabs.onRemoved.addListener((tabId) => void controller.tabRemoved(tabId));
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') void controller.tabLoading(tabId, changeInfo.url ?? tab.url);
  });
  void controller.reconstruct().catch(() => undefined);
});
