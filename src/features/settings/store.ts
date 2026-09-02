import { createStore, type StoreApi } from 'zustand/vanilla';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

type PipSize = { width: number; height: number };

type PlayerMode = 'grid' | 'focus';

type PipPosition = {
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  index: number;
};

type PlayerState = {
  mode: PlayerMode;
  selectedIds: string[];
  mainId: string;
  audioId: string;
  pipPositions: Record<string, PipPosition>;
};

type LightningSettings = {
  captionsEnabled: boolean;
  playbackRate: number;
  volumeBySection: Record<string, number>;
  playbackRateBySection: Record<string, number>;
  captionsEnabledBySection: Record<string, boolean>;
  mutedBySection: Record<string, boolean>;
  selectedStreamIds: Record<string, string[]>;
  playerStateBySection: Record<string, PlayerState>;
  pipSizeBySection: Record<string, PipSize>;
};

export type LightningSettingsState = LightningSettings & {
  setCaptionsEnabled: (enabled: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setVolumeForSection: (sectionId: string, volume: number) => void;
  setPlaybackRateForSection: (sectionId: string, rate: number) => void;
  setCaptionsEnabledForSection: (sectionId: string, enabled: boolean) => void;
  setMutedForSection: (sectionId: string, muted: boolean) => void;
  setSelectedStreamIds: (sectionId: string, ids: readonly string[]) => void;
  setPlayerState: (sectionId: string, state: PlayerState) => void;
  setPipSize: (sectionId: string, size: PipSize) => void;
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

function validPlaybackRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0.25 && value <= 10;
}

function validVolume(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5;
}

function validVolumeBySection(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([k, v]) => Boolean(k) && validVolume(v));
}

function validPlaybackRateBySection(value: unknown): value is Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([k, v]) => Boolean(k) && validPlaybackRate(v));
}

function validCaptionsEnabledBySection(value: unknown): value is Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([k, v]) => Boolean(k) && typeof v === 'boolean');
}

function validMutedBySection(value: unknown): value is Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([k, v]) => Boolean(k) && typeof v === 'boolean');
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

function validPipSize(value: unknown): value is PipSize {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const size = value as Partial<PipSize>;
  return (
    typeof size.width === 'number' &&
    Number.isFinite(size.width) &&
    typeof size.height === 'number' &&
    Number.isFinite(size.height) &&
    size.width >= 100 &&
    size.width <= 800 &&
    size.height >= 50 &&
    size.height <= 500
  );
}

function validPipPosition(value: unknown): value is PipPosition {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const pos = value as Partial<PipPosition>;
  return (
    (pos.corner === 'top-left' ||
      pos.corner === 'top-right' ||
      pos.corner === 'bottom-left' ||
      pos.corner === 'bottom-right') &&
    typeof pos.index === 'number' &&
    Number.isInteger(pos.index) &&
    pos.index >= 0 &&
    pos.index < 20
  );
}

function validPlayerState(value: unknown): value is PlayerState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as Partial<PlayerState>;
  if (state.mode !== 'grid' && state.mode !== 'focus') return false;
  if (!Array.isArray(state.selectedIds) || !state.selectedIds.every((id) => typeof id === 'string')) return false;
  if (typeof state.mainId !== 'string' || typeof state.audioId !== 'string') return false;
  if (!state.pipPositions || typeof state.pipPositions !== 'object' || Array.isArray(state.pipPositions)) return false;
  return Object.values(state.pipPositions).every(validPipPosition);
}

function validPlayerStateBySection(value: unknown): value is Record<string, PlayerState> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([k, v]) => Boolean(k) && validPlayerState(v));
}

function validPipSizeBySection(value: unknown): value is Record<string, PipSize> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([k, v]) => Boolean(k) && validPipSize(v));
}

function validSettings(value: unknown): value is LightningSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as Partial<LightningSettings>;
  const hasBase =
    typeof state.captionsEnabled === 'boolean' &&
    validPlaybackRate(state.playbackRate) &&
    validSelectedStreamIds(state.selectedStreamIds);
  if (!hasBase) return false;
  if (state.volumeBySection !== undefined && !validVolumeBySection(state.volumeBySection)) return false;
  if (state.playbackRateBySection !== undefined && !validPlaybackRateBySection(state.playbackRateBySection))
    return false;
  if (state.captionsEnabledBySection !== undefined && !validCaptionsEnabledBySection(state.captionsEnabledBySection))
    return false;
  if (state.mutedBySection !== undefined && !validMutedBySection(state.mutedBySection)) return false;
  if (state.playerStateBySection !== undefined && !validPlayerStateBySection(state.playerStateBySection)) return false;
  if (state.pipSizeBySection !== undefined && !validPipSizeBySection(state.pipSizeBySection)) return false;
  return true;
}

