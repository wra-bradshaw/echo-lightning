import { describe, expect, it, vi } from 'vitest';
import { createLightningSettingsStore, type SettingsStorage } from './store';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const storage: SettingsStorage = {
    getItem: vi.fn(async (key) => values.get(key) ?? null),
    setItem: vi.fn(async (key, value) => void values.set(key, value)),
    removeItem: vi.fn(async (key) => void values.delete(key)),
  };
  return { storage, values };
}

describe('lightning settings store', () => {
  it('uses system theme, captions enabled, and normal playback by default', () => {
    const store = createLightningSettingsStore({
      storage: memoryStorage().storage,
      systemTheme: 'dark',
    });
    expect(store.getState()).toMatchObject({ theme: 'dark', captionsEnabled: true, playbackRate: 1 });
  });

  it('persists updates and hydrates a recreated store', async () => {
    const first = memoryStorage();
    const store = createLightningSettingsStore({ storage: first.storage, systemTheme: 'light' });
    store.getState().setTheme('dark');
    store.getState().setCaptionsEnabled(false);
    store.getState().setPlaybackRate(1.5);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const recreated = createLightningSettingsStore({ storage: first.storage, systemTheme: 'light' });
    await recreated.persist.rehydrate();
    expect(recreated.getState()).toMatchObject({ theme: 'dark', captionsEnabled: false, playbackRate: 1.5 });
  });

  it('falls back for malformed, incompatible, and invalid persisted data', async () => {
    const malformed = memoryStorage({ 'lightning.settings': '{not-json' });
    const store = createLightningSettingsStore({ storage: malformed.storage, systemTheme: 'dark' });
    await store.persist.rehydrate();
    expect(store.getState()).toMatchObject({ theme: 'dark', captionsEnabled: true, playbackRate: 1 });

    const invalid = memoryStorage({
      'lightning.settings': JSON.stringify({
        state: { theme: 'blue', captionsEnabled: 'yes', playbackRate: 99 },
        version: 1,
      }),
    });
    const invalidStore = createLightningSettingsStore({ storage: invalid.storage, systemTheme: 'light' });
    await invalidStore.persist.rehydrate();
    expect(invalidStore.getState()).toMatchObject({ theme: 'light', captionsEnabled: true, playbackRate: 1 });
  });
});
