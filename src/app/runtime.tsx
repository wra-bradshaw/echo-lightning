import { QueryClient } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';
import type { EchoGateway } from '../domain';
import { createAuthenticatedEchoGateway } from '../integrations/echo';
import { createNavigationStore, type NavigationStore } from '../platform/browser/navigation-store';
import type { ExtensionResponse } from '../platform/extension/messages';
import { AppShell } from './app-shell';
import { ErrorBoundary } from './error-boundary';
import { AppProviders, createLightningQueryClient } from './providers';

export interface LightningRuntime {
  mount(container: HTMLElement): void;
  dispose(): void;
}

export type LightningRuntimeOptions = {
  window: Window;
  sendMessage: (message: { type: 'useOriginal' | 'routeChanged'; url?: string }) => Promise<ExtensionResponse>;
  navigationFactory?: (window: Window, onNavigate: (url: string) => void) => NavigationStore;
  queryClientFactory?: () => QueryClient;
  gatewayFactory?: (options: {
    origin: string;
    sendMessage: (message: { type: 'useOriginal'; url: string }) => Promise<unknown>;
  }) => EchoGateway;
  cleanup?: () => void;
};

export function createLightningRuntime(options: LightningRuntimeOptions): LightningRuntime {
  const queryClient = options.queryClientFactory?.() ?? createLightningQueryClient();
  const navigation =
    options.navigationFactory?.(options.window, (url) => {
      void options.sendMessage({ type: 'routeChanged', url });
    }) ??
    createNavigationStore(options.window, (url) => {
      void options.sendMessage({ type: 'routeChanged', url });
    });
  const gateway =
    options.gatewayFactory?.({
      origin: options.window.location.origin,
      sendMessage: (message) => options.sendMessage(message),
    }) ??
    createAuthenticatedEchoGateway({
      origin: options.window.location.origin,
      sendMessage: (message) => options.sendMessage(message),
    });
  let reactRoot: Root | undefined;
  let disposed = false;

  return {
    mount(container) {
      if (disposed) throw new Error('Cannot mount a disposed Lightning runtime.');
      if (reactRoot) return;
      reactRoot = createRoot(container);
      reactRoot.render(
        <AppProviders root={container} queryClient={queryClient}>
          <ErrorBoundary
            onUseOriginal={() => void options.sendMessage({ type: 'useOriginal', url: navigation.getSnapshot() })}
          >
            <AppShell
              navigation={navigation}
              gateway={gateway}
              onUseOriginal={(url) => void options.sendMessage({ type: 'useOriginal', url })}
            />
          </ErrorBoundary>
        </AppProviders>,
      );
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      reactRoot?.unmount();
      reactRoot = undefined;
      navigation.dispose();
      void queryClient.cancelQueries();
      queryClient.clear();
      options.cleanup?.();
    },
  };
}
