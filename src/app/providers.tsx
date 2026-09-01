import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { LightningSettingsStore } from '../features/settings';
import { ThemeProvider } from './theme';

export function createLightningQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  });
}

export function AppProviders({
  children,
  root,
  queryClient,
  settingsStore,
}: {
  children: ReactNode;
  root: HTMLElement;
  queryClient: QueryClient;
  settingsStore?: LightningSettingsStore;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider root={root} store={settingsStore}>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
