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
