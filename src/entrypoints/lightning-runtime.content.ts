import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { injectScript } from 'wxt/utils/inject-script';
import styles from '../app/styles.css?inline';
import { createLightningRuntime } from '../app/runtime';
import { syncOuterTheme } from '../app/theme';
import { createBrowserStorageAdapter } from '../features/settings/store';
import { isEchoHost } from '../integrations/echo';
import { createPageFetch } from '../integrations/echo/transport/page-fetch';
import type { ExtensionResponse } from '../platform/extension/messages';

type Runtime = { sendMessage: (message: unknown) => Promise<ExtensionResponse> };

export default defineContentScript({
  matches: ['*://*.echo360.net.au/*'],
  registration: 'runtime',
  runAt: 'document_start',
  cssInjectionMode: 'ui',
  async main(ctx) {
    if (!isEchoHost(location.hostname) || document.getElementById('echo-lightning-host')) return;
    const runtimeApi = browser.runtime as unknown as Runtime;
    await injectScript('/history-bridge.js').catch((error) => console.warn('Unable to install history bridge.', error));
    await injectScript('/api-bridge.js').catch((error) => console.warn('Unable to install API bridge.', error));
    const isDark =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    syncOuterTheme(isDark);
    let lightning: ReturnType<typeof createLightningRuntime> | undefined;
    const ui = await createShadowRootUi(ctx, {
      name: 'echo-lightning',
      position: 'overlay',
      anchor: 'body',
      append: 'last',
      css: styles,
      onMount: (container, _shadow, shadowHost) => {
        shadowHost.id = 'echo-lightning-host';
        shadowHost.dataset.echoLightning = 'true';
        Object.assign(shadowHost.style, {
          position: 'fixed',
          inset: '0',
          zIndex: '2147483647',
          width: 'auto',
          height: 'auto',
          overflow: 'auto',
          backgroundColor: 'hsl(var(--lightning-bg))',
          pointerEvents: 'auto',
        });
        syncOuterTheme(isDark);
        const app = document.createElement('div');
        app.id = 'lightning-app';
        container.append(app);
        lightning = createLightningRuntime({
          window,
          sendMessage: (message) => runtimeApi.sendMessage(message),
          fetcher: createPageFetch(window),
          settingsStorage: createBrowserStorageAdapter(browser.storage.local),
          cleanup: () => ui.remove(),
        });
        lightning.mount(app);
        const handlePageHide = () => lightning?.dispose();
        window.addEventListener('pagehide', handlePageHide, { once: true });
        ctx.onInvalidated(() => {
          window.removeEventListener('pagehide', handlePageHide);
          document.getElementById('echo-lightning-takeover')?.remove();
          document.getElementById('lightning-takeover')?.remove();
          lightning?.dispose();
        });
        return lightning;
      },
      onRemove: (mounted) => {
        mounted?.dispose();
        document.getElementById('echo-lightning-takeover')?.remove();
        document.getElementById('lightning-takeover')?.remove();
      },
    });
    ctx.onInvalidated(() => {
      document.getElementById('echo-lightning-takeover')?.remove();
      document.getElementById('lightning-takeover')?.remove();
    });
    ui.mount();
  },
});
