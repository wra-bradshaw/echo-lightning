export type TabMode = 'stock' | 'replacement';

export interface TabModeStore {
  read(tabId: number): Promise<TabMode>;
  set(tabId: number, mode: TabMode): Promise<void>;
  clear(tabId: number): Promise<void>;
  enumerate(): Promise<Array<{ tabId: number; mode: TabMode }>>;
}

export interface SessionStorageArea {
  get(keys?: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

export const TAB_MODES_STORAGE_KEY = 'lightning.tabModes';

function isTabMode(value: unknown): value is TabMode {
  return value === 'stock' || value === 'replacement';
}

function isTabId(value: string): boolean {
  const tabId = Number(value);
  return Number.isSafeInteger(tabId) && tabId > 0;
}

async function readModes(storage: SessionStorageArea): Promise<Record<string, TabMode>> {
  const values = await storage.get(TAB_MODES_STORAGE_KEY);
  const stored = values[TAB_MODES_STORAGE_KEY];
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  return Object.fromEntries(
    Object.entries(stored).filter(([tabId, mode]) => isTabId(tabId) && mode === 'replacement'),
  ) as Record<string, TabMode>;
}

export function createTabModeStore(storage: SessionStorageArea): TabModeStore {
  return {
    async read(tabId) {
      const modes = await readModes(storage);
      return isTabMode(modes[String(tabId)]) && modes[String(tabId)] === 'replacement' ? 'replacement' : 'stock';
    },
    async set(tabId, mode) {
      if (!isTabId(String(tabId))) throw new RangeError(`Cannot store a mode for invalid tab id ${tabId}.`);
      const modes = await readModes(storage);
      if (mode === 'replacement') modes[String(tabId)] = mode;
      else delete modes[String(tabId)];
      if (Object.keys(modes).length) await storage.set({ [TAB_MODES_STORAGE_KEY]: modes });
      else await storage.remove(TAB_MODES_STORAGE_KEY);
    },
    async clear(tabId) {
      const modes = await readModes(storage);
      delete modes[String(tabId)];
      if (Object.keys(modes).length) await storage.set({ [TAB_MODES_STORAGE_KEY]: modes });
      else await storage.remove(TAB_MODES_STORAGE_KEY);
    },
    async enumerate() {
      const modes = await readModes(storage);
      return Object.entries(modes)
        .map(([tabId, mode]) => ({ tabId: Number(tabId), mode }))
        .sort((left, right) => left.tabId - right.tabId);
    },
  };
}
