import type { ReplacementPolicy } from './replacement-policy';
import type { TabModeStore } from './mode-store';
import type { RuntimeInjector } from './runtime-injector';
import type { ExtensionMessage, ExtensionResponse } from './messages';

type StorageArea = {
  get(keys?: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
};

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
  globalEnabled?: () => Promise<boolean> | boolean;
  storageLocal?: StorageArea;
  now?: () => number;
  loggedOutAt?: Map<number, number>;
};

const badgeOn = { text: 'ON', color: '#2563eb' } as const;
const LOGGED_OUT_TTL_MS = 5 * 60 * 1000;
const LOGGED_OUT_STORAGE_KEY = 'lightning.loggedOutAt';
const GLOBAL_ENABLED_STORAGE_KEY = 'lightning.globalEnabled';

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

function parseStoredGlobalEnabled(value: unknown): boolean | undefined {
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
  return undefined;
}

async function readGlobalEnabled(deps: BackgroundControllerDeps): Promise<boolean> {
  if (deps.globalEnabled) {
    try {
      const value = await deps.globalEnabled();
      const parsed = parseStoredGlobalEnabled(value);
      if (parsed !== undefined) return parsed;
    } catch {
      void 0;
    }
  }
  if (deps.storageLocal) {
    try {
      const data = await deps.storageLocal.get(GLOBAL_ENABLED_STORAGE_KEY);
      const value = data[GLOBAL_ENABLED_STORAGE_KEY];
      const parsed = parseStoredGlobalEnabled(value);
      if (parsed !== undefined) return parsed;
      if (value === undefined) return true;
    } catch {
      void 0;
    }
  }
  if (deps.globalEnabled === undefined && deps.storageLocal === undefined) return true;
  return true;
}

async function readLoggedOutMap(deps: BackgroundControllerDeps): Promise<Record<string, number>> {
  if (!deps.storageLocal) return {};
  try {
    const data = await deps.storageLocal.get(LOGGED_OUT_STORAGE_KEY);
    const value = data[LOGGED_OUT_STORAGE_KEY];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
      }
      return out;
    }
  } catch {
    void 0;
  }
  return {};
}

async function writeLoggedOutMap(deps: BackgroundControllerDeps, map: Record<string, number>): Promise<void> {
  if (!deps.storageLocal) return;
  try {
    if (Object.keys(map).length) await deps.storageLocal.set({ [LOGGED_OUT_STORAGE_KEY]: map });
    else await deps.storageLocal.remove([LOGGED_OUT_STORAGE_KEY]);
  } catch {
    void 0;
  }
}

async function recordLoggedOut(
  deps: BackgroundControllerDeps,
  internal: Map<number, number>,
  tabId: number,
): Promise<void> {
  const ts = deps.now ? deps.now() : Date.now();
  internal.set(tabId, ts);
  if (deps.storageLocal) {
    const map = await readLoggedOutMap(deps);
    map[String(tabId)] = ts;
    await writeLoggedOutMap(deps, map);
  }
}

async function clearLoggedOutEntry(
  deps: BackgroundControllerDeps,
  internal: Map<number, number>,
  tabId: number,
): Promise<void> {
  internal.delete(tabId);
  if (deps.storageLocal) {
    const map = await readLoggedOutMap(deps);
    if (String(tabId) in map) {
      delete map[String(tabId)];
      await writeLoggedOutMap(deps, map);
    }
  }
}

async function isRecentlyLoggedOut(
  deps: BackgroundControllerDeps,
  internal: Map<number, number>,
  tabId: number,
): Promise<boolean> {
  let ts = internal.get(tabId);
  if (ts === undefined && deps.storageLocal) {
    const map = await readLoggedOutMap(deps);
    const v = map[String(tabId)];
    if (typeof v === 'number' && Number.isFinite(v)) {
      ts = v;
      internal.set(tabId, ts);
    }
  }
  if (ts === undefined) return false;
  const now = deps.now ? deps.now() : Date.now();
  if (now - ts < LOGGED_OUT_TTL_MS && now >= ts) return true;
  await clearLoggedOutEntry(deps, internal, tabId);
  return false;
}

function extractDomLoggedOut(message: unknown): boolean | undefined {
  if (!message || typeof message !== 'object') return undefined;
  const m = message as Record<string, unknown>;
  if (typeof m.isLoggedOut === 'boolean') return m.isLoggedOut;
  if (typeof m.domLoggedOut === 'boolean') return m.domLoggedOut;
  if (typeof m.isLoggedOutFromDOM === 'boolean') return m.isLoggedOutFromDOM;
  return undefined;
}

