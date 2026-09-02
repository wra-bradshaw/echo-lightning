import { useLayoutEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { createLightningSettingsStore } from '../features/settings/store';
import { SettingsProvider } from '../features/settings/react';
import type { LightningSettingsStore } from '../features/settings/store';

type Theme = 'light' | 'dark';

const SYSTEM_DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

let lightningMounted = false;

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

export function syncOuterTheme(isDark: boolean): void {
  if (typeof document === 'undefined') return;
  if (!lightningMounted) {
    const host = document.getElementById('echo-lightning-host');
    const app = document.getElementById('lightning-app');
    if (!host && !app) return;
  }
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.dataset.theme = isDark ? 'dark' : 'light';
  root.style.colorScheme = isDark ? 'dark' : 'light';
}

function useThemeBinding(root?: HTMLElement): void {
  const theme = useSystemTheme();
  useLayoutEffect(() => {
    lightningMounted = true;
    return () => {
      lightningMounted = false;
    };
  }, []);
  useLayoutEffect(() => {
    const target = root ?? document.documentElement;
    const isDark = theme === 'dark';
    target.classList.toggle('dark', isDark);
    target.dataset.theme = theme;
    syncOuterTheme(isDark);
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
