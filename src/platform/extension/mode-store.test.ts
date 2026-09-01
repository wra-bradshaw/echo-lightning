import { describe, expect, it } from 'vitest';
import { createTabModeStore, type SessionStorageArea } from './mode-store';

function storage(initial: Record<string, unknown> = {}) {
  let values = { ...initial };
  const area: SessionStorageArea = {
    async get() {
      return values;
    },
    async set(next) {
      values = { ...values, ...next };
    },
    async remove(key) {
      const keys = Array.isArray(key) ? key : [key];
      for (const currentKey of keys) delete values[currentKey];
    },
  };
  return { area, values: () => values };
}

describe('tab mode store', () => {
  it('persists, enumerates, and clears replacement modes', async () => {
    const backing = storage();
    const modes = createTabModeStore(backing.area);

    expect(await modes.read(4)).toBe('stock');
    await modes.set(4, 'replacement');
    await modes.set(8, 'replacement');
    expect(await modes.enumerate()).toEqual([
      { tabId: 4, mode: 'replacement' },
      { tabId: 8, mode: 'replacement' },
    ]);
    await modes.clear(4);
    expect(await modes.enumerate()).toEqual([{ tabId: 8, mode: 'replacement' }]);
    expect(backing.values()).toEqual({ 'lightning.tabModes': { '8': 'replacement' } });
  });

  it('ignores malformed session data', async () => {
    const modes = createTabModeStore(
      storage({ 'lightning.tabModes': { '0': 'replacement', '4': 'stock', '5': 'replacement', bad: 'replacement' } })
        .area,
    );
    expect(await modes.enumerate()).toEqual([{ tabId: 5, mode: 'replacement' }]);
  });
});
