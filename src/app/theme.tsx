import { useLayoutEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { createLightningSettingsStore } from '../features/settings/store';
import { SettingsProvider } from '../features/settings/react';
import type { LightningSettingsStore } from '../features/settings/store';

type Theme = 'light' | 'dark';

const SYSTEM_DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

function getSystemTheme(): Theme {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(SYSTEM_DARK_MODE_QUERY).matches
    ? 'dark'
    : 'light';
}

function subscribeToSystemTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
  const media = window.matchMedia(SYSTEM_DARK_MODE_QUERY);
  const listener = () => onChange();
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}

const getServerTheme = (): Theme => 'light';

function useSystemTheme(): Theme {
  return useSyncExternalStore(subscribeToSystemTheme, getSystemTheme, getServerTheme);
}

function useThemeBinding(root?: HTMLElement): void {
  const theme = useSystemTheme();
  useLayoutEffect(() => {
    const target = root ?? document.documentElement;
    target.classList.toggle('dark', theme === 'dark');
    target.dataset.theme = theme;
  }, [root, theme]);
}

function ThemeBinding({ root }: { root?: HTMLElement }) {
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
