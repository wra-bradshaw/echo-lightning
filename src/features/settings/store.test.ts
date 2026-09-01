import { describe, expect, it, vi } from 'vitest';
import { createLightningSettingsStore, SETTINGS_STORAGE_KEY, type SettingsStorage } from './store';

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
  it('uses captions enabled and normal playback by default without a theme setting', () => {
    const store = createLightningSettingsStore({ storage: memoryStorage().storage });
    expect(store.getState()).toMatchObject({ captionsEnabled: true, playbackRate: 1 });
    expect(store.getState()).not.toHaveProperty('theme');
  });

  it('persists updates and hydrates a recreated store', async () => {
    const first = memoryStorage();
    const store = createLightningSettingsStore({ storage: first.storage });
    store.getState().setCaptionsEnabled(false);
    store.getState().setPlaybackRate(1.5);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const persisted = JSON.parse(first.values.get(SETTINGS_STORAGE_KEY) ?? '{}') as { state?: Record<string, unknown> };
    expect(persisted.state).not.toHaveProperty('theme');
    const recreated = createLightningSettingsStore({ storage: first.storage });
    await recreated.persist.rehydrate();
    expect(recreated.getState()).toMatchObject({ captionsEnabled: false, playbackRate: 1.5 });
  });

  it('falls back for malformed or incomplete current persisted data', async () => {
    const malformed = memoryStorage({ 'lightning.settings': '{not-json' });
    const store = createLightningSettingsStore({ storage: malformed.storage });
    await store.persist.rehydrate();
    expect(store.getState()).toMatchObject({ captionsEnabled: true, playbackRate: 1 });

    const legacy = memoryStorage({
      'lightning.settings': JSON.stringify({
        state: { theme: 'dark', captionsEnabled: false, playbackRate: 1.5, selectedStreamIds: {} },
      }),
    });
    const legacyStore = createLightningSettingsStore({ storage: legacy.storage });
    await legacyStore.persist.rehydrate();
    expect(legacyStore.getState()).toMatchObject({ captionsEnabled: false, playbackRate: 1.5 });
    expect(legacyStore.getState()).not.toHaveProperty('theme');

    const invalid = memoryStorage({
      'lightning.settings': JSON.stringify({
        state: { theme: 'dark', captionsEnabled: false, playbackRate: 1.5 },
      }),
    });
    const invalidStore = createLightningSettingsStore({ storage: invalid.storage });
    await invalidStore.persist.rehydrate();
    expect(invalidStore.getState()).toMatchObject({ captionsEnabled: true, playbackRate: 1 });
  });

  it('persists selected stream IDs per section and restores them after rehydration', async () => {
    const backing = memoryStorage();
    const store = createLightningSettingsStore({ storage: backing.storage });

    store.getState().setSelectedStreamIds('section-a', ['camera-2']);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const recreated = createLightningSettingsStore({ storage: backing.storage });
    await recreated.persist.rehydrate();

    expect(recreated.getState().selectedStreamIds).toEqual({ 'section-a': ['camera-2'] });
  });
});
