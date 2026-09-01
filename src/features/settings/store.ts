import { createStore, type StoreApi } from 'zustand/vanilla';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

export type LightningSettings = {
  theme: Theme;
  captionsEnabled: boolean;
  playbackRate: number;
};

export type LightningSettingsState = LightningSettings & {
  setTheme: (theme: Theme) => void;
  setCaptionsEnabled: (enabled: boolean) => void;
  setPlaybackRate: (rate: number) => void;
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
const SETTINGS_VERSION = 1;

function validTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

function validPlaybackRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0.25 && value <= 4;
}

function validSettings(value: unknown): value is LightningSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as Partial<LightningSettings>;
  return validTheme(state.theme) && typeof state.captionsEnabled === 'boolean' && validPlaybackRate(state.playbackRate);
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
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: SETTINGS_VERSION,
      storage: createJSONStorage<LightningSettings>(() => storage),
      skipHydration: true,
      partialize: ({ theme, captionsEnabled, playbackRate }) => ({ theme, captionsEnabled, playbackRate }),
      merge: (persisted, current) => {
        if (!validSettings(persisted)) return current;
        return { ...current, ...persisted };
      },
    },
  );
  return createStore(creator) as LightningSettingsStore;
}
