import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
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
}: {
  children: ReactNode;
  root: HTMLElement;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider root={root}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
