import { createContext, useContext, useLayoutEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import type { LightningSettingsState, LightningSettingsStore } from './store';
import { createLightningSettingsStore } from './store';

const SettingsContext = createContext<LightningSettingsStore | undefined>(undefined);

function useSettingsHydration(store: LightningSettingsStore): void {
  useLayoutEffect(() => {
    void store.persist.rehydrate();
  }, [store]);
}

export function SettingsProvider({ children, store }: { children: ReactNode; store?: LightningSettingsStore }) {
  const settingsStore = useMemo(() => store ?? createLightningSettingsStore(), [store]);
  useSettingsHydration(settingsStore);
  return <SettingsContext.Provider value={settingsStore}>{children}</SettingsContext.Provider>;
}

export function useLightningSettings<T>(selector: (state: LightningSettingsState) => T): T {
  const store = useContext(SettingsContext);
  if (!store) throw new Error('useLightningSettings must be used inside SettingsProvider.');
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

export function useLightningSettingsBundle(sectionId?: string) {
  const settings = useLightningSettings((state) => state);
  return useMemo(
    () => ({
      savedSelectedIds: sectionId ? settings.selectedStreamIds[sectionId] : undefined,
      setSelectedStreamIds: settings.setSelectedStreamIds,
      savedPlayerState: sectionId ? settings.playerStateBySection[sectionId] : undefined,
      setPlayerState: settings.setPlayerState,
      savedPipSize: sectionId ? settings.pipSizeBySection[sectionId] : undefined,
      setPipSize: settings.setPipSize,
      savedVolume: sectionId ? settings.volumeBySection[sectionId] : undefined,
      setVolumeForSection: settings.setVolumeForSection,
      savedPlaybackRate: sectionId
        ? (settings.playbackRateBySection[sectionId] ?? settings.playbackRate)
        : settings.playbackRate,
      setPlaybackRateForSection: settings.setPlaybackRateForSection,
      setPlaybackRateGlobal: settings.setPlaybackRate,
      savedCaptionsEnabled: sectionId
        ? (settings.captionsEnabledBySection[sectionId] ?? settings.captionsEnabled)
        : settings.captionsEnabled,
      setCaptionsEnabledForSection: settings.setCaptionsEnabledForSection,
      setCaptionsEnabledGlobal: settings.setCaptionsEnabled,
      savedIsMuted: sectionId ? settings.mutedBySection[sectionId] : undefined,
      setMutedForSection: settings.setMutedForSection,
    }),
    [sectionId, settings],
  );
}