function settingsOnly(value: unknown): LightningSettings | undefined {
  if (!validSettings(value)) return undefined;
  return {
    captionsEnabled: value.captionsEnabled,
    playbackRate: value.playbackRate,
    volumeBySection: (value.volumeBySection as Record<string, number>) ?? {},
    playbackRateBySection: (value.playbackRateBySection as Record<string, number>) ?? {},
    captionsEnabledBySection: (value.captionsEnabledBySection as Record<string, boolean>) ?? {},
    mutedBySection: (value.mutedBySection as Record<string, boolean>) ?? {},
    selectedStreamIds: value.selectedStreamIds,
    playerStateBySection: (value.playerStateBySection as Record<string, PlayerState>) ?? {},
    pipSizeBySection: (value.pipSizeBySection as Record<string, PipSize>) ?? {},
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

export function createLightningSettingsStore(options: { storage?: SettingsStorageInput } = {}): LightningSettingsStore {
  const defaults: LightningSettings = {
    captionsEnabled: true,
    playbackRate: 1,
    volumeBySection: {},
    playbackRateBySection: {},
    captionsEnabledBySection: {},
    mutedBySection: {},
    selectedStreamIds: {},
    playerStateBySection: {},
    pipSizeBySection: {},
  };
  const storageInput = options.storage;
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
      setCaptionsEnabled: (captionsEnabled) => set({ captionsEnabled }),
      setPlaybackRate: (playbackRate) => {
        if (!validPlaybackRate(playbackRate)) return;
        set({ playbackRate });
      },
      setVolumeForSection: (sectionId, volume) => {
        if (!sectionId || !validVolume(volume)) return;
        set((state) => ({ volumeBySection: { ...state.volumeBySection, [sectionId]: volume } }));
      },
      setPlaybackRateForSection: (sectionId, rate) => {
        if (!sectionId || !validPlaybackRate(rate)) return;
        set((state) => ({ playbackRateBySection: { ...state.playbackRateBySection, [sectionId]: rate } }));
      },
      setCaptionsEnabledForSection: (sectionId, enabled) => {
        if (!sectionId || typeof enabled !== 'boolean') return;
        set((state) => ({ captionsEnabledBySection: { ...state.captionsEnabledBySection, [sectionId]: enabled } }));
      },
      setMutedForSection: (sectionId, muted) => {
        if (!sectionId || typeof muted !== 'boolean') return;
        set((state) => ({ mutedBySection: { ...state.mutedBySection, [sectionId]: muted } }));
      },
      setSelectedStreamIds: (sectionId, ids) => {
        if (!sectionId) return;
        const uniqueIds = ids.filter((id, index) => Boolean(id) && ids.indexOf(id) === index);
        set((state) => ({ selectedStreamIds: { ...state.selectedStreamIds, [sectionId]: uniqueIds } }));
      },
      setPlayerState: (sectionId, playerState) => {
        if (!sectionId || !validPlayerState(playerState)) return;
        set((state) => ({ playerStateBySection: { ...state.playerStateBySection, [sectionId]: playerState } }));
      },
      setPipSize: (sectionId, pipSize) => {
        if (!sectionId || !validPipSize(pipSize)) return;
        set((state) => ({ pipSizeBySection: { ...state.pipSizeBySection, [sectionId]: pipSize } }));
      },
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage<LightningSettings>(() => storage),
      skipHydration: true,
      partialize: ({
        captionsEnabled,
        playbackRate,
        volumeBySection,
        playbackRateBySection,
        captionsEnabledBySection,
        mutedBySection,
        selectedStreamIds,
        playerStateBySection,
        pipSizeBySection,
      }) => ({
        captionsEnabled,
        playbackRate,
        volumeBySection,
        playbackRateBySection,
        captionsEnabledBySection,
        mutedBySection,
        selectedStreamIds,
        playerStateBySection,
        pipSizeBySection,
      }),
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
