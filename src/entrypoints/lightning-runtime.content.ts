import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { injectScript } from 'wxt/utils/inject-script';
import styles from '../app/styles.css?inline';
import { createLightningRuntime } from '../app/runtime';
import { syncOuterTheme } from '../app/theme';
import { createBrowserStorageAdapter } from '../features/settings/store';
import { isEchoHost } from '../integrations/echo';
import { isEchoAuthUrl } from '../integrations/echo/routing/routes';
import { createPageFetch } from '../integrations/echo/transport/page-fetch';
import { isLoggedOutFromDOM } from '../platform/browser/auth-detector';
import { createHostContainer } from '../platform/browser/host-container';
import { installBodyTakeover } from '../platform/browser/body-takeover';
import { ensureWebIdlIterators } from '../platform/browser/webidl-iterators';
import type { ExtensionResponse } from '../platform/extension/messages';

type Runtime = { sendMessage: (message: unknown) => Promise<ExtensionResponse> };

const MOUNTING_ATTRIBUTE = 'data-echo-lightning-mounting';

export default defineContentScript({
  matches: ['*://*.echo360.net.au/*'],
  registration: 'runtime',
  runAt: 'document_start',
  cssInjectionMode: 'ui',
  async main(ctx) {
    ensureWebIdlIterators();
    if (!isEchoHost(location.hostname) || isEchoAuthUrl(location.href)) return;
    if (document.getElementById('echo-lightning-host') || document.documentElement.hasAttribute(MOUNTING_ATTRIBUTE))
      return;
    document.documentElement.setAttribute(MOUNTING_ATTRIBUTE, '');
    const releaseMountingClaim = () => document.documentElement.removeAttribute(MOUNTING_ATTRIBUTE);
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
    if (globallyDisabled) {
      releaseMountingClaim();
      return;
    }
    try {
      if (isLoggedOutFromDOM(document)) {
        void runtimeApi.sendMessage({ type: 'reportLoggedOut', url: location.href }).catch(() => undefined);
        releaseMountingClaim();
        return;
      }
    } catch {
      void 0;
    }
    const takeover = installBodyTakeover(document, { stripHead: true });
    if (!document.body) {
      await new Promise<void>((resolve) => {
        const observer = new MutationObserver(() => {
          if (document.body) {
            observer.disconnect();
            resolve();
          }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        requestAnimationFrame(() => {
          if (document.body) {
            observer.disconnect();
            resolve();
          }
        });
      });
    }
    await injectScript('/history-bridge.js').catch((error) => console.warn('Unable to install history bridge.', error));
    await injectScript('/api-bridge.js').catch((error) => console.warn('Unable to install API bridge.', error));
    const isDark =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    syncOuterTheme(isDark);
    const host = createHostContainer(document);
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = styles;
    shadow.append(style);
    const app = document.createElement('div');
    app.id = 'lightning-app';
    shadow.append(app);
    document.body.append(host);
    releaseMountingClaim();
    syncOuterTheme(isDark);
    const lightning = createLightningRuntime({
      window,
      sendMessage: (message) => runtimeApi.sendMessage(message),
      fetcher: createPageFetch(window),
      settingsStorage: createBrowserStorageAdapter(browser.storage.local),
      cleanup: () => {
        takeover.dispose();
        host.remove();
      },
    });
    lightning.mount(app);
    const handlePageHide = () => lightning?.dispose();
    window.addEventListener('pagehide', handlePageHide, { once: true });
    ctx.onInvalidated(() => {
      window.removeEventListener('pagehide', handlePageHide);
      document.getElementById('echo-lightning-takeover')?.remove();
      document.getElementById('lightning-takeover')?.remove();
      lightning?.dispose();
      takeover.dispose();
      host.remove();
    });
  },
});
