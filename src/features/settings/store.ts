import { z } from 'zod';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import type { PipSize, PlayerState } from '../../domain/player-types';

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

const validRecord = <T>(schema: z.ZodType<T>) => z.record(z.string().min(1), schema);
const playbackRateSchema = z.number().finite().min(0.25).max(10);
const volumeSchema = z.number().finite().min(0).max(5);
const pipSizeSchema = z.object({
  width: z.number().finite().min(100).max(800),
  height: z.number().finite().min(50).max(500),
});
const pipPositionSchema = z.object({
  corner: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']),
  index: z.number().int().min(0).max(19),
});
const playerStateSchema = z.object({
  mode: z.enum(['grid', 'focus']),
  selectedIds: z.array(z.string()),
  mainId: z.string(),
  audioId: z.string(),
  pipPositions: validRecord(pipPositionSchema),
});
const settingsSchema = z.object({
  captionsEnabled: z.boolean(),
  playbackRate: playbackRateSchema,
  volumeBySection: validRecord(volumeSchema).optional(),
  playbackRateBySection: validRecord(playbackRateSchema).optional(),
  captionsEnabledBySection: validRecord(z.boolean()).optional(),
  mutedBySection: validRecord(z.boolean()).optional(),
  selectedStreamIds: validRecord(z.array(z.string())),
  playerStateBySection: validRecord(playerStateSchema).optional(),
  pipSizeBySection: validRecord(pipSizeSchema).optional(),
});
function validPlaybackRate(value: unknown): value is number {
  return playbackRateSchema.safeParse(value).success;
}
function validVolume(value: unknown): value is number {
  return volumeSchema.safeParse(value).success;
}
function validPlayerState(value: unknown): value is PlayerState {
  return playerStateSchema.safeParse(value).success;
}
function validPipSize(value: unknown): value is PipSize {
  return pipSizeSchema.safeParse(value).success;
}
function validSettings(value: unknown): value is LightningSettings {
  return settingsSchema.safeParse(value).success;
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
