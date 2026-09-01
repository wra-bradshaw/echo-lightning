import { useLayoutEffect, useMemo, type ReactNode } from 'react';
import { createLightningSettingsStore } from '../features/settings';
import { SettingsProvider, useLightningSettings } from '../features/settings/react';
import type { Theme } from '../features/settings/store';
import type { LightningSettingsStore } from '../features/settings/store';

export type { Theme };

export function useThemeBinding(root?: HTMLElement): void {
  const theme = useLightningSettings((state) => state.theme);
  useLayoutEffect(() => {
    const target = root ?? document.documentElement;
    target.classList.toggle('dark', theme === 'dark');
    target.dataset.theme = theme;
  }, [root, theme]);
}

export function ThemeBinding({ root }: { root?: HTMLElement }) {
  useThemeBinding(root);
  return null;
}

export function ThemeProvider({
  children,
  root,
  store,
}: {
  children: ReactNode;
  root?: HTMLElement;
  store?: LightningSettingsStore;
}) {
  const settingsStore = useMemo(() => store ?? createLightningSettingsStore(), [store]);
  return (
    <SettingsProvider store={settingsStore}>
      <ThemeBinding root={root} />
      {children}
    </SettingsProvider>
  );
}

export function useTheme() {
  const theme = useLightningSettings((state) => state.theme);
  const setTheme = useLightningSettings((state) => state.setTheme);
  return { theme, setTheme };
}
