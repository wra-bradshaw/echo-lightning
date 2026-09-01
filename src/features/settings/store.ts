import { createStore, type StoreApi } from 'zustand/vanilla';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

export type LightningSettings = {
  theme: Theme;
  captionsEnabled: boolean;
  playbackRate: number;
  selectedStreamIds: Record<string, string[]>;
};

export type LightningSettingsState = LightningSettings & {
  setTheme: (theme: Theme) => void;
  setCaptionsEnabled: (enabled: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setSelectedStreamIds: (sectionId: string, ids: readonly string[]) => void;
};

export type LightningSettingsStore = StoreApi<LightningSettingsState> & {
  persist: {
    rehydrate: () => Promise<void> | void;
    hasHydrated: () => boolean;
    onFinishHydration: (listener: (state: LightningSettingsState) => void) => () => void;
  };
};

export type SettingsStorage = StateStorage;

export type BrowserStorageArea = {
  get: (keys?: string | string[] | null) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
  remove: (keys: string | string[]) => Promise<void>;
};

export type SettingsStorageInput = SettingsStorage | BrowserStorageArea;

export const SETTINGS_STORAGE_KEY = 'lightning.settings';
const SETTINGS_VERSION = 3;

function validTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

function validPlaybackRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0.25 && value <= 4;
}

function validSelectedStreamIds(value: unknown): value is Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(
    ([sectionId, ids]) =>
      Boolean(sectionId) &&
      Array.isArray(ids) &&
      ids.every((id) => typeof id === 'string') &&
      ids.every((id, index) => ids.indexOf(id) === index),
  );
}

function validSettings(value: unknown): value is Omit<LightningSettings, 'selectedStreamIds'> & {
  selectedStreamIds?: unknown;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as Partial<LightningSettings>;
  return (
    validTheme(state.theme) &&
    typeof state.captionsEnabled === 'boolean' &&
    validPlaybackRate(state.playbackRate) &&
    (state.selectedStreamIds === undefined || validSelectedStreamIds(state.selectedStreamIds))
  );
}

function settingsOnly(value: unknown): LightningSettings | undefined {
  if (!validSettings(value)) return undefined;
  return {
    theme: value.theme,
    captionsEnabled: value.captionsEnabled,
    playbackRate: value.playbackRate,
    selectedStreamIds: validSelectedStreamIds(value.selectedStreamIds) ? value.selectedStreamIds : {},
  };
}

export function createBrowserStorageAdapter(area: BrowserStorageArea): SettingsStorage {
  return {
    async getItem(name) {
      const values = await area.get(name);
      const value = values[name];
      return typeof value === 'string' ? value : value === undefined ? null : JSON.stringify(value);
    },
    async setItem(name, value) {
      await area.set({ [name]: value });
    },
    async removeItem(name) {
      await area.remove(name);
    },
  };
}

function systemTheme(): Theme {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function createLightningSettingsStore(
  options: {
    storage?: SettingsStorageInput;
    storageArea?: BrowserStorageArea;
    systemTheme?: Theme;
  } = {},
): LightningSettingsStore {
  const defaults: LightningSettings = {
    theme: options.systemTheme ?? systemTheme(),
    captionsEnabled: true,
    playbackRate: 1,
    selectedStreamIds: {},
  };
  const storageInput =
    options.storage ?? (options.storageArea ? createBrowserStorageAdapter(options.storageArea) : undefined);
  const storage =
    (storageInput && 'getItem' in storageInput
      ? storageInput
      : storageInput
        ? createBrowserStorageAdapter(storageInput)
        : undefined) ??
    ({
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
    } satisfies SettingsStorage);
  const creator = persist<LightningSettingsState, [], [], LightningSettings>(
    (set) => ({
      ...defaults,
      setTheme: (theme) => set({ theme }),
      setCaptionsEnabled: (captionsEnabled) => set({ captionsEnabled }),
      setPlaybackRate: (playbackRate) => set({ playbackRate }),
      setSelectedStreamIds: (sectionId, ids) => {
        if (!sectionId) return;
        const uniqueIds = ids.filter((id, index) => Boolean(id) && ids.indexOf(id) === index);
        set((state) => ({ selectedStreamIds: { ...state.selectedStreamIds, [sectionId]: uniqueIds } }));
      },
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: SETTINGS_VERSION,
      storage: createJSONStorage<LightningSettings>(() => storage),
      skipHydration: true,
      partialize: ({ theme, captionsEnabled, playbackRate, selectedStreamIds }) => ({
        theme,
        captionsEnabled,
        playbackRate,
        selectedStreamIds,
      }),
      migrate: (persisted) => settingsOnly(persisted) ?? defaults,
      merge: (persisted, current) => {
        const saved = settingsOnly(persisted);
        if (!saved) return current;
        return {
          ...current,
          ...saved,
        };
      },
    },
  );
  return createStore(creator) as LightningSettingsStore;
}
