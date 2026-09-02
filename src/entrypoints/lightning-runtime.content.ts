import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { injectScript } from 'wxt/utils/inject-script';
import styles from '../app/styles.css?inline';
import { createLightningRuntime } from '../app/runtime';
import { syncOuterTheme } from '../app/theme';
import { createBrowserStorageAdapter } from '../features/settings/store';
import { isEchoHost } from '../integrations/echo';
import { createPageFetch } from '../integrations/echo/transport/page-fetch';
import { isLoggedOutFromDOM } from '../platform/browser/auth-detector';
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
    let globallyDisabled = false;
    try {
      const stored = await browser.storage.local.get('lightning.globalEnabled');
      const raw = stored['lightning.globalEnabled'];
      if (raw === false) globallyDisabled = true;
      else if (typeof raw === 'string') {
        if (raw === 'false') globallyDisabled = true;
        else {
          try {
            const parsed = JSON.parse(raw) as unknown;
            if (parsed === false) globallyDisabled = true;
            else if (parsed && typeof parsed === 'object') {
              const obj = parsed as Record<string, unknown>;
              if (obj.globalEnabled === false) globallyDisabled = true;
              else if (obj.state && typeof obj.state === 'object') {
                const state = obj.state as Record<string, unknown>;
                if (state.globalEnabled === false) globallyDisabled = true;
              }
            }
          } catch {
            void 0;
          }
        }
      } else if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if (obj.globalEnabled === false) globallyDisabled = true;
        else if (obj.state && typeof obj.state === 'object') {
          const state = obj.state as Record<string, unknown>;
          if (state.globalEnabled === false) globallyDisabled = true;
        }
      }
    } catch {
      void 0;
    }
    if (globallyDisabled) return;
    try {
      if (isLoggedOutFromDOM(document)) {
        void runtimeApi.sendMessage({ type: 'reportLoggedOut', url: location.href }).catch(() => undefined);
        return;
      }
    } catch {
      void 0;
    }
    await injectScript('/history-bridge.js').catch((error) => console.warn('Unable to install history bridge.', error));
    await injectScript('/api-bridge.js').catch((error) => console.warn('Unable to install API bridge.', error));
    const isDark =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    syncOuterTheme(isDark);
    const host = document.createElement('div');
    host.id = 'echo-lightning-host';
    host.dataset.echoLightning = 'true';
    Object.assign(host.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      pointerEvents: 'auto',
      backgroundColor: 'hsl(var(--lightning-bg))',
      overflow: 'auto',
    });
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = styles;
    shadow.append(style);
    const app = document.createElement('div');
    app.id = 'lightning-app';
    shadow.append(app);
    (document.documentElement || document.body).append(host);
    syncOuterTheme(isDark);
    const lightning = createLightningRuntime({
      window,
      sendMessage: (message) => runtimeApi.sendMessage(message),
      fetcher: createPageFetch(window),
      settingsStorage: createBrowserStorageAdapter(browser.storage.local),
      cleanup: () => host.remove(),
    });
    lightning.mount(app);
    const handlePageHide = () => lightning?.dispose();
    window.addEventListener('pagehide', handlePageHide, { once: true });
    ctx.onInvalidated(() => {
      window.removeEventListener('pagehide', handlePageHide);
      document.getElementById('echo-lightning-takeover')?.remove();
      document.getElementById('lightning-takeover')?.remove();
      lightning?.dispose();
      host.remove();
    });
  },
});
