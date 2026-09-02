import { describe, expect, it } from 'vitest';
import { GLOBAL_ENABLED_KEY, canAutoEnable, createGlobalModeStore } from './global-mode-store';
import type { BrowserStorageArea } from './global-mode-store';

function memoryArea(initial: Record<string, unknown> = {}): {
  area: BrowserStorageArea;
  store: () => Record<string, unknown>;
} {
  let store = { ...initial };
  const area: BrowserStorageArea = {
    async get(keys?: string | string[] | null) {
      if (!keys) return { ...store };
      if (typeof keys === 'string') return { [keys]: store[keys] } as Record<string, unknown>;
      if (Array.isArray(keys)) {
        const out: Record<string, unknown> = {};
        for (const k of keys) if (k in store) out[k] = store[k];
        return out;
      }
      return { ...store };
    },
    async set(items: Record<string, unknown>) {
      store = { ...store, ...items };
    },
    async remove(keys: string | string[]) {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const k of list) delete store[k];
    },
  };
  return { area, store: () => store };
}

describe('global mode store', () => {
  it('defaults to enabled when storage is empty', async () => {
    const { area } = memoryArea();
    const global = createGlobalModeStore(area);
    expect(await global.get()).toBe(true);
  });

  it('persists enabled flag via browser.storage.local', async () => {
    const { area, store } = memoryArea();
    const global = createGlobalModeStore(area);
    await global.set(false);
    expect(await global.get()).toBe(false);
    expect(store()[GLOBAL_ENABLED_KEY]).toBe(JSON.stringify(false));
    await global.set(true);
    expect(await global.get()).toBe(true);
  });

  it('migrates from legacy tabModes and cleans up', async () => {
    const { area, store } = memoryArea({ 'lightning.tabModes': { '12': 'replacement', '34': 'replacement' } });
    const global = createGlobalModeStore(area);
    expect(await global.get()).toBe(true);
    expect(store()['lightning.tabModes']).toBeUndefined();
    expect(store()[GLOBAL_ENABLED_KEY]).toBe(JSON.stringify(true));
  });

  it('handles raw boolean and stringified legacy values', async () => {
    const first = memoryArea({ [GLOBAL_ENABLED_KEY]: false });
    expect(await createGlobalModeStore(first.area).get()).toBe(false);
    const second = memoryArea({ [GLOBAL_ENABLED_KEY]: 'false' });
    expect(await createGlobalModeStore(second.area).get()).toBe(false);
    const third = memoryArea({ [GLOBAL_ENABLED_KEY]: JSON.stringify(true) });
    expect(await createGlobalModeStore(third.area).get()).toBe(true);
  });

  it('canAutoEnable respects global flag, echo host, auth and replacement route', () => {
    expect(canAutoEnable({ url: 'https://echo360.net.au/courses', globalEnabled: true })).toBe(true);
    expect(canAutoEnable({ url: 'https://echo360.net.au/section/abc', globalEnabled: true })).toBe(true);
    expect(canAutoEnable({ url: 'https://echo360.net.au/lesson/xyz/classroom', globalEnabled: true })).toBe(true);
    expect(canAutoEnable({ url: 'https://echo360.net.au/courses', globalEnabled: false })).toBe(false);
    expect(canAutoEnable({ url: 'https://login.echo360.net.au/login', globalEnabled: true })).toBe(false);
    expect(canAutoEnable({ url: 'https://echo360.net.au/login', globalEnabled: true })).toBe(false);
    expect(canAutoEnable({ url: 'https://example.com/courses', globalEnabled: true })).toBe(false);
    expect(canAutoEnable({ url: 'https://echo360.net.au/unknown', globalEnabled: true })).toBe(false);
    expect(
      canAutoEnable({
        url: 'https://echo360.net.au/courses',
        globalEnabled: true,
        isLoggedOutFromDOM: true,
      }),
    ).toBe(false);
    expect(
      canAutoEnable({
        url: 'https://echo360.net.au/courses',
        globalEnabled: true,
        isLoggedOutFromDOM: false,
      }),
    ).toBe(true);
  });

  it('store canAutoEnable checks tabId and url and global state', async () => {
    const { area } = memoryArea();
    const global = createGlobalModeStore(area);
    expect(await global.canAutoEnable(12, 'https://echo360.net.au/courses')).toBe(true);
    expect(await global.canAutoEnable(0, 'https://echo360.net.au/courses')).toBe(false);
    expect(await global.canAutoEnable(12, 'https://login.echo360.net.au/login')).toBe(false);
    expect(await global.canAutoEnable(12, 'https://example.com/courses')).toBe(false);
    await global.set(false);
    expect(await global.canAutoEnable(12, 'https://echo360.net.au/courses')).toBe(false);
  });
});
