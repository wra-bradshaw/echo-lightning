import { createStore, type StoreApi } from 'zustand/vanilla';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

export type PlaybackProgress = {
  position: number;
  duration: number;
};

export type LightningSettings = {
  theme: Theme;
  captionsEnabled: boolean;
  playbackRate: number;
  progress: Record<string, PlaybackProgress>;
};

export type LightningSettingsState = LightningSettings & {
  setTheme: (theme: Theme) => void;
  setCaptionsEnabled: (enabled: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setPlaybackProgress: (mediaId: string, position: number, duration: number) => void;
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

function validProgress(value: unknown): value is Record<string, PlaybackProgress> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
    const progress = entry as Partial<PlaybackProgress>;
    return (
      typeof progress.position === 'number' &&
      Number.isFinite(progress.position) &&
      progress.position >= 0 &&
      typeof progress.duration === 'number' &&
      Number.isFinite(progress.duration) &&
      progress.duration >= 0 &&
      progress.position <= progress.duration
    );
  });
}

function validSettings(value: unknown): value is Omit<LightningSettings, 'progress'> & { progress?: unknown } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as Partial<LightningSettings>;
  return (
    validTheme(state.theme) &&
    typeof state.captionsEnabled === 'boolean' &&
    validPlaybackRate(state.playbackRate) &&
    (state.progress === undefined || validProgress(state.progress))
  );
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
    progress: {},
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
      setPlaybackProgress: (mediaId, position, duration) => {
        if (!mediaId || !Number.isFinite(position) || !Number.isFinite(duration) || duration < 0) return;
        const safeDuration = Math.max(0, duration);
        const safePosition = Math.min(safeDuration, Math.max(0, position));
        set((state) => ({
          progress: { ...state.progress, [mediaId]: { position: safePosition, duration: safeDuration } },
        }));
      },
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: SETTINGS_VERSION,
      storage: createJSONStorage<LightningSettings>(() => storage),
      skipHydration: true,
      partialize: ({ theme, captionsEnabled, playbackRate, progress }) => ({
        theme,
        captionsEnabled,
        playbackRate,
        progress,
      }),
      merge: (persisted, current) => {
        if (!validSettings(persisted)) return current;
        return {
          ...current,
          ...persisted,
          progress: persisted.progress && validProgress(persisted.progress) ? persisted.progress : current.progress,
        };
      },
    },
  );
  return createStore(creator) as LightningSettingsStore;
}
