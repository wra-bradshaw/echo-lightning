import { QueryClient } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { createRoot, type Root } from 'react-dom/client';
import type { EchoGateway } from '../domain';
import { createAuthenticatedEchoGateway } from '../integrations/echo';
import { canonicalEchoUrl } from '../integrations/echo/routing/routes';
import { createLightningHistory, type LightningHistory } from '../platform/browser/navigation-history';
import type { NavigationStore } from '../platform/browser/navigation-store';
import type { ExtensionResponse } from '../platform/extension/messages';
import { createLightningSettingsStore, type LightningSettingsStore, type SettingsStorage } from '../features/settings';
import { ErrorBoundary } from './error-boundary';
import { createLightningRouter } from './router';
import { AppProviders, createLightningQueryClient } from './providers';

export interface LightningRuntime {
  mount(container: HTMLElement): void;
  dispose(): void;
}

export type LightningRuntimeOptions = {
  window: Window;
  sendMessage: (message: { type: 'useOriginal' | 'routeChanged'; url?: string }) => Promise<ExtensionResponse>;
  historyFactory?: (window: Window, onNavigate: (url: string) => void) => LightningHistory;
  navigationFactory?: (window: Window, onNavigate: (url: string) => void) => NavigationStore;
  queryClientFactory?: () => QueryClient;
  gatewayFactory?: (options: {
    origin: string;
    sendMessage: (message: { type: 'useOriginal'; url: string }) => Promise<unknown>;
  }) => EchoGateway;
  settingsStorage?: SettingsStorage;
  settingsStoreFactory?: (storage?: SettingsStorage) => LightningSettingsStore;
  settingsStore?: LightningSettingsStore;
  cleanup?: () => void;
};

export function createLightningRuntime(options: LightningRuntimeOptions): LightningRuntime {
  const queryClient = options.queryClientFactory?.() ?? createLightningQueryClient();
  const routeChanged = (url: string) => {
    void options.sendMessage({ type: 'routeChanged', url });
  };
  const legacyNavigation = options.navigationFactory?.(options.window, routeChanged);
  const history =
    options.historyFactory?.(options.window, routeChanged) ?? createLightningHistory(options.window, routeChanged);
  const settingsStore =
    options.settingsStore ??
    options.settingsStoreFactory?.(options.settingsStorage) ??
    createLightningSettingsStore({ storage: options.settingsStorage });
  const gateway =
    options.gatewayFactory?.({
      origin: options.window.location.origin,
      sendMessage: (message) => options.sendMessage(message),
    }) ??
    createAuthenticatedEchoGateway({
      origin: options.window.location.origin,
      sendMessage: (message) => options.sendMessage(message),
    });
  const originalUrl = () => canonicalEchoUrl(new URL(history.getSnapshot(), options.window.location.href));
  const router = createLightningRouter({
    history,
    gateway,
    queryClient,
    settingsStore,
    onUseOriginal: (url) => void options.sendMessage({ type: 'useOriginal', url: url ?? originalUrl() }),
  });
  let reactRoot: Root | undefined;
  let disposed = false;

  return {
    mount(container) {
      if (disposed) throw new Error('Cannot mount a disposed Lightning runtime.');
      if (reactRoot) return;
      reactRoot = createRoot(container);
      reactRoot.render(
        <AppProviders root={container} queryClient={queryClient} settingsStore={settingsStore}>
          <ErrorBoundary onUseOriginal={() => void options.sendMessage({ type: 'useOriginal', url: originalUrl() })}>
            <RouterProvider router={router} />
          </ErrorBoundary>
        </AppProviders>,
      );
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      reactRoot?.unmount();
      reactRoot = undefined;
      history.dispose();
      legacyNavigation?.dispose();
      void queryClient.cancelQueries();
      queryClient.clear();
      options.cleanup?.();
    },
  };
}