async function syncTab(
  deps: BackgroundControllerDeps,
  internalLoggedOut: Map<number, number>,
  tabId: number,
  url: string,
  inject: boolean,
  domLoggedOut?: boolean,
): Promise<ExtensionResponse> {
  if (!deps.isEchoUrl(url) || (await checkEchoAuth(deps, tabId, url))) {
    if (!deps.isAuthUrl(url)) await clearTab(deps, tabId);
    return { ok: true, mode: 'stock' };
  }
  if (domLoggedOut === true) {
    await recordLoggedOut(deps, internalLoggedOut, tabId);
    await clearTab(deps, tabId);
    return { ok: true, mode: 'stock' };
  }
  if (domLoggedOut === false) {
    await clearLoggedOutEntry(deps, internalLoggedOut, tabId);
  }
  if (await isRecentlyLoggedOut(deps, internalLoggedOut, tabId)) {
    await clearTab(deps, tabId);
    return { ok: true, mode: 'stock' };
  }
  const globalEnabled = await readGlobalEnabled(deps);
  const isReplacement = deps.isReplacementRoute(url);
  const canAuto = globalEnabled && isReplacement && deps.isEchoUrl(url) && !deps.isAuthUrl(url);
  const mode = await deps.modes.read(tabId);
  if (mode !== 'replacement') {
    if (canAuto) {
      await deps.modes.set(tabId, 'replacement');
      await deps.policy.sync(tabId, url);
      await setModeBadge(deps, tabId, 'replacement');
      if (inject && isReplacement) {
        await deps.injector.inject(tabId);
        return { ok: true, mode: 'replacement', injected: true };
      }
      return { ok: true, mode: 'replacement', injected: false };
    }
    await deps.policy.remove(tabId);
    await setModeBadge(deps, tabId, 'stock');
    return { ok: true, mode: 'stock' };
  }
  if (!canAuto) {
    await clearTab(deps, tabId);
    return { ok: true, mode: 'stock' };
  }
  await deps.policy.sync(tabId, url);
  await setModeBadge(deps, tabId, 'replacement');
  const shouldInject = inject && isReplacement;
  if (shouldInject) {
    await deps.injector.inject(tabId);
    return { ok: true, mode: 'replacement', injected: true };
  }
  return { ok: true, mode: 'replacement', injected: false };
}

export function createBackgroundController(deps: BackgroundControllerDeps) {
  const internalLoggedOut = deps.loggedOutAt ?? new Map<number, number>();
  return {
    async getMode(tabId: number): Promise<ExtensionResponse> {
      return { ok: true, mode: await deps.modes.read(tabId) };
    },
    async bootstrap(tabId: number, url: string, domHint?: boolean): Promise<ExtensionResponse> {
      const hint = domHint ?? undefined;
      return syncTab(deps, internalLoggedOut, tabId, url, true, hint);
    },
    async routeChanged(tabId: number, url: string, domHint?: boolean): Promise<ExtensionResponse> {
      return syncTab(deps, internalLoggedOut, tabId, url, false, domHint);
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
      if (await isRecentlyLoggedOut(deps, internalLoggedOut, tabId)) {
        await clearTab(deps, tabId);
        return 'stock';
      }
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
      if (message.type === 'bootstrap') {
        const domLoggedOut = extractDomLoggedOut(message);
        return this.bootstrap(tabId, message.url, domLoggedOut);
      }
      if (message.type === 'routeChanged') {
        const domLoggedOut = extractDomLoggedOut(message);
        return this.routeChanged(tabId, message.url, domLoggedOut);
      }
      if (message.type === 'reportLoggedOut') {
        await recordLoggedOut(deps, internalLoggedOut, tabId);
        await clearTab(deps, tabId);
        return { ok: true, mode: 'stock' };
      }
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
      const globalEnabled = await readGlobalEnabled(deps);
      const entries = await deps.modes.enumerate();
      await Promise.all(
        entries.map(async ({ tabId }) => {
          try {
            const tab = await deps.tabs.get(tabId);
            if (tab.url) {
              if (!globalEnabled) {
                await clearTab(deps, tabId, false);
                return;
              }
              if (await isRecentlyLoggedOut(deps, internalLoggedOut, tabId)) {
                await clearTab(deps, tabId, false);
                return;
              }
              await syncTab(deps, internalLoggedOut, tabId, tab.url, false);
            } else await clearTab(deps, tabId, false);
          } catch {
            await clearTab(deps, tabId, false);
          }
        }),
      );
      if (!globalEnabled) {
        const remaining = await deps.modes.enumerate();
        await Promise.all(remaining.map(({ tabId }) => clearTab(deps, tabId, false)));
      }
    },
    async tabRemoved(tabId: number): Promise<void> {
      await clearLoggedOutEntry(deps, internalLoggedOut, tabId);
      await clearTab(deps, tabId, false);
    },
    async tabLoading(tabId: number, url?: string): Promise<void> {
      deps.injector.reset(tabId);
      if (url) await syncTab(deps, internalLoggedOut, tabId, url, false);
    },
  };
}

