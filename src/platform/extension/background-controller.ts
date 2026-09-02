import type { ReplacementPolicy } from './replacement-policy';
import type { TabModeStore } from './mode-store';
import type { RuntimeInjector } from './runtime-injector';
import type { ExtensionMessage, ExtensionResponse } from './messages';

export type BackgroundControllerDeps = {
  modes: TabModeStore;
  policy: ReplacementPolicy;
  injector: RuntimeInjector;
  isEchoUrl: (url: string) => boolean;
  isAuthUrl: (url: string) => boolean;
  isReplacementRoute: (url: string) => boolean;
  canonicalUrl?: (url: string) => string;
  tabs: {
    reload: (tabId: number) => Promise<unknown>;
    update: (tabId: number, updateProperties: { url: string }) => Promise<unknown>;
    get: (tabId: number) => Promise<{ url?: string }>;
  };
  action: {
    setBadgeText: (details: { tabId: number; text: string }) => Promise<unknown>;
    setBadgeBackgroundColor: (details: { tabId: number; color: string }) => Promise<unknown>;
    setTitle: (details: { tabId: number; title: string }) => Promise<unknown>;
  };
};

const badgeOn = { text: 'ON', color: '#2563eb' } as const;

async function setModeBadge(deps: BackgroundControllerDeps, tabId: number, mode: 'stock' | 'replacement') {
  if (mode === 'replacement') {
    await deps.action.setBadgeText({ tabId, text: badgeOn.text });
    await deps.action.setBadgeBackgroundColor({ tabId, color: badgeOn.color });
    await deps.action.setTitle({ tabId, title: 'Disable Echo360 Lightning' });
  } else {
    await deps.action.setBadgeText({ tabId, text: '' });
    await deps.action.setTitle({ tabId, title: 'Enable Echo360 Lightning' });
  }
}

async function clearTab(deps: BackgroundControllerDeps, tabId: number, updateBadge = true): Promise<void> {
  await deps.modes.clear(tabId);
  await deps.policy.remove(tabId);
  deps.injector.reset(tabId);
  if (updateBadge) await setModeBadge(deps, tabId, 'stock');
}

async function checkEchoAuth(deps: BackgroundControllerDeps, tabId: number, url: string): Promise<boolean> {
  if (!deps.isAuthUrl(url)) return false;
  await clearTab(deps, tabId);
  return true;
}

async function syncTab(
  deps: BackgroundControllerDeps,
  tabId: number,
  url: string,
  inject: boolean,
): Promise<ExtensionResponse> {
  if (!deps.isEchoUrl(url) || (await checkEchoAuth(deps, tabId, url))) {
    if (!deps.isAuthUrl(url)) await clearTab(deps, tabId);
    return { ok: true, mode: 'stock' };
  }
  const mode = await deps.modes.read(tabId);
  if (mode !== 'replacement') {
    await deps.policy.remove(tabId);
    return { ok: true, mode: 'stock' };
  }
  await deps.policy.sync(tabId, url);
  await setModeBadge(deps, tabId, 'replacement');
  const shouldInject = inject && deps.isReplacementRoute(url);
  if (shouldInject) {
    await deps.injector.inject(tabId);
    return { ok: true, mode: 'replacement', injected: true };
  }
  return { ok: true, mode: 'replacement', injected: false };
}

export function createBackgroundController(deps: BackgroundControllerDeps) {
  return {
    async getMode(tabId: number): Promise<ExtensionResponse> {
      return { ok: true, mode: await deps.modes.read(tabId) };
    },
    async bootstrap(tabId: number, url: string): Promise<ExtensionResponse> {
      return syncTab(deps, tabId, url, true);
    },
    async routeChanged(tabId: number, url: string): Promise<ExtensionResponse> {
      return syncTab(deps, tabId, url, false);
    },
    async toolbarClick(tab: { id?: number; url?: string }): Promise<'stock' | 'replacement'> {
      const tabId = tab.id;
      if (tabId === undefined) return 'stock';
      const url = tab.url;
      if (!url || !deps.isEchoUrl(url)) {
        await clearTab(deps, tabId);
        await deps.tabs.update(tabId, { url: 'https://echo360.net.au/' });
        return 'stock';
      }
      if (await checkEchoAuth(deps, tabId, url)) return 'stock';
      const mode = await deps.modes.read(tabId);
      if (mode === 'replacement') {
        await clearTab(deps, tabId);
        const canonical = deps.canonicalUrl ? deps.canonicalUrl(url) : url;
        if (canonical !== url && deps.isEchoUrl(canonical)) {
          await deps.tabs.update(tabId, { url: canonical });
          return 'stock';
        }
        await deps.tabs.reload(tabId);
        return 'stock';
      }
      await deps.modes.set(tabId, 'replacement');
      await deps.policy.sync(tabId, url);
      await setModeBadge(deps, tabId, 'replacement');
      await deps.tabs.reload(tabId);
      return 'replacement';
    },
    async message(message: ExtensionMessage, tabId: number): Promise<ExtensionResponse> {
      if (message.type === 'getMode') return this.getMode(tabId);
      if (message.type === 'bootstrap') return this.bootstrap(tabId, message.url);
      if (message.type === 'routeChanged') return this.routeChanged(tabId, message.url);
      if (message.type === 'enableReplacement') {
        await deps.modes.set(tabId, 'replacement');
        const tab = await deps.tabs.get(tabId);
        await deps.policy.sync(tabId, tab.url ?? '');
        await setModeBadge(deps, tabId, 'replacement');
        await deps.tabs.reload(tabId);
        return { ok: true, mode: 'replacement', reloaded: true };
      }
      await clearTab(deps, tabId);
      if (message.type === 'useOriginal' && message.url && deps.isEchoUrl(message.url)) {
        const canonical = deps.canonicalUrl ? deps.canonicalUrl(message.url) : message.url;
        if (deps.isEchoUrl(canonical)) await deps.tabs.update(tabId, { url: canonical });
        return { ok: true, mode: 'stock', reloaded: true };
      }
      await deps.tabs.reload(tabId);
      return { ok: true, mode: 'stock', reloaded: true };
    },
    async reconstruct(): Promise<void> {
      const entries = await deps.modes.enumerate();
      await Promise.all(
        entries.map(async ({ tabId }) => {
          try {
            const tab = await deps.tabs.get(tabId);
            if (tab.url) await syncTab(deps, tabId, tab.url, false);
            else await clearTab(deps, tabId, false);
          } catch {
            await clearTab(deps, tabId, false);
          }
        }),
      );
    },
    async tabRemoved(tabId: number): Promise<void> {
      await clearTab(deps, tabId, false);
    },
    async tabLoading(tabId: number, url?: string): Promise<void> {
      deps.injector.reset(tabId);
      if (url) await syncTab(deps, tabId, url, false);
    },
  };
}
